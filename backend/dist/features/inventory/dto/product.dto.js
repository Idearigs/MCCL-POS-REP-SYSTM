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
exports.LowStockReportDto = exports.BulkUpdateStockDto = exports.ProductStatsDto = exports.InventoryStatsDto = exports.ProductResponseDto = exports.StockAdjustmentDto = exports.CreateSupplierDto = exports.CreateCategoryDto = exports.ProductQueryDto = exports.UpdateProductDto = exports.CreateProductDto = exports.InventoryLogType = exports.ProductCondition = exports.JewelryMaterial = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const pagination_dto_1 = require("../../../shared/dto/pagination.dto");
var JewelryMaterial;
(function (JewelryMaterial) {
    JewelryMaterial["GOLD"] = "GOLD";
    JewelryMaterial["YELLOW_GOLD"] = "YELLOW_GOLD";
    JewelryMaterial["WHITE_GOLD"] = "WHITE_GOLD";
    JewelryMaterial["ROSE_GOLD"] = "ROSE_GOLD";
    JewelryMaterial["SILVER"] = "SILVER";
    JewelryMaterial["PLATINUM"] = "PLATINUM";
    JewelryMaterial["DIAMOND"] = "DIAMOND";
    JewelryMaterial["PEARL"] = "PEARL";
    JewelryMaterial["GEMSTONE"] = "GEMSTONE";
    JewelryMaterial["STAINLESS_STEEL"] = "STAINLESS_STEEL";
    JewelryMaterial["OTHER"] = "OTHER";
})(JewelryMaterial || (exports.JewelryMaterial = JewelryMaterial = {}));
var ProductCondition;
(function (ProductCondition) {
    ProductCondition["BRAND_NEW"] = "BRAND_NEW";
    ProductCondition["USED"] = "USED";
})(ProductCondition || (exports.ProductCondition = ProductCondition = {}));
var InventoryLogType;
(function (InventoryLogType) {
    InventoryLogType["SALE"] = "SALE";
    InventoryLogType["PURCHASE"] = "PURCHASE";
    InventoryLogType["ADJUSTMENT"] = "ADJUSTMENT";
    InventoryLogType["DAMAGE"] = "DAMAGE";
    InventoryLogType["RETURN"] = "RETURN";
    InventoryLogType["TRANSFER"] = "TRANSFER";
})(InventoryLogType || (exports.InventoryLogType = InventoryLogType = {}));
class CreateProductDto {
    name;
    description;
    sku;
    barcode;
    rfidTag;
    categoryId;
    supplierId;
    supplierName;
    costPrice;
    sellingPrice;
    discountPrice;
    stockQuantity;
    minStockLevel = 1;
    maxStockLevel;
    material;
    condition;
    weight;
    purity;
    gemstone;
    certification;
    color;
    size;
    location;
    materials;
}
exports.CreateProductDto = CreateProductDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Product name',
        example: 'Diamond Engagement Ring',
        minLength: 1,
        maxLength: 100,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1, { message: 'Product name is required' }),
    (0, class_validator_1.MaxLength)(100, { message: 'Product name must not exceed 100 characters' }),
    __metadata("design:type", String)
], CreateProductDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Product description',
        example: '18K gold ring with 1.5 carat diamond',
        maxLength: 500,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500, { message: 'Description must not exceed 500 characters' }),
    __metadata("design:type", String)
], CreateProductDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Stock Keeping Unit (SKU)',
        example: 'RING-DIA-18K-001',
        minLength: 1,
        maxLength: 50,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1, { message: 'SKU is required' }),
    (0, class_validator_1.MaxLength)(50, { message: 'SKU must not exceed 50 characters' }),
    __metadata("design:type", String)
], CreateProductDto.prototype, "sku", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Product barcode',
        example: '1234567890123',
        maxLength: 50,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(50, { message: 'Barcode must not exceed 50 characters' }),
    __metadata("design:type", String)
], CreateProductDto.prototype, "barcode", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'RFID tag identifier for fast inventory scanning',
        example: 'E2801170000002010DC90E8F',
        maxLength: 100,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100, { message: 'RFID tag must not exceed 100 characters' }),
    __metadata("design:type", String)
], CreateProductDto.prototype, "rfidTag", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Category ID',
        example: 'clv123abc456',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateProductDto.prototype, "categoryId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Supplier ID',
        example: 'clv123abc456',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateProductDto.prototype, "supplierId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Supplier name (free text)',
        example: 'ABC Gems Ltd',
        maxLength: 100,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100, { message: 'Supplier name must not exceed 100 characters' }),
    __metadata("design:type", String)
], CreateProductDto.prototype, "supplierName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Cost price',
        example: 1500.0,
        minimum: 0,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => value !== null && value !== undefined ? parseFloat(value) : value),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.Min)(0, { message: 'Cost price must be positive' }),
    __metadata("design:type", Number)
], CreateProductDto.prototype, "costPrice", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Selling price',
        example: 2500.0,
        minimum: 0,
    }),
    (0, class_transformer_1.Transform)(({ value }) => parseFloat(value)),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.Min)(0, { message: 'Selling price must be positive' }),
    __metadata("design:type", Number)
], CreateProductDto.prototype, "sellingPrice", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Discount price',
        example: 2250.0,
        minimum: 0,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => value !== null && value !== undefined ? parseFloat(value) : value),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.Min)(0, { message: 'Discount price must be positive' }),
    __metadata("design:type", Number)
], CreateProductDto.prototype, "discountPrice", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Stock quantity',
        example: 5,
        minimum: 0,
    }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0, { message: 'Stock quantity must be non-negative' }),
    (0, class_transformer_1.Transform)(({ value }) => parseInt(value)),
    __metadata("design:type", Number)
], CreateProductDto.prototype, "stockQuantity", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Minimum stock level for alerts',
        example: 1,
        minimum: 0,
        default: 1,
    }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0, { message: 'Minimum stock level must be non-negative' }),
    (0, class_transformer_1.Transform)(({ value }) => parseInt(value)),
    __metadata("design:type", Number)
], CreateProductDto.prototype, "minStockLevel", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Maximum stock level',
        example: 50,
        minimum: 1,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1, { message: 'Maximum stock level must be positive' }),
    (0, class_transformer_1.Transform)(({ value }) => parseInt(value)),
    __metadata("design:type", Number)
], CreateProductDto.prototype, "maxStockLevel", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Jewelry material',
        enum: JewelryMaterial,
        example: JewelryMaterial.GOLD,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(JewelryMaterial),
    __metadata("design:type", String)
], CreateProductDto.prototype, "material", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Product condition',
        enum: ProductCondition,
        example: ProductCondition.BRAND_NEW,
        default: ProductCondition.BRAND_NEW,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(ProductCondition),
    __metadata("design:type", String)
], CreateProductDto.prototype, "condition", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Weight in grams',
        example: 5.5,
        minimum: 0,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => value !== null && value !== undefined ? parseFloat(value) : value),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.Min)(0, { message: 'Weight must be positive' }),
    __metadata("design:type", Number)
], CreateProductDto.prototype, "weight", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Material purity (e.g., 14K, 18K, 925)',
        example: '18K',
        maxLength: 20,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(20, { message: 'Purity must not exceed 20 characters' }),
    __metadata("design:type", String)
], CreateProductDto.prototype, "purity", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Gemstone type',
        example: 'Diamond',
        maxLength: 50,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(50, { message: 'Gemstone must not exceed 50 characters' }),
    __metadata("design:type", String)
], CreateProductDto.prototype, "gemstone", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Certification details',
        example: 'GIA Certified',
        maxLength: 100,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100, { message: 'Certification must not exceed 100 characters' }),
    __metadata("design:type", String)
], CreateProductDto.prototype, "certification", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Product color',
        example: 'White Gold',
        maxLength: 30,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(30, { message: 'Color must not exceed 30 characters' }),
    __metadata("design:type", String)
], CreateProductDto.prototype, "color", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Product size',
        example: 'Size 7',
        maxLength: 20,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(20, { message: 'Size must not exceed 20 characters' }),
    __metadata("design:type", String)
], CreateProductDto.prototype, "size", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Storage location in store',
        example: 'Display Case A1',
        maxLength: 50,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(50, { message: 'Location must not exceed 50 characters' }),
    __metadata("design:type", String)
], CreateProductDto.prototype, "location", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'JSON array of material entries (multi-material support)',
        example: '[{"base":"YELLOW_GOLD","carat":"18CT"},{"base":"DIAMOND","detail":"Round"}]',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateProductDto.prototype, "materials", void 0);
class UpdateProductDto extends (0, swagger_1.PartialType)(CreateProductDto) {
    isActive;
    isDamaged;
    damageNotes;
}
exports.UpdateProductDto = UpdateProductDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Product active status',
        example: true,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    (0, class_transformer_1.Transform)(({ value }) => value === 'true' || value === true),
    __metadata("design:type", Boolean)
], UpdateProductDto.prototype, "isActive", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Product damaged status',
        example: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    (0, class_transformer_1.Transform)(({ value }) => value === 'true' || value === true),
    __metadata("design:type", Boolean)
], UpdateProductDto.prototype, "isDamaged", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Damage notes',
        example: 'Minor scratch on surface',
        maxLength: 200,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(200, { message: 'Damage notes must not exceed 200 characters' }),
    __metadata("design:type", String)
], UpdateProductDto.prototype, "damageNotes", void 0);
class ProductQueryDto extends pagination_dto_1.PaginationDto {
    search;
    categoryId;
    supplierId;
    material;
    isActive;
    isDamaged;
    lowStock;
    sortBy;
    sortOrder;
}
exports.ProductQueryDto = ProductQueryDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Search products by name, SKU, or description',
        example: 'diamond ring',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], ProductQueryDto.prototype, "search", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Filter by category ID',
        example: 'clv123abc456',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ProductQueryDto.prototype, "categoryId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Filter by supplier ID',
        example: 'clv123abc456',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ProductQueryDto.prototype, "supplierId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Filter by material',
        enum: JewelryMaterial,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(JewelryMaterial),
    __metadata("design:type", String)
], ProductQueryDto.prototype, "material", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Filter by active status',
        example: true,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    (0, class_transformer_1.Transform)(({ value }) => {
        if (value === 'true' || value === true)
            return true;
        if (value === 'false' || value === false)
            return false;
        return undefined;
    }),
    __metadata("design:type", Boolean)
], ProductQueryDto.prototype, "isActive", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Filter by damaged status',
        example: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    (0, class_transformer_1.Transform)(({ value }) => {
        if (value === 'true' || value === true)
            return true;
        if (value === 'false' || value === false)
            return false;
        return undefined;
    }),
    __metadata("design:type", Boolean)
], ProductQueryDto.prototype, "isDamaged", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Show only low stock items',
        example: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    (0, class_transformer_1.Transform)(({ value }) => {
        if (value === 'true' || value === true)
            return true;
        if (value === 'false' || value === false)
            return false;
        return undefined;
    }),
    __metadata("design:type", Boolean)
], ProductQueryDto.prototype, "lowStock", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Sort field',
        example: 'createdAt',
        enum: [
            'name',
            'sku',
            'sellingPrice',
            'stockQuantity',
            'createdAt',
            'updatedAt',
        ],
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ProductQueryDto.prototype, "sortBy", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Sort order',
        enum: ['asc', 'desc'],
        example: 'desc',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['asc', 'desc']),
    __metadata("design:type", String)
], ProductQueryDto.prototype, "sortOrder", void 0);
class CreateCategoryDto {
    name;
    description;
    parentId;
}
exports.CreateCategoryDto = CreateCategoryDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Category name',
        example: 'Engagement Rings',
        minLength: 1,
        maxLength: 50,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1, { message: 'Category name is required' }),
    (0, class_validator_1.MaxLength)(50, { message: 'Category name must not exceed 50 characters' }),
    __metadata("design:type", String)
], CreateCategoryDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Category description',
        example: 'Beautiful engagement rings for special moments',
        maxLength: 200,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(200, { message: 'Description must not exceed 200 characters' }),
    __metadata("design:type", String)
], CreateCategoryDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Parent category ID',
        example: 'clv123abc456',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCategoryDto.prototype, "parentId", void 0);
class CreateSupplierDto {
    name;
    contactPerson;
    email;
    phone;
    address;
    website;
    notes;
}
exports.CreateSupplierDto = CreateSupplierDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Supplier name',
        example: 'Diamond Wholesalers Ltd',
        minLength: 1,
        maxLength: 100,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1, { message: 'Supplier name is required' }),
    (0, class_validator_1.MaxLength)(100, { message: 'Supplier name must not exceed 100 characters' }),
    __metadata("design:type", String)
], CreateSupplierDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Contact person name',
        example: 'John Smith',
        maxLength: 50,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(50, { message: 'Contact person must not exceed 50 characters' }),
    __metadata("design:type", String)
], CreateSupplierDto.prototype, "contactPerson", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Email address',
        example: 'contact@diamondwholesalers.com',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateSupplierDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Phone number',
        example: '+44207123456',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateSupplierDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Address',
        example: '123 Diamond Street, London',
        maxLength: 200,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(200, { message: 'Address must not exceed 200 characters' }),
    __metadata("design:type", String)
], CreateSupplierDto.prototype, "address", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Website URL',
        example: 'https://www.diamondwholesalers.com',
        maxLength: 100,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100, { message: 'Website must not exceed 100 characters' }),
    __metadata("design:type", String)
], CreateSupplierDto.prototype, "website", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Notes',
        example: 'Reliable supplier for diamonds',
        maxLength: 500,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500, { message: 'Notes must not exceed 500 characters' }),
    __metadata("design:type", String)
], CreateSupplierDto.prototype, "notes", void 0);
class StockAdjustmentDto {
    type;
    quantity;
    reason;
    reference;
}
exports.StockAdjustmentDto = StockAdjustmentDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Adjustment type',
        enum: InventoryLogType,
        example: InventoryLogType.ADJUSTMENT,
    }),
    (0, class_validator_1.IsEnum)(InventoryLogType),
    __metadata("design:type", String)
], StockAdjustmentDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Quantity to adjust (positive or negative)',
        example: -2,
    }),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], StockAdjustmentDto.prototype, "quantity", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Reason for adjustment',
        example: 'Damaged during display',
        maxLength: 200,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(200, { message: 'Reason must not exceed 200 characters' }),
    __metadata("design:type", String)
], StockAdjustmentDto.prototype, "reason", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Reference (sale ID, purchase order, etc.)',
        example: 'SALE-001',
        maxLength: 50,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(50, { message: 'Reference must not exceed 50 characters' }),
    __metadata("design:type", String)
], StockAdjustmentDto.prototype, "reference", void 0);
class ProductResponseDto {
    id;
    name;
    description;
    sku;
    barcode;
    categoryId;
    supplierId;
    supplierName;
    costPrice;
    sellingPrice;
    discountPrice;
    stockQuantity;
    minStockLevel;
    maxStockLevel;
    material;
    condition;
    weight;
    purity;
    gemstone;
    certification;
    color;
    size;
    location;
    materials;
    isActive;
    isDamaged;
    damageNotes;
    createdAt;
    updatedAt;
    category;
    supplier;
    images;
}
exports.ProductResponseDto = ProductResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'clv123abc456' }),
    __metadata("design:type", String)
], ProductResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Diamond Engagement Ring' }),
    __metadata("design:type", String)
], ProductResponseDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '18K gold ring with 1.5 carat diamond' }),
    __metadata("design:type", String)
], ProductResponseDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'RING-DIA-18K-001' }),
    __metadata("design:type", String)
], ProductResponseDto.prototype, "sku", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '1234567890123' }),
    __metadata("design:type", String)
], ProductResponseDto.prototype, "barcode", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'clv123abc456' }),
    __metadata("design:type", String)
], ProductResponseDto.prototype, "categoryId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'clv123abc456' }),
    __metadata("design:type", String)
], ProductResponseDto.prototype, "supplierId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'ABC Gems Ltd' }),
    __metadata("design:type", String)
], ProductResponseDto.prototype, "supplierName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 1500.0 }),
    __metadata("design:type", Number)
], ProductResponseDto.prototype, "costPrice", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 2500.0 }),
    __metadata("design:type", Number)
], ProductResponseDto.prototype, "sellingPrice", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 2250.0 }),
    __metadata("design:type", Number)
], ProductResponseDto.prototype, "discountPrice", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 5 }),
    __metadata("design:type", Number)
], ProductResponseDto.prototype, "stockQuantity", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1 }),
    __metadata("design:type", Number)
], ProductResponseDto.prototype, "minStockLevel", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 50 }),
    __metadata("design:type", Number)
], ProductResponseDto.prototype, "maxStockLevel", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: JewelryMaterial, example: JewelryMaterial.GOLD }),
    __metadata("design:type", String)
], ProductResponseDto.prototype, "material", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        enum: ProductCondition,
        example: ProductCondition.BRAND_NEW,
    }),
    __metadata("design:type", String)
], ProductResponseDto.prototype, "condition", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 5.5 }),
    __metadata("design:type", Number)
], ProductResponseDto.prototype, "weight", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '18K' }),
    __metadata("design:type", String)
], ProductResponseDto.prototype, "purity", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Diamond' }),
    __metadata("design:type", String)
], ProductResponseDto.prototype, "gemstone", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'GIA Certified' }),
    __metadata("design:type", String)
], ProductResponseDto.prototype, "certification", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'White Gold' }),
    __metadata("design:type", String)
], ProductResponseDto.prototype, "color", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Size 7' }),
    __metadata("design:type", String)
], ProductResponseDto.prototype, "size", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Display Case A1' }),
    __metadata("design:type", String)
], ProductResponseDto.prototype, "location", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '[{"base":"YELLOW_GOLD","carat":"18CT"},{"base":"DIAMOND"}]' }),
    __metadata("design:type", String)
], ProductResponseDto.prototype, "materials", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: true }),
    __metadata("design:type", Boolean)
], ProductResponseDto.prototype, "isActive", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: false }),
    __metadata("design:type", Boolean)
], ProductResponseDto.prototype, "isDamaged", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Minor scratch on surface' }),
    __metadata("design:type", String)
], ProductResponseDto.prototype, "damageNotes", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2024-01-15T10:30:00Z' }),
    __metadata("design:type", String)
], ProductResponseDto.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2024-01-15T10:30:00Z' }),
    __metadata("design:type", String)
], ProductResponseDto.prototype, "updatedAt", void 0);
class InventoryStatsDto {
    totalProducts;
    activeProducts;
    inactiveProducts;
    damagedProducts;
    lowStockProducts;
    totalStockValue;
    averageProductValue;
    outOfStockProducts;
    productsByMaterial;
    productsByCategory;
}
exports.InventoryStatsDto = InventoryStatsDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1234 }),
    __metadata("design:type", Number)
], InventoryStatsDto.prototype, "totalProducts", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1150 }),
    __metadata("design:type", Number)
], InventoryStatsDto.prototype, "activeProducts", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 84 }),
    __metadata("design:type", Number)
], InventoryStatsDto.prototype, "inactiveProducts", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 23 }),
    __metadata("design:type", Number)
], InventoryStatsDto.prototype, "damagedProducts", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 45 }),
    __metadata("design:type", Number)
], InventoryStatsDto.prototype, "lowStockProducts", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 5678 }),
    __metadata("design:type", Number)
], InventoryStatsDto.prototype, "totalStockValue", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 234.56 }),
    __metadata("design:type", Number)
], InventoryStatsDto.prototype, "averageProductValue", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 12 }),
    __metadata("design:type", Number)
], InventoryStatsDto.prototype, "outOfStockProducts", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: { GOLD: 234, SILVER: 345, DIAMOND: 123 } }),
    __metadata("design:type", Object)
], InventoryStatsDto.prototype, "productsByMaterial", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: { rings: 123, necklaces: 234, earrings: 156 } }),
    __metadata("design:type", Object)
], InventoryStatsDto.prototype, "productsByCategory", void 0);
class ProductStatsDto extends InventoryStatsDto {
}
exports.ProductStatsDto = ProductStatsDto;
class BulkUpdateStockDto {
    updates;
}
exports.BulkUpdateStockDto = BulkUpdateStockDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => Object),
    __metadata("design:type", Array)
], BulkUpdateStockDto.prototype, "updates", void 0);
class LowStockReportDto {
    id;
    name;
    sku;
    currentStock;
    minStockLevel;
    category;
    sellingPrice;
}
exports.LowStockReportDto = LowStockReportDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'clv123abc456' }),
    __metadata("design:type", String)
], LowStockReportDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Diamond Ring' }),
    __metadata("design:type", String)
], LowStockReportDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'RING-001' }),
    __metadata("design:type", String)
], LowStockReportDto.prototype, "sku", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 2 }),
    __metadata("design:type", Number)
], LowStockReportDto.prototype, "currentStock", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 5 }),
    __metadata("design:type", Number)
], LowStockReportDto.prototype, "minStockLevel", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Rings' }),
    __metadata("design:type", String)
], LowStockReportDto.prototype, "category", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 2500.0 }),
    __metadata("design:type", Number)
], LowStockReportDto.prototype, "sellingPrice", void 0);
//# sourceMappingURL=product.dto.js.map