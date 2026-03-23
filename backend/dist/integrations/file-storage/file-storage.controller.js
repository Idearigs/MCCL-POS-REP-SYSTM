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
exports.FileStorageController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const file_storage_service_1 = require("./file-storage.service");
let FileStorageController = class FileStorageController {
    fileStorageService;
    constructor(fileStorageService) {
        this.fileStorageService = fileStorageService;
    }
    async uploadRepairImages(files, metadata) {
        if (!files || files.length === 0) {
            throw new common_1.BadRequestException('No files provided');
        }
        const results = [];
        for (const file of files) {
            try {
                const result = await this.fileStorageService.uploadFile({
                    fileName: file.originalname,
                    buffer: file.buffer,
                    mimeType: file.mimetype,
                    category: 'repair-images',
                    metadata: {
                        repairId: metadata.repairId,
                        description: metadata.description,
                        uploadedBy: metadata.uploadedBy || 'system',
                        originalSize: file.size,
                    },
                });
                results.push(result);
            }
            catch (error) {
                results.push({
                    success: false,
                    fileUrl: '',
                    fileName: file.originalname,
                    size: file.size,
                    uploadMethod: 'error',
                    error: error.message,
                });
            }
        }
        const summary = {
            totalFiles: files.length,
            successful: results.filter((r) => r.success).length,
            failed: results.filter((r) => !r.success).length,
            uploadMethods: results.reduce((acc, r) => {
                acc[r.uploadMethod] = (acc[r.uploadMethod] || 0) + 1;
                return acc;
            }, {}),
        };
        return { results, summary };
    }
    async uploadCustomerDocuments(files, metadata) {
        if (!files || files.length === 0) {
            throw new common_1.BadRequestException('No files provided');
        }
        const results = [];
        for (const file of files) {
            const result = await this.fileStorageService.uploadFile({
                fileName: file.originalname,
                buffer: file.buffer,
                mimeType: file.mimetype,
                category: 'customer-documents',
                metadata: {
                    customerId: metadata.customerId,
                    documentType: metadata.documentType,
                    uploadedBy: metadata.uploadedBy || 'system',
                },
            });
            results.push(result);
        }
        return { results };
    }
    async uploadProductImages(files, metadata) {
        if (!files || files.length === 0) {
            throw new common_1.BadRequestException('No files provided');
        }
        const results = [];
        for (const file of files) {
            const result = await this.fileStorageService.uploadFile({
                fileName: file.originalname,
                buffer: file.buffer,
                mimeType: file.mimetype,
                category: 'product-images',
                metadata: {
                    productId: metadata.productId,
                    imageType: metadata.imageType || 'product',
                    uploadedBy: metadata.uploadedBy || 'system',
                },
            });
            results.push(result);
        }
        return { results };
    }
    getStorageStatus() {
        return this.fileStorageService.getStorageStatus();
    }
    async testStorageMethods() {
        return await this.fileStorageService.testStorageMethods();
    }
};
exports.FileStorageController = FileStorageController;
__decorate([
    (0, common_1.Post)('upload/repair-images'),
    (0, swagger_1.ApiOperation)({ summary: 'Upload repair job images' }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Files uploaded successfully' }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('images', 10)),
    __param(0, (0, common_1.UploadedFiles)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array, Object]),
    __metadata("design:returntype", Promise)
], FileStorageController.prototype, "uploadRepairImages", null);
__decorate([
    (0, common_1.Post)('upload/customer-documents'),
    (0, swagger_1.ApiOperation)({ summary: 'Upload customer documents' }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('documents', 5)),
    __param(0, (0, common_1.UploadedFiles)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array, Object]),
    __metadata("design:returntype", Promise)
], FileStorageController.prototype, "uploadCustomerDocuments", null);
__decorate([
    (0, common_1.Post)('upload/product-images'),
    (0, swagger_1.ApiOperation)({ summary: 'Upload product images' }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('images', 10)),
    __param(0, (0, common_1.UploadedFiles)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array, Object]),
    __metadata("design:returntype", Promise)
], FileStorageController.prototype, "uploadProductImages", null);
__decorate([
    (0, common_1.Get)('status'),
    (0, swagger_1.ApiOperation)({ summary: 'Get storage system status' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Storage status retrieved' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], FileStorageController.prototype, "getStorageStatus", null);
__decorate([
    (0, common_1.Post)('test'),
    (0, swagger_1.ApiOperation)({ summary: 'Test all storage methods' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Storage test results' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], FileStorageController.prototype, "testStorageMethods", null);
exports.FileStorageController = FileStorageController = __decorate([
    (0, swagger_1.ApiTags)('File Storage'),
    (0, common_1.Controller)('file-storage'),
    __metadata("design:paramtypes", [file_storage_service_1.FileStorageService])
], FileStorageController);
//# sourceMappingURL=file-storage.controller.js.map