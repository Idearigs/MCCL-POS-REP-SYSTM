import { Request, Response } from 'express';
import { CustomerDocumentModel, CustomerDocument } from '../models/customerDocumentModel';
import { CustomerModel } from '../models/customerModel';
import multer from 'multer';
import * as path from 'path';

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    // Allow common document types
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
      'text/plain',
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, Word, Excel, images, and text files are allowed.'));
    }
  },
});

export class CustomerDocumentController {
  /**
   * Upload a document for a customer
   */
  static uploadMiddleware = upload.single('file');
  
  static async uploadDocument(req: Request, res: Response) {
    try {
      const customerId = parseInt(req.params.customerId);
      const { documentType, notes } = req.body;
      
      // Validate customer exists
      const customer = await CustomerModel.getById(customerId);
      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }
      
      // Validate document type
      if (!['contract', 'receipt', 'repair', 'other'].includes(documentType)) {
        return res.status(400).json({ error: 'Invalid document type' });
      }
      
      // Check if file was uploaded
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      // Upload document
      const document = await CustomerDocumentModel.uploadDocument(
        customerId,
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        documentType as CustomerDocument['document_type'],
        notes
      );
      
      res.status(201).json(document);
    } catch (error: any) {
      console.error('Error uploading document:', error);
      res.status(500).json({ error: error.message || 'Failed to upload document' });
    }
  }
  
  /**
   * Get all documents for a customer
   */
  static async getDocumentsByCustomerId(req: Request, res: Response) {
    try {
      const customerId = parseInt(req.params.customerId);
      
      // Validate customer exists
      const customer = await CustomerModel.getById(customerId);
      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }
      
      const documents = await CustomerDocumentModel.getByCustomerId(customerId);
      res.json(documents);
    } catch (error: any) {
      console.error('Error getting customer documents:', error);
      res.status(500).json({ error: error.message || 'Failed to get customer documents' });
    }
  }
  
  /**
   * Get a document by ID
   */
  static async getDocumentById(req: Request, res: Response) {
    try {
      const documentId = parseInt(req.params.id);
      const document = await CustomerDocumentModel.getById(documentId);
      
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }
      
      res.json(document);
    } catch (error: any) {
      console.error('Error getting document:', error);
      res.status(500).json({ error: error.message || 'Failed to get document' });
    }
  }
  
  /**
   * Update a document's metadata
   */
  static async updateDocument(req: Request, res: Response) {
    try {
      const documentId = parseInt(req.params.id);
      const { documentType, notes } = req.body;
      
      // Validate document type if provided
      if (documentType && !['contract', 'receipt', 'repair', 'other'].includes(documentType)) {
        return res.status(400).json({ error: 'Invalid document type' });
      }
      
      const updatedDocument = await CustomerDocumentModel.update(documentId, {
        document_type: documentType,
        notes
      });
      
      if (!updatedDocument) {
        return res.status(404).json({ error: 'Document not found' });
      }
      
      res.json(updatedDocument);
    } catch (error: any) {
      console.error('Error updating document:', error);
      res.status(500).json({ error: error.message || 'Failed to update document' });
    }
  }
  
  /**
   * Delete a document
   */
  static async deleteDocument(req: Request, res: Response) {
    try {
      const documentId = parseInt(req.params.id);
      const deleted = await CustomerDocumentModel.delete(documentId);
      
      if (!deleted) {
        return res.status(404).json({ error: 'Document not found' });
      }
      
      res.json({ success: true, message: 'Document deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting document:', error);
      res.status(500).json({ error: error.message || 'Failed to delete document' });
    }
  }
}
