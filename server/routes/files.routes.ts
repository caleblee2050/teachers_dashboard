import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { storage } from '../storage';
import { isAuthenticated } from '../googleAuth';
import { extractTextFromFile } from '../services/fileProcessor';
import { insertFileSchema } from '@shared/schema';
import { logger } from '../utils/logger';

const router = Router();

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
      logger.warn('Filename encoding fix failed, using original name');
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

/**
 * POST /api/files/upload
 * Upload a new file
 */
router.post('/upload', isAuthenticated, upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const userId = req.user!.id;
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
      logger.info('File text extracted successfully', { fileId: createdFile.id });
    } catch (error) {
      logger.error('Failed to extract text from file', error, { fileId: createdFile.id });
    }

    res.json(createdFile);
  } catch (error) {
    logger.error('File upload error', error);
    res.status(500).json({ message: 'Failed to upload file' });
  }
});

/**
 * GET /api/files
 * Get all files for the authenticated user
 */
router.get('/', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const files = await storage.getFilesByTeacher(userId);
    res.json(files);
  } catch (error) {
    logger.error('Error fetching files', error);
    res.status(500).json({ message: 'Failed to fetch files' });
  }
});

/**
 * POST /api/files/reprocess/:fileId
 * Re-extract text from a file
 */
router.post('/reprocess/:fileId', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
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
      logger.error('Failed to re-extract text', error);
      res.status(500).json({ message: 'Failed to re-process file' });
    }
  } catch (error) {
    logger.error('File reprocess error', error);
    res.status(500).json({ message: 'Failed to reprocess file' });
  }
});

/**
 * DELETE /api/files/:id
 * Delete a single file
 */
router.delete('/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
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
      logger.error('Error deleting generated content', error);
    }

    // Delete physical file
    try {
      await fs.promises.unlink(file.filePath);
    } catch (error) {
      logger.warn('Failed to delete physical file', { filePath: file.filePath });
    }

    const deleted = await storage.deleteFile(fileId);
    if (deleted) {
      res.json({ message: 'File deleted successfully' });
    } else {
      res.status(500).json({ message: 'Failed to delete file' });
    }
  } catch (error) {
    logger.error('Error deleting file', error);
    res.status(500).json({ message: 'Failed to delete file' });
  }
});

/**
 * DELETE /api/files
 * Delete multiple files
 */
router.delete('/', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { fileIds } = req.body;

    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      return res.status(400).json({ message: 'Invalid file IDs' });
    }

    const results = [];
    for (const fileId of fileIds) {
      try {
        const file = await storage.getFile(fileId);
        if (file && file.teacherId === userId) {
          // Delete all generated content associated with this file
          try {
            const generatedContent = await storage.getGeneratedContentByFile(fileId);
            for (const content of generatedContent) {
              await storage.deleteGeneratedContent(content.id);
            }
          } catch (error) {
            logger.error('Error deleting generated content for file', error, { fileId });
          }

          // Delete physical file (ignore if already deleted)
          try {
            await fs.promises.unlink(file.filePath);
          } catch (error) {
            logger.debug('Physical file already deleted or not found', { filePath: file.filePath });
          }

          const deleted = await storage.deleteFile(fileId);
          results.push({ fileId, success: deleted });
        } else {
          results.push({ fileId, success: false, error: 'File not found' });
        }
      } catch (error) {
        results.push({
          fileId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    res.json({ results });
  } catch (error) {
    logger.error('Error deleting files', error);
    res.status(500).json({ message: 'Failed to delete files' });
  }
});

export default router;
