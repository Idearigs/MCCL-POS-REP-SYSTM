import { Request, Response } from 'express';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { driveService } from '../utils/drive/googleDriveService';

// Configure multer for temporary file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tempDir = path.join(__dirname, '../../temp');
    
    // Create temp directory if it doesn't exist
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter to validate file types
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Accept images and common document types
  const allowedMimeTypes = [
    'image/jpeg', 
    'image/png', 
    'image/gif', 
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, PDFs, and Office documents are allowed.'));
  }
};

// Configure multer upload
export const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

/**
 * File controller for handling file uploads and management
 */
export class FileController {
  /**
   * Initialize Google Drive service
   */
  async initialize() {
    try {
      await driveService.initialize();
    } catch (error) {
      console.error('Failed to initialize Google Drive service:', error);
    }
  }

  /**
   * Upload a file to Google Drive
   * @param req Express request
   * @param res Express response
   */
  async uploadFile(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
      }

      const { entityType, entityId } = req.body;
      
      if (!entityType) {
        return res.status(400).json({ 
          success: false, 
          message: 'Entity type is required (e.g., "product", "repair", "customer")' 
        });
      }

      // Create or get folder for this entity type
      const folderName = entityType.toLowerCase();
      const folderId = await driveService.createFolder(folderName);

      // Upload file to Google Drive
      const filePath = req.file.path;
      const result = await driveService.uploadFileFromPath(
        filePath,
        req.file.mimetype,
        folderId
      );

      // Delete the temporary file
      fs.unlinkSync(filePath);

      // Return file information
      return res.status(200).json({
        success: true,
        file: {
          id: result.id,
          url: result.webViewLink,
          name: req.file.originalname,
          mimeType: req.file.mimetype,
          size: req.file.size,
          entityType,
          entityId: entityId || null
        }
      });
    } catch (error: any) {
      console.error('Error uploading file:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to upload file',
        error: error.message 
      });
    }
  }

  /**
   * Delete a file from Google Drive
   * @param req Express request
   * @param res Express response
   */
  async deleteFile(req: Request, res: Response) {
    try {
      const { fileId } = req.params;
      
      if (!fileId) {
        return res.status(400).json({ success: false, message: 'File ID is required' });
      }

      await driveService.deleteFile(fileId);

      return res.status(200).json({
        success: true,
        message: 'File deleted successfully'
      });
    } catch (error: any) {
      console.error('Error deleting file:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to delete file',
        error: error.message 
      });
    }
  }

  /**
   * Get file metadata from Google Drive
   * @param req Express request
   * @param res Express response
   */
  async getFileInfo(req: Request, res: Response) {
    try {
      const { fileId } = req.params;
      
      if (!fileId) {
        return res.status(400).json({ success: false, message: 'File ID is required' });
      }

      const metadata = await driveService.getFileMetadata(fileId);

      return res.status(200).json({
        success: true,
        file: metadata
      });
    } catch (error: any) {
      console.error('Error getting file info:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to get file information',
        error: error.message 
      });
    }
  }

  /**
   * List files for a specific entity
   * @param req Express request
   * @param res Express response
   */
  async listEntityFiles(req: Request, res: Response) {
    try {
      const { entityType } = req.params;
      
      if (!entityType) {
        return res.status(400).json({ 
          success: false, 
          message: 'Entity type is required (e.g., "product", "repair", "customer")' 
        });
      }

      // Get folder ID for this entity type
      const folderName = entityType.toLowerCase();
      const folderId = await driveService.createFolder(folderName);
      
      // List files in the folder
      const files = await driveService.listFiles(folderId);

      return res.status(200).json({
        success: true,
        entityType,
        files
      });
    } catch (error: any) {
      console.error('Error listing files:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to list files',
        error: error.message 
      });
    }
  }
}

export const fileController = new FileController();
