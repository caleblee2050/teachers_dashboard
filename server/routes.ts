import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./googleAuth";
import { generateSummary, generateQuiz, generateStudyGuide, generatePodcastScript, generatePodcastAudio } from "./services/gemini";
import { extractTextFromFile } from "./services/fileProcessor";
import { createClassroomService } from "./services/googleClassroom";
import { createDriveService } from "./services/googleDrive";
import { generatePDF } from "./services/pdfGenerator";
import { insertFileSchema, insertGeneratedContentSchema, insertStudentSchema } from "@shared/schema";
import { z } from "zod";
import { nanoid } from "nanoid";
import express from "express";

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      // Fix Korean filename encoding by using Buffer
      const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
      const ext = path.extname(originalName);
      const name = path.basename(originalName, ext);
      const sanitizedName = name.replace(/[^a-zA-Z0-9가-힣\s\-_.]/g, '');
      const timestamp = Date.now();
      cb(null, `${timestamp}-${sanitizedName}${ext}`);
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Fix originalname encoding issue
    try {
      file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
    } catch (error) {
      console.log('Filename encoding fix failed, using original name');
    }
    
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'text/plain' // .txt
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only DOCX and TXT files are allowed.'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Log all requests for debugging
  app.use((req, res, next) => {
    if (req.url.startsWith('/api/')) {
      console.log(`${req.method} ${req.url} - Query:`, req.query);
    }
    next();
  });

  // Auth middleware
  await setupAuth(app);

  // Serve uploaded files (including audio files)
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Debug route to check session
  app.get('/api/session', (req: any, res) => {
    console.log('Session check:', {
      isAuthenticated: req.isAuthenticated(),
      user: req.user,
      session: req.session
    });
    res.json({
      isAuthenticated: req.isAuthenticated(),
      hasUser: !!req.user,
      sessionID: req.sessionID
    });
  });

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // File routes
  app.post('/api/files/reprocess/:fileId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { fileId } = req.params;
      
      const file = await storage.getFile(fileId);
      if (!file || file.teacherId !== userId) {
        return res.status(404).json({ message: 'File not found' });
      }

      // Re-extract text from file
      try {
        const extractedText = await extractTextFromFile(file.filePath, file.fileType);
        const updatedFile = await storage.updateFileText(fileId, extractedText);
        res.json(updatedFile);
      } catch (error) {
        console.error('Failed to re-extract text:', error);
        res.status(500).json({ message: 'Failed to re-process file' });
      }
    } catch (error) {
      console.error('File reprocess error:', error);
      res.status(500).json({ message: 'Failed to reprocess file' });
    }
  });

  app.post('/api/files/upload', isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const userId = req.user.id;
      const file = req.file;
      
      const fileData = {
        teacherId: userId,
        filename: file.filename,
        originalName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        filePath: file.path,
      };

      const validatedData = insertFileSchema.parse(fileData);
      const createdFile = await storage.createFile(validatedData);

      // Extract text from file in background
      try {
        const extractedText = await extractTextFromFile(file.path, file.mimetype);
        await storage.updateFileText(createdFile.id, extractedText);
      } catch (error) {
        console.error('Failed to extract text:', error);
      }

      res.json(createdFile);
    } catch (error) {
      console.error('File upload error:', error);
      res.status(500).json({ message: 'Failed to upload file' });
    }
  });

  app.get('/api/files', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const files = await storage.getFilesByTeacher(userId);
      res.json(files);
    } catch (error) {
      console.error('Error fetching files:', error);
      res.status(500).json({ message: 'Failed to fetch files' });
    }
  });

  app.delete('/api/files/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const fileId = req.params.id;
      
      const file = await storage.getFile(fileId);
      if (!file || file.teacherId !== userId) {
        return res.status(404).json({ message: 'File not found' });
      }

      // First, delete all generated content associated with this file
      try {
        const generatedContent = await storage.getGeneratedContentByFile(fileId);
        for (const content of generatedContent) {
          await storage.deleteGeneratedContent(content.id);
        }
      } catch (error) {
        console.error('Error deleting generated content:', error);
      }

      // Delete physical file
      try {
        await fs.promises.unlink(file.filePath);
      } catch (error) {
        console.error('Failed to delete physical file:', error);
      }

      const deleted = await storage.deleteFile(fileId);
      if (deleted) {
        res.json({ message: 'File deleted successfully' });
      } else {
        res.status(500).json({ message: 'Failed to delete file' });
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      res.status(500).json({ message: 'Failed to delete file' });
    }
  });

  // Delete multiple files
  app.delete('/api/files', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { fileIds } = req.body;
      
      if (!Array.isArray(fileIds) || fileIds.length === 0) {
        return res.status(400).json({ message: 'Invalid file IDs' });
      }

      const results = [];
      for (const fileId of fileIds) {
        try {
          const file = await storage.getFile(fileId);
          if (file && file.teacherId === userId) {
            // First, delete all generated content associated with this file
            try {
              const generatedContent = await storage.getGeneratedContentByFile(fileId);
              for (const content of generatedContent) {
                await storage.deleteGeneratedContent(content.id);
              }
            } catch (error) {
              console.error('Error deleting generated content for file:', fileId, error);
            }

            // Delete physical file (ignore if already deleted)
            try {
              await fs.promises.unlink(file.filePath);
            } catch (error) {
              // File might already be deleted, continue with database deletion
              console.log('Physical file already deleted or not found:', file.filePath);
            }
            
            const deleted = await storage.deleteFile(fileId);
            results.push({ fileId, success: deleted });
          } else {
            results.push({ fileId, success: false, error: 'File not found' });
          }
        } catch (error) {
          results.push({ fileId, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
        }
      }

      res.json({ results });
    } catch (error) {
      console.error('Error deleting files:', error);
      res.status(500).json({ message: 'Failed to delete files' });
    }
  });

  // AI content generation routes
  app.post('/api/generate/:type', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { type } = req.params;
      const { fileId, language = 'ko' } = req.body;

      if (!['summary', 'quiz', 'study_guide'].includes(type)) {
        return res.status(400).json({ message: 'Invalid content type' });
      }

      const file = await storage.getFile(fileId);
      if (!file || file.teacherId !== userId) {
        return res.status(404).json({ message: 'File not found' });
      }

      if (!file.extractedText) {
        return res.status(400).json({ message: 'File text not yet extracted' });
      }

      let generatedData;
      let title;

      switch (type) {
        case 'summary':
          generatedData = await generateSummary(file.extractedText, language);
          title = `${file.originalName} - AI 요약`;
          break;
        case 'quiz':
          generatedData = await generateQuiz(file.extractedText, language);
          title = `${file.originalName} - AI 퀴즈`;
          break;
        case 'study_guide':
          generatedData = await generateStudyGuide(file.extractedText, language);
          title = `${file.originalName} - 학습 가이드`;
          break;
      }

      // Create folder name based on file and language
      const languageNames = {
        ko: '한국어',
        en: 'English',
        ja: '日本語',
        zh: '中文',
        th: 'ไทย',
        vi: 'Tiếng Việt',
        fil: 'Filipino'
      };
      
      const fileName = file.originalName.replace(/\.[^/.]+$/, ""); // Remove extension
      const folderName = `${fileName} - ${languageNames[language as keyof typeof languageNames] || language}`;

      const contentData = {
        fileId,
        teacherId: userId,
        contentType: type,
        language,
        title,
        content: generatedData,
        folderName,
      };

      const validatedData = insertGeneratedContentSchema.parse(contentData);
      const createdContent = await storage.createGeneratedContent(validatedData);

      res.json(createdContent);
    } catch (error) {
      console.error('Content generation error:', error);
      res.status(500).json({ message: `Failed to generate ${req.params.type}` });
    }
  });

  app.get('/api/content', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const content = await storage.getGeneratedContentByTeacher(userId);
      res.json(content);
    } catch (error) {
      console.error('Error fetching content:', error);
      res.status(500).json({ message: 'Failed to fetch generated content' });
    }
  });

  app.get('/api/content/file/:fileId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { fileId } = req.params;
      
      const file = await storage.getFile(fileId);
      if (!file || file.teacherId !== userId) {
        return res.status(404).json({ message: 'File not found' });
      }

      const content = await storage.getGeneratedContentByFile(fileId);
      res.json(content);
    } catch (error) {
      console.error('Error fetching file content:', error);
      res.status(500).json({ message: 'Failed to fetch file content' });
    }
  });

  // Delete generated content
  app.delete('/api/content/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const contentId = req.params.id;
      
      const content = await storage.getGeneratedContentByTeacher(userId);
      const targetContent = content.find(c => c.id === contentId);
      
      if (!targetContent) {
        return res.status(404).json({ message: 'Content not found' });
      }

      const deleted = await storage.deleteGeneratedContent(contentId);
      if (deleted) {
        res.json({ message: 'Content deleted successfully' });
      } else {
        res.status(500).json({ message: 'Failed to delete content' });
      }
    } catch (error) {
      console.error('Error deleting content:', error);
      res.status(500).json({ message: 'Failed to delete content' });
    }
  });

  // Delete multiple generated content
  app.delete('/api/content', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { contentIds } = req.body;
      
      if (!Array.isArray(contentIds) || contentIds.length === 0) {
        return res.status(400).json({ message: 'Invalid content IDs' });
      }

      const userContent = await storage.getGeneratedContentByTeacher(userId);
      const results = [];
      
      for (const contentId of contentIds) {
        try {
          const targetContent = userContent.find(c => c.id === contentId);
          if (targetContent) {
            const deleted = await storage.deleteGeneratedContent(contentId);
            results.push({ contentId, success: deleted });
          } else {
            results.push({ contentId, success: false, error: 'Content not found' });
          }
        } catch (error) {
          results.push({ contentId, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
        }
      }

      res.json({ results });
    } catch (error) {
      console.error('Error deleting content:', error);
      res.status(500).json({ message: 'Failed to delete content' });
    }
  });

  // Podcast generation route
  app.post('/api/content/:id/podcast', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const contentId = req.params.id;
      const { language = 'ko' } = req.body;

      // 기존 콘텐츠 가져오기
      const userContent = await storage.getGeneratedContentByTeacher(userId);
      const existingContent = userContent.find(c => c.id === contentId);
      
      if (!existingContent) {
        return res.status(404).json({ message: 'Content not found' });
      }

      // 팟캐스트 스크립트 생성
      const podcastData = await generatePodcastScript(existingContent, language);
      
      // 1. PDF 파일 먼저 생성
      let pdfPath: string | undefined;
      try {
        const timestamp = Date.now();
        const pdfFileName = `podcast_content_${timestamp}.pdf`;
        pdfPath = path.join(process.cwd(), 'uploads', pdfFileName);
        
        // Generate PDF from podcast content
        await generatePDF({
          title: podcastData.title,
          contentType: 'podcast',
          content: podcastData,
          language
        }, pdfPath);
        
        console.log(`PDF generated for podcast: ${pdfPath}`);
      } catch (pdfError) {
        console.warn('PDF generation failed for podcast:', pdfError);
        // Continue without PDF
      }

      // 2. 생성된 PDF와 스크립트를 Gemini에 제공하여 오디오 생성
      const timestamp = Date.now();
      const audioFileName = `podcast_${timestamp}.mp3`;
      const audioFilePath = path.join(process.cwd(), 'uploads', audioFileName);
      
      try {
        // Gemini를 사용하여 PDF 기반 오디오 생성
        await generatePodcastAudio(podcastData.script, audioFilePath, pdfPath);
        podcastData.audioFilePath = `/uploads/${audioFileName}`;
        
        // 파일 크기로 재생 시간 추정
        const stats = fs.statSync(audioFilePath);
        podcastData.duration = Math.round(stats.size / 16000); // 기본 추정
        
        console.log(`Podcast audio generated successfully with PDF: ${audioFilePath}`);
      } catch (audioError) {
        console.warn('Audio generation failed, proceeding with script only:', audioError);
        // 오디오 생성 실패 시 스크립트만 저장
      }

      // 팟캐스트 콘텐츠 저장
      const newContent = await storage.createGeneratedContent({
        fileId: existingContent.fileId,
        teacherId: userId,
        contentType: 'podcast',
        title: podcastData.title,
        content: podcastData,
        language,
        shareToken: nanoid(16),
      });

      res.json(newContent);
    } catch (error) {
      console.error('Error generating podcast:', error);
      res.status(500).json({ message: 'Failed to generate podcast' });
    }
  });

  // Public content sharing route
  app.get('/api/share/:token', async (req, res) => {
    try {
      const { token } = req.params;
      const content = await storage.getGeneratedContentByShare(token);
      
      if (!content) {
        return res.status(404).json({ message: 'Content not found' });
      }

      res.json(content);
    } catch (error) {
      console.error('Error fetching shared content:', error);
      res.status(500).json({ message: 'Failed to fetch shared content' });
    }
  });

  // Student management routes
  app.post('/api/students', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const studentData = {
        ...req.body,
        teacherId: userId,
      };

      const validatedData = insertStudentSchema.parse(studentData);
      const student = await storage.createStudent(validatedData);
      res.json(student);
    } catch (error) {
      console.error('Error creating student:', error);
      res.status(500).json({ message: 'Failed to create student' });
    }
  });

  app.get('/api/students', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const students = await storage.getStudentsByTeacher(userId);
      res.json(students);
    } catch (error) {
      console.error('Error fetching students:', error);
      res.status(500).json({ message: 'Failed to fetch students' });
    }
  });

  app.delete('/api/students/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteStudent(id);
      
      if (deleted) {
        res.json({ message: 'Student deleted successfully' });
      } else {
        res.status(404).json({ message: 'Student not found' });
      }
    } catch (error) {
      console.error('Error deleting student:', error);
      res.status(500).json({ message: 'Failed to delete student' });
    }
  });

  // Google Classroom student sync routes
  app.get('/api/classroom/students', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      
      if (!user.googleAccessToken) {
        console.log('No Google access token found for user:', user.id);
        return res.status(401).json({ 
          message: 'Google authentication required. Please connect your Google account first.' 
        });
      }

      const classroomService = await createClassroomService(user);
      const students = await classroomService.getStudents();
      
      res.json(students);
    } catch (error: any) {
      console.error('Error fetching classroom students:', error);
      
      if (error.code === 401 || error.status === 401) {
        res.status(401).json({ 
          message: 'Google authentication expired. Please reconnect your Google account.' 
        });
      } else if (error.code === 403 || error.status === 403) {
        res.status(403).json({ 
          message: 'Google Classroom API access denied. Please check API permissions and ensure Classroom API is enabled in Google Cloud Console.' 
        });
      } else {
        res.status(500).json({ message: 'Failed to fetch classroom students' });
      }
    }
  });

  app.post('/api/classroom/sync-students', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const userId = user.id;
      
      console.log('Sync students request - user tokens:', {
        hasAccessToken: !!user.googleAccessToken,
        hasRefreshToken: !!user.googleRefreshToken
      });
      
      if (!user.googleAccessToken) {
        console.log('No Google access token found for user:', user.id);
        return res.status(401).json({ 
          message: 'Google authentication required. Please connect your Google account first.' 
        });
      }

      const classroomService = await createClassroomService(user);
      const classroomStudents = await classroomService.getStudents();
      
      // Get existing students to avoid duplicates
      const existingStudents = await storage.getStudentsByTeacher(userId);
      const existingEmails = new Set(existingStudents.map(s => s.email));
      
      const syncResults = {
        added: 0,
        skipped: 0,
        errors: [] as string[]
      };
      
      for (const classroomStudent of classroomStudents) {
        try {
          if (!existingEmails.has(classroomStudent.email)) {
            const studentData = {
              name: classroomStudent.name,
              email: classroomStudent.email,
              teacherId: userId,
            };
            
            const validatedData = insertStudentSchema.parse(studentData);
            await storage.createStudent(validatedData);
            syncResults.added++;
          } else {
            syncResults.skipped++;
          }
        } catch (error) {
          console.error(`Failed to add student ${classroomStudent.email}:`, error);
          syncResults.errors.push(`Failed to add ${classroomStudent.name} (${classroomStudent.email})`);
        }
      }
      
      res.json({
        message: 'Student synchronization completed',
        results: syncResults,
        totalClassroomStudents: classroomStudents.length
      });
      
    } catch (error: any) {
      console.error('Error syncing classroom students:', error);
      
      if (error.code === 401 || error.status === 401) {
        res.status(401).json({ 
          message: 'Google authentication expired. Please reconnect your Google account.' 
        });
      } else if (error.code === 403 || error.status === 403) {
        res.status(403).json({ 
          message: 'Google Classroom API access denied. Please check API permissions and ensure Classroom API is enabled in Google Cloud Console.' 
        });
      } else {
        res.status(500).json({ message: 'Failed to sync classroom students' });
      }
    }
  });

  // Google Drive API routes
  app.get('/api/drive/files', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user?.googleAccessToken) {
        return res.status(401).json({ message: 'Google authentication required' });
      }
      
      const driveService = await createDriveService(user);
      const query = req.query.q as string;
      const files = await driveService.getFiles(query);
      
      res.json(files);
    } catch (error: any) {
      console.error('Error fetching Drive files:', error);
      
      if (error.code === 401 || error.status === 401) {
        res.status(401).json({ 
          message: 'Google authentication expired. Please reconnect your Google account.' 
        });
      } else {
        res.status(500).json({ message: 'Failed to fetch Google Drive files' });
      }
    }
  });

  app.post('/api/drive/upload', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user?.googleAccessToken) {
        return res.status(401).json({ message: 'Google authentication required' });
      }
      
      const { fileId, fileName } = req.body;
      
      if (!fileId || !fileName) {
        return res.status(400).json({ message: 'File ID and name are required' });
      }
      
      const driveService = await createDriveService(user);
      
      // Download file from Google Drive
      const fileBuffer = await driveService.downloadFile(fileId);
      const fileMetadata = await driveService.getFileMetadata(fileId);
      
      // Save file locally
      const timestamp = Date.now();
      const sanitizedName = fileName.replace(/[^a-zA-Z0-9가-힣\s\-_.]/g, '');
      const localFileName = `${timestamp}-${sanitizedName}`;
      const localFilePath = path.join(uploadDir, localFileName);
      
      fs.writeFileSync(localFilePath, fileBuffer);
      
      // Extract text from the file
      const extractedText = await extractTextFromFile(localFilePath, fileMetadata.mimeType);
      
      // Create file record
      const fileData = {
        teacherId: userId,
        filename: localFileName,
        originalName: fileName,
        fileType: fileMetadata.mimeType,
        fileSize: parseInt(fileMetadata.size || '0'),
        filePath: localFilePath,
        extractedText: extractedText
      };
      
      const validatedData = insertFileSchema.parse(fileData);
      const savedFile = await storage.createFile(validatedData);
      
      res.json(savedFile);
    } catch (error: any) {
      console.error('Error uploading from Drive:', error);
      
      if (error.code === 401 || error.status === 401) {
        res.status(401).json({ 
          message: 'Google authentication expired. Please reconnect your Google account.' 
        });
      } else {
        res.status(500).json({ message: 'Failed to upload file from Google Drive' });
      }
    }
  });

  // Classroom batch upload route
  app.post('/api/classroom/upload-batch', isAuthenticated, async (req: any, res) => {
    try {
      console.log('=== Batch Upload Started ===');
      console.log('Request body:', req.body);
      
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user?.googleAccessToken) {
        console.log('No Google access token found');
        return res.status(401).json({ message: 'Google authentication required' });
      }
      
      const { contents, folderName } = req.body;
      
      if (!contents || !Array.isArray(contents) || !folderName) {
        console.log('Invalid request data:', { contents, folderName });
        return res.status(400).json({ message: 'Contents array and folder name are required' });
      }
      
      console.log(`Creating classroom service for user: ${userId}`);
      const classroomService = await createClassroomService(user);
      
      // Get all courses for the user
      console.log('Getting classroom courses...');
      const courses = await classroomService.getCourses();
      console.log(`Found ${courses.length} courses:`, courses.map(c => ({ id: c.id, name: c.name, state: c.state })));
      
      if (courses.length === 0) {
        console.log('No courses found');
        return res.status(404).json({ message: 'No courses found. Please create a course in Google Classroom first.' });
      }
      
      // Use the first active course
      const activeCourse = courses.find(course => course.state === 'ACTIVE') || courses[0];
      console.log(`Using course: ${activeCourse.name} (${activeCourse.id})`);
      
      let totalUploaded = 0;
      const uploadResults = [];
      
      // Upload each content as a separate assignment
      console.log(`Starting to upload ${contents.length} contents...`);
      console.log('Contents array:', contents);
      
      for (let i = 0; i < contents.length; i++) {
        const contentId = contents[i];
        console.log(`Processing content [${i}]: ${JSON.stringify(contentId)} (type: ${typeof contentId})`);
        
        // Ensure contentId is a string
        const actualContentId = typeof contentId === 'string' ? contentId : contentId?.id || String(contentId);
        console.log(`Actual content ID to use: ${actualContentId}`);
        
        try {
          // Get all content for the teacher and find by ID
          const allContent = await storage.getGeneratedContentByTeacher(userId);
          const content = allContent.find(c => c.id === actualContentId);
          
          if (!content) {
            console.log(`Content not found: ${actualContentId}`);
            console.log(`Available content IDs:`, allContent.map(c => c.id));
            uploadResults.push({ contentId: actualContentId, success: false, error: 'Content not found' });
            continue;
          }
          
          console.log(`Found content: ${content.title} (${content.contentType})`);
          console.log(`Content data sample:`, JSON.stringify(content.content).substring(0, 200) + '...');
          const assignmentTitle = `[${folderName}] ${content.title}`;
          
          console.log(`Creating assignment: ${assignmentTitle}`);
          const result = await classroomService.createAssignment(
            activeCourse.id,
            assignmentTitle,
            `AI 생성 콘텐츠 - ${content.contentType}`,
            content
          );
          
          console.log(`Assignment creation result:`, result);
          
          if (result.success) {
            totalUploaded++;
            uploadResults.push({ contentId: actualContentId, success: true, assignmentId: result.assignmentId });
          } else {
            uploadResults.push({ contentId: actualContentId, success: false, error: result.error });
          }
        } catch (error: any) {
          console.error(`Failed to upload content ${actualContentId}:`, error);
          uploadResults.push({ contentId: actualContentId, success: false, error: error.message });
        }
      }
      
      res.json({
        totalUploaded,
        totalRequested: contents.length,
        courseId: activeCourse.id,
        courseName: activeCourse.name,
        folderName,
        results: uploadResults
      });
      
    } catch (error: any) {
      console.error('Error in batch classroom upload:', error);
      
      if (error.code === 401 || error.status === 401) {
        res.status(401).json({ 
          message: 'Google authentication expired. Please reconnect your Google account.' 
        });
      } else if (error.code === 403 || error.status === 403) {
        res.status(403).json({ 
          message: 'Google Classroom API access denied. Please check API permissions and ensure Classroom API is enabled in Google Cloud Console.' 
        });
      } else {
        res.status(500).json({ message: 'Failed to upload content to classroom' });
      }
    }
  });

  // Dashboard stats route
  app.get('/api/dashboard/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      const files = await storage.getFilesByTeacher(userId);
      const content = await storage.getGeneratedContentByTeacher(userId);
      const students = await storage.getStudentsByTeacher(userId);
      
      const stats = {
        uploadedFiles: files.length,
        generatedContent: content.length,
        students: students.length,
        sharedLinks: content.filter(c => c.shareToken).length,
      };

      res.json(stats);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      res.status(500).json({ message: 'Failed to fetch dashboard stats' });
    }
  });

  // Google Classroom API routes
  app.get('/api/classroom/courses', isAuthenticated, async (req: any, res) => {
    try {
      const classroomService = await createClassroomService(req.user);
      const courses = await classroomService.getCourses();
      res.json(courses);
    } catch (error: any) {
      console.error('Error fetching classroom courses:', error);
      
      // Check if it's an API not enabled error
      if (error.code === 403 && error.message?.includes('has not been used in project')) {
        res.status(403).json({ 
          message: 'Google Classroom API가 활성화되지 않았습니다.',
          error: 'API_NOT_ENABLED',
          details: 'Google Cloud Console에서 Google Classroom API를 활성화해주세요.'
        });
      } else if (error.code === 403) {
        res.status(403).json({ 
          message: 'Google Classroom 권한이 없습니다.',
          error: 'PERMISSION_DENIED',
          details: 'Google 계정에 다시 로그인하여 Classroom 권한을 허용해주세요.'
        });
      } else {
        res.status(500).json({ 
          message: 'Google Classroom에 접근할 수 없습니다.',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  });

  app.post('/api/classroom/upload', isAuthenticated, async (req: any, res) => {
    try {
      const { courseId, contentId, title, description } = req.body;

      if (!courseId || !contentId) {
        return res.status(400).json({ message: '필수 정보가 누락되었습니다.' });
      }

      // Get the content to upload
      const content = await storage.getGeneratedContentByTeacher(req.user.id);
      const targetContent = content.find(c => c.id === contentId);

      if (!targetContent) {
        return res.status(404).json({ message: '콘텐츠를 찾을 수 없습니다.' });
      }

      const classroomService = await createClassroomService(req.user);
      const result = await classroomService.createAssignment(
        courseId,
        title || targetContent.title,
        description || `EduAI Assistant에서 생성된 ${targetContent.contentType} 콘텐츠`,
        {
          type: targetContent.contentType,
          data: targetContent.content
        }
      );

      res.json(result);
    } catch (error) {
      console.error('Error uploading to classroom:', error);
      res.status(500).json({ 
        message: 'Google Classroom 업로드에 실패했습니다.',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.get('/api/classroom/check-permissions', isAuthenticated, async (req: any, res) => {
    try {
      console.log('Checking classroom permissions for user:', req.user?.id);
      
      if (!req.user?.googleAccessToken) {
        console.log('No Google access token found for user');
        return res.json({ 
          hasPermissions: false, 
          needsReauth: true,
          message: 'Google Classroom 권한이 필요합니다. Google 계정 연결을 먼저 진행해주세요.'
        });
      }
      
      const classroomService = await createClassroomService(req.user);
      const hasPermissions = await classroomService.checkPermissions();
      
      console.log('Classroom permissions check result:', hasPermissions);
      res.json({ hasPermissions });
    } catch (error: any) {
      console.error('Error checking classroom permissions:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        status: error.status,
        cause: error.cause
      });
      
      // Check for various authentication failure patterns
      const isAuthError = error.code === 401 || 
                         error.status === 401 ||
                         error.message?.includes('authentication') ||
                         error.message?.includes('access token') ||
                         error.message?.includes('UNAUTHENTICATED') ||
                         (error.cause && error.cause.code === 401);
      
      if (isAuthError) {
        console.log('Authentication failed - user needs to re-authenticate with Google');
        res.json({ 
          hasPermissions: false, 
          needsReauth: true,
          message: 'Google 계정 재인증이 필요합니다. 권한이 만료되었습니다.'
        });
      } else {
        res.json({ 
          hasPermissions: false, 
          error: error instanceof Error ? error.message : 'Unknown error',
          message: 'Google Classroom 권한 확인 중 오류가 발생했습니다.'
        });
      }
    }
  });

  // Force Google re-authentication
  app.post('/api/auth/reauth-google', isAuthenticated, async (req: any, res) => {
    try {
      // Update user to clear tokens
      await storage.upsertUser({
        id: req.user.id,
        email: req.user.email,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        accessToken: null,
        refreshToken: null
      });

      // Destroy session
      req.session.destroy((err: any) => {
        if (err) {
          console.error('Error destroying session:', err);
        }
      });

      res.json({ message: 'Google 계정 재인증을 위해 로그아웃되었습니다.' });
    } catch (error) {
      console.error('Error during reauth:', error);
      res.status(500).json({ message: '재인증 처리 중 오류가 발생했습니다.' });
    }
  });

  // Generate podcast from content
  app.post('/api/content/:id/podcast', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { language = 'ko' } = req.body;

      // Get the content
      const allContent = await storage.getGeneratedContentByTeacher(req.user.id);
      const content = allContent.find(c => c.id === id);
      
      if (!content) {
        return res.status(404).json({ message: 'Content not found' });
      }

      console.log(`Generating podcast for content: ${content.title}`);

      // Generate podcast script
      const podcastData = await generatePodcastScript(content, language);
      
      // Generate unique filename for audio
      const timestamp = Date.now();
      const audioFileName = `podcast-${id}-${timestamp}.mp3`;
      const audioFilePath = path.join(process.cwd(), 'uploads', audioFileName);

      try {
        // Generate audio file
        const generatedAudioPath = await generatePodcastAudio(podcastData.script, audioFilePath);
        podcastData.audioFilePath = `/uploads/${audioFileName}`;
        
        // Get audio file stats for duration (basic approximation)
        const stats = fs.statSync(generatedAudioPath);
        podcastData.duration = Math.round(stats.size / 16000); // Rough estimation
      } catch (audioError) {
        console.warn('Audio generation failed, returning script only:', audioError);
        // Continue without audio file - user will get script only
      }

      // Save podcast as new content
      const podcastContent = await storage.createGeneratedContent({
        fileId: content.fileId,
        teacherId: req.user.id,
        contentType: 'podcast',
        language,
        title: `${content.title} - 팟캐스트`,
        content: podcastData,
        shareToken: nanoid(),
        folderName: content.folderName
      });

      res.json(podcastContent);
    } catch (error) {
      console.error('Error generating podcast:', error);
      res.status(500).json({ message: 'Failed to generate podcast' });
    }
  });

  // PDF export route
  app.get('/api/content/:id/pdf', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const contentId = req.params.id;
      
      // Get content
      const allContent = await storage.getGeneratedContentByTeacher(userId);
      const content = allContent.find(c => c.id === contentId);
      
      if (!content) {
        return res.status(404).json({ message: 'Content not found' });
      }
      
      // Generate PDF
      const timestamp = Date.now();
      const fileName = `${content.title.replace(/[^a-zA-Z0-9가-힣]/g, '_')}_${timestamp}.pdf`;
      const outputPath = path.join(uploadDir, fileName);
      
      await generatePDF({
        title: content.title,
        contentType: content.contentType,
        content: content.content,
        language: content.language
      }, outputPath);
      
      // Send file
      res.download(outputPath, fileName, (err: any) => {
        if (err) {
          console.error('Error sending PDF:', err);
          res.status(500).json({ message: 'Failed to download PDF' });
        }
        
        // Clean up temporary file
        setTimeout(() => {
          try {
            fs.unlinkSync(outputPath);
          } catch (e) {
            console.error('Error cleaning up PDF file:', e);
          }
        }, 5000);
      });
      
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      res.status(500).json({ message: 'Failed to generate PDF' });
    }
  });

  // Batch PDF export route
  app.post('/api/content/batch-pdf', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { contentIds, folderName } = req.body;
      
      if (!contentIds || !Array.isArray(contentIds) || contentIds.length === 0) {
        return res.status(400).json({ message: 'Content IDs are required' });
      }
      
      // Get all content
      const allContent = await storage.getGeneratedContentByTeacher(userId);
      const contents = allContent.filter(c => contentIds.includes(c.id));
      
      if (contents.length === 0) {
        return res.status(404).json({ message: 'No content found' });
      }
      
      const timestamp = Date.now();
      const zipFileName = `${folderName || 'AI_Content'}_${timestamp}.zip`;
      const zipPath = path.join(uploadDir, zipFileName);
      
      // Create PDFs for each content
      const pdfPaths: string[] = [];
      for (const content of contents) {
        const fileName = `${content.title.replace(/[^a-zA-Z0-9가-힣]/g, '_')}.pdf`;
        const outputPath = path.join(uploadDir, `temp_${timestamp}_${fileName}`);
        
        await generatePDF({
          title: content.title,
          contentType: content.contentType,
          content: content.content,
          language: content.language
        }, outputPath);
        
        pdfPaths.push(outputPath);
      }
      
      // Create zip file
      const archiver = require('archiver');
      const output = fs.createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });
      
      output.on('close', () => {
        // Send zip file
        res.download(zipPath, zipFileName, (err: any) => {
          if (err) {
            console.error('Error sending ZIP:', err);
            res.status(500).json({ message: 'Failed to download ZIP' });
          }
          
          // Clean up temporary files
          setTimeout(() => {
            try {
              fs.unlinkSync(zipPath);
              pdfPaths.forEach(pdfPath => {
                try {
                  fs.unlinkSync(pdfPath);
                } catch (e) {
                  console.error('Error cleaning up PDF:', e);
                }
              });
            } catch (e) {
              console.error('Error cleaning up ZIP file:', e);
            }
          }, 5000);
        });
      });
      
      archive.on('error', (err) => {
        console.error('Archive error:', err);
        res.status(500).json({ message: 'Failed to create ZIP file' });
      });
      
      archive.pipe(output);
      
      // Add PDF files to archive
      contents.forEach((content, index) => {
        const fileName = `${content.title.replace(/[^a-zA-Z0-9가-힣]/g, '_')}.pdf`;
        archive.file(pdfPaths[index], { name: fileName });
      });
      
      archive.finalize();
      
    } catch (error: any) {
      console.error('Error generating batch PDF:', error);
      res.status(500).json({ message: 'Failed to generate batch PDF' });
    }
  });

  // Serve uploaded files (including audio files)
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  const httpServer = createServer(app);
  return httpServer;
}
