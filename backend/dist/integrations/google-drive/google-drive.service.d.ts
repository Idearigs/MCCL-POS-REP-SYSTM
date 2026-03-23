import { ConfigService } from '@nestjs/config';
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
export declare class GoogleDriveService {
    private configService;
    private readonly logger;
    private drive;
    private isConfigured;
    constructor(configService: ConfigService);
    private initializeGoogleDrive;
    isAvailable(): boolean;
    uploadFile(options: UploadFileOptions): Promise<DriveFile>;
    deleteFile(fileId: string): Promise<void>;
    getFile(fileId: string): Promise<DriveFile>;
    createFolder(name: string, parentId?: string): Promise<string>;
    listFiles(folderId?: string, pageSize?: number): Promise<DriveFile[]>;
    private makeFilePublic;
    private validateFile;
    generateShareableLink(fileId: string): Promise<string>;
    createTenantFolders(tenantId: string): Promise<{
        mainFolder: string;
        customersFolder: string;
        productsFolder: string;
        repairsFolder: string;
        receiptsFolder: string;
    }>;
}
