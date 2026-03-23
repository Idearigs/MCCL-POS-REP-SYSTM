import { GoogleDriveService } from './google-drive.service';
import { CreateFolderDto } from './dto/google-drive.dto';
export declare class GoogleDriveController {
    private readonly googleDriveService;
    private readonly folderStructure;
    constructor(googleDriveService: GoogleDriveService);
    uploadRepairImage(file: any, tenantId: string, description?: string): Promise<import("./google-drive.service").DriveFile>;
    uploadInvoice(file: any, tenantId: string, description?: string): Promise<import("./google-drive.service").DriveFile>;
    uploadCustomerDocument(file: any, tenantId: string, customerId: string, description?: string): Promise<import("./google-drive.service").DriveFile>;
    uploadReceipt(file: any, tenantId: string, transactionId: string, description?: string): Promise<import("./google-drive.service").DriveFile>;
    uploadProductImage(file: any, tenantId: string, productId: string, description?: string): Promise<import("./google-drive.service").DriveFile>;
    listFiles(folderId?: string, pageSize?: number): Promise<import("./google-drive.service").DriveFile[]>;
    getFile(fileId: string): Promise<import("./google-drive.service").DriveFile>;
    deleteFile(fileId: string): Promise<{
        message: string;
    }>;
    createFolder(createFolderDto: CreateFolderDto): Promise<{
        id: string;
        message: string;
    }>;
    getFolderStructure(): {
        folders: {
            repairImages: string;
            invoices: string;
            customerDocuments: string;
            receipts: string;
            productImages: string;
        };
        description: string;
    };
    healthCheck(): Promise<{
        status: string;
        message: string;
        timestamp: string;
    }>;
}
