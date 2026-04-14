import type { Response } from 'express';
import { FileStorageService, FileUploadResult } from './file-storage.service';
interface UploadedFile {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    size: number;
    buffer: Buffer;
}
export declare class FileStorageController {
    private readonly fileStorageService;
    constructor(fileStorageService: FileStorageService);
    uploadRepairImages(files: UploadedFile[], metadata: any, tenantId: string): Promise<{
        results: FileUploadResult[];
        summary: any;
    }>;
    uploadCustomerDocuments(files: UploadedFile[], metadata: any, tenantId: string): Promise<{
        results: FileUploadResult[];
    }>;
    uploadProductImages(files: UploadedFile[], metadata: any, tenantId: string): Promise<{
        results: FileUploadResult[];
    }>;
    streamDriveFile(fileId: string, res: Response): Promise<void>;
    getStorageStatus(): {
        googleDriveAvailable: boolean;
        localStorageAvailable: boolean;
        preferredMethod: string;
    };
    testStorageMethods(): Promise<Record<string, any>>;
}
export {};
