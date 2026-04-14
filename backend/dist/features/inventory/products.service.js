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
var ProductsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../core/prisma/prisma.service");
const cache_service_1 = require("../../core/cache/cache.service");
const google_drive_service_1 = require("../../integrations/google-drive/google-drive.service");
const file_storage_service_1 = require("../../integrations/file-storage/file-storage.service");
const id_generator_1 = require("../../shared/utils/id-generator");
const product_dto_1 = require("./dto/product.dto");
const pagination_dto_1 = require("../../shared/dto/pagination.dto");
let ProductsService = ProductsService_1 = class ProductsService {
    prismaService;
    cacheService;
    googleDriveService;
    fileStorageService;
    logger = new common_1.Logger(ProductsService_1.name);
    constructor(prismaService, cacheService, googleDriveService, fileStorageService) {
        this.prismaService = prismaService;
        this.cacheService = cacheService;
        this.googleDriveService = googleDriveService;
        this.fileStorageService = fileStorageService;
    }
    async create(createProductDto, tenantId, userId) {
        try {
            const existingProduct = await this.prismaService.products.findFirst({
                where: {
                    sku: createProductDto.sku,
                    tenantId,
                    isActive: true,
                },
            });
            if (existingProduct) {
                throw new common_1.ConflictException('Product already exists with this SKU');
            }
            if (createProductDto.barcode) {
                const existingBarcode = await this.prismaService.products.findFirst({
                    where: {
                        barcode: createProductDto.barcode,
                        tenantId,
                        isActive: true,
                    },
                });
                if (existingBarcode) {
                    throw new common_1.ConflictException('Product already exists with this barcode');
                }
            }
            if (createProductDto.categoryId) {
                const category = await this.prismaService.categories.findFirst({
                    where: { id: createProductDto.categoryId, tenantId },
                });
                if (!category) {
                    this.logger.warn(`Category not found: ${createProductDto.categoryId} for tenant ${tenantId}`);
                    throw new common_1.BadRequestException(`Category not found with ID: ${createProductDto.categoryId}. Please create the category first or leave it empty.`);
                }
            }
            if (createProductDto.supplierId) {
                const supplier = await this.prismaService.suppliers.findFirst({
                    where: { id: createProductDto.supplierId, tenantId },
                });
                if (!supplier) {
                    throw new common_1.BadRequestException('Supplier not found');
                }
            }
            const product = await this.prismaService.products.create({
                data: {
                    id: (0, id_generator_1.generateId)(),
                    ...createProductDto,
                    tenantId,
                    sellingPrice: new client_1.Prisma.Decimal(createProductDto.sellingPrice),
                    costPrice: createProductDto.costPrice
                        ? new client_1.Prisma.Decimal(createProductDto.costPrice)
                        : null,
                    discountPrice: createProductDto.discountPrice
                        ? new client_1.Prisma.Decimal(createProductDto.discountPrice)
                        : null,
                    weight: createProductDto.weight
                        ? new client_1.Prisma.Decimal(createProductDto.weight)
                        : null,
                    updatedAt: new Date(),
                },
                include: {
                    categories: { select: { id: true, name: true } },
                    suppliers: { select: { id: true, name: true } },
                    product_images: true,
                },
            });
            if (createProductDto.stockQuantity > 0) {
                await this.createInventoryLog(tenantId, product.id, product_dto_1.InventoryLogType.PURCHASE, createProductDto.stockQuantity, 0, createProductDto.stockQuantity, 'Initial stock', 'PRODUCT_CREATION');
            }
            await this.clearProductCaches(tenantId);
            this.logger.log(`Product created: ${product.id} (${product.sku}) in tenant ${tenantId}`);
            return this.mapToResponseDto(product);
        }
        catch (error) {
            this.logger.error('Failed to create product:', error.message);
            throw error;
        }
    }
    async findAll(query, tenantId) {
        try {
            const { page = 1, limit = 10, search, categoryId, supplierId, material, isActive, isDamaged, lowStock, sortBy = 'createdAt', sortOrder = 'desc', } = query;
            this.logger.debug(`📋 Query received: isActive=${isActive} (type: ${typeof isActive}), tenantId=${tenantId}`);
            const skip = (page - 1) * limit;
            const where = {
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
            if (lowStock) {
                where.stockQuantity = { lte: { field: 'minStockLevel' } };
            }
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
                                driveFileId: true,
                                isMain: true,
                            },
                        },
                    },
                }),
                this.prismaService.products.count({ where }),
            ]);
            const result = new pagination_dto_1.PaginatedResponseDto(products.map((product) => this.mapToResponseDto(product)), page, limit, total);
            return result;
        }
        catch (error) {
            this.logger.error('Failed to fetch products:', error.message);
            throw error;
        }
    }
    async findOne(id, tenantId) {
        try {
            const cacheKey = `product:${id}`;
            const cachedProduct = await this.cacheService.getTenantData(tenantId, cacheKey);
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
                throw new common_1.NotFoundException(`Product with ID ${id} not found`);
            }
            const productDto = this.mapToResponseDto(product);
            await this.cacheService.setTenantData(tenantId, cacheKey, productDto, 600);
            return productDto;
        }
        catch (error) {
            this.logger.error(`Failed to fetch product ${id}:`, error.message);
            throw error;
        }
    }
    async update(id, updateProductDto, tenantId, userId) {
        try {
            const existingProduct = await this.prismaService.products.findFirst({
                where: { id, tenantId },
            });
            if (!existingProduct) {
                throw new common_1.NotFoundException(`Product with ID ${id} not found`);
            }
            if (updateProductDto.sku &&
                updateProductDto.sku !== existingProduct.sku) {
                const skuConflict = await this.prismaService.products.findFirst({
                    where: {
                        sku: updateProductDto.sku,
                        tenantId,
                        isActive: true,
                        id: { not: id },
                    },
                });
                if (skuConflict) {
                    throw new common_1.ConflictException('Another product already exists with this SKU');
                }
            }
            if (updateProductDto.barcode &&
                updateProductDto.barcode !== existingProduct.barcode) {
                const barcodeConflict = await this.prismaService.products.findFirst({
                    where: {
                        barcode: updateProductDto.barcode,
                        tenantId,
                        isActive: true,
                        id: { not: id },
                    },
                });
                if (barcodeConflict) {
                    throw new common_1.ConflictException('Another product already exists with this barcode');
                }
            }
            let stockChanged = false;
            if (updateProductDto.stockQuantity !== undefined &&
                updateProductDto.stockQuantity !== existingProduct.stockQuantity) {
                stockChanged = true;
            }
            const product = await this.prismaService.products.update({
                where: { id },
                data: {
                    ...updateProductDto,
                    sellingPrice: updateProductDto.sellingPrice
                        ? new client_1.Prisma.Decimal(updateProductDto.sellingPrice)
                        : undefined,
                    costPrice: updateProductDto.costPrice
                        ? new client_1.Prisma.Decimal(updateProductDto.costPrice)
                        : undefined,
                    discountPrice: updateProductDto.discountPrice
                        ? new client_1.Prisma.Decimal(updateProductDto.discountPrice)
                        : undefined,
                    weight: updateProductDto.weight
                        ? new client_1.Prisma.Decimal(updateProductDto.weight)
                        : undefined,
                },
                include: {
                    categories: { select: { id: true, name: true } },
                    suppliers: { select: { id: true, name: true } },
                    product_images: true,
                },
            });
            if (stockChanged && updateProductDto.stockQuantity !== undefined) {
                await this.createInventoryLog(tenantId, product.id, product_dto_1.InventoryLogType.ADJUSTMENT, updateProductDto.stockQuantity - existingProduct.stockQuantity, existingProduct.stockQuantity, updateProductDto.stockQuantity, 'Stock updated via product edit', `PRODUCT_UPDATE:${id}`);
            }
            await this.cacheService.delTenantData(tenantId, `product:${id}`);
            await this.clearProductCaches(tenantId);
            this.logger.log(`Product updated: ${id} in tenant ${tenantId}`);
            return this.mapToResponseDto(product);
        }
        catch (error) {
            this.logger.error(`Failed to update product ${id}:`, error.message);
            throw error;
        }
    }
    async remove(id, tenantId, userId) {
        try {
            const product = await this.prismaService.products.findFirst({
                where: { id, tenantId },
            });
            if (!product) {
                throw new common_1.NotFoundException(`Product with ID ${id} not found`);
            }
            await this.prismaService.products.update({
                where: { id },
                data: {
                    isActive: false,
                    sku: `${product.sku}_DELETED_${Date.now()}`,
                    updatedAt: new Date(),
                },
            });
            await this.cacheService.delTenantData(tenantId, `product:${id}`);
            await this.clearProductCaches(tenantId);
            this.logger.log(`Product soft deleted: ${id} in tenant ${tenantId}`);
        }
        catch (error) {
            this.logger.error(`Failed to delete product ${id}:`, error.message);
            throw error;
        }
    }
    async adjustStock(id, stockAdjustmentDto, tenantId, userId) {
        try {
            const product = await this.prismaService.products.findFirst({
                where: { id, tenantId },
            });
            if (!product) {
                throw new common_1.NotFoundException(`Product with ID ${id} not found`);
            }
            const oldQuantity = product.stockQuantity;
            const newQuantity = oldQuantity + stockAdjustmentDto.quantity;
            if (newQuantity < 0) {
                throw new common_1.BadRequestException('Stock quantity cannot be negative');
            }
            const updatedProduct = await this.prismaService.products.update({
                where: { id },
                data: { stockQuantity: newQuantity },
                include: {
                    categories: { select: { id: true, name: true } },
                    suppliers: { select: { id: true, name: true } },
                    product_images: true,
                },
            });
            await this.createInventoryLog(tenantId, product.id, stockAdjustmentDto.type, stockAdjustmentDto.quantity, oldQuantity, newQuantity, stockAdjustmentDto.reason, stockAdjustmentDto.reference);
            await this.cacheService.delTenantData(tenantId, `product:${id}`);
            await this.clearProductCaches(tenantId);
            this.logger.log(`Stock adjusted for product ${id}: ${oldQuantity} -> ${newQuantity} (${stockAdjustmentDto.quantity > 0 ? '+' : ''}${stockAdjustmentDto.quantity})`);
            return this.mapToResponseDto(updatedProduct);
        }
        catch (error) {
            this.logger.error(`Failed to adjust stock for product ${id}:`, error.message);
            throw error;
        }
    }
    async getLowStockReport(tenantId) {
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
        }
        catch (error) {
            this.logger.error('Failed to get low stock report:', error.message);
            throw error;
        }
    }
    async getCategories(tenantId) {
        try {
            const categories = await this.prismaService.categories.findMany({
                where: { tenantId, isActive: true },
                select: { id: true, name: true },
                orderBy: { name: 'asc' },
            });
            return categories;
        }
        catch (error) {
            this.logger.error('Failed to get categories:', error.message);
            throw error;
        }
    }
    async getMaterials(tenantId) {
        try {
            const materials = await this.prismaService.products.findMany({
                where: { tenantId, isActive: true, material: { not: null } },
                select: { material: true },
                distinct: ['material'],
                orderBy: { material: 'asc' },
            });
            return materials.map((m) => m.material).filter(Boolean);
        }
        catch (error) {
            this.logger.error('Failed to get materials:', error.message);
            throw error;
        }
    }
    async generateUniqueSku(tenantId, prefix = 'JWL') {
        try {
            const today = new Date();
            const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
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
                const lastSku = existingProducts[0].sku;
                const match = lastSku.match(/-(\d+)$/);
                if (match) {
                    sequenceNumber = parseInt(match[1], 10) + 1;
                }
            }
            const sku = `${prefix}-${dateStr}-${sequenceNumber.toString().padStart(3, '0')}`;
            this.logger.log(`Generated unique SKU: ${sku} for tenant ${tenantId}`);
            return { sku };
        }
        catch (error) {
            this.logger.error('Failed to generate unique SKU:', error.message);
            throw error;
        }
    }
    async getStockHistory(productId, tenantId) {
        try {
            const logs = await this.getInventoryLogs(productId, tenantId);
            return logs;
        }
        catch (error) {
            this.logger.error('Failed to get stock history:', error.message);
            throw error;
        }
    }
    async bulkUpdateStock(bulkUpdateDto, tenantId, userId) {
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
                    await this.createInventoryLog(tenantId, update.productId, 'ADJUSTMENT', update.newStock, 0, update.newStock, update.reason, 'BULK_UPDATE');
                    results.updated++;
                }
                catch (error) {
                    results.errors.push({
                        productId: update.productId,
                        error: error.message,
                    });
                }
            }
            return results;
        }
        catch (error) {
            this.logger.error('Failed to bulk update stock:', error.message);
            throw error;
        }
    }
    async bulkAssignRFID(assignments, tenantId, userId) {
        try {
            const results = {
                success: 0,
                failed: 0,
                errors: [],
            };
            for (const assignment of assignments) {
                try {
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
                    await this.prismaService.products.update({
                        where: { id: product.id },
                        data: { rfidTag: assignment.rfidTag },
                    });
                    results.success++;
                }
                catch (error) {
                    results.failed++;
                    results.errors.push({
                        sku: assignment.sku,
                        error: error.message,
                    });
                }
            }
            this.logger.log(`Bulk RFID assignment completed: ${results.success} success, ${results.failed} failed`);
            return results;
        }
        catch (error) {
            this.logger.error('Failed to bulk assign RFID:', error.message);
            throw error;
        }
    }
    async getLowStockProducts(tenantId) {
        try {
            const cacheKey = 'products:low_stock';
            const cachedResult = await this.cacheService.getTenantData(tenantId, cacheKey);
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
            const lowStockProducts = products.filter((product) => product.stockQuantity <= product.minStockLevel);
            const result = lowStockProducts.map((product) => this.mapToResponseDto(product));
            await this.cacheService.setTenantData(tenantId, cacheKey, result, 300);
            return result;
        }
        catch (error) {
            this.logger.error('Failed to fetch low stock products:', error.message);
            throw error;
        }
    }
    async getStats(tenantId) {
        try {
            const cacheKey = 'products:stats';
            const cachedStats = await this.cacheService.getTenantData(tenantId, cacheKey);
            if (cachedStats) {
                return cachedStats;
            }
            const [totalProducts, activeProducts, damagedProducts, lowStockProducts, outOfStockProducts, stockValue, materialStats, categoryStats,] = await Promise.all([
                this.prismaService.products.count({ where: { tenantId } }),
                this.prismaService.products.count({
                    where: { tenantId, isActive: true },
                }),
                this.prismaService.products.count({
                    where: { tenantId, isDamaged: true },
                }),
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
            const allActiveProducts = await this.prismaService.products.findMany({
                where: { tenantId, isActive: true },
                select: { stockQuantity: true, minStockLevel: true },
            });
            const actualLowStockProducts = allActiveProducts.filter((p) => p.stockQuantity <= p.minStockLevel).length;
            const stats = {
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
            await this.cacheService.setTenantData(tenantId, cacheKey, stats, 900);
            return stats;
        }
        catch (error) {
            this.logger.error('Failed to get inventory stats:', error.message);
            throw error;
        }
    }
    async createCategory(createCategoryDto, tenantId) {
        try {
            const category = await this.prismaService.categories.create({
                data: {
                    id: (0, id_generator_1.generateId)(),
                    ...createCategoryDto,
                    tenantId,
                    updatedAt: new Date(),
                },
            });
            await this.clearProductCaches(tenantId);
            this.logger.log(`Category created: ${category.id} (${category.name}) in tenant ${tenantId}`);
            return category;
        }
        catch (error) {
            this.logger.error('Failed to create category:', error.message);
            throw error;
        }
    }
    async createSupplier(createSupplierDto, tenantId) {
        try {
            const supplier = await this.prismaService.suppliers.create({
                data: {
                    id: (0, id_generator_1.generateId)(),
                    ...createSupplierDto,
                    tenantId,
                    updatedAt: new Date(),
                },
            });
            await this.clearProductCaches(tenantId);
            this.logger.log(`Supplier created: ${supplier.id} (${supplier.name}) in tenant ${tenantId}`);
            return supplier;
        }
        catch (error) {
            this.logger.error('Failed to create supplier:', error.message);
            throw error;
        }
    }
    async findByBarcode(barcode, tenantId) {
        const product = await this.prismaService.products.findFirst({
            where: { barcode, tenantId, isActive: true },
            include: {
                categories: { select: { id: true, name: true } },
                suppliers: { select: { id: true, name: true } },
                product_images: true,
            },
        });
        if (!product) {
            throw new common_1.NotFoundException(`Product with barcode ${barcode} not found`);
        }
        return this.mapToResponseDto(product);
    }
    async findBySku(sku, tenantId) {
        const product = await this.prismaService.products.findFirst({
            where: { sku, tenantId, isActive: true },
            include: {
                categories: { select: { id: true, name: true } },
                suppliers: { select: { id: true, name: true } },
                product_images: true,
            },
        });
        if (!product) {
            throw new common_1.NotFoundException(`Product with SKU ${sku} not found`);
        }
        return this.mapToResponseDto(product);
    }
    async uploadImage(id, file, tenantId, userId) {
        try {
            const product = await this.prismaService.products.findFirst({
                where: { id, tenantId },
            });
            if (!product) {
                throw new common_1.NotFoundException(`Product with ID ${id} not found`);
            }
            if (!file || !file.buffer) {
                throw new common_1.BadRequestException('No file provided');
            }
            this.logger.log(`📤 Uploading image for product ${id}: ${file.originalname} (${file.size} bytes)`);
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
                throw new common_1.BadRequestException(uploadResult.error || 'File upload failed');
            }
            const productImage = await this.prismaService.product_images.create({
                data: {
                    id: (0, id_generator_1.generateId)(),
                    productId: id,
                    fileName: uploadResult.fileName,
                    filePath: uploadResult.fileUrl,
                    driveFileId: uploadResult.fileId,
                    driveViewLink: uploadResult.uploadMethod === 'google-drive'
                        ? uploadResult.fileUrl
                        : null,
                    fileSize: uploadResult.size,
                    mimeType: file.mimetype,
                    isMain: false,
                },
            });
            await this.cacheService.delTenantData(tenantId, `product:${id}`);
            await this.clearProductCaches(tenantId);
            this.logger.log(`✅ Image uploaded successfully for product ${id}: ${uploadResult.fileName} via ${uploadResult.uploadMethod}`);
            return {
                imageUrl: uploadResult.fileUrl,
                imageId: productImage.id,
            };
        }
        catch (error) {
            this.logger.error(`❌ Failed to upload image for product ${id}:`, error.message);
            throw error;
        }
    }
    async restore(id, tenantId, userId) {
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
    async getInventoryLogs(productId, tenantId) {
        try {
            const logs = await this.prismaService.inventory_logs.findMany({
                where: {
                    productId,
                    tenantId,
                },
                orderBy: { createdAt: 'desc' },
                take: 50,
            });
            return logs;
        }
        catch (error) {
            this.logger.error(`Failed to get inventory logs for product ${productId}:`, error.message);
            throw error;
        }
    }
    async createInventoryLog(tenantId, productId, type, quantity, previousQty, newQty, reason, reference) {
        await this.prismaService.inventory_logs.create({
            data: {
                id: (0, id_generator_1.generateId)(),
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
    async getProductsByMaterial(tenantId) {
        const results = await this.prismaService.products.groupBy({
            by: ['material'],
            where: { tenantId, isActive: true },
            _count: { material: true },
        });
        const stats = {};
        results.forEach((result) => {
            if (result.material) {
                stats[result.material] = result._count.material;
            }
        });
        return stats;
    }
    async getProductsByCategory(tenantId) {
        const results = await this.prismaService.products.findMany({
            where: { tenantId, isActive: true },
            include: {
                categories: { select: { name: true } },
            },
        });
        const stats = {};
        results.forEach((product) => {
            const categoryName = product.categories?.name || 'Uncategorized';
            stats[categoryName] = (stats[categoryName] || 0) + 1;
        });
        return stats;
    }
    async clearProductCaches(tenantId) {
        this.logger.debug(`Clearing all product caches for tenant ${tenantId}`);
        await Promise.all([
            this.cacheService.delTenantData(tenantId, 'products:list'),
            this.cacheService.delTenantData(tenantId, 'products:stats'),
            this.cacheService.delTenantData(tenantId, 'products:low_stock'),
        ]);
    }
    mapToResponseDto(product) {
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
};
exports.ProductsService = ProductsService;
exports.ProductsService = ProductsService = ProductsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        cache_service_1.CacheService,
        google_drive_service_1.GoogleDriveService,
        file_storage_service_1.FileStorageService])
], ProductsService);
//# sourceMappingURL=products.service.js.map