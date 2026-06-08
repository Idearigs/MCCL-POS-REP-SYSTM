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
  RecordInstallmentPaymentDto,
} from './dto/sale.dto';
import { PaginatedResponseDto } from '../../shared/dto/pagination.dto';
import { generateId } from '../../shared/utils/id-generator';

// Non-stock sale lines (repair services, gift-card sales) carry one of these
// markers in their notes so the create path skips the products table lookup
// and does not write a sale_items row (which would violate the productId FK).
const NON_STOCK_MARKERS = [
  'REPAIR SERVICE',
  'GIFT CARD',
  'MANUAL ENTRY',
  'APPRAISAL',
  'CUSTOM TILE',
];
function isNonStockLine(notes?: string): boolean {
  return !!notes && NON_STOCK_MARKERS.some((m) => notes.includes(m));
}

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
    idempotencyKey?: string,
  ): Promise<SaleResponseDto> {
    // Idempotency key resolution: prefer the Idempotency-Key header, fall back to
    // the body's clientSaleId (offline-sync path). Either uniquely identifies a
    // checkout attempt so a network-retry of the same payload is deduplicated.
    const idemKey = idempotencyKey || createSaleDto.clientSaleId;
    if (idemKey) {
      createSaleDto.clientSaleId = idemKey;

      // Fast path: already persisted → return the cached success response.
      const existing = await this.findExistingByIdemKey(tenantId, idemKey);
      if (existing) {
        this.logger.log(
          `Idempotent sale replay (pre-check): key=${idemKey} → ${existing.id}`,
        );
        return this.mapToResponseDto(existing);
      }
    }

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

          // ── CONCURRENCY: acquire row-level locks on all real products ──────
          // Lock every product row being sold with SELECT ... FOR UPDATE so two
          // terminals selling the same item serialize — the 2nd waits, then sees
          // the decremented stock and is cleanly rejected ("out of stock").
          const realProductIds = createSaleDto.items
            .filter((item) => !isNonStockLine(item.notes))
            .map((item) => item.productId);

          const lockedStock = new Map<
            string,
            { id: string; name: string; stockQuantity: number }
          >();

          if (realProductIds.length > 0) {
            // Deduplicate ids; lock in a stable order to avoid deadlocks
            const uniqueIds = [...new Set(realProductIds)].sort();
            const lockedRows = await prisma.$queryRaw<
              Array<{ id: string; name: string; stockQuantity: number }>
            >(
              Prisma.sql`
                SELECT id, name, "stockQuantity"
                FROM products
                WHERE id IN (${Prisma.join(uniqueIds)})
                  AND "tenantId" = ${tenantId}
                  AND "isActive" = true
                FOR UPDATE
              `,
            );
            for (const row of lockedRows) {
              lockedStock.set(row.id, {
                id: row.id,
                name: row.name,
                stockQuantity: Number(row.stockQuantity),
              });
            }
          }

          // Validate products and check stock against the LOCKED rows
          const productValidations = createSaleDto.items.map((item) => {
            // Non-stock line (repair service or gift-card sale): skip the
            // product lookup and treat it as a virtual line.
            const isRepairService = isNonStockLine(item.notes);

            if (isRepairService) {
              // For non-stock lines, skip product validation
              // Create a virtual product entry for the sale
              return {
                product: {
                  id: item.productId,
                  name: item.notes || 'Service',
                  stockQuantity: 999999, // Virtual unlimited stock
                  price: item.unitPrice,
                },
                item,
                isRepairService: true,
              };
            }

            // Regular product validation — uses the row we locked above
            const product = lockedStock.get(item.productId);

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
          });

          // Guard against the same product appearing on multiple lines exceeding
          // the locked stock in aggregate (e.g. two lines of the same SKU).
          const aggregateByProduct = new Map<string, number>();
          for (const { item, isRepairService } of productValidations) {
            if (isRepairService) continue;
            aggregateByProduct.set(
              item.productId,
              (aggregateByProduct.get(item.productId) ?? 0) + item.quantity,
            );
          }
          for (const [productId, qty] of aggregateByProduct) {
            const locked = lockedStock.get(productId);
            if (locked && locked.stockQuantity < qty) {
              throw new BadRequestException(
                `Insufficient stock for product ${locked.name}. Available: ${locked.stockQuantity}, Requested: ${qty}`,
              );
            }
          }

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

          // Validate payment amount. The payment lines must account for the
          // whole sale (e.g. a monthly account = cash deposit + INSTALLMENT
          // balance), so the sum still has to equal the total.
          const totalPayments = createSaleDto.payments.reduce(
            (sum, payment) => sum + payment.amount,
            0,
          );
          if (Math.abs(totalPayments - totalAmount) > 0.01) {
            throw new BadRequestException(
              `Payment amount (${totalPayments}) does not match total amount (${totalAmount})`,
            );
          }

          // Money actually received now excludes the INSTALLMENT line — that is
          // the financed balance still owed, not cash in hand. Without this a
          // monthly account would be stored fully paid (balanceDue 0) the moment
          // it is created, so it never appears as outstanding.
          const amountReceived = createSaleDto.payments
            .filter((payment) => payment.method !== 'INSTALLMENT')
            .reduce((sum, payment) => sum + payment.amount, 0);

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
              paymentStatus:
                amountReceived >= totalAmount - 0.01
                  ? PrismaPaymentStatus.COMPLETED
                  : PrismaPaymentStatus.PENDING,
              paidAmount: amountReceived,
              refundedAmount: 0,
              balanceDue: Math.max(0, totalAmount - amountReceived),
              notes: saleNotes,
              clientSaleId: createSaleDto.clientSaleId ?? null,
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
                      // Mark as monthly payer when an installment sale is created
                      ...(primaryPayment.method === 'INSTALLMENT' && {
                        isMonthlyPayer: true,
                      }),
                    },
                  }),
                ]
              : []),
          ]);

          // Clear caches — fire-and-forget (post-sale side effect). We do NOT
          // await this so the HTTP response is freed the instant the DB commits;
          // cache invalidation completes in the background.
          void Promise.all([
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
          ]).catch((err) =>
            this.logger.warn(`Post-sale cache clear failed: ${err?.message}`),
          );

          this.logger.log(
            `Sale created: ${saleNumber} (${sale.id}) in tenant ${tenantId}`,
          );

          return this.mapToResponseDto(sale);
        },
        { timeout: 30000 },
      );
    } catch (error) {
      // ── IDEMPOTENCY RACE ───────────────────────────────────────────────
      // Two simultaneous retries can both pass the pre-check and reach the
      // INSERT. The unique constraint [tenantId, clientSaleId] makes Postgres
      // reject the 2nd with P2002. Instead of 500-ing, return the sale the
      // winning transaction committed — the caller gets the same success.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' &&
        idemKey
      ) {
        const existing = await this.findExistingByIdemKey(tenantId, idemKey);
        if (existing) {
          this.logger.log(
            `Idempotent sale replay (race resolved): key=${idemKey} → ${existing.id}`,
          );
          return this.mapToResponseDto(existing);
        }
      }
      this.logger.error('Failed to create sale:', error.message);
      throw error;
    }
  }

  /**
   * Idempotency wrapper for mutating operations that have no durable dedupe
   * column (refunds, installment payments). Replays the cached prior result
   * when the same Idempotency-Key is seen again within 24h, so a network retry
   * or double-click does not double-process. Concurrent same-key requests are
   * additionally serialized by the SELECT … FOR UPDATE row lock inside each
   * operation, so the second caller sees the first's committed result.
   */
  private async replayOrRun<T>(
    scope: string,
    key: string | undefined,
    run: () => Promise<T>,
  ): Promise<T> {
    if (!key) return run();
    const cacheKey = `idem:${scope}:${key}`;
    const cached = await this.cacheService.get<T>(cacheKey);
    if (cached) {
      this.logger.log(`Idempotent replay [${scope}] key=${key}`);
      return cached;
    }
    try {
      const result = await run();
      // 24h retention — best-effort (Redis when available, else in-memory).
      await this.cacheService.set(cacheKey, result, 86400);
      return result;
    } catch (err) {
      // A concurrent request with the same key may have won the row lock and
      // committed while this one waited (and possibly timed out). If its result
      // is now cached, return that instead of surfacing the lost race as an
      // error — the operation succeeded exactly once.
      const afterRace = await this.cacheService.get<T>(cacheKey);
      if (afterRace) {
        this.logger.log(`Idempotent replay after race [${scope}] key=${key}`);
        return afterRace;
      }
      throw err;
    }
  }

  /** Look up an already-committed sale by its idempotency key (clientSaleId). */
  private async findExistingByIdemKey(
    tenantId: string,
    idemKey: string,
  ): Promise<Record<string, any> | null> {
    return (this.prismaService.sales as any).findFirst({
      where: { tenantId, clientSaleId: idemKey },
      include: {
        sale_items: { include: { products: true } },
        payments: true,
        customers: true,
        users: true,
      },
    });
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
        cursor,
        page = 1,
        limit = 10,
        search,
        status,
        paymentMethod,
        paymentStatus,
        customerId,
        cashierId,
        startDate,
        endDate,
        minAmount,
        maxAmount,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = query;

      const useCursor = !!cursor;
      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {
        // Simplified type
        tenantId,
        ...(status && { status: status as PrismaSaleStatus }),
        ...(paymentStatus && {
          paymentStatus: paymentStatus as PrismaPaymentStatus,
        }),
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

      // Cursor mode uses a stable, unique ordering (createdAt + id tiebreaker)
      // and seeks past the cursor row — O(1) regardless of page depth, unlike
      // OFFSET which scans+discards skipped rows. Offset mode is kept for
      // backwards compatibility with existing callers.
      const include = {
        sale_items: { include: { products: true } },
        payments: true,
        customers: true,
        users: true,
      };

      const findArgs: any = useCursor
        ? {
            where,
            take: limit,
            cursor: { id: cursor },
            skip: 1, // skip the cursor row itself
            orderBy: [{ createdAt: sortOrder }, { id: sortOrder }],
            include,
          }
        : {
            where,
            skip,
            take: limit,
            orderBy: { [sortBy]: sortOrder },
            include,
          };

      // Get sales and total count
      const [sales, total] = await Promise.all([
        this.salesRepo.findMany(findArgs),
        this.salesRepo.count({ where }),
      ]);

      // nextCursor: the id of the last row when a full page was returned (more
      // rows likely exist); null when the page wasn't full (end of data).
      // Emitted in BOTH modes so a client can start with an offset/first call
      // and then continue via ?cursor=… without overlap.
      const nextCursor =
        sales.length === limit ? sales[sales.length - 1].id : null;

      const result = new PaginatedResponseDto(
        sales.map((sale) => this.mapToResponseDto(sale)),
        page,
        limit,
        total,
        nextCursor,
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
   * Memory-flat streaming source for CSV export. Yields sales one row at a time
   * by walking the table in keyset (cursor) batches — never loads the whole
   * result set into memory, so RAM stays flat regardless of dataset size.
   *
   * `isAborted` lets the caller (controller) stop fetching further batches the
   * moment the HTTP client disconnects.
   */
  async *streamSalesForExport(
    tenantId: string,
    filters: {
      status?: string;
      startDate?: string;
      endDate?: string;
      customerId?: string;
    },
    isAborted: () => boolean,
    batchSize = 500,
  ): AsyncGenerator<{
    receiptNumber: string;
    saleNumber: string;
    date: Date;
    customer: string;
    total: number;
    paymentMethod: string;
    status: string;
    cashier: string;
  }> {
    const where: any = {
      tenantId,
      ...(filters.status && { status: filters.status as PrismaSaleStatus }),
      ...(filters.customerId && { customerId: filters.customerId }),
      ...(filters.startDate &&
        filters.endDate && {
          createdAt: {
            gte: new Date(filters.startDate),
            lte: new Date(filters.endDate + 'T23:59:59.999Z'),
          },
        }),
    };

    let cursor: string | undefined;

    while (true) {
      if (isAborted()) return; // client hung up — stop hitting the DB

      const batch = (await this.salesRepo.findMany({
        where,
        take: batchSize,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: {
          id: true,
          saleNumber: true,
          receiptNumber: true,
          totalAmount: true,
          paymentMethod: true,
          status: true,
          createdAt: true,
          customers: { select: { firstName: true, lastName: true } },
          users: { select: { firstName: true, lastName: true } },
        },
      } as any)) as any[];

      if (batch.length === 0) return;

      for (const s of batch) {
        yield {
          receiptNumber: s.receiptNumber ?? '',
          saleNumber: s.saleNumber ?? '',
          date: s.createdAt,
          customer: s.customers
            ? `${s.customers.firstName ?? ''} ${s.customers.lastName ?? ''}`.trim()
            : 'Walk-in',
          total: Number(s.totalAmount),
          paymentMethod: s.paymentMethod,
          status: s.status,
          cashier: s.users
            ? `${s.users.firstName ?? ''} ${s.users.lastName ?? ''}`.trim()
            : '',
        };
      }

      if (batch.length < batchSize) return; // last page
      cursor = batch[batch.length - 1].id;
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
   * Record a partial payment against an INSTALLMENT sale
   */
  async recordInstallmentPayment(
    id: string,
    dto: RecordInstallmentPaymentDto,
    tenantId: string,
    userId: string,
    idempotencyKey?: string,
  ): Promise<SaleResponseDto> {
    return this.replayOrRun('installment', idempotencyKey, () =>
      this.prismaService.$transaction(async (prisma) => {
        // CONCURRENCY: lock the sale row so two simultaneous payments serialize.
        // The 2nd reads the already-updated balanceDue, preventing a double
        // payment / incorrect balance.
        await prisma.$queryRaw`
          SELECT id FROM sales
          WHERE id = ${id} AND "tenantId" = ${tenantId}
          FOR UPDATE
        `;

        const sale = await prisma.sales.findFirst({
          where: { id, tenantId },
          include: {
            sale_items: { include: { products: true } },
            payments: true,
            customers: true,
            users: true,
          },
        });
        if (!sale) throw new NotFoundException(`Sale ${id} not found`);
        if (sale.paymentMethod !== 'INSTALLMENT')
          throw new BadRequestException('Sale is not an installment sale');
        if (Number(sale.balanceDue) <= 0)
          throw new BadRequestException('Sale is already fully paid');

        const payAmount = Math.min(dto.amount, Number(sale.balanceDue));
        const newPaid = Number(sale.paidAmount) + payAmount;
        const newBalance = Number(sale.totalAmount) - newPaid;

        await prisma.payments.create({
          data: {
            id: generateId(),
            saleId: sale.id,
            amount: payAmount,
            method: dto.method as any,
            status: 'COMPLETED',
            processorData: dto.notes ? { notes: dto.notes } : undefined,
          },
        });

        const updated = await prisma.sales.update({
          where: { id },
          data: {
            paidAmount: newPaid,
            balanceDue: Math.max(0, newBalance),
            paymentStatus: newBalance <= 0 ? 'COMPLETED' : 'PENDING',
            notes: dto.notes
              ? `${sale.notes ? sale.notes + '\n' : ''}Payment of £${payAmount.toFixed(2)} recorded.`
              : sale.notes,
            updatedAt: new Date(),
          },
          include: {
            sale_items: { include: { products: true } },
            payments: true,
            customers: true,
            users: true,
          },
        });

        await Promise.all([
          this.cacheService.delTenantData(tenantId, `sale:${id}`),
          this.cacheService.delTenantData(tenantId, 'sales:list'),
          this.cacheService.delTenantData(tenantId, 'sales:stats'),
        ]);

        this.logger.log(
          `Installment payment £${payAmount} recorded for sale ${id}`,
        );
        return this.mapToResponseDto(updated);
      }),
    );
  }

  /**
   * Void a sale — marks it as CANCELLED and appends the reason to notes.
   * Preserves the record for audit trail (does NOT delete).
   */
  async voidSale(
    id: string,
    reason: string,
    details: string,
    tenantId: string,
    _userId: string,
    idempotencyKey?: string,
  ): Promise<SaleResponseDto> {
    return this.replayOrRun('void', idempotencyKey, () =>
      this.prismaService.$transaction(async (prisma) => {
        // CONCURRENCY: lock the sale row so a void can't race with a concurrent
        // refund/update on the same sale.
        await prisma.$queryRaw`
          SELECT id FROM sales
          WHERE id = ${id} AND "tenantId" = ${tenantId}
          FOR UPDATE
        `;

        const sale = await prisma.sales.findFirst({
          where: { id, tenantId },
          include: {
            sale_items: { include: { products: true } },
            payments: true,
            customers: true,
            users: true,
          },
        });

        if (!sale) throw new NotFoundException(`Sale with ID ${id} not found`);

        const voidNote = `VOIDED: ${reason}${details && details !== reason ? ` — ${details}` : ''}`;
        const updatedNotes = sale.notes
          ? `${sale.notes}\n\n${voidNote}`
          : voidNote;

        const updated = await prisma.sales.update({
          where: { id },
          data: {
            status: SaleStatus.CANCELLED,
            notes: updatedNotes,
          },
          include: {
            sale_items: { include: { products: true } },
            payments: true,
            customers: true,
            users: true,
          },
        });

        this.logger.log(`Sale ${sale.saleNumber} voided. Reason: ${reason}`);
        return this.mapToResponseDto(updated);
      }),
    );
  }

  /**
   * Create refund for sale items
   */
  async createRefund(
    id: string,
    createRefundDto: CreateRefundDto,
    tenantId: string,
    userId: string,
    idempotencyKey?: string,
  ): Promise<SaleResponseDto> {
    return this.replayOrRun('refund', idempotencyKey, async () => {
      try {
        return await this.prismaService.$transaction(async (prisma) => {
          // CONCURRENCY: lock the sale row so two simultaneous refunds of the
          // same sale serialize — the 2nd waits, then sees the already-refunded
          // state (item deleted/reduced) and cannot double-restore stock.
          await prisma.$queryRaw`
            SELECT id FROM sales
            WHERE id = ${id} AND "tenantId" = ${tenantId}
            FOR UPDATE
          `;

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

          // Service-only sales (repairs, battery changes, etc.) are not stored
          // as sale_items, so the client sends an empty items array. Treat that
          // as a full refund of the remaining balance — there is no stock to
          // restore. Product sales must still itemise so we restock correctly.
          if (createRefundDto.items.length === 0) {
            if (sale.sale_items.length > 0) {
              throw new BadRequestException(
                'Select at least one item to refund for this sale',
              );
            }

            totalRefundAmount =
              Number(sale.totalAmount) - Number(sale.refundedAmount);

            if (totalRefundAmount <= 0) {
              throw new BadRequestException(
                'This sale has already been fully refunded',
              );
            }
          }

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
    });
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
      cashierName: sale.users ? sale.users.firstName : 'Unknown',
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
