import express from 'express';
import { CustomerDocumentController } from '../controllers/customerDocumentController';
import { authenticateJWT } from '../middleware/authMiddleware';

const router = express.Router();

// Apply JWT authentication to all routes
router.use(authenticateJWT);

// Upload a document for a customer
router.post(
  '/customers/:customerId/documents',
  CustomerDocumentController.uploadMiddleware,
  CustomerDocumentController.uploadDocument
);

// Get all documents for a customer
router.get('/customers/:customerId/documents', CustomerDocumentController.getDocumentsByCustomerId);

// Get a document by ID
router.get('/documents/:id', CustomerDocumentController.getDocumentById);

// Update a document's metadata
router.put('/documents/:id', CustomerDocumentController.updateDocument);

// Delete a document
router.delete('/documents/:id', CustomerDocumentController.deleteDocument);

export default router;
