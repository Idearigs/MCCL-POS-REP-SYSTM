import { useState, useEffect, useCallback } from 'react';
import { CustomerDocument } from '../types/customerDocument';
import { customerDocumentService } from '../services/customerDocumentService';
import { useToast } from '../components/ui/use-toast';

/**
 * Custom hook for managing customer documents
 */
export const useCustomerDocuments = (customerId?: number) => {
  const [documents, setDocuments] = useState<CustomerDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  /**
   * Fetch documents for a customer
   */
  const fetchDocuments = useCallback(async (id?: number) => {
    if (!id && !customerId) return;
    
    const targetId = id || customerId;
    setLoading(true);
    setError(null);
    
    try {
      const data = await customerDocumentService.getDocumentsByCustomerId(targetId as number);
      setDocuments(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch documents');
      toast.error('Error', 'Failed to fetch customer documents');
    } finally {
      setLoading(false);
    }
  }, [customerId, toast]);

  /**
   * Upload a document
   */
  const uploadDocument = useCallback(async (
    id: number,
    file: File,
    documentType: CustomerDocument['document_type'],
    notes?: string
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      const newDocument = await customerDocumentService.uploadDocument(
        id,
        file,
        documentType,
        notes
      );
      
      setDocuments(prev => [...prev, newDocument]);
      toast.success('Success', 'Document uploaded successfully');
      return newDocument;
    } catch (err: any) {
      setError(err.message || 'Failed to upload document');
      toast.error('Error', 'Failed to upload document');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  /**
   * Update a document's metadata
   */
  const updateDocument = useCallback(async (
    id: number,
    data: { documentType?: CustomerDocument['document_type']; notes?: string }
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      const updatedDocument = await customerDocumentService.updateDocument(id, data);
      
      setDocuments(prev => 
        prev.map(doc => 
          doc.id === id ? updatedDocument : doc
        )
      );
      
      toast.success('Success', 'Document updated successfully');
      return updatedDocument;
    } catch (err: any) {
      setError(err.message || 'Failed to update document');
      toast.error('Error', 'Failed to update document');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  /**
   * Delete a document
   */
  const deleteDocument = useCallback(async (id: number) => {
    setLoading(true);
    setError(null);
    
    try {
      const success = await customerDocumentService.deleteDocument(id);
      
      if (success) {
        setDocuments(prev => prev.filter(doc => doc.id !== id));
        toast.success('Success', 'Document deleted successfully');
      }
      
      return success;
    } catch (err: any) {
      setError(err.message || 'Failed to delete document');
      toast.error('Error', 'Failed to delete document');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Load documents when customerId changes
  useEffect(() => {
    if (customerId) {
      fetchDocuments(customerId);
    }
  }, [customerId, fetchDocuments]);

  return {
    documents,
    loading,
    error,
    fetchDocuments,
    uploadDocument,
    updateDocument,
    deleteDocument
  };
};

export default useCustomerDocuments;
