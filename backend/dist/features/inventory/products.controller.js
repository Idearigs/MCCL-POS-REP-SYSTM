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
exports.ProductsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const throttler_1 = require("@nestjs/throttler");
const platform_express_1 = require("@nestjs/platform-express");
const products_service_1 = require("./products.service");
const jwt_auth_guard_1 = require("../../shared/guards/jwt-auth.guard");
const tenant_guard_1 = require("../../shared/guards/tenant.guard");
const user_decorator_1 = require("../../shared/decorators/user.decorator");
const tenant_decorator_1 = require("../../shared/decorators/tenant.decorator");
const product_dto_1 = require("./dto/product.dto");
const pagination_dto_1 = require("../../shared/dto/pagination.dto");
let ProductsController = class ProductsController {
    productsService;
    constructor(productsService) {
        this.productsService = productsService;
    }
    async create(createProductDto, tenantId, userId) {
        return this.productsService.create(createProductDto, tenantId, userId);
    }
    async findAll(query, tenantId) {
        return this.productsService.findAll(query, tenantId);
    }
    async getStats(tenantId) {
        return this.productsService.getStats(tenantId);
    }
    async getLowStockReport(tenantId) {
        return this.productsService.getLowStockReport(tenantId);
    }
    async getCategories(tenantId) {
        return this.productsService.getCategories(tenantId);
    }
    async getMaterials(tenantId) {
        return this.productsService.getMaterials(tenantId);
    }
    async generateSku(prefix = 'JWL', tenantId) {
        return this.productsService.generateUniqueSku(tenantId, prefix);
    }
    async findOne(id, tenantId) {
        return this.productsService.findOne(id, tenantId);
    }
    async getStockHistory(id, tenantId) {
        return this.productsService.getStockHistory(id, tenantId);
    }
    async update(id, updateProductDto, tenantId, userId) {
        return this.productsService.update(id, updateProductDto, tenantId, userId);
    }
    async adjustStock(id, stockAdjustmentDto, tenantId, userId) {
        return this.productsService.adjustStock(id, stockAdjustmentDto, tenantId, userId);
    }
    async bulkUpdateStock(bulkUpdateDto, tenantId, userId) {
        return this.productsService.bulkUpdateStock(bulkUpdateDto, tenantId, userId);
    }
    async bulkAssignRFID(body, tenantId, userId) {
        return this.productsService.bulkAssignRFID(body.assignments, tenantId, userId);
    }
    async uploadImage(id, file, tenantId, userId) {
        return this.productsService.uploadImage(id, file, tenantId, userId);
    }
    async remove(id, tenantId, userId) {
        return this.productsService.remove(id, tenantId, userId);
    }
    async restore(id, tenantId, userId) {
        return this.productsService.restore(id, tenantId, userId);
    }
    async findByBarcode(barcode, tenantId) {
        return this.productsService.findByBarcode(barcode, tenantId);
    }
    async findBySku(sku, tenantId) {
        return this.productsService.findBySku(sku, tenantId);
    }
};
exports.ProductsController = ProductsController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({
        summary: 'Create a new product',
        description: 'Create a new jewelry product with inventory tracking',
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Product created successfully',
        type: product_dto_1.ProductResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Invalid input data',
    }),
    (0, swagger_1.ApiResponse)({
        status: 409,
        description: 'Product with same SKU or barcode already exists',
    }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, tenant_decorator_1.TenantId)()),
    __param(2, (0, user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [product_dto_1.CreateProductDto, String, String]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Get all products',
        description: 'Retrieve products with advanced filtering, search, and pagination',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Products retrieved successfully',
        type: (pagination_dto_1.PaginatedResponseDto),
    }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number, example: 1 }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number, example: 10 }),
    (0, swagger_1.ApiQuery)({
        name: 'search',
        required: false,
        type: String,
        example: 'Gold Ring',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'category',
        required: false,
        type: String,
        example: 'RING',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'material',
        required: false,
        type: String,
        example: 'GOLD',
    }),
    (0, swagger_1.ApiQuery)({ name: 'isActive', required: false, type: Boolean, example: true }),
    (0, swagger_1.ApiQuery)({
        name: 'lowStock',
        required: false,
        type: Boolean,
        example: false,
    }),
    (0, swagger_1.ApiQuery)({ name: 'minPrice', required: false, type: Number, example: 100 }),
    (0, swagger_1.ApiQuery)({ name: 'maxPrice', required: false, type: Number, example: 5000 }),
    (0, swagger_1.ApiQuery)({
        name: 'sortBy',
        required: false,
        type: String,
        example: 'createdAt',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'sortOrder',
        required: false,
        enum: ['asc', 'desc'],
        example: 'desc',
    }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, tenant_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [product_dto_1.ProductQueryDto, String]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('stats'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get product statistics',
        description: 'Retrieve comprehensive product and inventory statistics',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Product statistics retrieved successfully',
        type: product_dto_1.ProductStatsDto,
    }),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)('low-stock'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get low stock report',
        description: 'Retrieve products that are low in stock or out of stock',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Low stock report generated successfully',
        type: product_dto_1.LowStockReportDto,
    }),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "getLowStockReport", null);
__decorate([
    (0, common_1.Get)('categories'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get product categories',
        description: 'Retrieve all product categories with counts',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Product categories retrieved successfully',
    }),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "getCategories", null);
__decorate([
    (0, common_1.Get)('materials'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get product materials',
        description: 'Retrieve all product materials with counts',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Product materials retrieved successfully',
    }),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "getMaterials", null);
__decorate([
    (0, common_1.Get)('generate-sku'),
    (0, swagger_1.ApiOperation)({
        summary: 'Generate unique SKU',
        description: 'Generate a unique SKU for a new product',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'prefix',
        required: false,
        type: String,
        example: 'JWL',
        description: 'Optional prefix for the SKU (default: JWL)',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Unique SKU generated successfully',
        schema: {
            type: 'object',
            properties: {
                sku: { type: 'string', example: 'JWL-20251013-001' },
            },
        },
    }),
    __param(0, (0, common_1.Query)('prefix')),
    __param(1, (0, tenant_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "generateSku", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get product by ID',
        description: 'Retrieve a specific product with full details',
    }),
    (0, swagger_1.ApiParam)({
        name: 'id',
        description: 'Product ID',
        example: 'clv123abc456',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Product retrieved successfully',
        type: product_dto_1.ProductResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Product not found',
    }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, tenant_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)(':id/stock-history'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get product stock adjustment history',
        description: 'Retrieve complete stock adjustment history for a product',
    }),
    (0, swagger_1.ApiParam)({
        name: 'id',
        description: 'Product ID',
        example: 'clv123abc456',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Stock history retrieved successfully',
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Product not found',
    }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, tenant_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "getStockHistory", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, swagger_1.ApiOperation)({
        summary: 'Update product',
        description: 'Update product information',
    }),
    (0, swagger_1.ApiParam)({
        name: 'id',
        description: 'Product ID',
        example: 'clv123abc456',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Product updated successfully',
        type: product_dto_1.ProductResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Product not found',
    }),
    (0, swagger_1.ApiResponse)({
        status: 409,
        description: 'Conflict with existing product data',
    }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, tenant_decorator_1.TenantId)()),
    __param(3, (0, user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, product_dto_1.UpdateProductDto, String, String]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "update", null);
__decorate([
    (0, common_1.Post)(':id/adjust-stock'),
    (0, swagger_1.ApiOperation)({
        summary: 'Adjust product stock',
        description: 'Increase or decrease product stock with reason tracking',
    }),
    (0, swagger_1.ApiParam)({
        name: 'id',
        description: 'Product ID',
        example: 'clv123abc456',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Stock adjusted successfully',
        type: product_dto_1.ProductResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Invalid stock adjustment data',
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Product not found',
    }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, tenant_decorator_1.TenantId)()),
    __param(3, (0, user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, product_dto_1.StockAdjustmentDto, String, String]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "adjustStock", null);
__decorate([
    (0, common_1.Post)('bulk-update-stock'),
    (0, swagger_1.ApiOperation)({
        summary: 'Bulk update product stock',
        description: 'Update stock levels for multiple products at once',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Bulk stock update completed successfully',
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Invalid bulk update data',
    }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, tenant_decorator_1.TenantId)()),
    __param(2, (0, user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [product_dto_1.BulkUpdateStockDto, String, String]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "bulkUpdateStock", null);
__decorate([
    (0, common_1.Post)('bulk-assign-rfid'),
    (0, swagger_1.ApiOperation)({
        summary: 'Bulk assign RFID tags to products',
        description: 'Assign RFID tags to multiple products at once using SKU mapping. Perfect for when you purchase RFID tags and need to assign them to existing inventory.',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Bulk RFID assignment completed successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'number', example: 150 },
                failed: { type: 'number', example: 2 },
                errors: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            sku: { type: 'string', example: 'JWL-001' },
                            error: {
                                type: 'string',
                                example: 'Product not found with this SKU',
                            },
                        },
                    },
                },
            },
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Invalid bulk assignment data',
    }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, tenant_decorator_1.TenantId)()),
    __param(2, (0, user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "bulkAssignRFID", null);
__decorate([
    (0, common_1.Post)(':id/upload-image'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('image')),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiOperation)({
        summary: 'Upload product image',
        description: 'Upload and store product image to Google Drive',
    }),
    (0, swagger_1.ApiParam)({
        name: 'id',
        description: 'Product ID',
        example: 'clv123abc456',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Image uploaded successfully',
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Invalid file or file too large',
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Product not found',
    }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, tenant_decorator_1.TenantId)()),
    __param(3, (0, user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, String]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "uploadImage", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, swagger_1.ApiOperation)({
        summary: 'Delete product (soft delete)',
        description: 'Soft delete a product by setting isActive to false',
    }),
    (0, swagger_1.ApiParam)({
        name: 'id',
        description: 'Product ID',
        example: 'clv123abc456',
    }),
    (0, swagger_1.ApiResponse)({
        status: 204,
        description: 'Product deleted successfully',
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Product not found',
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Cannot delete product with existing sales',
    }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, tenant_decorator_1.TenantId)()),
    __param(2, (0, user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)(':id/restore'),
    (0, swagger_1.ApiOperation)({
        summary: 'Restore deleted product',
        description: 'Restore a soft-deleted product by setting isActive to true',
    }),
    (0, swagger_1.ApiParam)({
        name: 'id',
        description: 'Product ID',
        example: 'clv123abc456',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Product restored successfully',
        type: product_dto_1.ProductResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Product not found',
    }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, tenant_decorator_1.TenantId)()),
    __param(2, (0, user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "restore", null);
__decorate([
    (0, common_1.Get)('barcode/:barcode'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get product by barcode',
        description: 'Retrieve a product using its barcode for POS operations',
    }),
    (0, swagger_1.ApiParam)({
        name: 'barcode',
        description: 'Product barcode',
        example: '1234567890123',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Product found by barcode',
        type: product_dto_1.ProductResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Product not found',
    }),
    __param(0, (0, common_1.Param)('barcode')),
    __param(1, (0, tenant_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "findByBarcode", null);
__decorate([
    (0, common_1.Get)('sku/:sku'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get product by SKU',
        description: 'Retrieve a product using its SKU',
    }),
    (0, swagger_1.ApiParam)({
        name: 'sku',
        description: 'Product SKU',
        example: 'JWL-RING-001',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Product found by SKU',
        type: product_dto_1.ProductResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Product not found',
    }),
    __param(0, (0, common_1.Param)('sku')),
    __param(1, (0, tenant_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "findBySku", null);
exports.ProductsController = ProductsController = __decorate([
    (0, swagger_1.ApiTags)('Products'),
    (0, common_1.Controller)('products'),
    (0, common_1.UseGuards)(throttler_1.ThrottlerGuard, jwt_auth_guard_1.JwtAuthGuard, tenant_guard_1.TenantGuard),
    (0, swagger_1.ApiBearerAuth)('access-token'),
    __metadata("design:paramtypes", [products_service_1.ProductsService])
], ProductsController);
//# sourceMappingURL=products.controller.js.map