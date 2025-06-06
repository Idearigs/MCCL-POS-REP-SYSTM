import React from 'react';
import { CustomerDocument } from '../../types/customerDocument';
import { formatDate } from '../../utils/formatters';

interface DocumentCardProps {
  document: CustomerDocument;
  onEdit: (document: CustomerDocument) => void;
  onDelete: (document: CustomerDocument) => void;
}

/**
 * Component to display a customer document as a card
 */
export const DocumentCard: React.FC<DocumentCardProps> = ({ 
  document, 
  onEdit, 
  onDelete 
}) => {
  // Get file extension for icon selection
  const getFileIcon = (fileName: string, fileType: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    if (fileType.includes('pdf')) {
      return 'file-pdf';
    } else if (fileType.includes('word') || extension === 'doc' || extension === 'docx') {
      return 'file-word';
    } else if (fileType.includes('excel') || extension === 'xls' || extension === 'xlsx') {
      return 'file-excel';
    } else if (fileType.includes('image') || ['jpg', 'jpeg', 'png', 'gif'].includes(extension || '')) {
      return 'file-image';
    } else {
      return 'file';
    }
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Get document type label
  const getDocumentTypeLabel = (type: CustomerDocument['document_type']) => {
    const types = {
      contract: 'Contract',
      receipt: 'Receipt',
      repair: 'Repair',
      other: 'Other'
    };
    return types[type] || 'Document';
  };

  const fileIcon = getFileIcon(document.file_name, document.file_type);
  const fileSize = formatFileSize(document.file_size);
  const documentType = getDocumentTypeLabel(document.document_type);
  const createdAt = document.created_at ? formatDate(new Date(document.created_at)) : 'Unknown';

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <i className={`fas fa-${fileIcon} text-blue-600 text-xl`}></i>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 truncate max-w-[180px]" title={document.file_name}>
                {document.file_name}
              </h3>
              <p className="text-sm text-gray-500">{fileSize}</p>
            </div>
          </div>
          <span className={`px-2 py-1 text-xs rounded-full ${
            document.document_type === 'contract' ? 'bg-purple-100 text-purple-800' :
            document.document_type === 'receipt' ? 'bg-green-100 text-green-800' :
            document.document_type === 'repair' ? 'bg-orange-100 text-orange-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {documentType}
          </span>
        </div>
        
        {document.notes && (
          <p className="mt-2 text-sm text-gray-600 line-clamp-2" title={document.notes}>
            {document.notes}
          </p>
        )}
        
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
          <span className="text-xs text-gray-500">{createdAt}</span>
          
          <div className="flex space-x-2">
            <a 
              href={document.drive_view_link} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              View
            </a>
            <button 
              onClick={() => onEdit(document)}
              className="text-gray-600 hover:text-gray-800 text-sm font-medium"
            >
              Edit
            </button>
            <button 
              onClick={() => onDelete(document)}
              className="text-red-600 hover:text-red-800 text-sm font-medium"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentCard;
