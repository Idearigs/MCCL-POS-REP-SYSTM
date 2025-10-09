// Google Drive Service for MPS Jewelry System
import { apiClient } from './apiClient';

export interface GoogleDriveUploadResponse {
  imageUrls: string[];
  success: boolean;
  message?: string;
}

export interface FileUploadData {
  description?: string;
  repairId?: string;
}

class GoogleDriveService {
  // Upload repair images to Google Drive
  async uploadRepairImages(files: File[], data?: FileUploadData): Promise<GoogleDriveUploadResponse> {
    try {
      const formData = new FormData();
      
      // Append all files
      files.forEach((file, index) => {
        formData.append('file', file);
      });
      
      // Add metadata
      if (data?.description) {
        formData.append('description', data.description);
      }
      if (data?.repairId) {
        formData.append('repairId', data.repairId);
      }

      const response = await apiClient.uploadFile<GoogleDriveUploadResponse>(
        '/drive/upload/repair-image',
        files[0], // Main file
        { additionalFiles: files.slice(1) } // Additional files if any
      );

      return response;
    } catch (error) {
      console.error('Failed to upload repair images:', error);
      throw error;
    }
  }

  // Upload customer documents
  async uploadCustomerDocuments(files: File[], customerId: string, description?: string): Promise<GoogleDriveUploadResponse> {
    try {
      const formData = new FormData();
      
      files.forEach((file, index) => {
        formData.append('file', file);
      });
      
      formData.append('customerId', customerId);
      if (description) {
        formData.append('description', description);
      }

      return await apiClient.uploadFile<GoogleDriveUploadResponse>(
        '/drive/upload/customer-document',
        files[0]
      );
    } catch (error) {
      console.error('Failed to upload customer documents:', error);
      throw error;
    }
  }

  // Upload product images
  async uploadProductImages(files: File[], productId: string, description?: string): Promise<GoogleDriveUploadResponse> {
    try {
      const formData = new FormData();
      
      files.forEach((file, index) => {
        formData.append('file', file);
      });
      
      formData.append('productId', productId);
      if (description) {
        formData.append('description', description);
      }

      return await apiClient.uploadFile<GoogleDriveUploadResponse>(
        '/drive/upload/product-image',
        files[0]
      );
    } catch (error) {
      console.error('Failed to upload product images:', error);
      throw error;
    }
  }

  // Upload invoice/receipt
  async uploadReceipt(file: File, saleId: string, description?: string): Promise<GoogleDriveUploadResponse> {
    try {
      return await apiClient.uploadFile<GoogleDriveUploadResponse>(
        '/drive/upload/receipt',
        file,
        { saleId, description }
      );
    } catch (error) {
      console.error('Failed to upload receipt:', error);
      throw error;
    }
  }

  // Upload invoice
  async uploadInvoice(file: File, invoiceData: { customerId?: string; saleId?: string; description?: string }): Promise<GoogleDriveUploadResponse> {
    try {
      return await apiClient.uploadFile<GoogleDriveUploadResponse>(
        '/drive/upload/invoice',
        file,
        invoiceData
      );
    } catch (error) {
      console.error('Failed to upload invoice:', error);
      throw error;
    }
  }

  // Get file URL (for display)
  getFileUrl(fileId: string): string {
    return `https://drive.google.com/file/d/${fileId}/view`;
  }

  // Get direct image URL for thumbnails (if file is publicly accessible)
  getThumbnailUrl(fileId: string): string {
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w300-h300`;
  }
}

export const googleDriveService = new GoogleDriveService();
export default googleDriveService;