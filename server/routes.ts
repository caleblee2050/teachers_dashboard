import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./googleAuth";
import { generateSummary, generateQuiz, generateStudyGuide } from "./services/gemini";
import { extractTextFromFile } from "./services/fileProcessor";
import { createClassroomService } from "./services/googleClassroom";
import { insertFileSchema, insertGeneratedContentSchema, insertStudentSchema } from "@shared/schema";
import { z } from "zod";

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

      const contentData = {
        fileId,
        teacherId: userId,
        contentType: type,
        language,
        title,
        content: generatedData,
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
      
      if (!user.googleAccessToken || !user.googleRefreshToken) {
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
      
      if (!user.googleAccessToken || !user.googleRefreshToken) {
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
      
      if (!req.user?.accessToken) {
        console.log('No access token found for user');
        return res.json({ 
          hasPermissions: false, 
          needsReauth: true,
          message: 'Google 계정 재인증이 필요합니다. 액세스 토큰이 없습니다.'
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

  const httpServer = createServer(app);
  return httpServer;
}
