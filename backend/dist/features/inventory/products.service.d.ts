import { PrismaService } from '../../core/prisma/prisma.service';
import { CacheService } from '../../core/cache/cache.service';
import { GoogleDriveService } from '../../integrations/google-drive/google-drive.service';
import { FileStorageService } from '../../integrations/file-storage/file-storage.service';
import { CreateProductDto, UpdateProductDto, ProductQueryDto, ProductResponseDto, CreateCategoryDto, CreateSupplierDto, StockAdjustmentDto, InventoryStatsDto } from './dto/product.dto';
import { PaginatedResponseDto } from '../../shared/dto/pagination.dto';
export declare class ProductsService {
    private prismaService;
    private cacheService;
    private googleDriveService;
    private fileStorageService;
    private readonly logger;
    constructor(prismaService: PrismaService, cacheService: CacheService, googleDriveService: GoogleDriveService, fileStorageService: FileStorageService);
    create(createProductDto: CreateProductDto, tenantId: string, userId?: string): Promise<ProductResponseDto>;
    findAll(query: ProductQueryDto, tenantId: string): Promise<PaginatedResponseDto<ProductResponseDto>>;
    findOne(id: string, tenantId: string): Promise<ProductResponseDto>;
    update(id: string, updateProductDto: UpdateProductDto, tenantId: string, userId?: string): Promise<ProductResponseDto>;
    remove(id: string, tenantId: string, userId?: string): Promise<void>;
    adjustStock(id: string, stockAdjustmentDto: StockAdjustmentDto, tenantId: string, userId: string): Promise<ProductResponseDto>;
    getLowStockReport(tenantId: string): Promise<any[]>;
    getCategories(tenantId: string): Promise<Array<{
        id: string;
        name: string;
    }>>;
    getMaterials(tenantId: string): Promise<string[]>;
    generateUniqueSku(tenantId: string, prefix?: string): Promise<{
        sku: string;
    }>;
    getStockHistory(productId: string, tenantId: string): Promise<any[]>;
    bulkUpdateStock(bulkUpdateDto: any, tenantId: string, userId?: string): Promise<{
        updated: number;
        errors: any[];
    }>;
    bulkAssignRFID(assignments: Array<{
        sku: string;
        rfidTag: string;
    }>, tenantId: string, userId?: string): Promise<{
        success: number;
        failed: number;
        errors: any[];
    }>;
    getLowStockProducts(tenantId: string): Promise<ProductResponseDto[]>;
    getStats(tenantId: string): Promise<InventoryStatsDto>;
    createCategory(createCategoryDto: CreateCategoryDto, tenantId: string): Promise<any>;
    createSupplier(createSupplierDto: CreateSupplierDto, tenantId: string): Promise<any>;
    findByBarcode(barcode: string, tenantId: string): Promise<ProductResponseDto>;
    findBySku(sku: string, tenantId: string): Promise<ProductResponseDto>;
    uploadImage(id: string, file: any, tenantId: string, userId?: string): Promise<{
        imageUrl: string;
        imageId: string;
    }>;
    restore(id: string, tenantId: string, userId?: string): Promise<ProductResponseDto>;
    getInventoryLogs(productId: string, tenantId: string): Promise<any[]>;
    private createInventoryLog;
    private getProductsByMaterial;
    private getProductsByCategory;
    private clearProductCaches;
    private mapToResponseDto;
}
