import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./googleAuth";
import { generateSummary, generateQuiz, generateStudyGuide } from "./services/gemini";
import { extractTextFromFile } from "./services/fileProcessor";
import { insertFileSchema, insertGeneratedContentSchema, insertStudentSchema } from "@shared/schema";
import { z } from "zod";

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  dest: uploadDir,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOCX, PPTX, and TXT files are allowed.'));
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

  const httpServer = createServer(app);
  return httpServer;
}
