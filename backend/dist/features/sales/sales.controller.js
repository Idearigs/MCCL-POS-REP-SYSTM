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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SalesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const throttler_1 = require("@nestjs/throttler");
const sales_service_1 = require("./sales.service");
const jwt_auth_guard_1 = require("../../shared/guards/jwt-auth.guard");
const tenant_guard_1 = require("../../shared/guards/tenant.guard");
const user_decorator_1 = require("../../shared/decorators/user.decorator");
const tenant_decorator_1 = require("../../shared/decorators/tenant.decorator");
const sale_dto_1 = require("./dto/sale.dto");
const pagination_dto_1 = require("../../shared/dto/pagination.dto");
let SalesController = class SalesController {
    salesService;
    constructor(salesService) {
        this.salesService = salesService;
    }
    async create(createSaleDto, tenantId, userId) {
        return this.salesService.create(createSaleDto, tenantId, userId);
    }
    async findAll(query, tenantId) {
        return this.salesService.findAll(query, tenantId);
    }
    async getStats(tenantId) {
        return this.salesService.getStats(tenantId);
    }
    async getCashierStats(tenantId) {
        return this.salesService.getCashierStats(tenantId);
    }
    async getTodaysSales(query, tenantId) {
        const today = new Date().toISOString().split('T')[0];
        const todayQuery = {
            ...query,
            startDate: today,
            endDate: today,
        };
        return this.salesService.findAll(todayQuery, tenantId);
    }
    async findOne(id, tenantId) {
        return this.salesService.findOne(id, tenantId);
    }
    async update(id, updateSaleDto, tenantId, userId) {
        return this.salesService.update(id, updateSaleDto, tenantId, userId);
    }
    async updateSaleItem(itemId, body, tenantId) {
        return this.salesService.updateSaleItemNotes(itemId, body.notes, tenantId);
    }
    async createRefund(id, createRefundDto, tenantId, userId) {
        return this.salesService.createRefund(id, createRefundDto, tenantId, userId);
    }
    async getReceiptData(id, tenantId) {
        const sale = await this.salesService.findOne(id, tenantId);
        return {
            saleNumber: sale.saleNumber,
            date: sale.createdAt,
            customer: sale.customerName || sale.walkInCustomerName || 'Walk-in Customer',
            items: sale.items.map((item) => ({
                name: item.productName,
                sku: item.productSku,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                discount: item.discountAmount,
                total: item.lineTotal,
            })),
            subtotal: sale.subtotal,
            discount: sale.discountAmount,
            tax: sale.taxAmount,
            total: sale.totalAmount,
            payments: sale.payments.map((payment) => ({
                method: payment.method,
                amount: payment.amount,
                reference: payment.reference,
            })),
            change: sale.paidAmount - sale.totalAmount,
            notes: sale.notes,
            cashier: sale.createdByName,
        };
    }
    async getDailyReport(date, tenantId) {
        const reportDate = date || new Date().toISOString().split('T')[0];
        const query = {
            startDate: reportDate,
            endDate: reportDate,
            limit: 1000,
        };
        const salesData = await this.salesService.findAll(query, tenantId);
        const stats = await this.salesService.getStats(tenantId);
        return {
            date: reportDate,
            totalSales: salesData.data.length,
            totalRevenue: salesData.data.reduce((sum, sale) => sum + sale.totalAmount, 0),
            averageSaleAmount: salesData.data.length > 0
                ? salesData.data.reduce((sum, sale) => sum + sale.totalAmount, 0) /
                    salesData.data.length
                : 0,
            paymentBreakdown: salesData.data.reduce((acc, sale) => {
                sale.payments.forEach((payment) => {
                    acc[payment.method] = (acc[payment.method] || 0) + payment.amount;
                });
                return acc;
            }, {}),
            topSellingProducts: stats.topSellingProducts.slice(0, 5),
            salesByHour: stats.salesByHour,
            sales: salesData.data,
        };
    }
    async getMonthlyReport(year, month, tenantId) {
        const currentDate = new Date();
        const reportYear = year || currentDate.getFullYear();
        const reportMonth = month || currentDate.getMonth() + 1;
        const startDate = new Date(reportYear, reportMonth - 1, 1)
            .toISOString()
            .split('T')[0];
        const endDate = new Date(reportYear, reportMonth, 0)
            .toISOString()
            .split('T')[0];
        const query = {
            startDate,
            endDate,
            limit: 10000,
        };
        const salesData = await this.salesService.findAll(query, tenantId);
        const dailySales = salesData.data.reduce((acc, sale) => {
            const day = sale.createdAt.split('T')[0];
            if (!acc[day]) {
                acc[day] = { count: 0, revenue: 0 };
            }
            acc[day].count++;
            acc[day].revenue += sale.totalAmount;
            return acc;
        }, {});
        return {
            year: reportYear,
            month: reportMonth,
            totalSales: salesData.data.length,
            totalRevenue: salesData.data.reduce((sum, sale) => sum + sale.totalAmount, 0),
            averageDailySales: Object.keys(dailySales).length > 0
                ? salesData.data.length / Object.keys(dailySales).length
                : 0,
            averageDailyRevenue: Object.keys(dailySales).length > 0
                ? salesData.data.reduce((sum, sale) => sum + sale.totalAmount, 0) /
                    Object.keys(dailySales).length
                : 0,
            dailyBreakdown: dailySales,
            paymentMethodTrends: salesData.data.reduce((acc, sale) => {
                sale.payments.forEach((payment) => {
                    acc[payment.method] = (acc[payment.method] || 0) + payment.amount;
                });
                return acc;
            }, {}),
        };
    }
    async remove(id, tenantId, userId) {
        await this.salesService.remove(id, tenantId, userId);
        return {
            message: 'Sale deleted successfully',
            success: true,
        };
    }
};
exports.SalesController = SalesController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({
        summary: 'Create a new sale',
        description: 'Create a new sale with items and payment processing',
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Sale created successfully',
        type: sale_dto_1.SaleResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Invalid input data or insufficient stock',
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Product or customer not found',
    }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, tenant_decorator_1.TenantId)()),
    __param(2, (0, user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [sale_dto_1.CreateSaleDto, String, String]),
    __metadata("design:returntype", Promise)
], SalesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Get all sales',
        description: 'Retrieve sales with advanced filtering, search, and pagination',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Sales retrieved successfully',
        type: (pagination_dto_1.PaginatedResponseDto),
    }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number, example: 1 }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number, example: 10 }),
    (0, swagger_1.ApiQuery)({
        name: 'search',
        required: false,
        type: String,
        example: 'SALE-2024-001',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'status',
        required: false,
        enum: ['DRAFT', 'COMPLETED', 'CANCELLED', 'REFUNDED'],
    }),
    (0, swagger_1.ApiQuery)({
        name: 'paymentMethod',
        required: false,
        enum: [
            'CASH',
            'CARD',
            'BANK_TRANSFER',
            'CHEQUE',
            'DIGITAL_WALLET',
            'INSTALLMENT',
        ],
    }),
    (0, swagger_1.ApiQuery)({ name: 'customerId', required: false, type: String }),
    (0, swagger_1.ApiQuery)({
        name: 'startDate',
        required: false,
        type: String,
        example: '2024-01-01',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'endDate',
        required: false,
        type: String,
        example: '2024-12-31',
    }),
    (0, swagger_1.ApiQuery)({ name: 'minAmount', required: false, type: Number, example: 100 }),
    (0, swagger_1.ApiQuery)({ name: 'maxAmount', required: false, type: Number, example: 5000 }),
    (0, swagger_1.ApiQuery)({
        name: 'sortBy',
        required: false,
        type: String,
        example: 'createdAt',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'sortOrder',
        required: false,
        enum: ['asc', 'desc'],
        example: 'desc',
    }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, tenant_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [sale_dto_1.SaleQueryDto, String]),
    __metadata("design:returntype", Promise)
], SalesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('stats'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get sales statistics',
        description: 'Retrieve comprehensive sales statistics and analytics',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Sales statistics retrieved successfully',
        type: sale_dto_1.SalesStatsDto,
    }),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SalesController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)('stats/cashiers'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get per-cashier sales statistics',
        description: 'Retrieve sales statistics broken down by cashier/staff member',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Cashier stats retrieved successfully',
    }),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SalesController.prototype, "getCashierStats", null);
__decorate([
    (0, common_1.Get)('today'),
    (0, swagger_1.ApiOperation)({
        summary: "Get today's sales",
        description: 'Retrieve all sales created today',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: "Today's sales retrieved successfully",
        type: (pagination_dto_1.PaginatedResponseDto),
    }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, tenant_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [sale_dto_1.SaleQueryDto, String]),
    __metadata("design:returntype", Promise)
], SalesController.prototype, "getTodaysSales", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get sale by ID',
        description: 'Retrieve a specific sale with full details including items and payments',
    }),
    (0, swagger_1.ApiParam)({
        name: 'id',
        description: 'Sale ID',
        example: 'clv123abc456',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Sale retrieved successfully',
        type: sale_dto_1.SaleResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Sale not found',
    }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, tenant_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], SalesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, swagger_1.ApiOperation)({
        summary: 'Update sale',
        description: 'Update sale information (limited updates allowed for completed sales)',
    }),
    (0, swagger_1.ApiParam)({
        name: 'id',
        description: 'Sale ID',
        example: 'clv123abc456',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Sale updated successfully',
        type: sale_dto_1.SaleResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Sale not found',
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Invalid update for completed sale',
    }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, tenant_decorator_1.TenantId)()),
    __param(3, (0, user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, sale_dto_1.UpdateSaleDto, String, String]),
    __metadata("design:returntype", Promise)
], SalesController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)('items/:itemId'),
    (0, swagger_1.ApiOperation)({ summary: 'Update sale item notes (e.g. condition)' }),
    __param(0, (0, common_1.Param)('itemId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, tenant_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", Promise)
], SalesController.prototype, "updateSaleItem", null);
__decorate([
    (0, common_1.Post)(':id/refund'),
    (0, swagger_1.ApiOperation)({
        summary: 'Process sale refund',
        description: 'Create a refund for specific sale items with stock adjustment',
    }),
    (0, swagger_1.ApiParam)({
        name: 'id',
        description: 'Sale ID',
        example: 'clv123abc456',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Refund processed successfully',
        type: sale_dto_1.SaleResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Sale not found',
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Invalid refund request',
    }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, tenant_decorator_1.TenantId)()),
    __param(3, (0, user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, sale_dto_1.CreateRefundDto, String, String]),
    __metadata("design:returntype", Promise)
], SalesController.prototype, "createRefund", null);
__decorate([
    (0, common_1.Get)(':id/receipt'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get sale receipt data',
        description: 'Retrieve formatted sale data for receipt printing',
    }),
    (0, swagger_1.ApiParam)({
        name: 'id',
        description: 'Sale ID',
        example: 'clv123abc456',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Receipt data retrieved successfully',
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Sale not found',
    }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, tenant_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], SalesController.prototype, "getReceiptData", null);
__decorate([
    (0, common_1.Get)('reports/daily'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get daily sales report',
        description: 'Retrieve daily sales summary and statistics',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'date',
        required: false,
        type: String,
        example: '2024-01-15',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Daily report retrieved successfully',
    }),
    __param(0, (0, common_1.Query)('date')),
    __param(1, (0, tenant_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], SalesController.prototype, "getDailyReport", null);
__decorate([
    (0, common_1.Get)('reports/monthly'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get monthly sales report',
        description: 'Retrieve monthly sales summary and trends',
    }),
    (0, swagger_1.ApiQuery)({ name: 'year', required: false, type: Number, example: 2024 }),
    (0, swagger_1.ApiQuery)({ name: 'month', required: false, type: Number, example: 1 }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Monthly report retrieved successfully',
    }),
    __param(0, (0, common_1.Query)('year')),
    __param(1, (0, common_1.Query)('month')),
    __param(2, (0, tenant_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, String]),
    __metadata("design:returntype", Promise)
], SalesController.prototype, "getMonthlyReport", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Delete a sale',
        description: 'Permanently delete a sale record. This will also adjust stock quantities for returned items.',
    }),
    (0, swagger_1.ApiParam)({
        name: 'id',
        description: 'Sale ID',
        example: 'clv123abc456',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Sale deleted successfully',
        schema: {
            type: 'object',
            properties: {
                message: { type: 'string', example: 'Sale deleted successfully' },
                success: { type: 'boolean', example: true },
            },
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Sale not found',
    }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'Not authorized to delete this sale',
    }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, tenant_decorator_1.TenantId)()),
    __param(2, (0, user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], SalesController.prototype, "remove", null);
exports.SalesController = SalesController = __decorate([
    (0, swagger_1.ApiTags)('Sales'),
    (0, common_1.Controller)('sales'),
    (0, common_1.UseGuards)(throttler_1.ThrottlerGuard, jwt_auth_guard_1.JwtAuthGuard, tenant_guard_1.TenantGuard),
    (0, swagger_1.ApiBearerAuth)('access-token'),
    __metadata("design:paramtypes", [sales_service_1.SalesService])
], SalesController);
//# sourceMappingURL=sales.controller.js.map