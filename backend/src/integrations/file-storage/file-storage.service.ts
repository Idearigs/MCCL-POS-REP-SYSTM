import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';
import { Readable } from 'stream';

export interface FileUploadResult {
  success: boolean;
  fileUrl: string;
  fileId?: string;
  fileName: string;
  size: number;
  uploadMethod: 'google-drive' | 'local' | 'error';
  error?: string;
}

export interface FileUploadOptions {
  fileName: string;
  buffer: Buffer;
  mimeType: string;
  category: 'repair-images' | 'customer-documents' | 'product-images' | 'receipts';
  metadata?: Record<string, any>;
}

@Injectable()
export class FileStorageService {
  private readonly logger = new Logger(FileStorageService.name);
  private driveClient: any = null;
  private isGoogleDriveAvailable = false;
  private uploadDirectory: string;

  constructor(private configService: ConfigService) {
    this.uploadDirectory = path.join(process.cwd(), 'uploads');
    this.initializeStorageSystems();
  }

  private async initializeStorageSystems() {
    // Initialize local storage directory
    this.ensureUploadDirectory();
    
    // Try to initialize Google Drive
    await this.initializeGoogleDrive();
  }

  private ensureUploadDirectory() {
    try {
      if (!fs.existsSync(this.uploadDirectory)) {
        fs.mkdirSync(this.uploadDirectory, { recursive: true });
      }
      
      // Create category subdirectories
      const categories = ['repair-images', 'customer-documents', 'product-images', 'receipts'];
      categories.forEach(category => {
        const categoryPath = path.join(this.uploadDirectory, category);
        if (!fs.existsSync(categoryPath)) {
          fs.mkdirSync(categoryPath, { recursive: true });
        }
      });
      
      this.logger.log('✅ Local upload directories initialized');
    } catch (error) {
      this.logger.error('❌ Failed to initialize upload directories:', error.message);
    }
  }

  private async initializeGoogleDrive() {
    // Google Drive temporarily disabled - waiting for client Shared Drive setup
    this.logger.warn('⚠️ Google Drive integration temporarily disabled. Using local storage only.');
    this.logger.log('📋 Reason: Waiting for client to complete Shared Drive setup');
    this.logger.log('📁 All files will be stored locally until Google Drive is re-enabled');
    this.isGoogleDriveAvailable = false;
    
    // Uncomment below code once Shared Drive is configured by client
    /*
    try {
      const clientEmail = this.configService.get('GOOGLE_DRIVE_CLIENT_EMAIL');
      const privateKey = this.configService.get('GOOGLE_DRIVE_PRIVATE_KEY');
      const projectId = this.configService.get('GOOGLE_DRIVE_PROJECT_ID');

      if (!clientEmail || !privateKey || !projectId) {
        this.logger.warn('⚠️ Google Drive credentials not configured. Using local storage only.');
        return;
      }

      // Create JWT client with broader permissions
      const auth = new google.auth.JWT({
        email: clientEmail,
        key: privateKey.replace(/\\n/g, '\n'),
        scopes: [
          'https://www.googleapis.com/auth/drive',
          'https://www.googleapis.com/auth/drive.file',
          'https://www.googleapis.com/auth/drive.metadata'
        ]
      });

      this.driveClient = google.drive({ version: 'v3', auth });
      
      // Test basic authentication
      await this.driveClient.about.get({ fields: 'user' });
      
      this.isGoogleDriveAvailable = true;
      this.logger.log('✅ Google Drive integration initialized');
      
    } catch (error) {
      this.logger.warn(`⚠️ Google Drive initialization failed: ${error.message}`);
      this.logger.log('📁 Falling back to local storage only');
      this.isGoogleDriveAvailable = false;
    }
    */
  }

  /**
   * Upload file with multiple strategies
   */
  async uploadFile(options: FileUploadOptions): Promise<FileUploadResult> {
    const { fileName, buffer, mimeType, category, metadata } = options;
    
    this.logger.debug(`📤 Starting file upload: ${fileName} (${buffer.length} bytes)`);

    // Strategy 1: Try Google Drive first (if available)
    if (this.isGoogleDriveAvailable) {
      try {
        const driveResult = await this.uploadToGoogleDrive(options);
        if (driveResult.success) {
          this.logger.log(`✅ Google Drive upload successful: ${fileName}`);
          return driveResult;
        }
      } catch (error) {
        this.logger.warn(`⚠️ Google Drive upload failed: ${error.message}`);
      }
    }

    // Strategy 2: Fallback to local storage
    try {
      const localResult = await this.uploadToLocal(options);
      this.logger.log(`✅ Local storage upload successful: ${fileName}`);
      return localResult;
    } catch (error) {
      this.logger.error(`❌ All upload strategies failed for: ${fileName}`);
      return {
        success: false,
        fileUrl: '',
        fileName,
        size: buffer.length,
        uploadMethod: 'error',
        error: `Upload failed: ${error.message}`
      };
    }
  }

  /**
   * Strategy 1: Upload to Google Shared Drive with proper support
   */
  private async uploadToGoogleDrive(options: FileUploadOptions): Promise<FileUploadResult> {
    const { fileName, buffer, mimeType, category, metadata } = options;
    
    try {
      // Create a unique filename to avoid conflicts
      const timestamp = Date.now();
      const uniqueFileName = `${timestamp}-${fileName}`;
      
      const fileMetadata: any = {
        name: uniqueFileName,
        description: `MPS Jewelry System - ${category} - ${metadata?.description || 'File upload'}`,
      };

      // Get the appropriate folder ID based on category
      const folderId = this.getSharedDriveFolderId(category);
      
      if (folderId) {
        try {
          // Test if we can access the Shared Drive folder
          await this.driveClient.files.get({ 
            fileId: folderId,
            supportsAllDrives: true
          });
          fileMetadata.parents = [folderId];
          this.logger.debug(`Uploading to Shared Drive folder: ${category} (${folderId})`);
        } catch (folderError) {
          this.logger.warn(`Cannot access Shared Drive folder ${category}: ${folderError.message}`);
          throw new Error(`Shared Drive folder not accessible: ${category}`);
        }
      } else {
        this.logger.warn(`No Shared Drive folder configured for category: ${category}`);
        throw new Error(`No Shared Drive folder configured for category: ${category}`);
      }

      const media = {
        mimeType,
        body: Readable.from(buffer)
      };

      // Upload to Shared Drive with proper flags
      const response = await this.driveClient.files.create({
        requestBody: fileMetadata,
        media,
        fields: 'id,name,webViewLink,webContentLink,size,parents,driveId',
        supportsAllDrives: true,
        // Note: supportsTeamDrives is deprecated but kept for compatibility
        supportsTeamDrives: true
      });

      const file = response.data;

      // For Shared Drives, files inherit permissions from the drive
      // No need to set individual permissions as they're managed at drive level
      this.logger.debug(`File uploaded to Shared Drive: ${file.id} in drive ${file.driveId}`);

      // Generate accessible URL - for Shared Drive files
      const fileUrl = file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`;

      return {
        success: true,
        fileUrl,
        fileId: file.id,
        fileName: file.name,
        size: parseInt(file.size) || buffer.length,
        uploadMethod: 'google-drive'
      };

    } catch (error) {
      throw new Error(`Google Drive Shared Drive upload failed: ${error.message}`);
    }
  }

  /**
   * Get the appropriate Shared Drive folder ID based on file category
   */
  private getSharedDriveFolderId(category: string): string | null {
    const folderMap = {
      'repair-images': this.configService.get('GOOGLE_SHARED_DRIVE_REPAIRS_FOLDER_ID'),
      'customer-documents': this.configService.get('GOOGLE_SHARED_DRIVE_CUSTOMERS_FOLDER_ID'),
      'product-images': this.configService.get('GOOGLE_SHARED_DRIVE_PRODUCTS_FOLDER_ID'),
      'receipts': this.configService.get('GOOGLE_SHARED_DRIVE_RECEIPTS_FOLDER_ID'),
    };

    return folderMap[category] || null;
  }

  /**
   * Strategy 2: Upload to local storage
   */
  private async uploadToLocal(options: FileUploadOptions): Promise<FileUploadResult> {
    const { fileName, buffer, category, metadata } = options;
    
    try {
      const timestamp = Date.now();
      const uniqueFileName = `${timestamp}-${fileName}`;
      const categoryPath = path.join(this.uploadDirectory, category);
      const filePath = path.join(categoryPath, uniqueFileName);

      // Write file to disk
      await fs.promises.writeFile(filePath, buffer);

      // Create accessible URL (assuming server serves static files)
      const port = this.configService.get('PORT', 3002);
      const baseUrl = `http://localhost:${port}`;
      const fileUrl = `${baseUrl}/uploads/${category}/${uniqueFileName}`;

      // Save metadata if provided
      if (metadata) {
        const metadataPath = filePath + '.meta.json';
        await fs.promises.writeFile(metadataPath, JSON.stringify({
          ...metadata,
          uploadedAt: new Date().toISOString(),
          originalFileName: fileName,
          fileSize: buffer.length
        }));
      }

      return {
        success: true,
        fileUrl,
        fileName: uniqueFileName,
        size: buffer.length,
        uploadMethod: 'local'
      };

    } catch (error) {
      throw new Error(`Local storage failed: ${error.message}`);
    }
  }

  /**
   * Get upload status and available methods
   */
  getStorageStatus() {
    return {
      googleDriveAvailable: this.isGoogleDriveAvailable,
      localStorageAvailable: fs.existsSync(this.uploadDirectory),
      preferredMethod: this.isGoogleDriveAvailable ? 'google-drive' : 'local'
    };
  }

  /**
   * Delete file from all storage locations
   */
  async deleteFile(fileId: string, uploadMethod: 'google-drive' | 'local'): Promise<boolean> {
    try {
      if (uploadMethod === 'google-drive' && this.isGoogleDriveAvailable) {
        await this.driveClient.files.delete({ 
          fileId,
          supportsAllDrives: true,
          supportsTeamDrives: true
        });
        this.logger.log(`✅ File deleted from Google Shared Drive: ${fileId}`);
        return true;
      }

      if (uploadMethod === 'local') {
        // For local files, fileId is actually the file path
        if (fs.existsSync(fileId)) {
          await fs.promises.unlink(fileId);
          this.logger.log(`✅ File deleted from local storage: ${fileId}`);
          return true;
        }
      }

      return false;
    } catch (error) {
      this.logger.error(`❌ Failed to delete file: ${error.message}`);
      return false;
    }
  }

  /**
   * Test all storage methods
   */
  async testStorageMethods(): Promise<Record<string, any>> {
    const results = {
      googleDrive: { available: false, error: null },
      localStorage: { available: false, error: null }
    };

    // Test Google Drive
    if (this.isGoogleDriveAvailable) {
      try {
        const testBuffer = Buffer.from('Test file content');
        const testResult = await this.uploadToGoogleDrive({
          fileName: 'test-connection.txt',
          buffer: testBuffer,
          mimeType: 'text/plain',
          category: 'repair-images',
          metadata: { test: true }
        });
        
        if (testResult.success) {
          results.googleDrive.available = true;
          // Clean up test file
          await this.deleteFile(testResult.fileId!, 'google-drive');
        }
      } catch (error) {
        results.googleDrive.error = error.message;
      }
    }

    // Test local storage
    try {
      const testBuffer = Buffer.from('Test file content');
      const testResult = await this.uploadToLocal({
        fileName: 'test-connection.txt',
        buffer: testBuffer,
        mimeType: 'text/plain',
        category: 'repair-images',
        metadata: { test: true }
      });
      
      if (testResult.success) {
        results.localStorage.available = true;
        // Clean up test file
        const filePath = path.join(this.uploadDirectory, 'repair-images', testResult.fileName);
        if (fs.existsSync(filePath)) {
          await fs.promises.unlink(filePath);
        }
      }
    } catch (error) {
      results.localStorage.error = error.message;
    }

    return results;
  }
}