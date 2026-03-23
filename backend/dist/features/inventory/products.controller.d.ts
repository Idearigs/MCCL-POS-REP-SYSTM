import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto, ProductQueryDto, ProductResponseDto, StockAdjustmentDto, ProductStatsDto, BulkUpdateStockDto } from './dto/product.dto';
import { PaginatedResponseDto } from '../../shared/dto/pagination.dto';
export declare class ProductsController {
    private readonly productsService;
    constructor(productsService: ProductsService);
    create(createProductDto: CreateProductDto, tenantId: string, userId: string): Promise<ProductResponseDto>;
    findAll(query: ProductQueryDto, tenantId: string): Promise<PaginatedResponseDto<ProductResponseDto>>;
    getStats(tenantId: string): Promise<ProductStatsDto>;
    getLowStockReport(tenantId: string): Promise<any>;
    getCategories(tenantId: string): Promise<{
        id: string;
        name: string;
    }[]>;
    getMaterials(tenantId: string): Promise<string[]>;
    generateSku(prefix: string, tenantId: string): Promise<{
        sku: string;
    }>;
    findOne(id: string, tenantId: string): Promise<ProductResponseDto>;
    getStockHistory(id: string, tenantId: string): Promise<any[]>;
    update(id: string, updateProductDto: UpdateProductDto, tenantId: string, userId: string): Promise<ProductResponseDto>;
    adjustStock(id: string, stockAdjustmentDto: StockAdjustmentDto, tenantId: string, userId: string): Promise<ProductResponseDto>;
    bulkUpdateStock(bulkUpdateDto: BulkUpdateStockDto, tenantId: string, userId: string): Promise<{
        updated: number;
        errors: any[];
    }>;
    bulkAssignRFID(body: {
        assignments: Array<{
            sku: string;
            rfidTag: string;
        }>;
    }, tenantId: string, userId: string): Promise<{
        success: number;
        failed: number;
        errors: any[];
    }>;
    uploadImage(id: string, file: any, tenantId: string, userId: string): Promise<{
        imageUrl: string;
        imageId: string;
    }>;
    remove(id: string, tenantId: string, userId: string): Promise<void>;
    restore(id: string, tenantId: string, userId: string): Promise<ProductResponseDto>;
    findByBarcode(barcode: string, tenantId: string): Promise<ProductResponseDto>;
    findBySku(sku: string, tenantId: string): Promise<ProductResponseDto>;
}
