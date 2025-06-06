import React, { useState } from 'react';
import { CustomerDocument } from '../../types/customerDocument';
import DocumentCard from './DocumentCard';
import DocumentUploadForm from './DocumentUploadForm';
import useCustomerDocuments from '../../hooks/useCustomerDocuments';
import { useToast } from '../../components/ui/use-toast';

interface CustomerDocumentsProps {
  customerId: number;
  customerName: string;
}

/**
 * Component to display and manage customer documents
 */
export const CustomerDocuments: React.FC<CustomerDocumentsProps> = ({ 
  customerId,
  customerName 
}) => {
  const { 
    documents, 
    loading, 
    uploadDocument, 
    updateDocument, 
    deleteDocument 
  } = useCustomerDocuments(customerId);
  
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [editingDocument, setEditingDocument] = useState<CustomerDocument | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editDocumentType, setEditDocumentType] = useState<CustomerDocument['document_type']>('other');
  const toast = useToast();

  // Handle document upload
  const handleUpload = async (customerId: number, file: File, documentType: CustomerDocument['document_type'], notes?: string) => {
    setIsUploading(true);
    try {
      await uploadDocument(customerId, file, documentType, notes);
      setShowUploadForm(false);
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsUploading(false);
    }
  };

  // Handle document edit
  const handleEdit = (document: CustomerDocument) => {
    setEditingDocument(document);
    setEditNotes(document.notes || '');
    setEditDocumentType(document.document_type);
  };

  // Save document edits
  const handleSaveEdit = async () => {
    if (!editingDocument) return;
    
    try {
      await updateDocument(editingDocument.id as number, {
        documentType: editDocumentType,
        notes: editNotes
      });
      setEditingDocument(null);
    } catch (error) {
      console.error('Update failed:', error);
    }
  };

  // Handle document delete with confirmation
  const handleDelete = async (document: CustomerDocument) => {
    if (window.confirm(`Are you sure you want to delete the document "${document.file_name}"? This action cannot be undone.`)) {
      try {
        await deleteDocument(document.id as number);
      } catch (error) {
        console.error('Delete failed:', error);
      }
    }
  };

  return (
    <div className="mt-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">
          Documents for {customerName}
        </h2>
        
        {!showUploadForm && (
          <button
            onClick={() => setShowUploadForm(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <i className="fas fa-plus mr-2"></i>
            Upload Document
          </button>
        )}
      </div>
      
      {/* Upload form */}
      {showUploadForm && (
        <div className="mb-6">
          <DocumentUploadForm
            customerId={customerId}
            onUpload={handleUpload}
            onCancel={() => setShowUploadForm(false)}
            isUploading={isUploading}
          />
        </div>
      )}
      
      {/* Edit document modal */}
      {editingDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Edit Document</h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-500 mb-1">File Name</p>
              <p className="font-medium">{editingDocument.file_name}</p>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="editDocumentType">
                Document Type
              </label>
              <select
                id="editDocumentType"
                value={editDocumentType}
                onChange={(e) => setEditDocumentType(e.target.value as CustomerDocument['document_type'])}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="contract">Contract</option>
                <option value="receipt">Receipt</option>
                <option value="repair">Repair Document</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="editNotes">
                Notes
              </label>
              <textarea
                id="editNotes"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Add notes about this document"
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setEditingDocument(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Documents list */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : documents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((document) => (
            <DocumentCard
              key={document.id}
              document={document}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <div className="text-gray-400 mb-3">
            <i className="fas fa-file-alt text-4xl"></i>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No documents found</h3>
          <p className="text-gray-500 mb-4">
            This customer doesn't have any documents yet.
          </p>
          {!showUploadForm && (
            <button
              onClick={() => setShowUploadForm(true)}
              className="px-4 py-2 text-sm font-medium text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Upload First Document
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default CustomerDocuments;
