import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import { Readable } from 'stream';
import * as path from 'path';

export interface DriveFile {
  id: string;
  name: string;
  webViewLink: string;
  webContentLink: string;
  mimeType: string;
  size: string;
  createdTime: string;
  modifiedTime: string;
}

export interface UploadFileOptions {
  fileName: string;
  mimeType: string;
  buffer: Buffer;
  folderId?: string;
  description?: string;
}

@Injectable()
export class GoogleDriveService {
  private readonly logger = new Logger(GoogleDriveService.name);
  private drive: any;
  private isConfigured = false;

  constructor(private configService: ConfigService) {
    this.initializeGoogleDrive();
  }

  private async initializeGoogleDrive() {
    try {
      const clientEmail = this.configService.get('GOOGLE_DRIVE_CLIENT_EMAIL');
      const privateKey = this.configService.get('GOOGLE_DRIVE_PRIVATE_KEY');
      const projectId = this.configService.get('GOOGLE_DRIVE_PROJECT_ID');

      if (!clientEmail || !privateKey || !projectId) {
        this.logger.warn(
          '⚠️  Google Drive credentials not configured. File upload will be disabled.',
        );
        return;
      }

      // Create JWT client
      const auth = new google.auth.JWT({
        email: clientEmail,
        key: privateKey.replace(/\\n/g, '\n'),
        scopes: ['https://www.googleapis.com/auth/drive.file'],
      });

      // Initialize Drive API
      this.drive = google.drive({ version: 'v3', auth });

      // Test connection
      await this.drive.about.get({ fields: 'user' });

      this.isConfigured = true;
      this.logger.log('✅ Google Drive service initialized successfully');
    } catch (error) {
      this.logger.error('❌ Failed to initialize Google Drive:', error.message);
      this.isConfigured = false;
    }
  }

  /**
   * Check if Google Drive is properly configured
   */
  isAvailable(): boolean {
    return this.isConfigured;
  }

  /**
   * Upload file to Google Drive
   */
  async uploadFile(options: UploadFileOptions): Promise<DriveFile> {
    if (!this.isConfigured) {
      throw new BadRequestException('Google Drive not configured');
    }

    try {
      const { fileName, mimeType, buffer, folderId, description } = options;

      // Validate file
      this.validateFile(fileName, buffer, mimeType);

      // Create readable stream from buffer
      const stream = Readable.from(buffer);

      const fileMetadata: any = {
        name: fileName,
        description: description || `Uploaded by MPS Jewelry SaaS`,
      };

      // Set parent folder if provided
      if (folderId) {
        fileMetadata.parents = [folderId];
      } else {
        const parentFolderId = this.configService.get(
          'GOOGLE_DRIVE_PARENT_FOLDER_ID',
        );
        if (parentFolderId) {
          fileMetadata.parents = [parentFolderId];
        }
      }

      const media = {
        mimeType,
        body: stream,
      };

      this.logger.debug(`Uploading file to Google Drive: ${fileName}`);

      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        media,
        fields:
          'id,name,webViewLink,webContentLink,mimeType,size,createdTime,modifiedTime',
      });

      const file = response.data;

      // Make file accessible
      await this.makeFilePublic(file.id);

      this.logger.log(
        `✅ File uploaded successfully: ${fileName} (ID: ${file.id})`,
      );

      return {
        id: file.id,
        name: file.name,
        webViewLink: file.webViewLink,
        webContentLink: file.webContentLink,
        mimeType: file.mimeType,
        size: file.size,
        createdTime: file.createdTime,
        modifiedTime: file.modifiedTime,
      };
    } catch (error) {
      this.logger.error(
        `Failed to upload file ${options.fileName}:`,
        error.message,
      );
      throw new BadRequestException(`File upload failed: ${error.message}`);
    }
  }

  /**
   * Delete file from Google Drive
   */
  async deleteFile(fileId: string): Promise<void> {
    if (!this.isConfigured) {
      throw new BadRequestException('Google Drive not configured');
    }

    try {
      await this.drive.files.delete({ fileId });
      this.logger.log(`✅ File deleted successfully: ${fileId}`);
    } catch (error) {
      this.logger.error(`Failed to delete file ${fileId}:`, error.message);
      throw new BadRequestException(`File deletion failed: ${error.message}`);
    }
  }

  /**
   * Get file information
   */
  async getFile(fileId: string): Promise<DriveFile> {
    if (!this.isConfigured) {
      throw new BadRequestException('Google Drive not configured');
    }

    try {
      const response = await this.drive.files.get({
        fileId,
        fields:
          'id,name,webViewLink,webContentLink,mimeType,size,createdTime,modifiedTime',
      });

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get file ${fileId}:`, error.message);
      throw new BadRequestException(`File retrieval failed: ${error.message}`);
    }
  }

  /**
   * Create folder in Google Drive
   */
  async createFolder(name: string, parentId?: string): Promise<string> {
    if (!this.isConfigured) {
      throw new BadRequestException('Google Drive not configured');
    }

    try {
      const fileMetadata: any = {
        name,
        mimeType: 'application/vnd.google-apps.folder',
      };

      if (parentId) {
        fileMetadata.parents = [parentId];
      }

      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        fields: 'id',
      });

      this.logger.log(
        `✅ Folder created successfully: ${name} (ID: ${response.data.id})`,
      );
      return response.data.id;
    } catch (error) {
      this.logger.error(`Failed to create folder ${name}:`, error.message);
      throw new BadRequestException(`Folder creation failed: ${error.message}`);
    }
  }

  /**
   * List files in a folder
   */
  async listFiles(
    folderId?: string,
    pageSize: number = 100,
  ): Promise<DriveFile[]> {
    if (!this.isConfigured) {
      throw new BadRequestException('Google Drive not configured');
    }

    try {
      const query = folderId ? `'${folderId}' in parents` : undefined;

      const response = await this.drive.files.list({
        q: query,
        pageSize,
        fields:
          'files(id,name,webViewLink,webContentLink,mimeType,size,createdTime,modifiedTime)',
        orderBy: 'createdTime desc',
      });

      return response.data.files || [];
    } catch (error) {
      this.logger.error('Failed to list files:', error.message);
      throw new BadRequestException(`File listing failed: ${error.message}`);
    }
  }

  /**
   * Make file publicly accessible
   */
  private async makeFilePublic(fileId: string): Promise<void> {
    try {
      await this.drive.permissions.create({
        fileId,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });
    } catch (error) {
      this.logger.warn(`Failed to make file public ${fileId}:`, error.message);
    }
  }

  /**
   * Validate uploaded file
   */
  private validateFile(
    fileName: string,
    buffer: Buffer,
    mimeType: string,
  ): void {
    // Check file size (max 100MB)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (buffer.length > maxSize) {
      throw new BadRequestException('File size exceeds 100MB limit');
    }

    // Check file extension
    const allowedExtensions = [
      '.jpg',
      '.jpeg',
      '.png',
      '.pdf',
      '.doc',
      '.docx',
      '.txt',
    ];
    const extension = path.extname(fileName).toLowerCase();

    if (!allowedExtensions.includes(extension)) {
      throw new BadRequestException(`File type ${extension} not allowed`);
    }

    // Validate MIME type
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];

    if (!allowedMimeTypes.includes(mimeType)) {
      throw new BadRequestException(`MIME type ${mimeType} not allowed`);
    }
  }

  /**
   * Generate shareable link for a file
   */
  async generateShareableLink(fileId: string): Promise<string> {
    if (!this.isConfigured) {
      throw new BadRequestException('Google Drive not configured');
    }

    try {
      const file = await this.getFile(fileId);
      return file.webViewLink;
    } catch (error) {
      this.logger.error(
        `Failed to generate shareable link for ${fileId}:`,
        error.message,
      );
      throw new BadRequestException(`Link generation failed: ${error.message}`);
    }
  }

  /**
   * Create tenant-specific folder structure
   */
  async createTenantFolders(tenantId: string): Promise<{
    mainFolder: string;
    customersFolder: string;
    productsFolder: string;
    repairsFolder: string;
    receiptsFolder: string;
  }> {
    if (!this.isConfigured) {
      throw new BadRequestException('Google Drive not configured');
    }

    try {
      // Create main tenant folder
      const mainFolder = await this.createFolder(`Tenant_${tenantId}`);

      // Create subfolders
      const customersFolder = await this.createFolder('Customers', mainFolder);
      const productsFolder = await this.createFolder('Products', mainFolder);
      const repairsFolder = await this.createFolder('Repairs', mainFolder);
      const receiptsFolder = await this.createFolder('Receipts', mainFolder);

      this.logger.log(`✅ Tenant folder structure created for: ${tenantId}`);

      return {
        mainFolder,
        customersFolder,
        productsFolder,
        repairsFolder,
        receiptsFolder,
      };
    } catch (error) {
      this.logger.error(
        `Failed to create tenant folders for ${tenantId}:`,
        error.message,
      );
      throw new BadRequestException(
        `Tenant folder creation failed: ${error.message}`,
      );
    }
  }
}
