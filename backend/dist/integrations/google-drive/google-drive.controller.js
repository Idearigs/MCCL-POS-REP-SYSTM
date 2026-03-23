"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleDriveController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const throttler_1 = require("@nestjs/throttler");
const platform_express_1 = require("@nestjs/platform-express");
const google_drive_service_1 = require("./google-drive.service");
const jwt_auth_guard_1 = require("../../shared/guards/jwt-auth.guard");
const tenant_guard_1 = require("../../shared/guards/tenant.guard");
const tenant_decorator_1 = require("../../shared/decorators/tenant.decorator");
const google_drive_dto_1 = require("./dto/google-drive.dto");
let GoogleDriveController = class GoogleDriveController {
    googleDriveService;
    folderStructure = {
        repairImages: '1Xy0PIIRg-YBbmDHpQodx2xp_uRamm3NQ',
        invoices: '1Xy0PIIRg-YBbmDHpQodx2xp_uRamm3NQ',
        customerDocuments: '1Xy0PIIRg-YBbmDHpQodx2xp_uRamm3NQ',
        receipts: '1Xy0PIIRg-YBbmDHpQodx2xp_uRamm3NQ',
        productImages: '1Xy0PIIRg-YBbmDHpQodx2xp_uRamm3NQ',
    };
    constructor(googleDriveService) {
        this.googleDriveService = googleDriveService;
    }
    async uploadRepairImage(file, tenantId, description) {
        const fileName = `repair_${Date.now()}_${file.originalname}`;
        return this.googleDriveService.uploadFile({
            fileName,
            mimeType: file.mimetype,
            buffer: file.buffer,
            folderId: this.folderStructure.repairImages,
            description: description || `Repair image for tenant ${tenantId}`,
        });
    }
    async uploadInvoice(file, tenantId, description) {
        const fileName = `invoice_${Date.now()}_${file.originalname}`;
        return this.googleDriveService.uploadFile({
            fileName,
            mimeType: file.mimetype,
            buffer: file.buffer,
            folderId: this.folderStructure.invoices,
            description: description || `Invoice for tenant ${tenantId}`,
        });
    }
    async uploadCustomerDocument(file, tenantId, customerId, description) {
        const fileName = `customer_${customerId}_${Date.now()}_${file.originalname}`;
        return this.googleDriveService.uploadFile({
            fileName,
            mimeType: file.mimetype,
            buffer: file.buffer,
            folderId: this.folderStructure.customerDocuments,
            description: description || `Customer document for ${customerId}`,
        });
    }
    async uploadReceipt(file, tenantId, transactionId, description) {
        const fileName = `receipt_${transactionId}_${Date.now()}_${file.originalname}`;
        return this.googleDriveService.uploadFile({
            fileName,
            mimeType: file.mimetype,
            buffer: file.buffer,
            folderId: this.folderStructure.receipts,
            description: description || `Receipt for transaction ${transactionId}`,
        });
    }
    async uploadProductImage(file, tenantId, productId, description) {
        const fileName = `product_${productId}_${Date.now()}_${file.originalname}`;
        return this.googleDriveService.uploadFile({
            fileName,
            mimeType: file.mimetype,
            buffer: file.buffer,
            folderId: this.folderStructure.productImages,
            description: description || `Product image for ${productId}`,
        });
    }
    async listFiles(folderId, pageSize = 50) {
        return this.googleDriveService.listFiles(folderId, pageSize);
    }
    async getFile(fileId) {
        return this.googleDriveService.getFile(fileId);
    }
    async deleteFile(fileId) {
        await this.googleDriveService.deleteFile(fileId);
        return { message: 'File deleted successfully' };
    }
    async createFolder(createFolderDto) {
        const folderId = await this.googleDriveService.createFolder(createFolderDto.name, createFolderDto.parentId);
        return { id: folderId, message: 'Folder created successfully' };
    }
    getFolderStructure() {
        return {
            folders: {
                repairImages: this.folderStructure.repairImages,
                invoices: this.folderStructure.invoices,
                customerDocuments: this.folderStructure.customerDocuments,
                receipts: this.folderStructure.receipts,
                productImages: this.folderStructure.productImages,
            },
            description: 'Predefined folder structure for MPS Jewelry file organization',
        };
    }
    async healthCheck() {
        const isAvailable = this.googleDriveService.isAvailable();
        return {
            status: isAvailable ? 'connected' : 'disconnected',
            message: isAvailable
                ? 'Google Drive service is running properly'
                : 'Google Drive service is not configured or unavailable',
            timestamp: new Date().toISOString(),
        };
    }
};
exports.GoogleDriveController = GoogleDriveController;
__decorate([
    (0, common_1.Post)('upload/repair-image'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiOperation)({
        summary: 'Upload repair image',
        description: 'Upload repair image to Google Drive repair-images folder',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'File uploaded successfully',
        type: google_drive_dto_1.GoogleDriveDto,
    }),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, tenant_decorator_1.TenantId)()),
    __param(2, (0, common_1.Body)('description')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], GoogleDriveController.prototype, "uploadRepairImage", null);
__decorate([
    (0, common_1.Post)('upload/invoice'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiOperation)({
        summary: 'Upload invoice',
        description: 'Upload invoice to Google Drive invoices folder',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Invoice uploaded successfully',
        type: google_drive_dto_1.GoogleDriveDto,
    }),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, tenant_decorator_1.TenantId)()),
    __param(2, (0, common_1.Body)('description')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], GoogleDriveController.prototype, "uploadInvoice", null);
__decorate([
    (0, common_1.Post)('upload/customer-document'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiOperation)({
        summary: 'Upload customer document',
        description: 'Upload customer document to Google Drive customer-documents folder',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Customer document uploaded successfully',
        type: google_drive_dto_1.GoogleDriveDto,
    }),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, tenant_decorator_1.TenantId)()),
    __param(2, (0, common_1.Body)('customerId')),
    __param(3, (0, common_1.Body)('description')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", Promise)
], GoogleDriveController.prototype, "uploadCustomerDocument", null);
__decorate([
    (0, common_1.Post)('upload/receipt'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiOperation)({
        summary: 'Upload receipt',
        description: 'Upload receipt to Google Drive receipts folder',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Receipt uploaded successfully',
        type: google_drive_dto_1.GoogleDriveDto,
    }),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, tenant_decorator_1.TenantId)()),
    __param(2, (0, common_1.Body)('transactionId')),
    __param(3, (0, common_1.Body)('description')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", Promise)
], GoogleDriveController.prototype, "uploadReceipt", null);
__decorate([
    (0, common_1.Post)('upload/product-image'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiOperation)({
        summary: 'Upload product image',
        description: 'Upload product image to Google Drive product-images folder',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Product image uploaded successfully',
        type: google_drive_dto_1.GoogleDriveDto,
    }),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, tenant_decorator_1.TenantId)()),
    __param(2, (0, common_1.Body)('productId')),
    __param(3, (0, common_1.Body)('description')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", Promise)
], GoogleDriveController.prototype, "uploadProductImage", null);
__decorate([
    (0, common_1.Get)('files'),
    (0, swagger_1.ApiOperation)({
        summary: 'List files in Google Drive',
        description: 'List all files or files in a specific folder',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Files retrieved successfully',
        type: [google_drive_dto_1.GoogleDriveDto],
    }),
    __param(0, (0, common_1.Query)('folderId')),
    __param(1, (0, common_1.Query)('pageSize')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number]),
    __metadata("design:returntype", Promise)
], GoogleDriveController.prototype, "listFiles", null);
__decorate([
    (0, common_1.Get)('file/:id'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get file information',
        description: 'Get detailed information about a specific file',
    }),
    (0, swagger_1.ApiParam)({
        name: 'id',
        description: 'Google Drive file ID',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'File information retrieved successfully',
        type: google_drive_dto_1.GoogleDriveDto,
    }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], GoogleDriveController.prototype, "getFile", null);
__decorate([
    (0, common_1.Delete)('file/:id'),
    (0, swagger_1.ApiOperation)({
        summary: 'Delete file',
        description: 'Delete a file from Google Drive',
    }),
    (0, swagger_1.ApiParam)({
        name: 'id',
        description: 'Google Drive file ID',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'File deleted successfully',
    }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], GoogleDriveController.prototype, "deleteFile", null);
__decorate([
    (0, common_1.Post)('folder'),
    (0, swagger_1.ApiOperation)({
        summary: 'Create folder',
        description: 'Create a new folder in Google Drive',
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Folder created successfully',
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [google_drive_dto_1.CreateFolderDto]),
    __metadata("design:returntype", Promise)
], GoogleDriveController.prototype, "createFolder", null);
__decorate([
    (0, common_1.Get)('folders/structure'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get folder structure',
        description: 'Get the predefined folder structure for file organization',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Folder structure retrieved successfully',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], GoogleDriveController.prototype, "getFolderStructure", null);
__decorate([
    (0, common_1.Get)('health'),
    (0, swagger_1.ApiOperation)({
        summary: 'Google Drive health check',
        description: 'Check if Google Drive integration is working properly',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Google Drive service status',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], GoogleDriveController.prototype, "healthCheck", null);
exports.GoogleDriveController = GoogleDriveController = __decorate([
    (0, swagger_1.ApiTags)('Google Drive'),
    (0, common_1.Controller)('drive'),
    (0, common_1.UseGuards)(throttler_1.ThrottlerGuard, jwt_auth_guard_1.JwtAuthGuard, tenant_guard_1.TenantGuard),
    (0, swagger_1.ApiBearerAuth)('access-token'),
    __metadata("design:paramtypes", [google_drive_service_1.GoogleDriveService])
], GoogleDriveController);
//# sourceMappingURL=google-drive.controller.js.map