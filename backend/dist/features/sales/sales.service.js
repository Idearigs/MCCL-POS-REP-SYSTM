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
var SalesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SalesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../core/prisma/prisma.service");
const cache_service_1 = require("../../core/cache/cache.service");
const shifts_service_1 = require("../shifts/shifts.service");
const client_1 = require("@prisma/client");
const sale_dto_1 = require("./dto/sale.dto");
const pagination_dto_1 = require("../../shared/dto/pagination.dto");
const id_generator_1 = require("../../shared/utils/id-generator");
let SalesService = SalesService_1 = class SalesService {
    prismaService;
    cacheService;
    shiftsService;
    logger = new common_1.Logger(SalesService_1.name);
    constructor(prismaService, cacheService, shiftsService) {
        this.prismaService = prismaService;
        this.cacheService = cacheService;
        this.shiftsService = shiftsService;
    }
    async create(createSaleDto, tenantId, userId) {
        try {
            return await this.prismaService.$transaction(async (prisma) => {
                const saleNumber = await this.generateSaleNumber(tenantId, prisma);
                if (createSaleDto.customerId) {
                    const customer = await prisma.customers.findFirst({
                        where: { id: createSaleDto.customerId, tenantId },
                    });
                    if (!customer) {
                        throw new common_1.NotFoundException('Customer not found');
                    }
                }
                const productValidations = await Promise.all(createSaleDto.items.map(async (item) => {
                    const isRepairService = item.notes?.includes('REPAIR SERVICE');
                    if (isRepairService) {
                        return {
                            product: {
                                id: item.productId,
                                name: item.notes || 'Repair Service',
                                stockQuantity: 999999,
                                price: item.unitPrice,
                            },
                            item,
                            isRepairService: true,
                        };
                    }
                    const product = await prisma.products.findFirst({
                        where: { id: item.productId, tenantId, isActive: true },
                    });
                    if (!product) {
                        throw new common_1.NotFoundException(`Product ${item.productId} not found`);
                    }
                    if (product.stockQuantity < item.quantity) {
                        throw new common_1.BadRequestException(`Insufficient stock for product ${product.name}. Available: ${product.stockQuantity}, Requested: ${item.quantity}`);
                    }
                    return { product, item, isRepairService: false };
                }));
                let subtotal = 0;
                const saleItems = [];
                const repairServiceDetails = [];
                for (const { product, item, isRepairService } of productValidations) {
                    const lineSubtotal = item.quantity * item.unitPrice;
                    const itemDiscountAmount = item.discountAmount ||
                        (item.discountPercentage
                            ? lineSubtotal * (item.discountPercentage / 100)
                            : 0);
                    const discountedAmount = lineSubtotal - itemDiscountAmount;
                    const taxAmount = item.taxRate
                        ? discountedAmount * (item.taxRate / 100)
                        : 0;
                    const totalPrice = discountedAmount + taxAmount;
                    subtotal += lineSubtotal;
                    if (!isRepairService) {
                        saleItems.push({
                            id: (0, id_generator_1.generateId)(),
                            productId: item.productId,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice,
                            discount: itemDiscountAmount,
                            totalPrice,
                        });
                    }
                    else {
                        repairServiceDetails.push({
                            name: item.notes || 'Repair Service',
                            price: item.unitPrice,
                            quantity: item.quantity,
                            total: totalPrice,
                        });
                    }
                }
                const overallDiscountAmount = createSaleDto.discountAmount ||
                    (createSaleDto.discountPercentage
                        ? subtotal * (createSaleDto.discountPercentage / 100)
                        : 0);
                const discountedSubtotal = subtotal - overallDiscountAmount;
                const taxAmount = createSaleDto.taxRate
                    ? discountedSubtotal * (createSaleDto.taxRate / 100)
                    : 0;
                const totalAmount = discountedSubtotal + taxAmount;
                const totalPayments = createSaleDto.payments.reduce((sum, payment) => sum + payment.amount, 0);
                if (Math.abs(totalPayments - totalAmount) > 0.01) {
                    throw new common_1.BadRequestException(`Payment amount (${totalPayments}) does not match total amount (${totalAmount})`);
                }
                const primaryPayment = createSaleDto.payments.length === 1
                    ? createSaleDto.payments[0]
                    : createSaleDto.payments.reduce((max, payment) => payment.amount > max.amount ? payment : max);
                let saleNotes = createSaleDto.notes || '';
                if (repairServiceDetails.length > 0) {
                    const repairInfo = repairServiceDetails
                        .map((r) => `${r.name}: £${r.price.toFixed(2)}`)
                        .join(', ');
                    saleNotes = saleNotes
                        ? `${saleNotes}\n\nRepair Services: ${repairInfo}`
                        : `Repair Services: ${repairInfo}`;
                }
                let activeShiftId;
                try {
                    const activeShift = await this.shiftsService.getActiveShift(userId, tenantId);
                    if (activeShift) {
                        activeShiftId = activeShift.id;
                    }
                }
                catch (error) {
                    this.logger.debug(`No active shift found for user ${userId}: ${error.message}`);
                }
                const sale = await prisma.sales.create({
                    data: {
                        id: (0, id_generator_1.generateId)(),
                        saleNumber,
                        tenantId,
                        customerId: createSaleDto.customerId,
                        shiftId: activeShiftId,
                        status: client_1.SaleStatus.COMPLETED,
                        subtotal,
                        discountAmount: overallDiscountAmount,
                        taxAmount,
                        totalAmount,
                        paymentMethod: primaryPayment.method,
                        paymentStatus: client_1.PaymentStatus.COMPLETED,
                        paidAmount: totalPayments,
                        refundedAmount: 0,
                        notes: saleNotes,
                        createdBy: userId,
                        updatedAt: new Date(),
                        ...(saleItems.length > 0 && {
                            sale_items: {
                                create: saleItems,
                            },
                        }),
                        payments: {
                            create: createSaleDto.payments.map((payment) => ({
                                id: (0, id_generator_1.generateId)(),
                                method: payment.method,
                                amount: payment.amount,
                                status: client_1.PaymentStatus.COMPLETED,
                                transactionId: payment.reference,
                                processorData: payment.cardLast4 ||
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
                await Promise.all([
                    ...productValidations
                        .filter(({ isRepairService }) => !isRepairService)
                        .map(({ product, item }) => Promise.all([
                        prisma.products.update({
                            where: { id: product.id },
                            data: {
                                stockQuantity: { decrement: item.quantity },
                            },
                        }),
                    ])),
                    ...(createSaleDto.customerId
                        ? [
                            prisma.customers.update({
                                where: { id: createSaleDto.customerId },
                                data: {
                                    totalSpent: { increment: totalAmount },
                                    visitCount: { increment: 1 },
                                },
                            }),
                        ]
                        : []),
                ]);
                await Promise.all([
                    this.cacheService.delTenantData(tenantId, 'sales:list'),
                    this.cacheService.delTenantData(tenantId, 'sales:stats'),
                    this.cacheService.delTenantData(tenantId, 'products:list'),
                    this.cacheService.delTenantData(tenantId, 'products:stats'),
                    ...(createSaleDto.customerId
                        ? [
                            this.cacheService.delTenantData(tenantId, `customer:${createSaleDto.customerId}`),
                            this.cacheService.delTenantData(tenantId, 'customers:stats'),
                        ]
                        : []),
                ]);
                this.logger.log(`Sale created: ${saleNumber} (${sale.id}) in tenant ${tenantId}`);
                return this.mapToResponseDto(sale);
            }, { timeout: 30000 });
        }
        catch (error) {
            this.logger.error('Failed to create sale:', error.message);
            throw error;
        }
    }
    async generateSaleNumber(tenantId, prisma) {
        const db = prisma || this.prismaService;
        const year = new Date().getFullYear();
        const month = String(new Date().getMonth() + 1).padStart(2, '0');
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
    async findAll(query, tenantId) {
        try {
            const { page = 1, limit = 10, search, status, paymentMethod, customerId, cashierId, startDate, endDate, minAmount, maxAmount, sortBy = 'createdAt', sortOrder = 'desc', } = query;
            const skip = (page - 1) * limit;
            const where = {
                tenantId,
                ...(status && { status: status }),
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
            const cacheKey = `sales:list:${JSON.stringify({ where, skip, limit, sortBy, sortOrder })}`;
            const cachedResult = null;
            if (cachedResult) {
                return cachedResult;
            }
            const [sales, total] = await Promise.all([
                this.prismaService.sales.findMany({
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
                    },
                }),
                this.prismaService.sales.count({ where }),
            ]);
            const result = new pagination_dto_1.PaginatedResponseDto(sales.map((sale) => this.mapToResponseDto(sale)), page, limit, total);
            await this.cacheService.setTenantData(tenantId, cacheKey, result, 300);
            return result;
        }
        catch (error) {
            this.logger.error('Failed to fetch sales:', error.message);
            this.logger.error('Error stack:', error.stack);
            this.logger.error('Full error:', JSON.stringify(error, null, 2));
            throw error;
        }
    }
    async findOne(id, tenantId) {
        try {
            const cacheKey = `sale:${id}`;
            const cachedSale = await this.cacheService.getTenantData(tenantId, cacheKey);
            if (cachedSale) {
                return cachedSale;
            }
            const sale = await this.prismaService.sales.findFirst({
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
                throw new common_1.NotFoundException(`Sale with ID ${id} not found`);
            }
            const saleDto = this.mapToResponseDto(sale);
            await this.cacheService.setTenantData(tenantId, cacheKey, saleDto, 600);
            return saleDto;
        }
        catch (error) {
            this.logger.error(`Failed to fetch sale ${id}:`, error.message);
            throw error;
        }
    }
    async update(id, updateSaleDto, tenantId, userId) {
        try {
            const existingSale = await this.prismaService.sales.findFirst({
                where: { id, tenantId },
            });
            if (!existingSale) {
                throw new common_1.NotFoundException(`Sale with ID ${id} not found`);
            }
            if (existingSale.status === sale_dto_1.SaleStatus.COMPLETED &&
                updateSaleDto.status !== sale_dto_1.SaleStatus.CANCELLED) {
                if (Object.keys(updateSaleDto).some((key) => !['notes', 'expectedDeliveryDate', 'actualDeliveryDate'].includes(key))) {
                    throw new common_1.BadRequestException('Only notes and delivery dates can be updated for completed sales');
                }
            }
            const sale = await this.prismaService.sales.update({
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
            await Promise.all([
                this.cacheService.delTenantData(tenantId, `sale:${id}`),
                this.cacheService.delTenantData(tenantId, 'sales:list'),
                this.cacheService.delTenantData(tenantId, 'sales:stats'),
            ]);
            this.logger.log(`Sale updated: ${id} in tenant ${tenantId}`);
            return this.mapToResponseDto(sale);
        }
        catch (error) {
            this.logger.error(`Failed to update sale ${id}:`, error.message);
            throw error;
        }
    }
    async createRefund(id, createRefundDto, tenantId, userId) {
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
                    throw new common_1.NotFoundException(`Sale with ID ${id} not found`);
                }
                if (sale.status !== sale_dto_1.SaleStatus.COMPLETED) {
                    throw new common_1.BadRequestException('Can only refund completed sales');
                }
                let totalRefundAmount = 0;
                const refundOperations = [];
                for (const refundItem of createRefundDto.items) {
                    const saleItem = sale.sale_items.find((item) => item.id === refundItem.saleItemId);
                    if (!saleItem) {
                        throw new common_1.NotFoundException(`Sale item ${refundItem.saleItemId} not found`);
                    }
                    if (refundItem.quantity > saleItem.quantity) {
                        throw new common_1.BadRequestException(`Cannot refund more than sold quantity. Item quantity: ${saleItem.quantity}, Refund quantity: ${refundItem.quantity}`);
                    }
                    const refundAmount = (Number(saleItem.totalPrice) / saleItem.quantity) *
                        refundItem.quantity;
                    totalRefundAmount += refundAmount;
                    refundOperations.push(prisma.products.update({
                        where: { id: saleItem.productId },
                        data: {
                            stockQuantity: { increment: refundItem.quantity },
                        },
                    }));
                    if (refundItem.quantity === saleItem.quantity) {
                        refundOperations.push(prisma.sale_items.delete({
                            where: { id: saleItem.id },
                        }));
                    }
                    else {
                        const newQuantity = saleItem.quantity - refundItem.quantity;
                        const newTotalPrice = (Number(saleItem.totalPrice) / saleItem.quantity) * newQuantity;
                        refundOperations.push(prisma.sale_items.update({
                            where: { id: saleItem.id },
                            data: {
                                quantity: newQuantity,
                                totalPrice: newTotalPrice,
                            },
                        }));
                    }
                }
                await Promise.all(refundOperations);
                const newTotalAmount = Number(sale.totalAmount) - totalRefundAmount;
                const newRefundedAmount = Number(sale.refundedAmount) + totalRefundAmount;
                const newStatus = newTotalAmount === newRefundedAmount
                    ? 'REFUNDED'
                    : 'PARTIAL_REFUND';
                const updatedSale = await prisma.sales.update({
                    where: { id },
                    data: {
                        status: client_1.SaleStatus.REFUNDED,
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
                if (sale.customerId) {
                    await prisma.customers.update({
                        where: { id: sale.customerId },
                        data: {
                            totalSpent: { decrement: totalRefundAmount },
                        },
                    });
                }
                this.logger.log(`Refund processed for sale ${sale.saleNumber}: $${totalRefundAmount}`);
                return this.mapToResponseDto(updatedSale);
            });
        }
        catch (error) {
            this.logger.error(`Failed to create refund for sale ${id}:`, error.message);
            throw error;
        }
    }
    async getStats(tenantId) {
        try {
            const cacheKey = 'sales:stats';
            const cachedStats = await this.cacheService.getTenantData(tenantId, cacheKey);
            if (cachedStats) {
                return cachedStats;
            }
            const today = new Date();
            const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            const startOfYear = new Date(today.getFullYear(), 0, 1);
            const [totalSales, completedSales, pendingSales, cancelledSales, totalSalesAmount, totalRefundedAmount, salesToday, salesThisMonth, salesThisYear, revenueToday, revenueThisMonth, revenueThisYear, paymentMethods, topProducts, hourlySales,] = await Promise.all([
                this.prismaService.sales.count({ where: { tenantId } }),
                this.prismaService.sales.count({
                    where: { tenantId, status: 'COMPLETED' },
                }),
                this.prismaService.sales.count({
                    where: { tenantId, status: 'DRAFT' },
                }),
                this.prismaService.sales.count({
                    where: { tenantId, status: 'CANCELLED' },
                }),
                this.prismaService.sales.aggregate({
                    where: { tenantId, status: 'COMPLETED' },
                    _sum: { totalAmount: true },
                }),
                this.prismaService.sales.aggregate({
                    where: { tenantId },
                    _sum: { refundedAmount: true },
                }),
                this.prismaService.sales.count({
                    where: { tenantId, createdAt: { gte: startOfDay } },
                }),
                this.prismaService.sales.count({
                    where: { tenantId, createdAt: { gte: startOfMonth } },
                }),
                this.prismaService.sales.count({
                    where: { tenantId, createdAt: { gte: startOfYear } },
                }),
                this.prismaService.sales.aggregate({
                    where: {
                        tenantId,
                        status: sale_dto_1.SaleStatus.COMPLETED,
                        createdAt: { gte: startOfDay },
                    },
                    _sum: { totalAmount: true },
                }),
                this.prismaService.sales.aggregate({
                    where: {
                        tenantId,
                        status: sale_dto_1.SaleStatus.COMPLETED,
                        createdAt: { gte: startOfMonth },
                    },
                    _sum: { totalAmount: true },
                }),
                this.prismaService.sales.aggregate({
                    where: {
                        tenantId,
                        status: sale_dto_1.SaleStatus.COMPLETED,
                        createdAt: { gte: startOfYear },
                    },
                    _sum: { totalAmount: true },
                }),
                this.prismaService.payments.groupBy({
                    by: ['method'],
                    where: {
                        sales: { tenantId },
                        status: sale_dto_1.PaymentStatus.COMPLETED,
                        amount: { gt: 0 },
                    },
                    _count: { method: true },
                }),
                this.prismaService.sale_items.groupBy({
                    by: ['productId'],
                    where: { sales: { tenantId, status: sale_dto_1.SaleStatus.COMPLETED } },
                    _sum: { quantity: true, totalPrice: true },
                    orderBy: { _sum: { totalPrice: 'desc' } },
                    take: 10,
                }),
                this.prismaService.sales.findMany({
                    where: {
                        tenantId,
                        status: client_1.SaleStatus.COMPLETED,
                        createdAt: { gte: startOfDay },
                    },
                    select: { createdAt: true },
                }),
            ]);
            const paymentMethodBreakdown = Object.values(sale_dto_1.PaymentMethod).reduce((acc, method) => {
                acc[method] = 0;
                return acc;
            }, {});
            paymentMethods.forEach(({ method, _count }) => {
                if (method && typeof method === 'string') {
                    paymentMethodBreakdown[method] = _count.method;
                }
            });
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
            const salesByHour = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')).reduce((acc, hour) => {
                acc[hour] = 0;
                return acc;
            }, {});
            hourlySales.forEach((sale) => {
                const hour = String(sale.createdAt.getHours()).padStart(2, '0');
                salesByHour[hour]++;
            });
            const stats = {
                totalSales,
                completedSales,
                pendingSales,
                cancelledSales,
                totalSalesAmount: Number(totalSalesAmount._sum.totalAmount || 0),
                totalRevenue: Number(totalSalesAmount._sum.totalAmount || 0),
                averageSaleAmount: completedSales > 0
                    ? Number(totalSalesAmount._sum.totalAmount || 0) / completedSales
                    : 0,
                totalRefundedAmount: Number(totalRefundedAmount._sum?.refundedAmount || 0),
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
            await this.cacheService.setTenantData(tenantId, cacheKey, stats, 600);
            return stats;
        }
        catch (error) {
            this.logger.error('Failed to get sales stats:', error.message);
            throw error;
        }
    }
    mapToResponseDto(sale) {
        return {
            id: sale.id,
            saleNumber: sale.saleNumber,
            customerId: sale.customerId,
            customerName: sale.customers
                ? `${sale.customers.firstName} ${sale.customers.lastName}`.trim()
                : '',
            walkInCustomerName: '',
            walkInCustomerPhone: '',
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
            items: sale.sale_items?.map((item) => ({
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
                notes: '',
                createdAt: sale.createdAt.toISOString(),
                updatedAt: sale.updatedAt.toISOString(),
            })) || [],
            payments: sale.payments?.map((payment) => ({
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
    async remove(id, tenantId, userId) {
        try {
            await this.prismaService.$transaction(async (prisma) => {
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
                    throw new common_1.NotFoundException('Sale not found');
                }
                for (const item of sale.sale_items) {
                    if (item.products) {
                        await prisma.products.update({
                            where: { id: item.productId },
                            data: {
                                stockQuantity: {
                                    increment: item.quantity,
                                },
                            },
                        });
                        this.logger.log(`Restored ${item.quantity} units of product ${item.productId} (${item.products.name})`);
                    }
                }
                await prisma.payments.deleteMany({
                    where: { saleId: id },
                });
                await prisma.sale_items.deleteMany({
                    where: { saleId: id },
                });
                await prisma.sales.delete({
                    where: { id },
                });
                this.logger.log(`Sale ${sale.saleNumber} deleted by user ${userId}`);
                await this.cacheService.del(`sale:${id}`);
                await this.cacheService.del(`sales:${tenantId}:*`);
                await this.cacheService.del(`sales:stats:${tenantId}`);
            });
        }
        catch (error) {
            this.logger.error(`Failed to delete sale ${id}:`, error);
            if (error instanceof common_1.NotFoundException) {
                throw error;
            }
            throw new common_1.BadRequestException(`Failed to delete sale: ${error.message || 'Unknown error'}`);
        }
    }
};
exports.SalesService = SalesService;
exports.SalesService = SalesService = SalesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        cache_service_1.CacheService,
        shifts_service_1.ShiftsService])
], SalesService);
//# sourceMappingURL=sales.service.js.map