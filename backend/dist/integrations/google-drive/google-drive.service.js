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
var GoogleDriveService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleDriveService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const googleapis_1 = require("googleapis");
const stream_1 = require("stream");
const path = __importStar(require("path"));
let GoogleDriveService = GoogleDriveService_1 = class GoogleDriveService {
    configService;
    logger = new common_1.Logger(GoogleDriveService_1.name);
    drive;
    isConfigured = false;
    constructor(configService) {
        this.configService = configService;
        this.initializeGoogleDrive();
    }
    async initializeGoogleDrive() {
        try {
            const clientEmail = this.configService.get('GOOGLE_DRIVE_CLIENT_EMAIL');
            const privateKey = this.configService.get('GOOGLE_DRIVE_PRIVATE_KEY');
            const projectId = this.configService.get('GOOGLE_DRIVE_PROJECT_ID');
            if (!clientEmail || !privateKey || !projectId) {
                this.logger.warn('⚠️  Google Drive credentials not configured. File upload will be disabled.');
                return;
            }
            const auth = new googleapis_1.google.auth.JWT({
                email: clientEmail,
                key: privateKey.replace(/\\n/g, '\n'),
                scopes: ['https://www.googleapis.com/auth/drive.file'],
            });
            this.drive = googleapis_1.google.drive({ version: 'v3', auth });
            await this.drive.about.get({ fields: 'user' });
            this.isConfigured = true;
            this.logger.log('✅ Google Drive service initialized successfully');
        }
        catch (error) {
            this.logger.error('❌ Failed to initialize Google Drive:', error.message);
            this.isConfigured = false;
        }
    }
    isAvailable() {
        return this.isConfigured;
    }
    async uploadFile(options) {
        if (!this.isConfigured) {
            throw new common_1.BadRequestException('Google Drive not configured');
        }
        try {
            const { fileName, mimeType, buffer, folderId, description } = options;
            this.validateFile(fileName, buffer, mimeType);
            const stream = stream_1.Readable.from(buffer);
            const fileMetadata = {
                name: fileName,
                description: description || `Uploaded by MPS Jewelry SaaS`,
            };
            if (folderId) {
                fileMetadata.parents = [folderId];
            }
            else {
                const parentFolderId = this.configService.get('GOOGLE_DRIVE_PARENT_FOLDER_ID');
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
                fields: 'id,name,webViewLink,webContentLink,mimeType,size,createdTime,modifiedTime',
            });
            const file = response.data;
            await this.makeFilePublic(file.id);
            this.logger.log(`✅ File uploaded successfully: ${fileName} (ID: ${file.id})`);
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
        }
        catch (error) {
            this.logger.error(`Failed to upload file ${options.fileName}:`, error.message);
            throw new common_1.BadRequestException(`File upload failed: ${error.message}`);
        }
    }
    async deleteFile(fileId) {
        if (!this.isConfigured) {
            throw new common_1.BadRequestException('Google Drive not configured');
        }
        try {
            await this.drive.files.delete({ fileId });
            this.logger.log(`✅ File deleted successfully: ${fileId}`);
        }
        catch (error) {
            this.logger.error(`Failed to delete file ${fileId}:`, error.message);
            throw new common_1.BadRequestException(`File deletion failed: ${error.message}`);
        }
    }
    async getFile(fileId) {
        if (!this.isConfigured) {
            throw new common_1.BadRequestException('Google Drive not configured');
        }
        try {
            const response = await this.drive.files.get({
                fileId,
                fields: 'id,name,webViewLink,webContentLink,mimeType,size,createdTime,modifiedTime',
            });
            return response.data;
        }
        catch (error) {
            this.logger.error(`Failed to get file ${fileId}:`, error.message);
            throw new common_1.BadRequestException(`File retrieval failed: ${error.message}`);
        }
    }
    async createFolder(name, parentId) {
        if (!this.isConfigured) {
            throw new common_1.BadRequestException('Google Drive not configured');
        }
        try {
            const fileMetadata = {
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
            this.logger.log(`✅ Folder created successfully: ${name} (ID: ${response.data.id})`);
            return response.data.id;
        }
        catch (error) {
            this.logger.error(`Failed to create folder ${name}:`, error.message);
            throw new common_1.BadRequestException(`Folder creation failed: ${error.message}`);
        }
    }
    async listFiles(folderId, pageSize = 100) {
        if (!this.isConfigured) {
            throw new common_1.BadRequestException('Google Drive not configured');
        }
        try {
            const query = folderId ? `'${folderId}' in parents` : undefined;
            const response = await this.drive.files.list({
                q: query,
                pageSize,
                fields: 'files(id,name,webViewLink,webContentLink,mimeType,size,createdTime,modifiedTime)',
                orderBy: 'createdTime desc',
            });
            return response.data.files || [];
        }
        catch (error) {
            this.logger.error('Failed to list files:', error.message);
            throw new common_1.BadRequestException(`File listing failed: ${error.message}`);
        }
    }
    async makeFilePublic(fileId) {
        try {
            await this.drive.permissions.create({
                fileId,
                requestBody: {
                    role: 'reader',
                    type: 'anyone',
                },
            });
        }
        catch (error) {
            this.logger.warn(`Failed to make file public ${fileId}:`, error.message);
        }
    }
    validateFile(fileName, buffer, mimeType) {
        const maxSize = 100 * 1024 * 1024;
        if (buffer.length > maxSize) {
            throw new common_1.BadRequestException('File size exceeds 100MB limit');
        }
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
            throw new common_1.BadRequestException(`File type ${extension} not allowed`);
        }
        const allowedMimeTypes = [
            'image/jpeg',
            'image/png',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain',
        ];
        if (!allowedMimeTypes.includes(mimeType)) {
            throw new common_1.BadRequestException(`MIME type ${mimeType} not allowed`);
        }
    }
    async generateShareableLink(fileId) {
        if (!this.isConfigured) {
            throw new common_1.BadRequestException('Google Drive not configured');
        }
        try {
            const file = await this.getFile(fileId);
            return file.webViewLink;
        }
        catch (error) {
            this.logger.error(`Failed to generate shareable link for ${fileId}:`, error.message);
            throw new common_1.BadRequestException(`Link generation failed: ${error.message}`);
        }
    }
    async createTenantFolders(tenantId) {
        if (!this.isConfigured) {
            throw new common_1.BadRequestException('Google Drive not configured');
        }
        try {
            const mainFolder = await this.createFolder(`Tenant_${tenantId}`);
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
        }
        catch (error) {
            this.logger.error(`Failed to create tenant folders for ${tenantId}:`, error.message);
            throw new common_1.BadRequestException(`Tenant folder creation failed: ${error.message}`);
        }
    }
};
exports.GoogleDriveService = GoogleDriveService;
exports.GoogleDriveService = GoogleDriveService = GoogleDriveService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], GoogleDriveService);
//# sourceMappingURL=google-drive.service.js.map