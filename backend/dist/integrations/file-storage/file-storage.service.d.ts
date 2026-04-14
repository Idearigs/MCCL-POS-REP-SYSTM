import { ConfigService } from '@nestjs/config';
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
    tenantId?: string;
    metadata?: Record<string, any>;
}
export declare class FileStorageService {
    private configService;
    private readonly logger;
    private driveClient;
    private isGoogleDriveAvailable;
    private uploadDirectory;
    private googleDriveTenantIds;
    constructor(configService: ConfigService);
    private initializeStorageSystems;
    private ensureUploadDirectory;
    private initializeGoogleDrive;
    uploadFile(options: FileUploadOptions): Promise<FileUploadResult>;
    private validateFile;
    private validateImageMagicBytes;
    private uploadToGoogleDrive;
    private getSharedDriveFolderId;
    private uploadToLocal;
    getStorageStatus(): {
        googleDriveAvailable: boolean;
        localStorageAvailable: boolean;
        preferredMethod: string;
    };
    streamDriveFile(fileId: string, res: import('express').Response): Promise<void>;
    deleteFile(fileId: string, uploadMethod: 'google-drive' | 'local'): Promise<boolean>;
    testStorageMethods(): Promise<Record<string, any>>;
}
