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
import { FileStorageService } from '../../integrations/file-storage/file-storage.service';
import { generateId } from '../../shared/utils/id-generator';
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
    private fileStorageService: FileStorageService,
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
      // Check if product with same SKU already exists in tenant (only check active products)
      const existingProduct = await this.prismaService.products.findFirst({
        where: {
          sku: createProductDto.sku,
          tenantId,
          isActive: true, // Only check active products for SKU conflicts
        },
      });

      if (existingProduct) {
        throw new ConflictException('Product already exists with this SKU');
      }

      // Check if barcode already exists (if provided) - only check active products
      if (createProductDto.barcode) {
        const existingBarcode = await this.prismaService.products.findFirst({
          where: {
            barcode: createProductDto.barcode,
            tenantId,
            isActive: true, // Only check active products for barcode conflicts
          },
        });

        if (existingBarcode) {
          throw new ConflictException(
            'Product already exists with this barcode',
          );
        }
      }

      // Validate category exists (if provided)
      if (createProductDto.categoryId) {
        const category = await this.prismaService.categories.findFirst({
          where: { id: createProductDto.categoryId, tenantId },
        });
        if (!category) {
          this.logger.warn(
            `Category not found: ${createProductDto.categoryId} for tenant ${tenantId}`,
          );
          throw new BadRequestException(
            `Category not found with ID: ${createProductDto.categoryId}. Please create the category first or leave it empty.`,
          );
        }
      }

      // Validate supplier exists (if provided)
      if (createProductDto.supplierId) {
        const supplier = await this.prismaService.suppliers.findFirst({
          where: { id: createProductDto.supplierId, tenantId },
        });
        if (!supplier) {
          throw new BadRequestException('Supplier not found');
        }
      }

      // Create product
      const product = await this.prismaService.products.create({
        data: {
          id: generateId(),
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
          updatedAt: new Date(),
        } as any,
        include: {
          categories: { select: { id: true, name: true } },
          suppliers: { select: { id: true, name: true } },
          product_images: true,
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

      this.logger.log(
        `Product created: ${product.id} (${product.sku}) in tenant ${tenantId}`,
      );

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

      // DEBUG: Log what we received
      this.logger.debug(
        `📋 Query received: isActive=${isActive} (type: ${typeof isActive}), tenantId=${tenantId}`,
      );

      const skip = (page - 1) * limit;

      // Build where clause
      const where: Prisma.productsWhereInput = {
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

      // CACHING DISABLED: Cache keys include complex filter combinations that we can't easily clear
      // This ensures deleted products (isActive=false) don't reappear from stale cache
      // TODO: Implement Redis with pattern-based cache clearing for better performance

      // const cacheKey = `products:list:${JSON.stringify({ where, skip, limit, sortBy, sortOrder })}`;
      // const cachedResult = await this.cacheService.getTenantData<PaginatedResponseDto<ProductResponseDto>>(
      //   tenantId,
      //   cacheKey,
      // );

      // if (cachedResult) {
      //   return cachedResult;
      // }

      // Get products and total count
      const [products, total] = await Promise.all([
        this.prismaService.products.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: {
            categories: { select: { id: true, name: true } },
            suppliers: { select: { id: true, name: true } },
            product_images: {
              orderBy: [{ isMain: 'desc' }, { createdAt: 'asc' }],
              select: {
                id: true,
                fileName: true,
                filePath: true,
                driveViewLink: true,
                isMain: true,
              },
            },
          },
        }),
        this.prismaService.products.count({ where }),
      ]);

      const result = new PaginatedResponseDto(
        products.map((product) => this.mapToResponseDto(product)),
        page,
        limit,
        total,
      );

      // CACHING DISABLED - See comment above
      // await this.cacheService.setTenantData(tenantId, cacheKey, result, 300);

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
      const cachedProduct =
        await this.cacheService.getTenantData<ProductResponseDto>(
          tenantId,
          cacheKey,
        );

      if (cachedProduct) {
        return cachedProduct;
      }

      const product = await this.prismaService.products.findFirst({
        where: { id, tenantId },
        include: {
          categories: { select: { id: true, name: true } },
          suppliers: { select: { id: true, name: true } },
          product_images: {
            orderBy: [{ isMain: 'desc' }, { createdAt: 'asc' }],
            select: {
              id: true,
              fileName: true,
              filePath: true,
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
      await this.cacheService.setTenantData(
        tenantId,
        cacheKey,
        productDto,
        600,
      );

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
      const existingProduct = await this.prismaService.products.findFirst({
        where: { id, tenantId },
      });

      if (!existingProduct) {
        throw new NotFoundException(`Product with ID ${id} not found`);
      }

      // Check SKU conflicts (if SKU is being updated) - only check active products
      if (
        updateProductDto.sku &&
        updateProductDto.sku !== existingProduct.sku
      ) {
        const skuConflict = await this.prismaService.products.findFirst({
          where: {
            sku: updateProductDto.sku,
            tenantId,
            isActive: true, // Only check active products for SKU conflicts
            id: { not: id },
          },
        });

        if (skuConflict) {
          throw new ConflictException(
            'Another product already exists with this SKU',
          );
        }
      }

      // Check barcode conflicts (if barcode is being updated) - only check active products
      if (
        updateProductDto.barcode &&
        updateProductDto.barcode !== existingProduct.barcode
      ) {
        const barcodeConflict = await this.prismaService.products.findFirst({
          where: {
            barcode: updateProductDto.barcode,
            tenantId,
            isActive: true, // Only check active products for barcode conflicts
            id: { not: id },
          },
        });

        if (barcodeConflict) {
          throw new ConflictException(
            'Another product already exists with this barcode',
          );
        }
      }

      // Handle stock quantity changes
      let stockChanged = false;
      if (
        updateProductDto.stockQuantity !== undefined &&
        updateProductDto.stockQuantity !== existingProduct.stockQuantity
      ) {
        stockChanged = true;
      }

      const product = await this.prismaService.products.update({
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
          categories: { select: { id: true, name: true } },
          suppliers: { select: { id: true, name: true } },
          product_images: true,
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
      const product = await this.prismaService.products.findFirst({
        where: { id, tenantId },
      });

      if (!product) {
        throw new NotFoundException(`Product with ID ${id} not found`);
      }

      // Soft delete by setting isActive to false and modifying SKU to avoid unique constraint violation
      // The unique constraint is on (tenantId, sku, isActive)
      await this.prismaService.products.update({
        where: { id },
        data: {
          isActive: false,
          sku: `${product.sku}_DELETED_${Date.now()}`, // Append timestamp to avoid conflicts
          updatedAt: new Date(),
        },
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
      const product = await this.prismaService.products.findFirst({
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
      const updatedProduct = await this.prismaService.products.update({
        where: { id },
        data: { stockQuantity: newQuantity },
        include: {
          categories: { select: { id: true, name: true } },
          suppliers: { select: { id: true, name: true } },
          product_images: true,
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
        `Stock adjusted for product ${id}: ${oldQuantity} -> ${newQuantity} (${stockAdjustmentDto.quantity > 0 ? '+' : ''}${stockAdjustmentDto.quantity})`,
      );

      return this.mapToResponseDto(updatedProduct);
    } catch (error) {
      this.logger.error(
        `Failed to adjust stock for product ${id}:`,
        error.message,
      );
      throw error;
    }
  }

  /**
   * Get low stock report
   */
  async getLowStockReport(tenantId: string): Promise<any[]> {
    try {
      const products = await this.getLowStockProducts(tenantId);
      return products.map((product) => ({
        id: product.id,
        name: product.name,
        sku: product.sku,
        currentStock: product.stockQuantity,
        minStockLevel: product.minStockLevel,
        category: product.category?.name,
        sellingPrice: product.sellingPrice,
      }));
    } catch (error) {
      this.logger.error('Failed to get low stock report:', error.message);
      throw error;
    }
  }

  /**
   * Get categories
   */
  async getCategories(
    tenantId: string,
  ): Promise<Array<{ id: string; name: string }>> {
    try {
      const categories = await this.prismaService.categories.findMany({
        where: { tenantId, isActive: true },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      });
      return categories;
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
      const materials = await this.prismaService.products.findMany({
        where: { tenantId, isActive: true, material: { not: null } },
        select: { material: true },
        distinct: ['material'],
        orderBy: { material: 'asc' },
      });
      return materials.map((m) => m.material).filter(Boolean) as string[];
    } catch (error) {
      this.logger.error('Failed to get materials:', error.message);
      throw error;
    }
  }

  /**
   * Generate a unique SKU
   */
  async generateUniqueSku(
    tenantId: string,
    prefix: string = 'JWL',
  ): Promise<{ sku: string }> {
    try {
      // Format: PREFIX-YYYYMMDD-XXX (e.g., JWL-20251013-001)
      const today = new Date();
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

      // Find the highest sequence number for today
      const existingProducts = await this.prismaService.products.findMany({
        where: {
          tenantId,
          isActive: true,
          sku: {
            startsWith: `${prefix}-${dateStr}-`,
          },
        },
        select: { sku: true },
        orderBy: { sku: 'desc' },
        take: 1,
      });

      let sequenceNumber = 1;
      if (existingProducts.length > 0) {
        // Extract the sequence number from the last SKU
        const lastSku = existingProducts[0].sku;
        const match = lastSku.match(/-(\d+)$/);
        if (match) {
          sequenceNumber = parseInt(match[1], 10) + 1;
        }
      }

      // Generate the new SKU
      const sku = `${prefix}-${dateStr}-${sequenceNumber.toString().padStart(3, '0')}`;

      this.logger.log(`Generated unique SKU: ${sku} for tenant ${tenantId}`);

      return { sku };
    } catch (error) {
      this.logger.error('Failed to generate unique SKU:', error.message);
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
  async bulkUpdateStock(
    bulkUpdateDto: any,
    tenantId: string,
    userId?: string,
  ): Promise<{ updated: number; errors: any[] }> {
    try {
      const results = {
        updated: 0,
        errors: [],
      };

      for (const update of bulkUpdateDto.updates) {
        try {
          await this.prismaService.products.update({
            where: { id: update.productId, tenantId },
            data: { stockQuantity: update.newStock },
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
            'BULK_UPDATE',
          );

          results.updated++;
        } catch (error) {
          results.errors.push({
            productId: update.productId,
            error: error.message,
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
   * Bulk assign RFID tags to products by SKU
   */
  async bulkAssignRFID(
    assignments: Array<{ sku: string; rfidTag: string }>,
    tenantId: string,
    userId?: string,
  ): Promise<{ success: number; failed: number; errors: any[] }> {
    try {
      const results = {
        success: 0,
        failed: 0,
        errors: [],
      };

      for (const assignment of assignments) {
        try {
          // Find product by SKU
          const product = await this.prismaService.products.findFirst({
            where: {
              sku: assignment.sku,
              tenantId,
              isActive: true,
            },
          });

          if (!product) {
            results.failed++;
            results.errors.push({
              sku: assignment.sku,
              error: 'Product not found with this SKU',
            });
            continue;
          }

          // Check if RFID tag is already assigned to another product
          if (assignment.rfidTag) {
            const existingRFID = await this.prismaService.products.findFirst({
              where: {
                rfidTag: assignment.rfidTag,
                tenantId,
                isActive: true,
                NOT: { id: product.id },
              },
            });

            if (existingRFID) {
              results.failed++;
              results.errors.push({
                sku: assignment.sku,
                error: `RFID tag ${assignment.rfidTag} is already assigned to another product (SKU: ${existingRFID.sku})`,
              });
              continue;
            }
          }

          // Update product with RFID tag
          await this.prismaService.products.update({
            where: { id: product.id },
            data: { rfidTag: assignment.rfidTag },
          });

          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            sku: assignment.sku,
            error: error.message,
          });
        }
      }

      // Invalidate cache
      // TODO: Implement pattern-based cache invalidation
      // await this.cacheService.invalidateTenantData(tenantId, 'products:*');

      this.logger.log(
        `Bulk RFID assignment completed: ${results.success} success, ${results.failed} failed`,
      );

      return results;
    } catch (error) {
      this.logger.error('Failed to bulk assign RFID:', error.message);
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
      const cachedResult = await this.cacheService.getTenantData<
        ProductResponseDto[]
      >(tenantId, cacheKey);

      if (cachedResult) {
        return cachedResult;
      }

      const products = await this.prismaService.products.findMany({
        where: {
          tenantId,
          isActive: true,
        },
        include: {
          categories: { select: { id: true, name: true } },
          suppliers: { select: { id: true, name: true } },
          product_images: {
            orderBy: [{ isMain: 'desc' }, { createdAt: 'asc' }],
          },
        },
        orderBy: [{ stockQuantity: 'asc' }, { name: 'asc' }],
      });

      // Filter low stock products in JavaScript since Prisma doesn't support comparing fields directly
      const lowStockProducts = products.filter(
        (product) => product.stockQuantity <= product.minStockLevel,
      );

      const result = lowStockProducts.map((product) =>
        this.mapToResponseDto(product),
      );

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
      const cachedStats =
        await this.cacheService.getTenantData<InventoryStatsDto>(
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
        this.prismaService.products.count({ where: { tenantId } }),
        this.prismaService.products.count({
          where: { tenantId, isActive: true },
        }),
        this.prismaService.products.count({
          where: { tenantId, isDamaged: true },
        }),
        // Low stock count - we'll calculate this differently
        0,
        this.prismaService.products.count({
          where: { tenantId, isActive: true, stockQuantity: 0 },
        }),
        this.prismaService.products.aggregate({
          where: { tenantId, isActive: true },
          _sum: {
            sellingPrice: true,
          },
        }),
        this.getProductsByMaterial(tenantId),
        this.getProductsByCategory(tenantId),
      ]);

      // Calculate low stock products properly
      const allActiveProducts = await this.prismaService.products.findMany({
        where: { tenantId, isActive: true },
        select: { stockQuantity: true, minStockLevel: true },
      });
      const actualLowStockProducts = allActiveProducts.filter(
        (p) => p.stockQuantity <= p.minStockLevel,
      ).length;

      const stats: InventoryStatsDto = {
        totalProducts,
        activeProducts,
        inactiveProducts: totalProducts - activeProducts,
        damagedProducts,
        lowStockProducts: actualLowStockProducts,
        outOfStockProducts,
        totalStockValue: Number(stockValue._sum.sellingPrice || 0),
        averageProductValue:
          totalProducts > 0
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
      const category = await this.prismaService.categories.create({
        data: {
          id: generateId(),
          ...createCategoryDto,
          tenantId,
          updatedAt: new Date(),
        } as any,
      });

      await this.clearProductCaches(tenantId);

      this.logger.log(
        `Category created: ${category.id} (${category.name}) in tenant ${tenantId}`,
      );

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
      const supplier = await this.prismaService.suppliers.create({
        data: {
          id: generateId(),
          ...createSupplierDto,
          tenantId,
          updatedAt: new Date(),
        } as any,
      });

      await this.clearProductCaches(tenantId);

      this.logger.log(
        `Supplier created: ${supplier.id} (${supplier.name}) in tenant ${tenantId}`,
      );

      return supplier;
    } catch (error) {
      this.logger.error('Failed to create supplier:', error.message);
      throw error;
    }
  }

  /**
   * Find product by barcode
   */
  async findByBarcode(
    barcode: string,
    tenantId: string,
  ): Promise<ProductResponseDto> {
    const product = await this.prismaService.products.findFirst({
      where: { barcode, tenantId, isActive: true },
      include: {
        categories: { select: { id: true, name: true } },
        suppliers: { select: { id: true, name: true } },
        product_images: true,
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
    const product = await this.prismaService.products.findFirst({
      where: { sku, tenantId, isActive: true },
      include: {
        categories: { select: { id: true, name: true } },
        suppliers: { select: { id: true, name: true } },
        product_images: true,
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with SKU ${sku} not found`);
    }

    return this.mapToResponseDto(product);
  }

  /**
   * Upload product image with secure local storage
   */
  async uploadImage(
    id: string,
    file: any,
    tenantId: string,
    userId?: string,
  ): Promise<{ imageUrl: string; imageId: string }> {
    try {
      // 1. Verify product exists
      const product = await this.prismaService.products.findFirst({
        where: { id, tenantId },
      });

      if (!product) {
        throw new NotFoundException(`Product with ID ${id} not found`);
      }

      // 2. Validate file exists
      if (!file || !file.buffer) {
        throw new BadRequestException('No file provided');
      }

      this.logger.log(
        `📤 Uploading image for product ${id}: ${file.originalname} (${file.size} bytes)`,
      );

      // 3. Upload file using secure file storage service
      const uploadResult = await this.fileStorageService.uploadFile({
        fileName: file.originalname,
        buffer: file.buffer,
        mimeType: file.mimetype,
        category: 'product-images',
        tenantId,
        metadata: {
          productId: id,
          tenantId,
          uploadedBy: userId || 'system',
          productName: product.name,
          productSku: product.sku,
        },
      });

      if (!uploadResult.success) {
        throw new BadRequestException(
          uploadResult.error || 'File upload failed',
        );
      }

      // 4. Save image record to database
      const productImage = await this.prismaService.product_images.create({
        data: {
          id: generateId(),
          productId: id,
          fileName: uploadResult.fileName,
          filePath: uploadResult.fileUrl, // For local: http://localhost:3002/uploads/product-images/filename
          driveFileId: uploadResult.fileId, // For Google Drive (when enabled)
          driveViewLink:
            uploadResult.uploadMethod === 'google-drive'
              ? uploadResult.fileUrl
              : null,
          fileSize: uploadResult.size,
          mimeType: file.mimetype,
          isMain: false, // User can set this via another endpoint
        } as any,
      });

      // 5. Clear cache
      await this.cacheService.delTenantData(tenantId, `product:${id}`);
      await this.clearProductCaches(tenantId);

      this.logger.log(
        `✅ Image uploaded successfully for product ${id}: ${uploadResult.fileName} via ${uploadResult.uploadMethod}`,
      );

      return {
        imageUrl: uploadResult.fileUrl,
        imageId: productImage.id,
      };
    } catch (error) {
      this.logger.error(
        `❌ Failed to upload image for product ${id}:`,
        error.message,
      );
      throw error;
    }
  }

  /**
   * Restore product (undelete)
   */
  async restore(
    id: string,
    tenantId: string,
    userId?: string,
  ): Promise<ProductResponseDto> {
    const product = await this.prismaService.products.update({
      where: { id, tenantId },
      data: { isActive: true },
      include: {
        categories: { select: { id: true, name: true } },
        suppliers: { select: { id: true, name: true } },
        product_images: true,
      },
    });

    return this.mapToResponseDto(product);
  }

  /**
   * Get product inventory logs
   */
  async getInventoryLogs(productId: string, tenantId: string): Promise<any[]> {
    try {
      const logs = await this.prismaService.inventory_logs.findMany({
        where: {
          productId,
          tenantId,
        },
        orderBy: { createdAt: 'desc' },
        take: 50, // Last 50 logs
      });

      return logs;
    } catch (error) {
      this.logger.error(
        `Failed to get inventory logs for product ${productId}:`,
        error.message,
      );
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
    await this.prismaService.inventory_logs.create({
      data: {
        id: generateId(),
        tenantId,
        productId,
        type,
        quantity,
        previousQty,
        newQty,
        reason,
        reference,
      } as any,
    });
  }

  /**
   * Private: Get products by material
   */
  private async getProductsByMaterial(
    tenantId: string,
  ): Promise<Record<string, number>> {
    const results = await this.prismaService.products.groupBy({
      by: ['material'],
      where: { tenantId, isActive: true },
      _count: { material: true },
    });

    const stats: Record<string, number> = {};
    results.forEach((result) => {
      if (result.material) {
        stats[result.material] = result._count.material;
      }
    });

    return stats;
  }

  /**
   * Private: Get products by category
   */
  private async getProductsByCategory(
    tenantId: string,
  ): Promise<Record<string, number>> {
    const results = await this.prismaService.products.findMany({
      where: { tenantId, isActive: true },
      include: {
        categories: { select: { name: true } },
      },
    });

    const stats: Record<string, number> = {};
    results.forEach((product) => {
      const categoryName = product.categories?.name || 'Uncategorized';
      stats[categoryName] = (stats[categoryName] || 0) + 1;
    });

    return stats;
  }

  /**
   * Private: Clear product-related caches
   * Note: We clear all cache because cache keys include complex filters (where, skip, limit, etc)
   * and we can't easily pattern-match all variations. This ensures deleted products don't reappear.
   */
  private async clearProductCaches(tenantId: string): Promise<void> {
    // Clear all tenant cache to ensure no stale product data
    // This is more aggressive but necessary because product list cache keys
    // include serialized where clauses that we can't easily enumerate
    this.logger.debug(`Clearing all product caches for tenant ${tenantId}`);

    // We would need to implement a pattern-based cache clearing or store cache keys
    // For now, we'll rely on TTL expiration and accept potential stale data for up to 5 min
    // A better long-term solution would be to use Redis with SCAN/pattern matching
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
      supplierName: product.supplierName || product.suppliers?.name,
      costPrice: product.costPrice ? Number(product.costPrice) : undefined,
      sellingPrice: Number(product.sellingPrice),
      discountPrice: product.discountPrice
        ? Number(product.discountPrice)
        : undefined,
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
      category: product.categories,
      supplier: product.suppliers,
      images: product.product_images,
    };
  }
}
