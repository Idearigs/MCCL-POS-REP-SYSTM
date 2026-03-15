import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsDecimal,
  IsInt,
  IsBoolean,
  IsEnum,
  IsUUID,
  MinLength,
  MaxLength,
  Min,
  Max,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { PaginationDto } from '../../../shared/dto/pagination.dto';

export enum JewelryMaterial {
  GOLD = 'GOLD',
  SILVER = 'SILVER',
  PLATINUM = 'PLATINUM',
  DIAMOND = 'DIAMOND',
  PEARL = 'PEARL',
  GEMSTONE = 'GEMSTONE',
  STAINLESS_STEEL = 'STAINLESS_STEEL',
  OTHER = 'OTHER',
}

export enum ProductCondition {
  BRAND_NEW = 'BRAND_NEW',
  USED = 'USED',
}

export enum InventoryLogType {
  SALE = 'SALE',
  PURCHASE = 'PURCHASE',
  ADJUSTMENT = 'ADJUSTMENT',
  DAMAGE = 'DAMAGE',
  RETURN = 'RETURN',
  TRANSFER = 'TRANSFER',
}

export class CreateProductDto {
  @ApiProperty({
    description: 'Product name',
    example: 'Diamond Engagement Ring',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @MinLength(1, { message: 'Product name is required' })
  @MaxLength(100, { message: 'Product name must not exceed 100 characters' })
  name: string;

  @ApiPropertyOptional({
    description: 'Product description',
    example: '18K gold ring with 1.5 carat diamond',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Description must not exceed 500 characters' })
  description?: string;

  @ApiProperty({
    description: 'Stock Keeping Unit (SKU)',
    example: 'RING-DIA-18K-001',
    minLength: 1,
    maxLength: 50,
  })
  @IsString()
  @MinLength(1, { message: 'SKU is required' })
  @MaxLength(50, { message: 'SKU must not exceed 50 characters' })
  sku: string;

  @ApiPropertyOptional({
    description: 'Product barcode',
    example: '1234567890123',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Barcode must not exceed 50 characters' })
  barcode?: string;

  @ApiPropertyOptional({
    description: 'RFID tag identifier for fast inventory scanning',
    example: 'E2801170000002010DC90E8F',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'RFID tag must not exceed 100 characters' })
  rfidTag?: string;

  @ApiPropertyOptional({
    description: 'Category ID',
    example: 'clv123abc456',
  })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Supplier ID',
    example: 'clv123abc456',
  })
  @IsOptional()
  @IsString()
  supplierId?: string;

  @ApiPropertyOptional({
    description: 'Supplier name (free text)',
    example: 'ABC Gems Ltd',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Supplier name must not exceed 100 characters' })
  supplierName?: string;

  @ApiPropertyOptional({
    description: 'Cost price',
    example: 1500.00,
    minimum: 0,
  })
  @IsOptional()
  @Transform(({ value }) => (value !== null && value !== undefined ? parseFloat(value) : value))
  @Type(() => Number)
  @Min(0, { message: 'Cost price must be positive' })
  costPrice?: number;

  @ApiProperty({
    description: 'Selling price',
    example: 2500.00,
    minimum: 0,
  })
  @Transform(({ value }) => parseFloat(value))
  @Type(() => Number)
  @Min(0, { message: 'Selling price must be positive' })
  sellingPrice: number;

  @ApiPropertyOptional({
    description: 'Discount price',
    example: 2250.00,
    minimum: 0,
  })
  @IsOptional()
  @Transform(({ value }) => (value !== null && value !== undefined ? parseFloat(value) : value))
  @Type(() => Number)
  @Min(0, { message: 'Discount price must be positive' })
  discountPrice?: number;

  @ApiProperty({
    description: 'Stock quantity',
    example: 5,
    minimum: 0,
  })
  @IsInt()
  @Min(0, { message: 'Stock quantity must be non-negative' })
  @Transform(({ value }) => parseInt(value))
  stockQuantity: number;

  @ApiProperty({
    description: 'Minimum stock level for alerts',
    example: 1,
    minimum: 0,
    default: 1,
  })
  @IsInt()
  @Min(0, { message: 'Minimum stock level must be non-negative' })
  @Transform(({ value }) => parseInt(value))
  minStockLevel: number = 1;

  @ApiPropertyOptional({
    description: 'Maximum stock level',
    example: 50,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1, { message: 'Maximum stock level must be positive' })
  @Transform(({ value }) => parseInt(value))
  maxStockLevel?: number;

  @ApiPropertyOptional({
    description: 'Jewelry material',
    enum: JewelryMaterial,
    example: JewelryMaterial.GOLD,
  })
  @IsOptional()
  @IsEnum(JewelryMaterial)
  material?: JewelryMaterial;

  @ApiPropertyOptional({
    description: 'Product condition',
    enum: ProductCondition,
    example: ProductCondition.BRAND_NEW,
    default: ProductCondition.BRAND_NEW,
  })
  @IsOptional()
  @IsEnum(ProductCondition)
  condition?: ProductCondition;

  @ApiPropertyOptional({
    description: 'Weight in grams',
    example: 5.5,
    minimum: 0,
  })
  @IsOptional()
  @Transform(({ value }) => (value !== null && value !== undefined ? parseFloat(value) : value))
  @Type(() => Number)
  @Min(0, { message: 'Weight must be positive' })
  weight?: number;

  @ApiPropertyOptional({
    description: 'Material purity (e.g., 14K, 18K, 925)',
    example: '18K',
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'Purity must not exceed 20 characters' })
  purity?: string;

  @ApiPropertyOptional({
    description: 'Gemstone type',
    example: 'Diamond',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Gemstone must not exceed 50 characters' })
  gemstone?: string;

  @ApiPropertyOptional({
    description: 'Certification details',
    example: 'GIA Certified',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Certification must not exceed 100 characters' })
  certification?: string;

  @ApiPropertyOptional({
    description: 'Product color',
    example: 'White Gold',
    maxLength: 30,
  })
  @IsOptional()
  @IsString()
  @MaxLength(30, { message: 'Color must not exceed 30 characters' })
  color?: string;

  @ApiPropertyOptional({
    description: 'Product size',
    example: 'Size 7',
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'Size must not exceed 20 characters' })
  size?: string;

  @ApiPropertyOptional({
    description: 'Storage location in store',
    example: 'Display Case A1',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Location must not exceed 50 characters' })
  location?: string;
}

export class UpdateProductDto extends PartialType(CreateProductDto) {
  @ApiPropertyOptional({
    description: 'Product active status',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Product damaged status',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isDamaged?: boolean;

  @ApiPropertyOptional({
    description: 'Damage notes',
    example: 'Minor scratch on surface',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'Damage notes must not exceed 200 characters' })
  damageNotes?: string;
}

export class ProductQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Search products by name, SKU, or description',
    example: 'diamond ring',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by category ID',
    example: 'clv123abc456',
  })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Filter by supplier ID',
    example: 'clv123abc456',
  })
  @IsOptional()
  @IsString()
  supplierId?: string;

  @ApiPropertyOptional({
    description: 'Filter by material',
    enum: JewelryMaterial,
  })
  @IsOptional()
  @IsEnum(JewelryMaterial)
  material?: JewelryMaterial;

  @ApiPropertyOptional({
    description: 'Filter by active status',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    // Handle string 'true'/'false' from query params and boolean true/false from objects
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by damaged status',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    // Handle string 'true'/'false' from query params and boolean true/false from objects
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  isDamaged?: boolean;

  @ApiPropertyOptional({
    description: 'Show only low stock items',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    // Handle string 'true'/'false' from query params and boolean true/false from objects
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  lowStock?: boolean;

  @ApiPropertyOptional({
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
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    example: 'desc',
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}

export class CreateCategoryDto {
  @ApiProperty({
    description: 'Category name',
    example: 'Engagement Rings',
    minLength: 1,
    maxLength: 50,
  })
  @IsString()
  @MinLength(1, { message: 'Category name is required' })
  @MaxLength(50, { message: 'Category name must not exceed 50 characters' })
  name: string;

  @ApiPropertyOptional({
    description: 'Category description',
    example: 'Beautiful engagement rings for special moments',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'Description must not exceed 200 characters' })
  description?: string;

  @ApiPropertyOptional({
    description: 'Parent category ID',
    example: 'clv123abc456',
  })
  @IsOptional()
  @IsString()
  parentId?: string;
}

export class CreateSupplierDto {
  @ApiProperty({
    description: 'Supplier name',
    example: 'Diamond Wholesalers Ltd',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @MinLength(1, { message: 'Supplier name is required' })
  @MaxLength(100, { message: 'Supplier name must not exceed 100 characters' })
  name: string;

  @ApiPropertyOptional({
    description: 'Contact person name',
    example: 'John Smith',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Contact person must not exceed 50 characters' })
  contactPerson?: string;

  @ApiPropertyOptional({
    description: 'Email address',
    example: 'contact@diamondwholesalers.com',
  })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({
    description: 'Phone number',
    example: '+44207123456',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Address',
    example: '123 Diamond Street, London',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'Address must not exceed 200 characters' })
  address?: string;

  @ApiPropertyOptional({
    description: 'Website URL',
    example: 'https://www.diamondwholesalers.com',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Website must not exceed 100 characters' })
  website?: string;

  @ApiPropertyOptional({
    description: 'Notes',
    example: 'Reliable supplier for diamonds',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Notes must not exceed 500 characters' })
  notes?: string;
}

export class StockAdjustmentDto {
  @ApiProperty({
    description: 'Adjustment type',
    enum: InventoryLogType,
    example: InventoryLogType.ADJUSTMENT,
  })
  @IsEnum(InventoryLogType)
  type: InventoryLogType;

  @ApiProperty({
    description: 'Quantity to adjust (positive or negative)',
    example: -2,
  })
  @IsInt()
  quantity: number;

  @ApiPropertyOptional({
    description: 'Reason for adjustment',
    example: 'Damaged during display',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'Reason must not exceed 200 characters' })
  reason?: string;

  @ApiPropertyOptional({
    description: 'Reference (sale ID, purchase order, etc.)',
    example: 'SALE-001',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Reference must not exceed 50 characters' })
  reference?: string;
}

export class ProductResponseDto {
  @ApiProperty({ example: 'clv123abc456' })
  id: string;

  @ApiProperty({ example: 'Diamond Engagement Ring' })
  name: string;

  @ApiPropertyOptional({ example: '18K gold ring with 1.5 carat diamond' })
  description?: string;

  @ApiProperty({ example: 'RING-DIA-18K-001' })
  sku: string;

  @ApiPropertyOptional({ example: '1234567890123' })
  barcode?: string;

  @ApiPropertyOptional({ example: 'clv123abc456' })
  categoryId?: string;

  @ApiPropertyOptional({ example: 'clv123abc456' })
  supplierId?: string;

  @ApiPropertyOptional({ example: 'ABC Gems Ltd' })
  supplierName?: string;

  @ApiPropertyOptional({ example: 1500.00 })
  costPrice?: number;

  @ApiProperty({ example: 2500.00 })
  sellingPrice: number;

  @ApiPropertyOptional({ example: 2250.00 })
  discountPrice?: number;

  @ApiProperty({ example: 5 })
  stockQuantity: number;

  @ApiProperty({ example: 1 })
  minStockLevel: number;

  @ApiPropertyOptional({ example: 50 })
  maxStockLevel?: number;

  @ApiPropertyOptional({ enum: JewelryMaterial, example: JewelryMaterial.GOLD })
  material?: JewelryMaterial;

  @ApiPropertyOptional({ enum: ProductCondition, example: ProductCondition.BRAND_NEW })
  condition?: ProductCondition;

  @ApiPropertyOptional({ example: 5.5 })
  weight?: number;

  @ApiPropertyOptional({ example: '18K' })
  purity?: string;

  @ApiPropertyOptional({ example: 'Diamond' })
  gemstone?: string;

  @ApiPropertyOptional({ example: 'GIA Certified' })
  certification?: string;

  @ApiPropertyOptional({ example: 'White Gold' })
  color?: string;

  @ApiPropertyOptional({ example: 'Size 7' })
  size?: string;

  @ApiPropertyOptional({ example: 'Display Case A1' })
  location?: string;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: false })
  isDamaged: boolean;

  @ApiPropertyOptional({ example: 'Minor scratch on surface' })
  damageNotes?: string;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  createdAt: string;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  updatedAt: string;

  // Related data
  category?: {
    id: string;
    name: string;
  };

  supplier?: {
    id: string;
    name: string;
  };

  images?: Array<{
    id: string;
    fileName: string;
    driveViewLink: string;
    isMain: boolean;
  }>;
}

export class InventoryStatsDto {
  @ApiProperty({ example: 1234 })
  totalProducts: number;

  @ApiProperty({ example: 1150 })
  activeProducts: number;

  @ApiProperty({ example: 84 })
  inactiveProducts: number;

  @ApiProperty({ example: 23 })
  damagedProducts: number;

  @ApiProperty({ example: 45 })
  lowStockProducts: number;

  @ApiProperty({ example: 5678 })
  totalStockValue: number;

  @ApiProperty({ example: 234.56 })
  averageProductValue: number;

  @ApiProperty({ example: 12 })
  outOfStockProducts: number;

  @ApiProperty({ example: { GOLD: 234, SILVER: 345, DIAMOND: 123 } })
  productsByMaterial: Record<string, number>;

  @ApiProperty({ example: { rings: 123, necklaces: 234, earrings: 156 } })
  productsByCategory: Record<string, number>;
}

export class ProductStatsDto extends InventoryStatsDto {}

export class BulkUpdateStockDto {
  @ApiProperty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Object)
  updates: Array<{
    productId: string;
    newStock: number;
    reason: string;
  }>;
}

export class LowStockReportDto {
  @ApiProperty({ example: 'clv123abc456' })
  id: string;

  @ApiProperty({ example: 'Diamond Ring' })
  name: string;

  @ApiProperty({ example: 'RING-001' })
  sku: string;

  @ApiProperty({ example: 2 })
  currentStock: number;

  @ApiProperty({ example: 5 })
  minStockLevel: number;

  @ApiProperty({ example: 'Rings' })
  category?: string;

  @ApiProperty({ example: 2500.00 })
  sellingPrice: number;
}