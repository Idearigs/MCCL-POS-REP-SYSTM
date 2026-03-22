import { CustomerDocument } from '../types/customerDocument';
import { mockCustomerDocuments, generateId, simulateDelay } from './mockData';

// Storage key for localStorage
const STORAGE_KEY = 'mps_customer_documents';

/**
 * Service for customer document operations using localStorage
 */
export const customerDocumentService = {
  /**
   * Get documents from localStorage
   * @returns Array of documents from localStorage or mock data
   */
  getStoredDocuments(): CustomerDocument[] {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (error) {
        console.warn('Error parsing stored documents, using mock data:', error);
      }
    }
    // Initialize with mock data if nothing stored
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockCustomerDocuments));
    return mockCustomerDocuments;
  },

  /**
   * Save documents to localStorage
   * @param documents Array of documents to save
   */
  saveDocuments(documents: CustomerDocument[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(documents));
  },

  /**
   * Get all documents for a customer
   * @param customerId Customer ID
   * @returns Array of customer documents
   */
  async getDocumentsByCustomerId(customerId: number): Promise<CustomerDocument[]> {
    await simulateDelay(300);
    
    const documents = this.getStoredDocuments();
    return documents.filter(doc => doc.customer_id === customerId);
  },

  /**
   * Get a document by ID
   * @param id Document ID
   * @returns Customer document
   */
  async getDocumentById(id: number): Promise<CustomerDocument> {
    await simulateDelay(200);
    
    const documents = this.getStoredDocuments();
    const document = documents.find(doc => doc.id === id);
    
    if (!document) {
      throw new Error(`Document with ID ${id} not found`);
    }
    
    return document;
  },

  /**
   * Upload a document for a customer (simulated)
   * @param customerId Customer ID
   * @param file File to upload
   * @param documentType Type of document
   * @param notes Optional notes
   * @returns Created document
   */
  async uploadDocument(
    customerId: number,
    file: File,
    documentType: CustomerDocument['document_type'],
    notes?: string
  ): Promise<CustomerDocument> {
    await simulateDelay(800); // Longer delay for upload simulation
    
    const documents = this.getStoredDocuments();
    
    // Create a simulated file path (in real app, this would be the uploaded file URL)
    const fileExtension = file.name.split('.').pop() || 'pdf';
    const fileName = `${documentType}_${Date.now()}.${fileExtension}`;
    
    const newDocument: CustomerDocument = {
      id: generateId(),
      customer_id: customerId,
      document_type: documentType,
      file_name: fileName,
      file_path: `/documents/customer_${customerId}/${fileName}`,
      file_size: file.size,
      mime_type: file.type || 'application/pdf',
      uploaded_at: new Date().toISOString(),
      notes: notes || ''
    };
    
    const updatedDocuments = [...documents, newDocument];
    this.saveDocuments(updatedDocuments);
    
    return newDocument;
  },

  /**
   * Update a document's metadata
   * @param id Document ID
   * @param data Updated document data
   * @returns Updated document
   */
  async updateDocument(
    id: number,
    data: { documentType?: CustomerDocument['document_type']; notes?: string }
  ): Promise<CustomerDocument> {
    await simulateDelay(400);
    
    const documents = this.getStoredDocuments();
    const documentIndex = documents.findIndex(doc => doc.id === id);
    
    if (documentIndex === -1) {
      throw new Error(`Document with ID ${id} not found`);
    }
    
    const updatedDocument = { 
      ...documents[documentIndex], 
      ...data,
      // Update document_type if provided
      ...(data.documentType && { document_type: data.documentType })
    };
    
    const updatedDocuments = [...documents];
    updatedDocuments[documentIndex] = updatedDocument;
    
    this.saveDocuments(updatedDocuments);
    
    return updatedDocument;
  },

  /**
   * Delete a document
   * @param id Document ID
   * @returns Success status
   */
  async deleteDocument(id: number): Promise<boolean> {
    await simulateDelay(300);
    
    const documents = this.getStoredDocuments();
    const filteredDocuments = documents.filter(doc => doc.id !== id);
    
    if (filteredDocuments.length === documents.length) {
      throw new Error(`Document with ID ${id} not found`);
    }
    
    this.saveDocuments(filteredDocuments);
    
    return true;
  }
};
