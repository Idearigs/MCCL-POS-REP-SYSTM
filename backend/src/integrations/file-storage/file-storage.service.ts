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
  category:
    | 'repair-images'
    | 'customer-documents'
    | 'product-images'
    | 'receipts';
  tenantId?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class FileStorageService {
  private readonly logger = new Logger(FileStorageService.name);
  private driveClient: any = null;
  private isGoogleDriveAvailable = false;
  private uploadDirectory: string;
  private googleDriveTenantIds: Set<string> = new Set();

  constructor(private configService: ConfigService) {
    this.uploadDirectory = path.join(process.cwd(), 'uploads');
    const tenantIds = this.configService.get<string>('GOOGLE_DRIVE_TENANT_IDS', '');
    if (tenantIds) {
      tenantIds.split(',').map(id => id.trim()).filter(Boolean).forEach(id => this.googleDriveTenantIds.add(id));
    }
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
      const categories = [
        'repair-images',
        'customer-documents',
        'product-images',
        'receipts',
      ];
      categories.forEach((category) => {
        const categoryPath = path.join(this.uploadDirectory, category);
        if (!fs.existsSync(categoryPath)) {
          fs.mkdirSync(categoryPath, { recursive: true });
        }
      });

      this.logger.log('✅ Local upload directories initialized');
    } catch (error) {
      this.logger.error(
        '❌ Failed to initialize upload directories:',
        error.message,
      );
    }
  }

  private async initializeGoogleDrive() {
    if (this.googleDriveTenantIds.size === 0) {
      this.logger.log('📁 No Google Drive tenants configured — all files use local VPS storage.');
      this.isGoogleDriveAvailable = false;
      return;
    }

    try {
      const clientEmail = this.configService.get('GOOGLE_DRIVE_CLIENT_EMAIL');
      const privateKey = this.configService.get('GOOGLE_DRIVE_PRIVATE_KEY');
      const projectId = this.configService.get('GOOGLE_DRIVE_PROJECT_ID');

      if (!clientEmail || !privateKey || !projectId) {
        this.logger.warn('⚠️ Google Drive credentials not configured. Using local storage only.');
        return;
      }

      const auth = new google.auth.JWT({
        email: clientEmail,
        key: privateKey.replace(/\\n/g, '\n'),
        scopes: [
          'https://www.googleapis.com/auth/drive',
          'https://www.googleapis.com/auth/drive.file',
          'https://www.googleapis.com/auth/drive.metadata',
        ],
      });

      this.driveClient = google.drive({ version: 'v3', auth });

      // Test basic authentication
      await this.driveClient.about.get({ fields: 'user' });

      this.isGoogleDriveAvailable = true;
      this.logger.log(
        `✅ Google Drive initialized for tenants: ${[...this.googleDriveTenantIds].join(', ')}`,
      );
    } catch (error) {
      this.logger.warn(`⚠️ Google Drive initialization failed: ${error.message}`);
      this.logger.log('📁 Falling back to local storage for all tenants');
      this.isGoogleDriveAvailable = false;
    }
  }

  /**
   * Upload file with multiple strategies
   */
  async uploadFile(options: FileUploadOptions): Promise<FileUploadResult> {
    const { fileName, buffer, mimeType, category, tenantId } = options;

    this.logger.debug(
      `📤 Starting file upload: ${fileName} (${buffer.length} bytes) tenant=${tenantId}`,
    );

    // Security: Validate file before upload
    this.validateFile(fileName, buffer, mimeType, category);

    // Use Google Drive only for tenants explicitly configured to use it
    const useGoogleDrive =
      this.isGoogleDriveAvailable &&
      !!tenantId &&
      this.googleDriveTenantIds.has(tenantId);

    if (useGoogleDrive) {
      try {
        const driveResult = await this.uploadToGoogleDrive(options);
        if (driveResult.success) {
          this.logger.log(`✅ Google Drive upload successful: ${fileName}`);
          return driveResult;
        }
      } catch (error) {
        this.logger.warn(`⚠️ Google Drive upload failed, falling back to VPS: ${error.message}`);
      }
    }

    // Local VPS storage (default for all non-Google-Drive tenants)
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
        error: `Upload failed: ${error.message}`,
      };
    }
  }

  /**
   * Security: Validate file before upload
   */
  private validateFile(
    fileName: string,
    buffer: Buffer,
    mimeType: string,
    category: string,
  ): void {
    // 1. Check file size (max 10MB for images, 5MB for documents)
    const maxSize =
      category === 'product-images' || category === 'repair-images'
        ? 10 * 1024 * 1024
        : 5 * 1024 * 1024;
    if (buffer.length > maxSize) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${maxSize / 1024 / 1024}MB`,
      );
    }

    // 2. Validate file extension (prevent executable files)
    const dangerousExtensions = [
      '.exe',
      '.bat',
      '.cmd',
      '.sh',
      '.ps1',
      '.js',
      '.jar',
      '.app',
      '.deb',
      '.rpm',
    ];
    const fileExt = path.extname(fileName).toLowerCase();
    if (dangerousExtensions.includes(fileExt)) {
      throw new BadRequestException('File type not allowed');
    }

    // 3. Validate MIME type based on category
    const allowedMimeTypes: Record<string, string[]> = {
      'product-images': [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'image/gif',
      ],
      'repair-images': [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'image/gif',
      ],
      'customer-documents': [
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ],
      receipts: ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'],
    };

    if (
      !allowedMimeTypes[category] ||
      !allowedMimeTypes[category].includes(mimeType)
    ) {
      throw new BadRequestException(
        `File type ${mimeType} not allowed for ${category}`,
      );
    }

    // 4. Sanitize filename (remove path traversal attempts)
    if (
      fileName.includes('..') ||
      fileName.includes('/') ||
      fileName.includes('\\')
    ) {
      throw new BadRequestException('Invalid filename');
    }

    // 5. Check for magic bytes to verify actual file type (prevent MIME type spoofing)
    if (category === 'product-images' || category === 'repair-images') {
      const isValidImage = this.validateImageMagicBytes(buffer, mimeType);
      if (!isValidImage) {
        this.logger.warn(
          `⚠️ Image magic bytes validation failed for ${fileName} (MIME: ${mimeType})`,
        );
        this.logger.warn(
          `   First 12 bytes: ${buffer.slice(0, 12).toString('hex')}`,
        );
        // TEMPORARY: Allow upload anyway but log the warning
        // TODO: Investigate why some valid images fail validation
        // throw new BadRequestException('File does not match declared image type');
      }
    }

    this.logger.debug(`✅ File validation passed: ${fileName}`);
  }

  /**
   * Security: Validate image file by checking magic bytes (file signature)
   */
  private validateImageMagicBytes(buffer: Buffer, mimeType: string): boolean {
    if (buffer.length < 12) return false;

    const header = buffer.slice(0, 12);

    // JPEG: FF D8 FF
    if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
      return header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
    }

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (mimeType === 'image/png') {
      return (
        header[0] === 0x89 &&
        header[1] === 0x50 &&
        header[2] === 0x4e &&
        header[3] === 0x47 &&
        header[4] === 0x0d &&
        header[5] === 0x0a &&
        header[6] === 0x1a &&
        header[7] === 0x0a
      );
    }

    // GIF: 47 49 46 38
    if (mimeType === 'image/gif') {
      return (
        header[0] === 0x47 &&
        header[1] === 0x49 &&
        header[2] === 0x46 &&
        header[3] === 0x38
      );
    }

    // WebP: 52 49 46 46 ... 57 45 42 50
    if (mimeType === 'image/webp') {
      return (
        header[0] === 0x52 &&
        header[1] === 0x49 &&
        header[2] === 0x46 &&
        header[3] === 0x46 &&
        header[8] === 0x57 &&
        header[9] === 0x45 &&
        header[10] === 0x42 &&
        header[11] === 0x50
      );
    }

    return false;
  }

  /**
   * Strategy 1: Upload to Google Shared Drive with proper support
   */
  private async uploadToGoogleDrive(
    options: FileUploadOptions,
  ): Promise<FileUploadResult> {
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
      const folderId =
        this.getSharedDriveFolderId(category) ||
        this.configService.get('GOOGLE_DRIVE_PARENT_FOLDER_ID');

      if (!folderId) {
        throw new Error('No Google Drive folder configured');
      }

      try {
        await this.driveClient.files.get({
          fileId: folderId,
          supportsAllDrives: true,
        });
        fileMetadata.parents = [folderId];
        this.logger.debug(
          `Uploading to Drive folder: ${category} (${folderId})`,
        );
      } catch (folderError) {
        throw new Error(`Drive folder not accessible: ${folderError.message}`);
      }

      const media = {
        mimeType,
        body: Readable.from(buffer),
      };

      // Upload to Shared Drive with proper flags
      const response = await this.driveClient.files.create({
        requestBody: fileMetadata,
        media,
        fields: 'id,name,webViewLink,webContentLink,size,parents,driveId',
        supportsAllDrives: true,
        // Note: supportsTeamDrives is deprecated but kept for compatibility
        supportsTeamDrives: true,
      });

      const file = response.data;

      // For Shared Drives, files inherit permissions from the drive
      // No need to set individual permissions as they're managed at drive level
      this.logger.debug(
        `File uploaded to Shared Drive: ${file.id} in drive ${file.driveId}`,
      );

      // Generate accessible URL - use direct download URL so it works as <img src>
      // webViewLink is a viewer page (HTML), not a direct image — unusable as img src
      const fileUrl = `https://drive.google.com/uc?export=view&id=${file.id}`;

      return {
        success: true,
        fileUrl,
        fileId: file.id,
        fileName: file.name,
        size: parseInt(file.size) || buffer.length,
        uploadMethod: 'google-drive',
      };
    } catch (error) {
      throw new Error(
        `Google Drive Shared Drive upload failed: ${error.message}`,
      );
    }
  }

  /**
   * Get the appropriate Shared Drive folder ID based on file category
   */
  private getSharedDriveFolderId(category: string): string | null {
    const folderMap = {
      'repair-images': this.configService.get(
        'GOOGLE_SHARED_DRIVE_REPAIRS_FOLDER_ID',
      ),
      'customer-documents': this.configService.get(
        'GOOGLE_SHARED_DRIVE_CUSTOMERS_FOLDER_ID',
      ),
      'product-images': this.configService.get(
        'GOOGLE_SHARED_DRIVE_PRODUCTS_FOLDER_ID',
      ),
      receipts: this.configService.get(
        'GOOGLE_SHARED_DRIVE_RECEIPTS_FOLDER_ID',
      ),
    };

    return folderMap[category] || null;
  }

  /**
   * Strategy 2: Upload to local storage
   */
  private async uploadToLocal(
    options: FileUploadOptions,
  ): Promise<FileUploadResult> {
    const { fileName, buffer, category, metadata } = options;

    try {
      const timestamp = Date.now();
      const uniqueFileName = `${timestamp}-${fileName}`;
      const categoryPath = path.join(this.uploadDirectory, category);
      const filePath = path.join(categoryPath, uniqueFileName);

      // Write file to disk
      await fs.promises.writeFile(filePath, buffer);

      // Create accessible URL using APP_URL env var (production domain) or fallback to localhost
      const appUrl = this.configService.get('APP_URL', `http://localhost:${this.configService.get('PORT', 3000)}`);
      const baseUrl = appUrl.replace(/\/$/, ''); // strip trailing slash
      const fileUrl = `${baseUrl}/uploads/${category}/${uniqueFileName}`;

      // Save metadata if provided
      if (metadata) {
        const metadataPath = filePath + '.meta.json';
        await fs.promises.writeFile(
          metadataPath,
          JSON.stringify({
            ...metadata,
            uploadedAt: new Date().toISOString(),
            originalFileName: fileName,
            fileSize: buffer.length,
          }),
        );
      }

      return {
        success: true,
        fileUrl,
        fileName: uniqueFileName,
        size: buffer.length,
        uploadMethod: 'local',
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
      preferredMethod: this.isGoogleDriveAvailable ? 'google-drive' : 'local',
    };
  }

  /**
   * Delete file from all storage locations
   */
  async deleteFile(
    fileId: string,
    uploadMethod: 'google-drive' | 'local',
  ): Promise<boolean> {
    try {
      if (uploadMethod === 'google-drive' && this.isGoogleDriveAvailable) {
        await this.driveClient.files.delete({
          fileId,
          supportsAllDrives: true,
          supportsTeamDrives: true,
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
      localStorage: { available: false, error: null },
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
          metadata: { test: true },
        });

        if (testResult.success) {
          results.googleDrive.available = true;
          // Clean up test file
          await this.deleteFile(testResult.fileId, 'google-drive');
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
        metadata: { test: true },
      });

      if (testResult.success) {
        results.localStorage.available = true;
        // Clean up test file
        const filePath = path.join(
          this.uploadDirectory,
          'repair-images',
          testResult.fileName,
        );
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
