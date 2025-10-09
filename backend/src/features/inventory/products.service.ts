import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CacheService } from '../../core/cache/cache.service';
import { GoogleDriveService } from '../../integrations/google-drive/google-drive.service';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductQueryDto,
  ProductResponseDto,
  CreateCategoryDto,
  CreateSupplierDto,
  StockAdjustmentDto,
  InventoryStatsDto,
  JewelryMaterial,
  InventoryLogType,
} from './dto/product.dto';
import { PaginatedResponseDto } from '../../shared/dto/pagination.dto';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    private prismaService: PrismaService,
    private cacheService: CacheService,
    private googleDriveService: GoogleDriveService,
  ) {}

  /**
   * Create a new product
   */
  async create(
    createProductDto: CreateProductDto,
    tenantId: string,
    userId?: string,
  ): Promise<ProductResponseDto> {
    try {
      // Check if product with same SKU already exists in tenant
      const existingProduct = await this.prismaService.product.findFirst({
        where: {
          sku: createProductDto.sku,
          tenantId,
        },
      });

      if (existingProduct) {
        throw new ConflictException('Product already exists with this SKU');
      }

      // Check if barcode already exists (if provided)
      if (createProductDto.barcode) {
        const existingBarcode = await this.prismaService.product.findFirst({
          where: {
            barcode: createProductDto.barcode,
            tenantId,
          },
        });

        if (existingBarcode) {
          throw new ConflictException('Product already exists with this barcode');
        }
      }

      // Validate category exists (if provided)
      if (createProductDto.categoryId) {
        const category = await this.prismaService.category.findFirst({
          where: { id: createProductDto.categoryId, tenantId },
        });
        if (!category) {
          throw new BadRequestException('Category not found');
        }
      }

      // Validate supplier exists (if provided)
      if (createProductDto.supplierId) {
        const supplier = await this.prismaService.supplier.findFirst({
          where: { id: createProductDto.supplierId, tenantId },
        });
        if (!supplier) {
          throw new BadRequestException('Supplier not found');
        }
      }

      // Create product
      const product = await this.prismaService.product.create({
        data: {
          ...createProductDto,
          tenantId,
          sellingPrice: new Prisma.Decimal(createProductDto.sellingPrice),
          costPrice: createProductDto.costPrice 
            ? new Prisma.Decimal(createProductDto.costPrice) 
            : null,
          discountPrice: createProductDto.discountPrice 
            ? new Prisma.Decimal(createProductDto.discountPrice) 
            : null,
          weight: createProductDto.weight 
            ? new Prisma.Decimal(createProductDto.weight) 
            : null,
        },
        include: {
          category: { select: { id: true, name: true } },
          supplier: { select: { id: true, name: true } },
          images: true,
        },
      });

      // Create inventory log for initial stock
      if (createProductDto.stockQuantity > 0) {
        await this.createInventoryLog(
          tenantId,
          product.id,
          InventoryLogType.PURCHASE,
          createProductDto.stockQuantity,
          0,
          createProductDto.stockQuantity,
          'Initial stock',
          'PRODUCT_CREATION',
        );
      }

      // Clear cache
      await this.clearProductCaches(tenantId);

      this.logger.log(`Product created: ${product.id} (${product.sku}) in tenant ${tenantId}`);

      return this.mapToResponseDto(product);
    } catch (error) {
      this.logger.error('Failed to create product:', error.message);
      throw error;
    }
  }

  /**
   * Get all products with pagination and filtering
   */
  async findAll(
    query: ProductQueryDto,
    tenantId: string,
  ): Promise<PaginatedResponseDto<ProductResponseDto>> {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        categoryId,
        supplierId,
        material,
        isActive,
        isDamaged,
        lowStock,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = query;

      const skip = (page - 1) * limit;

      // Build where clause
      const where: Prisma.ProductWhereInput = {
        tenantId,
        ...(isActive !== undefined && { isActive }),
        ...(isDamaged !== undefined && { isDamaged }),
        ...(categoryId && { categoryId }),
        ...(supplierId && { supplierId }),
        ...(material && { material }),
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { sku: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            { barcode: { contains: search } },
          ],
        }),
      };

      // Add low stock filter
      if (lowStock) {
        where.stockQuantity = { lte: { field: 'minStockLevel' } as any };
      }

      // Check cache first
      const cacheKey = `products:list:${JSON.stringify({ where, skip, limit, sortBy, sortOrder })}`;
      const cachedResult = await this.cacheService.getTenantData<PaginatedResponseDto<ProductResponseDto>>(
        tenantId,
        cacheKey,
      );

      if (cachedResult) {
        return cachedResult;
      }

      // Get products and total count
      const [products, total] = await Promise.all([
        this.prismaService.product.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: {
            category: { select: { id: true, name: true } },
            supplier: { select: { id: true, name: true } },
            images: {
              where: { isMain: true },
              take: 1,
              select: {
                id: true,
                fileName: true,
                driveViewLink: true,
                isMain: true,
              },
            },
          },
        }),
        this.prismaService.product.count({ where }),
      ]);

      const result = new PaginatedResponseDto(
        products.map(product => this.mapToResponseDto(product)),
        page,
        limit,
        total,
      );

      // Cache result for 5 minutes
      await this.cacheService.setTenantData(tenantId, cacheKey, result, 300);

      return result;
    } catch (error) {
      this.logger.error('Failed to fetch products:', error.message);
      throw error;
    }
  }

  /**
   * Get product by ID
   */
  async findOne(id: string, tenantId: string): Promise<ProductResponseDto> {
    try {
      // Check cache first
      const cacheKey = `product:${id}`;
      const cachedProduct = await this.cacheService.getTenantData<ProductResponseDto>(
        tenantId,
        cacheKey,
      );

      if (cachedProduct) {
        return cachedProduct;
      }

      const product = await this.prismaService.product.findFirst({
        where: { id, tenantId },
        include: {
          category: { select: { id: true, name: true } },
          supplier: { select: { id: true, name: true } },
          images: {
            orderBy: [
              { isMain: 'desc' },
              { createdAt: 'asc' },
            ],
            select: {
              id: true,
              fileName: true,
              driveViewLink: true,
              isMain: true,
            },
          },
        },
      });

      if (!product) {
        throw new NotFoundException(`Product with ID ${id} not found`);
      }

      const productDto = this.mapToResponseDto(product);

      // Cache product for 10 minutes
      await this.cacheService.setTenantData(tenantId, cacheKey, productDto, 600);

      return productDto;
    } catch (error) {
      this.logger.error(`Failed to fetch product ${id}:`, error.message);
      throw error;
    }
  }

  /**
   * Update product
   */
  async update(
    id: string,
    updateProductDto: UpdateProductDto,
    tenantId: string,
    userId?: string,
  ): Promise<ProductResponseDto> {
    try {
      // Check if product exists
      const existingProduct = await this.prismaService.product.findFirst({
        where: { id, tenantId },
      });

      if (!existingProduct) {
        throw new NotFoundException(`Product with ID ${id} not found`);
      }

      // Check SKU conflicts (if SKU is being updated)
      if (updateProductDto.sku && updateProductDto.sku !== existingProduct.sku) {
        const skuConflict = await this.prismaService.product.findFirst({
          where: {
            sku: updateProductDto.sku,
            tenantId,
            id: { not: id },
          },
        });

        if (skuConflict) {
          throw new ConflictException('Another product already exists with this SKU');
        }
      }

      // Check barcode conflicts (if barcode is being updated)
      if (updateProductDto.barcode && updateProductDto.barcode !== existingProduct.barcode) {
        const barcodeConflict = await this.prismaService.product.findFirst({
          where: {
            barcode: updateProductDto.barcode,
            tenantId,
            id: { not: id },
          },
        });

        if (barcodeConflict) {
          throw new ConflictException('Another product already exists with this barcode');
        }
      }

      // Handle stock quantity changes
      let stockChanged = false;
      if (updateProductDto.stockQuantity !== undefined && 
          updateProductDto.stockQuantity !== existingProduct.stockQuantity) {
        stockChanged = true;
      }

      const product = await this.prismaService.product.update({
        where: { id },
        data: {
          ...updateProductDto,
          sellingPrice: updateProductDto.sellingPrice 
            ? new Prisma.Decimal(updateProductDto.sellingPrice) 
            : undefined,
          costPrice: updateProductDto.costPrice 
            ? new Prisma.Decimal(updateProductDto.costPrice) 
            : undefined,
          discountPrice: updateProductDto.discountPrice 
            ? new Prisma.Decimal(updateProductDto.discountPrice) 
            : undefined,
          weight: updateProductDto.weight 
            ? new Prisma.Decimal(updateProductDto.weight) 
            : undefined,
        },
        include: {
          category: { select: { id: true, name: true } },
          supplier: { select: { id: true, name: true } },
          images: true,
        },
      });

      // Create inventory log if stock changed
      if (stockChanged && updateProductDto.stockQuantity !== undefined) {
        await this.createInventoryLog(
          tenantId,
          product.id,
          InventoryLogType.ADJUSTMENT,
          updateProductDto.stockQuantity - existingProduct.stockQuantity,
          existingProduct.stockQuantity,
          updateProductDto.stockQuantity,
          'Stock updated via product edit',
          `PRODUCT_UPDATE:${id}`,
        );
      }

      // Clear cache
      await this.cacheService.delTenantData(tenantId, `product:${id}`);
      await this.clearProductCaches(tenantId);

      this.logger.log(`Product updated: ${id} in tenant ${tenantId}`);

      return this.mapToResponseDto(product);
    } catch (error) {
      this.logger.error(`Failed to update product ${id}:`, error.message);
      throw error;
    }
  }

  /**
   * Delete product (soft delete)
   */
  async remove(id: string, tenantId: string, userId?: string): Promise<void> {
    try {
      const product = await this.prismaService.product.findFirst({
        where: { id, tenantId },
      });

      if (!product) {
        throw new NotFoundException(`Product with ID ${id} not found`);
      }

      // Soft delete by setting isActive to false
      await this.prismaService.product.update({
        where: { id },
        data: { isActive: false },
      });

      // Clear cache
      await this.cacheService.delTenantData(tenantId, `product:${id}`);
      await this.clearProductCaches(tenantId);

      this.logger.log(`Product soft deleted: ${id} in tenant ${tenantId}`);
    } catch (error) {
      this.logger.error(`Failed to delete product ${id}:`, error.message);
      throw error;
    }
  }

  /**
   * Adjust product stock
   */
  async adjustStock(
    id: string,
    stockAdjustmentDto: StockAdjustmentDto,
    tenantId: string,
    userId: string,
  ): Promise<ProductResponseDto> {
    try {
      const product = await this.prismaService.product.findFirst({
        where: { id, tenantId },
      });

      if (!product) {
        throw new NotFoundException(`Product with ID ${id} not found`);
      }

      const oldQuantity = product.stockQuantity;
      const newQuantity = oldQuantity + stockAdjustmentDto.quantity;

      if (newQuantity < 0) {
        throw new BadRequestException('Stock quantity cannot be negative');
      }

      // Update product stock
      const updatedProduct = await this.prismaService.product.update({
        where: { id },
        data: { stockQuantity: newQuantity },
        include: {
          category: { select: { id: true, name: true } },
          supplier: { select: { id: true, name: true } },
          images: true,
        },
      });

      // Create inventory log
      await this.createInventoryLog(
        tenantId,
        product.id,
        stockAdjustmentDto.type,
        stockAdjustmentDto.quantity,
        oldQuantity,
        newQuantity,
        stockAdjustmentDto.reason,
        stockAdjustmentDto.reference,
      );

      // Clear cache
      await this.cacheService.delTenantData(tenantId, `product:${id}`);
      await this.clearProductCaches(tenantId);

      this.logger.log(
        `Stock adjusted for product ${id}: ${oldQuantity} -> ${newQuantity} (${stockAdjustmentDto.quantity > 0 ? '+' : ''}${stockAdjustmentDto.quantity})`
      );

      return this.mapToResponseDto(updatedProduct);
    } catch (error) {
      this.logger.error(`Failed to adjust stock for product ${id}:`, error.message);
      throw error;
    }
  }

  /**
   * Get low stock report
   */
  async getLowStockReport(tenantId: string): Promise<any[]> {
    try {
      const products = await this.getLowStockProducts(tenantId);
      return products.map(product => ({
        id: product.id,
        name: product.name,
        sku: product.sku,
        currentStock: product.stockQuantity,
        minStockLevel: product.minStockLevel,
        category: product.category?.name,
        sellingPrice: product.sellingPrice
      }));
    } catch (error) {
      this.logger.error('Failed to get low stock report:', error.message);
      throw error;
    }
  }

  /**
   * Get categories
   */
  async getCategories(tenantId: string): Promise<string[]> {
    try {
      const categories = await this.prismaService.category.findMany({
        where: { tenantId, isActive: true },
        select: { name: true },
        orderBy: { name: 'asc' }
      });
      return categories.map(cat => cat.name);
    } catch (error) {
      this.logger.error('Failed to get categories:', error.message);
      throw error;
    }
  }

  /**
   * Get materials
   */
  async getMaterials(tenantId: string): Promise<string[]> {
    try {
      const materials = await this.prismaService.product.findMany({
        where: { tenantId, isActive: true, material: { not: null } },
        select: { material: true },
        distinct: ['material'],
        orderBy: { material: 'asc' }
      });
      return materials.map(m => m.material).filter(Boolean) as string[];
    } catch (error) {
      this.logger.error('Failed to get materials:', error.message);
      throw error;
    }
  }

  /**
   * Get stock history
   */
  async getStockHistory(productId: string, tenantId: string): Promise<any[]> {
    try {
      const logs = await this.getInventoryLogs(productId, tenantId);
      return logs;
    } catch (error) {
      this.logger.error('Failed to get stock history:', error.message);
      throw error;
    }
  }

  /**
   * Bulk update stock
   */
  async bulkUpdateStock(bulkUpdateDto: any, tenantId: string, userId?: string): Promise<{ updated: number; errors: any[] }> {
    try {
      const results = {
        updated: 0,
        errors: []
      };

      for (const update of bulkUpdateDto.updates) {
        try {
          await this.prismaService.product.update({
            where: { id: update.productId, tenantId },
            data: { stockQuantity: update.newStock }
          });

          // Create inventory log
          await this.createInventoryLog(
            tenantId,
            update.productId,
            'ADJUSTMENT' as any,
            update.newStock,
            0, // We don't have the old quantity here
            update.newStock,
            update.reason,
            'BULK_UPDATE'
          );

          results.updated++;
        } catch (error) {
          results.errors.push({
            productId: update.productId,
            error: error.message
          });
        }
      }

      return results;
    } catch (error) {
      this.logger.error('Failed to bulk update stock:', error.message);
      throw error;
    }
  }

  /**
   * Get low stock products
   */
  async getLowStockProducts(tenantId: string): Promise<ProductResponseDto[]> {
    try {
      // Check cache first
      const cacheKey = 'products:low_stock';
      const cachedResult = await this.cacheService.getTenantData<ProductResponseDto[]>(
        tenantId,
        cacheKey,
      );

      if (cachedResult) {
        return cachedResult;
      }

      const products = await this.prismaService.product.findMany({
        where: {
          tenantId,
          isActive: true,
        },
        include: {
          category: { select: { id: true, name: true } },
          supplier: { select: { id: true, name: true } },
          images: {
            where: { isMain: true },
            take: 1,
          },
        },
        orderBy: [
          { stockQuantity: 'asc' },
          { name: 'asc' },
        ],
      });

      // Filter low stock products in JavaScript since Prisma doesn't support comparing fields directly
      const lowStockProducts = products.filter(product => product.stockQuantity <= product.minStockLevel);

      const result = lowStockProducts.map(product => this.mapToResponseDto(product));

      // Cache for 5 minutes
      await this.cacheService.setTenantData(tenantId, cacheKey, result, 300);

      return result;
    } catch (error) {
      this.logger.error('Failed to fetch low stock products:', error.message);
      throw error;
    }
  }

  /**
   * Get inventory statistics
   */
  async getStats(tenantId: string): Promise<InventoryStatsDto> {
    try {
      // Check cache first
      const cacheKey = 'products:stats';
      const cachedStats = await this.cacheService.getTenantData<InventoryStatsDto>(
        tenantId,
        cacheKey,
      );

      if (cachedStats) {
        return cachedStats;
      }

      const [
        totalProducts,
        activeProducts,
        damagedProducts,
        lowStockProducts,
        outOfStockProducts,
        stockValue,
        materialStats,
        categoryStats,
      ] = await Promise.all([
        this.prismaService.product.count({ where: { tenantId } }),
        this.prismaService.product.count({ where: { tenantId, isActive: true } }),
        this.prismaService.product.count({ where: { tenantId, isDamaged: true } }),
        // Low stock count - we'll calculate this differently
        0,
        this.prismaService.product.count({
          where: { tenantId, isActive: true, stockQuantity: 0 },
        }),
        this.prismaService.product.aggregate({
          where: { tenantId, isActive: true },
          _sum: {
            sellingPrice: true,
          },
        }),
        this.getProductsByMaterial(tenantId),
        this.getProductsByCategory(tenantId),
      ]);

      // Calculate low stock products properly
      const allActiveProducts = await this.prismaService.product.findMany({
        where: { tenantId, isActive: true },
        select: { stockQuantity: true, minStockLevel: true }
      });
      const actualLowStockProducts = allActiveProducts.filter(p => p.stockQuantity <= p.minStockLevel).length;

      const stats: InventoryStatsDto = {
        totalProducts,
        activeProducts,
        inactiveProducts: totalProducts - activeProducts,
        damagedProducts,
        lowStockProducts: actualLowStockProducts,
        outOfStockProducts,
        totalStockValue: Number(stockValue._sum.sellingPrice || 0),
        averageProductValue: totalProducts > 0 
          ? Number(stockValue._sum.sellingPrice || 0) / totalProducts 
          : 0,
        productsByMaterial: materialStats,
        productsByCategory: categoryStats,
      };

      // Cache stats for 15 minutes
      await this.cacheService.setTenantData(tenantId, cacheKey, stats, 900);

      return stats;
    } catch (error) {
      this.logger.error('Failed to get inventory stats:', error.message);
      throw error;
    }
  }

  /**
   * Create category
   */
  async createCategory(
    createCategoryDto: CreateCategoryDto,
    tenantId: string,
  ): Promise<any> {
    try {
      const category = await this.prismaService.category.create({
        data: {
          ...createCategoryDto,
          tenantId,
        },
      });

      await this.clearProductCaches(tenantId);

      this.logger.log(`Category created: ${category.id} (${category.name}) in tenant ${tenantId}`);

      return category;
    } catch (error) {
      this.logger.error('Failed to create category:', error.message);
      throw error;
    }
  }

  /**
   * Create supplier
   */
  async createSupplier(
    createSupplierDto: CreateSupplierDto,
    tenantId: string,
  ): Promise<any> {
    try {
      const supplier = await this.prismaService.supplier.create({
        data: {
          ...createSupplierDto,
          tenantId,
        },
      });

      await this.clearProductCaches(tenantId);

      this.logger.log(`Supplier created: ${supplier.id} (${supplier.name}) in tenant ${tenantId}`);

      return supplier;
    } catch (error) {
      this.logger.error('Failed to create supplier:', error.message);
      throw error;
    }
  }

  /**
   * Find product by barcode
   */
  async findByBarcode(barcode: string, tenantId: string): Promise<ProductResponseDto> {
    const product = await this.prismaService.product.findFirst({
      where: { barcode, tenantId, isActive: true },
      include: {
        category: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true } },
        images: true,
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with barcode ${barcode} not found`);
    }

    return this.mapToResponseDto(product);
  }

  /**
   * Find product by SKU
   */
  async findBySku(sku: string, tenantId: string): Promise<ProductResponseDto> {
    const product = await this.prismaService.product.findFirst({
      where: { sku, tenantId, isActive: true },
      include: {
        category: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true } },
        images: true,
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with SKU ${sku} not found`);
    }

    return this.mapToResponseDto(product);
  }

  /**
   * Upload product image
   */
  async uploadImage(id: string, file: any, tenantId: string, userId?: string): Promise<{ imageUrl: string }> {
    // This would integrate with the GoogleDriveService
    // For now, return a placeholder
    return { imageUrl: 'placeholder-url' };
  }

  /**
   * Restore product (undelete)
   */
  async restore(id: string, tenantId: string, userId?: string): Promise<ProductResponseDto> {
    const product = await this.prismaService.product.update({
      where: { id, tenantId },
      data: { isActive: true },
      include: {
        category: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true } },
        images: true,
      },
    });

    return this.mapToResponseDto(product);
  }

  /**
   * Get product inventory logs
   */
  async getInventoryLogs(productId: string, tenantId: string): Promise<any[]> {
    try {
      const logs = await this.prismaService.inventoryLog.findMany({
        where: {
          productId,
          tenantId,
        },
        orderBy: { createdAt: 'desc' },
        take: 50, // Last 50 logs
      });

      return logs;
    } catch (error) {
      this.logger.error(`Failed to get inventory logs for product ${productId}:`, error.message);
      throw error;
    }
  }

  /**
   * Private: Create inventory log
   */
  private async createInventoryLog(
    tenantId: string,
    productId: string,
    type: InventoryLogType,
    quantity: number,
    previousQty: number,
    newQty: number,
    reason?: string,
    reference?: string,
  ): Promise<void> {
    await this.prismaService.inventoryLog.create({
      data: {
        tenantId,
        productId,
        type,
        quantity,
        previousQty,
        newQty,
        reason,
        reference,
      },
    });
  }

  /**
   * Private: Get products by material
   */
  private async getProductsByMaterial(tenantId: string): Promise<Record<string, number>> {
    const results = await this.prismaService.product.groupBy({
      by: ['material'],
      where: { tenantId, isActive: true },
      _count: { material: true },
    });

    const stats: Record<string, number> = {};
    results.forEach(result => {
      if (result.material) {
        stats[result.material] = result._count.material;
      }
    });

    return stats;
  }

  /**
   * Private: Get products by category
   */
  private async getProductsByCategory(tenantId: string): Promise<Record<string, number>> {
    const results = await this.prismaService.product.findMany({
      where: { tenantId, isActive: true },
      include: {
        category: { select: { name: true } },
      },
    });

    const stats: Record<string, number> = {};
    results.forEach(product => {
      const categoryName = product.category?.name || 'Uncategorized';
      stats[categoryName] = (stats[categoryName] || 0) + 1;
    });

    return stats;
  }

  /**
   * Private: Clear product-related caches
   */
  private async clearProductCaches(tenantId: string): Promise<void> {
    await Promise.all([
      this.cacheService.delTenantData(tenantId, 'products:list'),
      this.cacheService.delTenantData(tenantId, 'products:stats'),
      this.cacheService.delTenantData(tenantId, 'products:low_stock'),
    ]);
  }

  /**
   * Private: Map product to response DTO
   */
  private mapToResponseDto(product: any): ProductResponseDto {
    return {
      id: product.id,
      name: product.name,
      description: product.description,
      sku: product.sku,
      barcode: product.barcode,
      categoryId: product.categoryId,
      supplierId: product.supplierId,
      costPrice: product.costPrice ? Number(product.costPrice) : undefined,
      sellingPrice: Number(product.sellingPrice),
      discountPrice: product.discountPrice ? Number(product.discountPrice) : undefined,
      stockQuantity: product.stockQuantity,
      minStockLevel: product.minStockLevel,
      maxStockLevel: product.maxStockLevel,
      material: product.material,
      weight: product.weight ? Number(product.weight) : undefined,
      purity: product.purity,
      gemstone: product.gemstone,
      certification: product.certification,
      color: product.color,
      size: product.size,
      location: product.location,
      isActive: product.isActive,
      isDamaged: product.isDamaged,
      damageNotes: product.damageNotes,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
      category: product.category,
      supplier: product.supplier,
      images: product.images,
    };
  }
}