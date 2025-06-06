import express from 'express';
import { fileController, upload } from '../controllers/fileController';
import { authenticateJWT } from '../middleware/authMiddleware';

const router = express.Router();

// Initialize Google Drive service when routes are loaded
fileController.initialize().catch(console.error);

// All file routes require authentication
router.use(authenticateJWT);

/**
 * @route POST /api/files/upload
 * @desc Upload a file to Google Drive
 * @access Private
 */
router.post('/upload', upload.single('file'), fileController.uploadFile);

/**
 * @route DELETE /api/files/:fileId
 * @desc Delete a file from Google Drive
 * @access Private
 */
router.delete('/:fileId', fileController.deleteFile);

/**
 * @route GET /api/files/:fileId
 * @desc Get file metadata from Google Drive
 * @access Private
 */
router.get('/:fileId', fileController.getFileInfo);

/**
 * @route GET /api/files/entity/:entityType
 * @desc List files for a specific entity type
 * @access Private
 */
router.get('/entity/:entityType', fileController.listEntityFiles);

export default router;
