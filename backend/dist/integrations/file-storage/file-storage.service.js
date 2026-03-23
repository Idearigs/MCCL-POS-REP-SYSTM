"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var FileStorageService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileStorageService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const stream_1 = require("stream");
let FileStorageService = FileStorageService_1 = class FileStorageService {
    configService;
    logger = new common_1.Logger(FileStorageService_1.name);
    driveClient = null;
    isGoogleDriveAvailable = false;
    uploadDirectory;
    constructor(configService) {
        this.configService = configService;
        this.uploadDirectory = path.join(process.cwd(), 'uploads');
        this.initializeStorageSystems();
    }
    async initializeStorageSystems() {
        this.ensureUploadDirectory();
        await this.initializeGoogleDrive();
    }
    ensureUploadDirectory() {
        try {
            if (!fs.existsSync(this.uploadDirectory)) {
                fs.mkdirSync(this.uploadDirectory, { recursive: true });
            }
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
        }
        catch (error) {
            this.logger.error('❌ Failed to initialize upload directories:', error.message);
        }
    }
    async initializeGoogleDrive() {
        this.logger.warn('⚠️ Google Drive integration temporarily disabled. Using local storage only.');
        this.logger.log('📋 Reason: Waiting for client to complete Shared Drive setup');
        this.logger.log('📁 All files will be stored locally until Google Drive is re-enabled');
        this.isGoogleDriveAvailable = false;
    }
    async uploadFile(options) {
        const { fileName, buffer, mimeType, category, metadata } = options;
        this.logger.debug(`📤 Starting file upload: ${fileName} (${buffer.length} bytes)`);
        this.validateFile(fileName, buffer, mimeType, category);
        if (this.isGoogleDriveAvailable) {
            try {
                const driveResult = await this.uploadToGoogleDrive(options);
                if (driveResult.success) {
                    this.logger.log(`✅ Google Drive upload successful: ${fileName}`);
                    return driveResult;
                }
            }
            catch (error) {
                this.logger.warn(`⚠️ Google Drive upload failed: ${error.message}`);
            }
        }
        try {
            const localResult = await this.uploadToLocal(options);
            this.logger.log(`✅ Local storage upload successful: ${fileName}`);
            return localResult;
        }
        catch (error) {
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
    validateFile(fileName, buffer, mimeType, category) {
        const maxSize = category === 'product-images' || category === 'repair-images'
            ? 10 * 1024 * 1024
            : 5 * 1024 * 1024;
        if (buffer.length > maxSize) {
            throw new common_1.BadRequestException(`File size exceeds maximum allowed size of ${maxSize / 1024 / 1024}MB`);
        }
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
            throw new common_1.BadRequestException('File type not allowed');
        }
        const allowedMimeTypes = {
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
        if (!allowedMimeTypes[category] ||
            !allowedMimeTypes[category].includes(mimeType)) {
            throw new common_1.BadRequestException(`File type ${mimeType} not allowed for ${category}`);
        }
        if (fileName.includes('..') ||
            fileName.includes('/') ||
            fileName.includes('\\')) {
            throw new common_1.BadRequestException('Invalid filename');
        }
        if (category === 'product-images' || category === 'repair-images') {
            const isValidImage = this.validateImageMagicBytes(buffer, mimeType);
            if (!isValidImage) {
                this.logger.warn(`⚠️ Image magic bytes validation failed for ${fileName} (MIME: ${mimeType})`);
                this.logger.warn(`   First 12 bytes: ${buffer.slice(0, 12).toString('hex')}`);
            }
        }
        this.logger.debug(`✅ File validation passed: ${fileName}`);
    }
    validateImageMagicBytes(buffer, mimeType) {
        if (buffer.length < 12)
            return false;
        const header = buffer.slice(0, 12);
        if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
            return header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
        }
        if (mimeType === 'image/png') {
            return (header[0] === 0x89 &&
                header[1] === 0x50 &&
                header[2] === 0x4e &&
                header[3] === 0x47 &&
                header[4] === 0x0d &&
                header[5] === 0x0a &&
                header[6] === 0x1a &&
                header[7] === 0x0a);
        }
        if (mimeType === 'image/gif') {
            return (header[0] === 0x47 &&
                header[1] === 0x49 &&
                header[2] === 0x46 &&
                header[3] === 0x38);
        }
        if (mimeType === 'image/webp') {
            return (header[0] === 0x52 &&
                header[1] === 0x49 &&
                header[2] === 0x46 &&
                header[3] === 0x46 &&
                header[8] === 0x57 &&
                header[9] === 0x45 &&
                header[10] === 0x42 &&
                header[11] === 0x50);
        }
        return false;
    }
    async uploadToGoogleDrive(options) {
        const { fileName, buffer, mimeType, category, metadata } = options;
        try {
            const timestamp = Date.now();
            const uniqueFileName = `${timestamp}-${fileName}`;
            const fileMetadata = {
                name: uniqueFileName,
                description: `MPS Jewelry System - ${category} - ${metadata?.description || 'File upload'}`,
            };
            const folderId = this.getSharedDriveFolderId(category);
            if (folderId) {
                try {
                    await this.driveClient.files.get({
                        fileId: folderId,
                        supportsAllDrives: true,
                    });
                    fileMetadata.parents = [folderId];
                    this.logger.debug(`Uploading to Shared Drive folder: ${category} (${folderId})`);
                }
                catch (folderError) {
                    this.logger.warn(`Cannot access Shared Drive folder ${category}: ${folderError.message}`);
                    throw new Error(`Shared Drive folder not accessible: ${category}`);
                }
            }
            else {
                this.logger.warn(`No Shared Drive folder configured for category: ${category}`);
                throw new Error(`No Shared Drive folder configured for category: ${category}`);
            }
            const media = {
                mimeType,
                body: stream_1.Readable.from(buffer),
            };
            const response = await this.driveClient.files.create({
                requestBody: fileMetadata,
                media,
                fields: 'id,name,webViewLink,webContentLink,size,parents,driveId',
                supportsAllDrives: true,
                supportsTeamDrives: true,
            });
            const file = response.data;
            this.logger.debug(`File uploaded to Shared Drive: ${file.id} in drive ${file.driveId}`);
            const fileUrl = file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`;
            return {
                success: true,
                fileUrl,
                fileId: file.id,
                fileName: file.name,
                size: parseInt(file.size) || buffer.length,
                uploadMethod: 'google-drive',
            };
        }
        catch (error) {
            throw new Error(`Google Drive Shared Drive upload failed: ${error.message}`);
        }
    }
    getSharedDriveFolderId(category) {
        const folderMap = {
            'repair-images': this.configService.get('GOOGLE_SHARED_DRIVE_REPAIRS_FOLDER_ID'),
            'customer-documents': this.configService.get('GOOGLE_SHARED_DRIVE_CUSTOMERS_FOLDER_ID'),
            'product-images': this.configService.get('GOOGLE_SHARED_DRIVE_PRODUCTS_FOLDER_ID'),
            receipts: this.configService.get('GOOGLE_SHARED_DRIVE_RECEIPTS_FOLDER_ID'),
        };
        return folderMap[category] || null;
    }
    async uploadToLocal(options) {
        const { fileName, buffer, category, metadata } = options;
        try {
            const timestamp = Date.now();
            const uniqueFileName = `${timestamp}-${fileName}`;
            const categoryPath = path.join(this.uploadDirectory, category);
            const filePath = path.join(categoryPath, uniqueFileName);
            await fs.promises.writeFile(filePath, buffer);
            const port = this.configService.get('PORT', 3002);
            const baseUrl = `http://localhost:${port}`;
            const fileUrl = `${baseUrl}/uploads/${category}/${uniqueFileName}`;
            if (metadata) {
                const metadataPath = filePath + '.meta.json';
                await fs.promises.writeFile(metadataPath, JSON.stringify({
                    ...metadata,
                    uploadedAt: new Date().toISOString(),
                    originalFileName: fileName,
                    fileSize: buffer.length,
                }));
            }
            return {
                success: true,
                fileUrl,
                fileName: uniqueFileName,
                size: buffer.length,
                uploadMethod: 'local',
            };
        }
        catch (error) {
            throw new Error(`Local storage failed: ${error.message}`);
        }
    }
    getStorageStatus() {
        return {
            googleDriveAvailable: this.isGoogleDriveAvailable,
            localStorageAvailable: fs.existsSync(this.uploadDirectory),
            preferredMethod: this.isGoogleDriveAvailable ? 'google-drive' : 'local',
        };
    }
    async deleteFile(fileId, uploadMethod) {
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
                if (fs.existsSync(fileId)) {
                    await fs.promises.unlink(fileId);
                    this.logger.log(`✅ File deleted from local storage: ${fileId}`);
                    return true;
                }
            }
            return false;
        }
        catch (error) {
            this.logger.error(`❌ Failed to delete file: ${error.message}`);
            return false;
        }
    }
    async testStorageMethods() {
        const results = {
            googleDrive: { available: false, error: null },
            localStorage: { available: false, error: null },
        };
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
                    await this.deleteFile(testResult.fileId, 'google-drive');
                }
            }
            catch (error) {
                results.googleDrive.error = error.message;
            }
        }
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
                const filePath = path.join(this.uploadDirectory, 'repair-images', testResult.fileName);
                if (fs.existsSync(filePath)) {
                    await fs.promises.unlink(filePath);
                }
            }
        }
        catch (error) {
            results.localStorage.error = error.message;
        }
        return results;
    }
};
exports.FileStorageService = FileStorageService;
exports.FileStorageService = FileStorageService = FileStorageService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], FileStorageService);
//# sourceMappingURL=file-storage.service.js.map