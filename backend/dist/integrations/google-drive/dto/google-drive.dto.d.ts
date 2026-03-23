export declare class GoogleDriveDto {
    id: string;
    name: string;
    webViewLink: string;
    webContentLink: string;
    mimeType: string;
    size: string;
    createdTime: string;
    modifiedTime: string;
}
export declare class CreateFolderDto {
    name: string;
    parentId?: string;
}
export declare class UploadFileDto {
    file: any;
    description?: string;
    folderId?: string;
}
export declare class UploadRepairImageDto extends UploadFileDto {
    repairId?: string;
}
export declare class UploadCustomerDocumentDto extends UploadFileDto {
    customerId: string;
}
export declare class UploadReceiptDto extends UploadFileDto {
    transactionId: string;
}
export declare class UploadProductImageDto extends UploadFileDto {
    productId: string;
}
export declare class ListFilesDto {
    folderId?: string;
    pageSize?: number;
}
export declare class GoogleDriveHealthDto {
    status: 'connected' | 'disconnected';
    message: string;
    timestamp: string;
}
export declare class FolderStructureDto {
    folders: {
        repairImages: string;
        invoices: string;
        customerDocuments: string;
        receipts: string;
        productImages: string;
    };
    description: string;
}
