import axios from 'axios';
import { CustomerDocument } from '../types/customerDocument';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

/**
 * Service for customer document API operations
 */
export const customerDocumentService = {
  /**
   * Get all documents for a customer
   * @param customerId Customer ID
   * @returns Array of customer documents
   */
  async getDocumentsByCustomerId(customerId: number): Promise<CustomerDocument[]> {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_URL}/customers/${customerId}/documents`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  /**
   * Get a document by ID
   * @param id Document ID
   * @returns Customer document
   */
  async getDocumentById(id: number): Promise<CustomerDocument> {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_URL}/documents/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  /**
   * Upload a document for a customer
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
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', documentType);
    if (notes) formData.append('notes', notes);

    const response = await axios.post(
      `${API_URL}/customers/${customerId}/documents`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    return response.data;
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
    const token = localStorage.getItem('token');
    const response = await axios.put(
      `${API_URL}/documents/${id}`,
      data,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    return response.data;
  },

  /**
   * Delete a document
   * @param id Document ID
   * @returns Success status
   */
  async deleteDocument(id: number): Promise<boolean> {
    const token = localStorage.getItem('token');
    const response = await axios.delete(`${API_URL}/documents/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.success;
  }
};
