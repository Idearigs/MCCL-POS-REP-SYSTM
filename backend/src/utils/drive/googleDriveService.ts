import { google } from 'googleapis';
import { Readable } from 'stream';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Google Drive Service for file operations
 * This service handles uploading, downloading, and managing files in Google Drive
 */
export class GoogleDriveService {
  private drive;
  private folderId: string | null = null;

  constructor() {
    // Initialize the Google Drive API client
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/drive'],
    });

    this.drive = google.drive({ version: 'v3', auth });
  }

  /**
   * Initialize the service by ensuring the root folder exists
   * @param folderName Name of the root folder to use
   */
  async initialize(folderName: string = 'MCCL_POS_SYSTEM'): Promise<void> {
    try {
      // Check if the folder already exists
      const response = await this.drive.files.list({
        q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id, name)',
      });

      if (response.data.files && response.data.files.length > 0) {
        // Folder exists, use its ID
        this.folderId = response.data.files[0].id || null;
        console.log(`Using existing folder: ${folderName} with ID: ${this.folderId}`);
      } else {
        // Create the folder
        const fileMetadata = {
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
        };

        const folder = await this.drive.files.create({
          requestBody: fileMetadata,
          fields: 'id',
        });

        this.folderId = folder.data.id || null;
        console.log(`Created new folder: ${folderName} with ID: ${this.folderId}`);
      }
    } catch (error) {
      console.error('Error initializing Google Drive service:', error);
      throw new Error('Failed to initialize Google Drive service');
    }
  }

  /**
   * Create a subfolder within a parent folder or the root folder
   * @param folderName Name of the subfolder
   * @param parentFolderId Optional parent folder ID (defaults to root folder)
   * @returns ID of the created folder
   */
  async createFolder(folderName: string, parentFolderId?: string): Promise<string> {
    try {
      if (!this.folderId && !parentFolderId) {
        await this.initialize();
      }

      const targetParentId = parentFolderId || this.folderId;
      if (!targetParentId) {
        throw new Error('No parent folder ID available');
      }

      // Check if folder already exists in the parent folder
      const response = await this.drive.files.list({
        q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and '${targetParentId}' in parents and trashed=false`,
        fields: 'files(id, name)',
      });

      if (response.data.files && response.data.files.length > 0) {
        return response.data.files[0].id || '';
      }

      // Create new folder
      const fileMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [targetParentId],
      };

      const folder = await this.drive.files.create({
        requestBody: fileMetadata,
        fields: 'id',
      });

      return folder.data.id || '';
    } catch (error) {
      console.error('Error creating folder:', error);
      throw new Error('Failed to create folder in Google Drive');
    }
  }

  /**
   * Upload a file to Google Drive
   * @param fileBuffer Buffer containing the file data
   * @param fileName Name to give the file
   * @param mimeType MIME type of the file
   * @param folderId Optional folder ID to upload to (defaults to root folder)
   * @returns Object with file ID and web view link
   */
  async uploadFile(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
    folderId?: string
  ): Promise<{ id: string; webViewLink: string }> {
    try {
      if (!this.folderId && !folderId) {
        await this.initialize();
      }

      const targetFolderId = folderId || this.folderId;

      // Generate a unique filename to avoid duplicates
      const uniqueFileName = `${path.parse(fileName).name}_${uuidv4()}${path.extname(fileName)}`;

      const fileMetadata = {
        name: uniqueFileName,
        parents: [targetFolderId as string],
      };

      const media = {
        mimeType,
        body: Readable.from(fileBuffer),
      };

      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, webViewLink',
      });

      // Make the file publicly accessible (read-only)
      await this.drive.permissions.create({
        fileId: response.data.id as string,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });

      // Get the updated file with webViewLink
      const file = await this.drive.files.get({
        fileId: response.data.id as string,
        fields: 'id, webViewLink',
      });

      return {
        id: file.data.id as string,
        webViewLink: file.data.webViewLink as string,
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      throw new Error('Failed to upload file to Google Drive');
    }
  }

  /**
   * Upload a file from a local path
   * @param filePath Path to the file on the local filesystem
   * @param mimeType MIME type of the file
   * @param folderId Optional folder ID to upload to
   * @returns Object with file ID and web view link
   */
  async uploadFileFromPath(
    filePath: string,
    mimeType: string,
    folderId?: string
  ): Promise<{ id: string; webViewLink: string }> {
    try {
      const fileBuffer = fs.readFileSync(filePath);
      const fileName = path.basename(filePath);
      return this.uploadFile(fileBuffer, fileName, mimeType, folderId);
    } catch (error) {
      console.error('Error uploading file from path:', error);
      throw new Error('Failed to upload file from path to Google Drive');
    }
  }

  /**
   * Download a file from Google Drive
   * @param fileId ID of the file to download
   * @returns Buffer containing the file data
   */
  async downloadFile(fileId: string): Promise<Buffer> {
    try {
      const response = await this.drive.files.get(
        {
          fileId,
          alt: 'media',
        },
        { responseType: 'arraybuffer' }
      );

      return Buffer.from(response.data as ArrayBuffer);
    } catch (error) {
      console.error('Error downloading file:', error);
      throw new Error('Failed to download file from Google Drive');
    }
  }

  /**
   * Delete a file from Google Drive
   * @param fileId ID of the file to delete
   * @returns True if deletion was successful
   */
  async deleteFile(fileId: string): Promise<boolean> {
    try {
      await this.drive.files.delete({
        fileId,
      });
      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      throw new Error('Failed to delete file from Google Drive');
    }
  }

  /**
   * Get metadata for a file
   * @param fileId ID of the file
   * @returns File metadata
   */
  async getFileMetadata(fileId: string): Promise<any> {
    try {
      const response = await this.drive.files.get({
        fileId,
        fields: 'id, name, mimeType, size, createdTime, modifiedTime, webViewLink, webContentLink',
      });
      return response.data;
    } catch (error) {
      console.error('Error getting file metadata:', error);
      throw new Error('Failed to get file metadata from Google Drive');
    }
  }

  /**
   * List files in a folder
   * @param folderId ID of the folder (defaults to root folder)
   * @returns Array of file metadata
   */
  async listFiles(folderId?: string): Promise<any[]> {
    try {
      const targetFolderId = folderId || this.folderId;
      
      if (!targetFolderId) {
        await this.initialize();
      }

      const response = await this.drive.files.list({
        q: `'${targetFolderId}' in parents and trashed=false`,
        fields: 'files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink)',
      });

      return response.data.files || [];
    } catch (error) {
      console.error('Error listing files:', error);
      throw new Error('Failed to list files from Google Drive');
    }
  }
}

// Export a singleton instance
export const driveService = new GoogleDriveService();
