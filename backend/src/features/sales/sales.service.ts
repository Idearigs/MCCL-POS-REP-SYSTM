import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { SalesRepository } from './sales.repository';
import { CacheService } from '../../core/cache/cache.service';
import { ShiftsService } from '../shifts/shifts.service';
import {
  PaymentMethod as PrismaPaymentMethod,
  PaymentStatus as PrismaPaymentStatus,
  SaleStatus as PrismaSaleStatus,
} from '@prisma/client';
import {
  CreateSaleDto,
  UpdateSaleDto,
  CreateRefundDto,
  SaleQueryDto,
  SaleResponseDto,
  SalesStatsDto,
  SaleStatus,
  PaymentMethod,
  PaymentStatus,
} from './dto/sale.dto';
import { PaginatedResponseDto } from '../../shared/dto/pagination.dto';
import { generateId } from '../../shared/utils/id-generator';

@Injectable()
export class SalesService {
  private readonly logger = new Logger(SalesService.name);

  constructor(
    private salesRepo: SalesRepository,
    private prismaService: PrismaService,
    private cacheService: CacheService,
    private shiftsService: ShiftsService,
  ) {}

  /**
   * Create a new sale with payment processing
   */
  async create(
    createSaleDto: CreateSaleDto,
    tenantId: string,
    userId: string,
  ): Promise<SaleResponseDto> {
    try {
      return await this.prismaService.$transaction(
        async (prisma) => {
          // Generate sale number
          const saleNumber = await this.generateSaleNumber(tenantId, prisma);

          // Validate customer exists if provided
          if (createSaleDto.customerId) {
            const customer = await prisma.customers.findFirst({
              where: { id: createSaleDto.customerId, tenantId },
            });
            if (!customer) {
              throw new NotFoundException('Customer not found');
            }
          }

          // Validate products and check stock
          const productValidations = await Promise.all(
            createSaleDto.items.map(async (item) => {
              // Check if this is a repair service item (special handling)
              const isRepairService = item.notes?.includes('REPAIR SERVICE');

              if (isRepairService) {
                // For repair services, skip product validation
                // Create a virtual product entry for the sale
                return {
                  product: {
                    id: item.productId,
                    name: item.notes || 'Repair Service',
                    stockQuantity: 999999, // Virtual unlimited stock
                    price: item.unitPrice,
                  },
                  item,
                  isRepairService: true,
                };
              }

              // Regular product validation
              const product = await prisma.products.findFirst({
                where: { id: item.productId, tenantId, isActive: true },
              });

              if (!product) {
                throw new NotFoundException(
                  `Product ${item.productId} not found`,
                );
              }

              if (product.stockQuantity < item.quantity) {
                throw new BadRequestException(
                  `Insufficient stock for product ${product.name}. Available: ${product.stockQuantity}, Requested: ${item.quantity}`,
                );
              }

              return { product, item, isRepairService: false };
            }),
          );

          // Calculate totals and prepare sale items
          let subtotal = 0;
          const saleItems = [];
          const repairServiceDetails = [];

          for (const { product, item, isRepairService } of productValidations) {
            const lineSubtotal = item.quantity * item.unitPrice;
            const itemDiscountAmount =
              item.discountAmount ||
              (item.discountPercentage
                ? lineSubtotal * (item.discountPercentage / 100)
                : 0);
            const discountedAmount = lineSubtotal - itemDiscountAmount;
            const taxAmount = item.taxRate
              ? discountedAmount * (item.taxRate / 100)
              : 0;
            const totalPrice = discountedAmount + taxAmount;

            subtotal += lineSubtotal;

            // Only add actual products to sale_items (skip repair services due to FK constraint)
            if (!isRepairService) {
              saleItems.push({
                id: generateId(),
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                discount: itemDiscountAmount,
                totalPrice,
              });
            } else {
              // Store repair service details for notes
              repairServiceDetails.push({
                name: item.notes || 'Repair Service',
                price: item.unitPrice,
                quantity: item.quantity,
                total: totalPrice,
              });
            }
          }

          // Apply overall discount
          const overallDiscountAmount =
            createSaleDto.discountAmount ||
            (createSaleDto.discountPercentage
              ? subtotal * (createSaleDto.discountPercentage / 100)
              : 0);
          const discountedSubtotal = subtotal - overallDiscountAmount;

          // Calculate tax
          const taxAmount = createSaleDto.taxRate
            ? discountedSubtotal * (createSaleDto.taxRate / 100)
            : 0;
          const totalAmount = discountedSubtotal + taxAmount;

          // Validate payment amount
          const totalPayments = createSaleDto.payments.reduce(
            (sum, payment) => sum + payment.amount,
            0,
          );
          if (Math.abs(totalPayments - totalAmount) > 0.01) {
            throw new BadRequestException(
              `Payment amount (${totalPayments}) does not match total amount (${totalAmount})`,
            );
          }

          // Determine primary payment method (use first payment or the one with largest amount)
          const primaryPayment =
            createSaleDto.payments.length === 1
              ? createSaleDto.payments[0]
              : createSaleDto.payments.reduce((max, payment) =>
                  payment.amount > max.amount ? payment : max,
                );

          // Build notes with repair service details
          let saleNotes = createSaleDto.notes || '';
          if (repairServiceDetails.length > 0) {
            const repairInfo = repairServiceDetails
              .map((r) => `${r.name}: £${r.price.toFixed(2)}`)
              .join(', ');
            saleNotes = saleNotes
              ? `${saleNotes}\n\nRepair Services: ${repairInfo}`
              : `Repair Services: ${repairInfo}`;
          }

          // Get active shift for the user (if exists)
          let activeShiftId: string | undefined;
          try {
            const activeShift = await this.shiftsService.getActiveShift(
              userId,
              tenantId,
            );
            if (activeShift) {
              activeShiftId = activeShift.id;
            }
          } catch (error) {
            // If no active shift, continue without linking (shift tracking is optional)
            this.logger.debug(
              `No active shift found for user ${userId}: ${error.message}`,
            );
          }

          // Create sale
          const sale = await (prisma.sales as any).create({
            data: {
              id: generateId(),
              saleNumber,
              tenantId,
              customerId: createSaleDto.customerId,
              shiftId: activeShiftId,
              // walkInCustomerName and walkInCustomerPhone fields don't exist in current schema
              status: PrismaSaleStatus.COMPLETED,
              subtotal,
              // discountPercentage: createSaleDto.discountPercentage || 0, // Field doesn't exist
              discountAmount: overallDiscountAmount,
              // taxRate: createSaleDto.taxRate || 0, // Field doesn't exist
              taxAmount,
              totalAmount,
              paymentMethod: primaryPayment.method as PrismaPaymentMethod,
              paymentStatus: PrismaPaymentStatus.COMPLETED,
              paidAmount: totalPayments,
              refundedAmount: 0,
              // balanceDue: 0, // Field doesn't exist
              notes: saleNotes,
              // expectedDeliveryDate: createSaleDto.expectedDeliveryDate ? new Date(createSaleDto.expectedDeliveryDate) : null,
              createdBy: userId,
              updatedAt: new Date(),
              ...(saleItems.length > 0 && {
                sale_items: {
                  create: saleItems,
                },
              }),
              payments: {
                create: createSaleDto.payments.map((payment) => ({
                  id: generateId(),
                  method: payment.method as PrismaPaymentMethod,
                  amount: payment.amount,
                  status: PrismaPaymentStatus.COMPLETED,
                  transactionId: payment.reference,
                  processorData:
                    payment.cardLast4 ||
                    payment.processorResponse ||
                    payment.notes
                      ? {
                          cardLast4: payment.cardLast4,
                          processorResponse: payment.processorResponse,
                          notes: payment.notes,
                        }
                      : undefined,
                })),
              },
            },
            include: {
              sale_items: {
                include: {
                  products: true,
                },
              },
              payments: true,
              customers: true,
              users: true,
            },
          });

          // Update product stock and customer stats
          await Promise.all([
            ...productValidations
              .filter(({ isRepairService }) => !isRepairService) // Skip repair services
              .map(({ product, item }) =>
                Promise.all([
                  // Update product stock
                  prisma.products.update({
                    where: { id: product.id },
                    data: {
                      stockQuantity: { decrement: item.quantity },
                      // soldQuantity field doesn't exist in current schema
                    },
                  }),
                  // stockAdjustment table doesn't exist in current schema
                ]),
              ),
            // Update customer stats if customer exists
            ...(createSaleDto.customerId
              ? [
                  prisma.customers.update({
                    where: { id: createSaleDto.customerId },
                    data: {
                      totalSpent: { increment: totalAmount },
                      visitCount: { increment: 1 },
                      // lastVisitDate: new Date(), // Field doesn't exist
                    },
                  }),
                ]
              : []),
          ]);

          // Clear caches
          await Promise.all([
            this.cacheService.delTenantData(tenantId, 'sales:list'),
            this.cacheService.delTenantData(tenantId, 'sales:stats'),
            this.cacheService.delTenantData(tenantId, 'products:list'),
            this.cacheService.delTenantData(tenantId, 'products:stats'),
            ...(createSaleDto.customerId
              ? [
                  this.cacheService.delTenantData(
                    tenantId,
                    `customer:${createSaleDto.customerId}`,
                  ),
                  this.cacheService.delTenantData(tenantId, 'customers:stats'),
                ]
              : []),
          ]);

          this.logger.log(
            `Sale created: ${saleNumber} (${sale.id}) in tenant ${tenantId}`,
          );

          return this.mapToResponseDto(sale);
        },
        { timeout: 30000 },
      );
    } catch (error) {
      this.logger.error('Failed to create sale:', error.message);
      throw error;
    }
  }

  /**
   * Generate unique sale number
   */
  private async generateSaleNumber(
    tenantId: string,
    prisma?: any,
  ): Promise<string> {
    const db = prisma || this.prismaService;
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');

    // Get the count of sales this month
    const salesThisMonth = await db.sales.count({
      where: {
        tenantId,
        createdAt: {
          gte: new Date(year, new Date().getMonth(), 1),
          lt: new Date(year, new Date().getMonth() + 1, 1),
        },
      },
    });

    const sequence = String(salesThisMonth + 1).padStart(4, '0');
    return `SALE-${year}${month}-${sequence}`;
  }

  /**
   * Get all sales with pagination and filtering
   */
  async findAll(
    query: SaleQueryDto,
    tenantId: string,
  ): Promise<PaginatedResponseDto<SaleResponseDto>> {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        status,
        paymentMethod,
        customerId,
        cashierId,
        startDate,
        endDate,
        minAmount,
        maxAmount,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = query;

      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {
        // Simplified type
        tenantId,
        ...(status && { status: status as PrismaSaleStatus }),
        ...(customerId && { customerId }),
        ...(cashierId && { createdBy: cashierId }),
        ...(startDate &&
          endDate && {
            createdAt: {
              gte: new Date(startDate),
              lte: new Date(endDate + 'T23:59:59.999Z'),
            },
          }),
        ...(minAmount !== undefined && { totalAmount: { gte: minAmount } }),
        ...(maxAmount !== undefined && { totalAmount: { lte: maxAmount } }),
        ...(paymentMethod && {
          payments: {
            some: { method: paymentMethod },
          },
        }),
        ...(search && {
          OR: [
            { saleNumber: { contains: search, mode: 'insensitive' } },
            // { walkInCustomerName: { contains: search, mode: 'insensitive' } },
            { notes: { contains: search, mode: 'insensitive' } },
            {
              customers: {
                OR: [
                  { firstName: { contains: search, mode: 'insensitive' } },
                  { lastName: { contains: search, mode: 'insensitive' } },
                  { email: { contains: search, mode: 'insensitive' } },
                ],
              },
            },
          ],
        }),
      };

      // Check cache (temporarily disabled for debugging - TODO: re-enable after fixing cache invalidation)
      const cacheKey = `sales:list:${JSON.stringify({ where, skip, limit, sortBy, sortOrder })}`;
      const cachedResult = null; // Disabled: await this.cacheService.getTenantData<PaginatedResponseDto<SaleResponseDto>>(tenantId, cacheKey);

      if (cachedResult) {
        return cachedResult;
      }

      // Get sales and total count
      const [sales, total] = await Promise.all([
        this.salesRepo.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: {
            sale_items: {
              include: {
                products: true,
              },
            },
            payments: true,
            customers: true,
            // users: true, // Temporarily disabled to debug
          },
        }),
        this.salesRepo.count({ where }),
      ]);

      const result = new PaginatedResponseDto(
        sales.map((sale) => this.mapToResponseDto(sale)),
        page,
        limit,
        total,
      );

      // Cache result for 5 minutes
      await this.cacheService.setTenantData(tenantId, cacheKey, result, 300);

      return result;
    } catch (error) {
      this.logger.error('Failed to fetch sales:', error.message);
      this.logger.error('Error stack:', error.stack);
      this.logger.error('Full error:', JSON.stringify(error, null, 2));
      throw error;
    }
  }

  /**
   * Get sale by ID
   */
  async findOne(id: string, tenantId: string): Promise<SaleResponseDto> {
    try {
      // Check cache first
      const cacheKey = `sale:${id}`;
      const cachedSale = await this.cacheService.getTenantData<SaleResponseDto>(
        tenantId,
        cacheKey,
      );

      if (cachedSale) {
        return cachedSale;
      }

      const sale = await this.salesRepo.findFirst({
        where: { id, tenantId },
        include: {
          sale_items: {
            include: {
              products: true,
            },
          },
          payments: true,
          customers: true,
          users: true,
        },
      });

      if (!sale) {
        throw new NotFoundException(`Sale with ID ${id} not found`);
      }

      const saleDto = this.mapToResponseDto(sale);

      // Cache sale for 10 minutes
      await this.cacheService.setTenantData(tenantId, cacheKey, saleDto, 600);

      return saleDto;
    } catch (error) {
      this.logger.error(`Failed to fetch sale ${id}:`, error.message);
      throw error;
    }
  }

  /**
   * Update a single sale item's notes (used for condition edits etc.)
   */
  async updateSaleItemNotes(itemId: string, notes: string, tenantId: string) {
    const item = await this.salesRepo.findFirstSaleItem({
      where: { id: itemId, sales: { tenantId } },
    });
    if (!item) throw new NotFoundException(`Sale item ${itemId} not found`);
    const updated = await this.salesRepo.updateSaleItem({
      where: { id: itemId },
      data: { notes },
    });
    // Invalidate per-sale cache so next fetch returns fresh data
    await this.cacheService.delTenantData(tenantId, `sale:${item.saleId}`);
    return updated;
  }

  /**
   * Update sale
   */
  async update(
    id: string,
    updateSaleDto: UpdateSaleDto,
    tenantId: string,
    userId: string,
  ): Promise<SaleResponseDto> {
    try {
      // Check if sale exists
      const existingSale = await this.salesRepo.findFirst({
        where: { id, tenantId },
      });

      if (!existingSale) {
        throw new NotFoundException(`Sale with ID ${id} not found`);
      }

      // Prevent updates to completed sales with restrictions
      if (
        existingSale.status === SaleStatus.COMPLETED &&
        updateSaleDto.status !== SaleStatus.CANCELLED
      ) {
        if (
          Object.keys(updateSaleDto).some(
            (key) =>
              !['notes', 'expectedDeliveryDate', 'actualDeliveryDate'].includes(
                key,
              ),
          )
        ) {
          throw new BadRequestException(
            'Only notes and delivery dates can be updated for completed sales',
          );
        }
      }

      const sale = await this.salesRepo.update({
        where: { id },
        data: {
          notes: updateSaleDto.notes,
        },
        include: {
          sale_items: {
            include: {
              products: true,
            },
          },
          payments: true,
          customers: true,
          users: true,
        },
      });

      // Clear cache
      await Promise.all([
        this.cacheService.delTenantData(tenantId, `sale:${id}`),
        this.cacheService.delTenantData(tenantId, 'sales:list'),
        this.cacheService.delTenantData(tenantId, 'sales:stats'),
      ]);

      this.logger.log(`Sale updated: ${id} in tenant ${tenantId}`);

      return this.mapToResponseDto(sale);
    } catch (error) {
      this.logger.error(`Failed to update sale ${id}:`, error.message);
      throw error;
    }
  }

  /**
   * Create refund for sale items
   */
  async createRefund(
    id: string,
    createRefundDto: CreateRefundDto,
    tenantId: string,
    userId: string,
  ): Promise<SaleResponseDto> {
    try {
      return await this.prismaService.$transaction(async (prisma) => {
        const sale = await prisma.sales.findFirst({
          where: { id, tenantId },
          include: {
            sale_items: {
              include: {
                products: true,
              },
            },
            payments: true,
          },
        });

        if (!sale) {
          throw new NotFoundException(`Sale with ID ${id} not found`);
        }

        if (sale.status !== SaleStatus.COMPLETED) {
          throw new BadRequestException('Can only refund completed sales');
        }

        let totalRefundAmount = 0;
        const refundOperations = [];

        // Process each refund item
        for (const refundItem of createRefundDto.items) {
          const saleItem = sale.sale_items.find(
            (item) => item.id === refundItem.saleItemId,
          );
          if (!saleItem) {
            throw new NotFoundException(
              `Sale item ${refundItem.saleItemId} not found`,
            );
          }

          if (refundItem.quantity > saleItem.quantity) {
            throw new BadRequestException(
              `Cannot refund more than sold quantity. Item quantity: ${saleItem.quantity}, Refund quantity: ${refundItem.quantity}`,
            );
          }

          // Calculate refund amount proportionally
          const refundAmount =
            (Number(saleItem.totalPrice) / saleItem.quantity) *
            refundItem.quantity;
          totalRefundAmount += refundAmount;

          // Add stock back to product
          refundOperations.push(
            prisma.products.update({
              where: { id: saleItem.productId },
              data: {
                stockQuantity: { increment: refundItem.quantity },
              },
            }),
          );

          // Update or remove sale item
          if (refundItem.quantity === saleItem.quantity) {
            refundOperations.push(
              prisma.sale_items.delete({
                where: { id: saleItem.id },
              }),
            );
          } else {
            const newQuantity = saleItem.quantity - refundItem.quantity;
            const newTotalPrice =
              (Number(saleItem.totalPrice) / saleItem.quantity) * newQuantity;

            refundOperations.push(
              prisma.sale_items.update({
                where: { id: saleItem.id },
                data: {
                  quantity: newQuantity,
                  totalPrice: newTotalPrice,
                },
              }),
            );
          }
        }

        // Execute all refund operations
        await Promise.all(refundOperations);

        // Update sale totals
        const newTotalAmount = Number(sale.totalAmount) - totalRefundAmount;
        const newRefundedAmount =
          Number(sale.refundedAmount) + totalRefundAmount;
        const newStatus =
          newTotalAmount === newRefundedAmount
            ? ('REFUNDED' as const)
            : ('PARTIAL_REFUND' as const);

        // TODO: Create refund payment record
        // Payment model needs additional fields (reference, refundReason, etc) to properly track refunds
        // For now, refund is tracked via refundedAmount field in Sale model

        const updatedSale = await prisma.sales.update({
          where: { id },
          data: {
            status: PrismaSaleStatus.REFUNDED, // Use REFUNDED instead of PARTIAL_REFUND
            totalAmount: newTotalAmount,
            refundedAmount: newRefundedAmount,
            notes: sale.notes
              ? `${sale.notes}\n\nREFUND: ${createRefundDto.reason || 'Customer refund'}`
              : `REFUND: ${createRefundDto.reason || 'Customer refund'}`,
          },
          include: {
            sale_items: {
              include: {
                products: true,
              },
            },
            payments: true,
            customers: true,
            users: true,
          },
        });

        // Update customer stats if applicable
        if (sale.customerId) {
          await prisma.customers.update({
            where: { id: sale.customerId },
            data: {
              totalSpent: { decrement: totalRefundAmount },
            },
          });
        }

        this.logger.log(
          `Refund processed for sale ${sale.saleNumber}: $${totalRefundAmount}`,
        );

        return this.mapToResponseDto(updatedSale);
      });
    } catch (error) {
      this.logger.error(
        `Failed to create refund for sale ${id}:`,
        error.message,
      );
      throw error;
    }
  }

  /**
   * Get sales statistics
   */
  async getStats(tenantId: string): Promise<SalesStatsDto> {
    try {
      // Check cache first
      const cacheKey = 'sales:stats';
      const cachedStats = await this.cacheService.getTenantData<SalesStatsDto>(
        tenantId,
        cacheKey,
      );

      if (cachedStats) {
        return cachedStats;
      }

      const today = new Date();
      const startOfDay = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
      );
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const startOfYear = new Date(today.getFullYear(), 0, 1);

      const [
        totalSales,
        completedSales,
        pendingSales,
        cancelledSales,
        totalSalesAmount,
        totalRefundedAmount,
        salesToday,
        salesThisMonth,
        salesThisYear,
        revenueToday,
        revenueThisMonth,
        revenueThisYear,
        paymentMethods,
        topProducts,
        hourlySales,
      ] = await Promise.all([
        this.salesRepo.count({ where: { tenantId } }),
        this.salesRepo.count({
          where: { tenantId, status: 'COMPLETED' },
        }),
        // PENDING status doesn't exist in SaleStatus enum - using DRAFT instead
        this.salesRepo.count({
          where: { tenantId, status: 'DRAFT' },
        }),
        this.salesRepo.count({
          where: { tenantId, status: 'CANCELLED' },
        }),
        this.salesRepo.aggregate({
          where: { tenantId, status: 'COMPLETED' },
          _sum: { totalAmount: true },
        }),
        this.salesRepo.aggregate({
          where: { tenantId },
          _sum: { refundedAmount: true },
        }),
        this.salesRepo.count({
          where: { tenantId, createdAt: { gte: startOfDay } },
        }),
        this.salesRepo.count({
          where: { tenantId, createdAt: { gte: startOfMonth } },
        }),
        this.salesRepo.count({
          where: { tenantId, createdAt: { gte: startOfYear } },
        }),
        this.salesRepo.aggregate({
          where: {
            tenantId,
            status: SaleStatus.COMPLETED,
            createdAt: { gte: startOfDay },
          },
          _sum: { totalAmount: true },
        }),
        this.salesRepo.aggregate({
          where: {
            tenantId,
            status: SaleStatus.COMPLETED,
            createdAt: { gte: startOfMonth },
          },
          _sum: { totalAmount: true },
        }),
        this.salesRepo.aggregate({
          where: {
            tenantId,
            status: SaleStatus.COMPLETED,
            createdAt: { gte: startOfYear },
          },
          _sum: { totalAmount: true },
        }),
        // Payment method breakdown
        (this.prismaService.payments.groupBy as any)({
          by: ['method'],
          where: {
            sales: { tenantId },
            status: PaymentStatus.COMPLETED,
            amount: { gt: 0 }, // Exclude refunds
          },
          _count: { method: true },
        }),
        // Top selling products
        (this.prismaService.sale_items.groupBy as any)({
          by: ['productId'],
          where: { sales: { tenantId, status: SaleStatus.COMPLETED } },
          _sum: { quantity: true, totalPrice: true },
          orderBy: { _sum: { totalPrice: 'desc' } },
          take: 10,
        }),
        // Hourly sales for today
        this.salesRepo.findMany({
          where: {
            tenantId,
            status: PrismaSaleStatus.COMPLETED,
            createdAt: { gte: startOfDay },
          },
          select: { createdAt: true },
        }),
      ]);

      // Process payment method breakdown
      const paymentMethodBreakdown = Object.values(PaymentMethod).reduce(
        (acc, method) => {
          acc[method] = 0;
          return acc;
        },
        {} as Record<PaymentMethod, number>,
      );

      paymentMethods.forEach(({ method, _count }) => {
        if (method && typeof method === 'string') {
          paymentMethodBreakdown[method as any] = _count.method;
        }
      });

      // Process top selling products
      const productIds = topProducts.map((p) => p.productId);
      const products = await this.prismaService.products.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true },
      });

      const topSellingProducts = topProducts.map((item) => {
        const product = products.find((p) => p.id === item.productId);
        return {
          productId: item.productId,
          productName: product?.name || 'Unknown Product',
          quantity: item._sum?.quantity || 0,
          revenue: Number(item._sum?.totalPrice || 0),
        };
      });

      // Process hourly sales
      const salesByHour = Array.from({ length: 24 }, (_, i) =>
        String(i).padStart(2, '0'),
      ).reduce(
        (acc, hour) => {
          acc[hour] = 0;
          return acc;
        },
        {} as Record<string, number>,
      );

      hourlySales.forEach((sale) => {
        const hour = String(sale.createdAt.getHours()).padStart(2, '0');
        salesByHour[hour]++;
      });

      const stats: SalesStatsDto = {
        totalSales,
        completedSales,
        pendingSales,
        cancelledSales,
        totalSalesAmount: Number(totalSalesAmount._sum.totalAmount || 0),
        totalRevenue: Number(totalSalesAmount._sum.totalAmount || 0),
        averageSaleAmount:
          completedSales > 0
            ? Number(totalSalesAmount._sum.totalAmount || 0) / completedSales
            : 0,
        totalRefundedAmount: Number(
          totalRefundedAmount._sum?.refundedAmount || 0,
        ),
        salesToday,
        salesThisMonth,
        salesThisYear,
        revenueToday: Number(revenueToday._sum.totalAmount || 0),
        revenueThisMonth: Number(revenueThisMonth._sum.totalAmount || 0),
        revenueThisYear: Number(revenueThisYear._sum.totalAmount || 0),
        paymentMethodBreakdown,
        topSellingProducts,
        salesByHour,
      };

      // Cache stats for 10 minutes
      await this.cacheService.setTenantData(tenantId, cacheKey, stats, 600);

      return stats;
    } catch (error) {
      this.logger.error('Failed to get sales stats:', error.message);
      throw error;
    }
  }

  /**
   * Map sale to response DTO
   */
  private mapToResponseDto(sale: any): SaleResponseDto {
    return {
      id: sale.id,
      saleNumber: sale.saleNumber,
      customerId: sale.customerId,
      customerName: sale.customers
        ? `${sale.customers.firstName} ${sale.customers.lastName}`.trim()
        : '',
      walkInCustomerName: '', // Not in current schema
      walkInCustomerPhone: '', // Not in current schema
      status: sale.status,
      paymentMethod: sale.paymentMethod,
      paymentStatus: sale.paymentStatus,
      subtotal: Number(sale.subtotal),
      discountPercentage: Number(sale.discountPercentage),
      discountAmount: Number(sale.discountAmount),
      taxRate: Number(sale.taxRate),
      taxAmount: Number(sale.taxAmount),
      totalAmount: Number(sale.totalAmount),
      paidAmount: Number(sale.paidAmount),
      refundedAmount: Number(sale.refundedAmount),
      balanceDue: Number(sale.balanceDue || 0),
      notes: sale.notes,
      expectedDeliveryDate: null,
      actualDeliveryDate: null,
      items:
        sale.sale_items?.map((item: any) => ({
          id: item.id,
          productId: item.productId,
          productName: item.products?.name || 'Unknown Product',
          productSku: item.products?.sku || '',
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          discountPercentage: 0,
          discountAmount: Number(item.discount || 0),
          taxRate: 0,
          taxAmount: 0,
          totalPrice: Number(item.totalPrice),
          notes: item.notes || '',
          createdAt: sale.createdAt.toISOString(),
          updatedAt: sale.updatedAt.toISOString(),
        })) || [],
      payments:
        sale.payments?.map((payment: any) => ({
          id: payment.id,
          method: payment.method,
          amount: Number(payment.amount),
          status: payment.status,
          reference: payment.transactionId,
          cardLast4: payment.processorData?.cardLast4,
          processorResponse: payment.processorData?.processorResponse,
          processedAt: null,
          notes: payment.processorData?.notes,
          createdAt: payment.createdAt.toISOString(),
          updatedAt: payment.createdAt.toISOString(),
        })) || [],
      createdBy: sale.createdBy,
      createdByName: sale.users
        ? `${sale.users.firstName} ${sale.users.lastName}`.trim()
        : 'Unknown User',
      cashierId: sale.createdBy,
      cashierName: sale.users
        ? `${sale.users.firstName} ${sale.users.lastName}`.trim()
        : 'Unknown',
      createdAt: sale.createdAt.toISOString(),
      updatedAt: sale.updatedAt.toISOString(),
    };
  }

  /**
   * Get sales statistics broken down per cashier/user
   */
  async getCashierStats(tenantId: string): Promise<any[]> {
    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get all users for this tenant
    const users = await this.prismaService.users.findMany({
      where: { tenantId },
      select: { id: true, firstName: true, lastName: true },
    });

    // Aggregate sales per user
    const results = await Promise.all(
      users.map(async (user) => {
        const base = {
          tenantId,
          createdBy: user.id,
          status: PrismaSaleStatus.COMPLETED,
        };

        const [
          totalSales,
          totalRevAgg,
          todaySales,
          todayRevAgg,
          weekSales,
          weekRevAgg,
          monthSales,
          monthRevAgg,
          lastSale,
        ] = await Promise.all([
          this.salesRepo.count({
            where: { tenantId, createdBy: user.id },
          }),
          this.salesRepo.aggregate({
            where: base,
            _sum: { totalAmount: true },
          }),
          this.salesRepo.count({
            where: { ...base, createdAt: { gte: startOfDay } },
          }),
          this.salesRepo.aggregate({
            where: { ...base, createdAt: { gte: startOfDay } },
            _sum: { totalAmount: true },
          }),
          this.salesRepo.count({
            where: { ...base, createdAt: { gte: startOfWeek } },
          }),
          this.salesRepo.aggregate({
            where: { ...base, createdAt: { gte: startOfWeek } },
            _sum: { totalAmount: true },
          }),
          this.salesRepo.count({
            where: { ...base, createdAt: { gte: startOfMonth } },
          }),
          this.salesRepo.aggregate({
            where: { ...base, createdAt: { gte: startOfMonth } },
            _sum: { totalAmount: true },
          }),
          this.salesRepo.findFirst({
            where: { tenantId, createdBy: user.id },
            orderBy: { createdAt: 'desc' },
            select: { createdAt: true },
          }),
        ]);

        const totalRev = Number(totalRevAgg._sum.totalAmount || 0);
        const completedCount = await this.salesRepo.count({
          where: base,
        });

        return {
          cashierId: user.id,
          cashierName: `${user.firstName} ${user.lastName}`.trim(),
          todaySales,
          todayRevenue: Number(todayRevAgg._sum.totalAmount || 0),
          weekSales,
          weekRevenue: Number(weekRevAgg._sum.totalAmount || 0),
          monthSales,
          monthRevenue: Number(monthRevAgg._sum.totalAmount || 0),
          totalSales,
          totalRevenue: totalRev,
          averageOrderValue: completedCount > 0 ? totalRev / completedCount : 0,
          lastSaleDate: lastSale?.createdAt?.toISOString() || null,
        };
      }),
    );

    return results;
  }

  /**
   * Delete a sale
   * This will restore inventory for sold items and mark the sale as deleted
   */
  async remove(id: string, tenantId: string, userId: string): Promise<void> {
    try {
      await this.prismaService.$transaction(async (prisma) => {
        // Find the sale
        const sale = await prisma.sales.findFirst({
          where: {
            id,
            tenantId,
          },
          include: {
            sale_items: {
              include: {
                products: true,
              },
            },
            payments: true,
          },
        });

        if (!sale) {
          throw new NotFoundException('Sale not found');
        }

        // Restore inventory for each item in the sale
        for (const item of sale.sale_items) {
          if (item.products) {
            await prisma.products.update({
              where: { id: item.productId },
              data: {
                stockQuantity: {
                  increment: item.quantity, // Add back the sold quantity
                },
              },
            });

            this.logger.log(
              `Restored ${item.quantity} units of product ${item.productId} (${item.products.name})`,
            );
          }
        }

        // Delete related records first (due to foreign key constraints)
        await prisma.payments.deleteMany({
          where: { saleId: id },
        });

        await prisma.sale_items.deleteMany({
          where: { saleId: id },
        });

        // Delete the sale
        await prisma.sales.delete({
          where: { id },
        });

        this.logger.log(`Sale ${sale.saleNumber} deleted by user ${userId}`);

        // Invalidate relevant caches
        await this.cacheService.del(`sale:${id}`);
        await this.cacheService.del(`sales:${tenantId}:*`);
        await this.cacheService.del(`sales:stats:${tenantId}`);
      });
    } catch (error) {
      this.logger.error(`Failed to delete sale ${id}:`, error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to delete sale: ${error.message || 'Unknown error'}`,
      );
    }
  }
}
