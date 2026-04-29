import { PaginationDto } from '../../../shared/dto/pagination.dto';
export declare enum JewelryMaterial {
    GOLD = "GOLD",
    YELLOW_GOLD = "YELLOW_GOLD",
    WHITE_GOLD = "WHITE_GOLD",
    ROSE_GOLD = "ROSE_GOLD",
    SILVER = "SILVER",
    PLATINUM = "PLATINUM",
    DIAMOND = "DIAMOND",
    PEARL = "PEARL",
    GEMSTONE = "GEMSTONE",
    STAINLESS_STEEL = "STAINLESS_STEEL",
    OTHER = "OTHER"
}
export declare enum ProductCondition {
    BRAND_NEW = "BRAND_NEW",
    USED = "USED"
}
export declare enum InventoryLogType {
    SALE = "SALE",
    PURCHASE = "PURCHASE",
    ADJUSTMENT = "ADJUSTMENT",
    DAMAGE = "DAMAGE",
    RETURN = "RETURN",
    TRANSFER = "TRANSFER"
}
export declare class CreateProductDto {
    name: string;
    description?: string;
    sku: string;
    barcode?: string;
    rfidTag?: string;
    categoryId?: string;
    supplierId?: string;
    supplierName?: string;
    costPrice?: number;
    sellingPrice: number;
    discountPrice?: number;
    stockQuantity: number;
    minStockLevel: number;
    maxStockLevel?: number;
    material?: JewelryMaterial;
    condition?: ProductCondition;
    weight?: number;
    purity?: string;
    gemstone?: string;
    certification?: string;
    color?: string;
    size?: string;
    location?: string;
}
declare const UpdateProductDto_base: import("@nestjs/common").Type<Partial<CreateProductDto>>;
export declare class UpdateProductDto extends UpdateProductDto_base {
    isActive?: boolean;
    isDamaged?: boolean;
    damageNotes?: string;
}
export declare class ProductQueryDto extends PaginationDto {
    search?: string;
    categoryId?: string;
    supplierId?: string;
    material?: JewelryMaterial;
    isActive?: boolean;
    isDamaged?: boolean;
    lowStock?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
export declare class CreateCategoryDto {
    name: string;
    description?: string;
    parentId?: string;
}
export declare class CreateSupplierDto {
    name: string;
    contactPerson?: string;
    email?: string;
    phone?: string;
    address?: string;
    website?: string;
    notes?: string;
}
export declare class StockAdjustmentDto {
    type: InventoryLogType;
    quantity: number;
    reason?: string;
    reference?: string;
}
export declare class ProductResponseDto {
    id: string;
    name: string;
    description?: string;
    sku: string;
    barcode?: string;
    categoryId?: string;
    supplierId?: string;
    supplierName?: string;
    costPrice?: number;
    sellingPrice: number;
    discountPrice?: number;
    stockQuantity: number;
    minStockLevel: number;
    maxStockLevel?: number;
    material?: JewelryMaterial;
    condition?: ProductCondition;
    weight?: number;
    purity?: string;
    gemstone?: string;
    certification?: string;
    color?: string;
    size?: string;
    location?: string;
    isActive: boolean;
    isDamaged: boolean;
    damageNotes?: string;
    createdAt: string;
    updatedAt: string;
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
export declare class InventoryStatsDto {
    totalProducts: number;
    activeProducts: number;
    inactiveProducts: number;
    damagedProducts: number;
    lowStockProducts: number;
    totalStockValue: number;
    averageProductValue: number;
    outOfStockProducts: number;
    productsByMaterial: Record<string, number>;
    productsByCategory: Record<string, number>;
}
export declare class ProductStatsDto extends InventoryStatsDto {
}
export declare class BulkUpdateStockDto {
    updates: Array<{
        productId: string;
        newStock: number;
        reason: string;
    }>;
}
export declare class LowStockReportDto {
    id: string;
    name: string;
    sku: string;
    currentStock: number;
    minStockLevel: number;
    category?: string;
    sellingPrice: number;
}
export {};
