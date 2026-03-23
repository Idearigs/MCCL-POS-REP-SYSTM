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
Object.defineProperty(exports, "__esModule", { value: true });
exports.FolderStructureDto = exports.GoogleDriveHealthDto = exports.ListFilesDto = exports.UploadProductImageDto = exports.UploadReceiptDto = exports.UploadCustomerDocumentDto = exports.UploadRepairImageDto = exports.UploadFileDto = exports.CreateFolderDto = exports.GoogleDriveDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class GoogleDriveDto {
    id;
    name;
    webViewLink;
    webContentLink;
    mimeType;
    size;
    createdTime;
    modifiedTime;
}
exports.GoogleDriveDto = GoogleDriveDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Google Drive file ID',
        example: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
    }),
    __metadata("design:type", String)
], GoogleDriveDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'File name',
        example: 'repair_image_2024.jpg',
    }),
    __metadata("design:type", String)
], GoogleDriveDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Web view link for the file',
        example: 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view',
    }),
    __metadata("design:type", String)
], GoogleDriveDto.prototype, "webViewLink", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Web content link for direct download',
        example: 'https://drive.google.com/uc?id=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
    }),
    __metadata("design:type", String)
], GoogleDriveDto.prototype, "webContentLink", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'MIME type of the file',
        example: 'image/jpeg',
    }),
    __metadata("design:type", String)
], GoogleDriveDto.prototype, "mimeType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'File size in bytes',
        example: '1024576',
    }),
    __metadata("design:type", String)
], GoogleDriveDto.prototype, "size", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'File creation timestamp',
        example: '2024-01-15T10:30:00.000Z',
    }),
    __metadata("design:type", String)
], GoogleDriveDto.prototype, "createdTime", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'File modification timestamp',
        example: '2024-01-15T10:30:00.000Z',
    }),
    __metadata("design:type", String)
], GoogleDriveDto.prototype, "modifiedTime", void 0);
class CreateFolderDto {
    name;
    parentId;
}
exports.CreateFolderDto = CreateFolderDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Folder name',
        example: 'Customer_Documents_2024',
    }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateFolderDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Parent folder ID (optional)',
        example: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateFolderDto.prototype, "parentId", void 0);
class UploadFileDto {
    file;
    description;
    folderId;
}
exports.UploadFileDto = UploadFileDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'File to upload',
        type: 'string',
        format: 'binary',
    }),
    __metadata("design:type", Object)
], UploadFileDto.prototype, "file", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'File description',
        example: 'Repair image for customer XYZ',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UploadFileDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Custom folder ID (overrides default folder structure)',
        example: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UploadFileDto.prototype, "folderId", void 0);
class UploadRepairImageDto extends UploadFileDto {
    repairId;
}
exports.UploadRepairImageDto = UploadRepairImageDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Repair ID for reference',
        example: 'repair_123',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UploadRepairImageDto.prototype, "repairId", void 0);
class UploadCustomerDocumentDto extends UploadFileDto {
    customerId;
}
exports.UploadCustomerDocumentDto = UploadCustomerDocumentDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Customer ID for reference',
        example: 'customer_456',
    }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UploadCustomerDocumentDto.prototype, "customerId", void 0);
class UploadReceiptDto extends UploadFileDto {
    transactionId;
}
exports.UploadReceiptDto = UploadReceiptDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Transaction ID for reference',
        example: 'txn_789',
    }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UploadReceiptDto.prototype, "transactionId", void 0);
class UploadProductImageDto extends UploadFileDto {
    productId;
}
exports.UploadProductImageDto = UploadProductImageDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Product ID for reference',
        example: 'product_101',
    }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UploadProductImageDto.prototype, "productId", void 0);
class ListFilesDto {
    folderId;
    pageSize = 50;
}
exports.ListFilesDto = ListFilesDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Folder ID to list files from (optional)',
        example: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ListFilesDto.prototype, "folderId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Number of files to return (max 100)',
        example: 20,
        minimum: 1,
        maximum: 100,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], ListFilesDto.prototype, "pageSize", void 0);
class GoogleDriveHealthDto {
    status;
    message;
    timestamp;
}
exports.GoogleDriveHealthDto = GoogleDriveHealthDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Service status',
        example: 'connected',
        enum: ['connected', 'disconnected'],
    }),
    __metadata("design:type", String)
], GoogleDriveHealthDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Status message',
        example: 'Google Drive service is running properly',
    }),
    __metadata("design:type", String)
], GoogleDriveHealthDto.prototype, "message", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Health check timestamp',
        example: '2024-01-15T10:30:00.000Z',
    }),
    __metadata("design:type", String)
], GoogleDriveHealthDto.prototype, "timestamp", void 0);
class FolderStructureDto {
    folders;
    description;
}
exports.FolderStructureDto = FolderStructureDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Predefined folder structure',
        example: {
            repairImages: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
            invoices: '1CxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
            customerDocuments: '1DxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
            receipts: '1ExiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
            productImages: '1FxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
        },
    }),
    __metadata("design:type", Object)
], FolderStructureDto.prototype, "folders", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Description of the folder structure',
        example: 'Predefined folder structure for MPS Jewelry file organization',
    }),
    __metadata("design:type", String)
], FolderStructureDto.prototype, "description", void 0);
//# sourceMappingURL=google-drive.dto.js.map