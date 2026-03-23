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
exports.CustomersController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const throttler_1 = require("@nestjs/throttler");
const customers_service_1 = require("./customers.service");
const jwt_auth_guard_1 = require("../../shared/guards/jwt-auth.guard");
const tenant_guard_1 = require("../../shared/guards/tenant.guard");
const user_decorator_1 = require("../../shared/decorators/user.decorator");
const tenant_decorator_1 = require("../../shared/decorators/tenant.decorator");
const customer_dto_1 = require("./dto/customer.dto");
const pagination_dto_1 = require("../../shared/dto/pagination.dto");
let CustomersController = class CustomersController {
    customersService;
    constructor(customersService) {
        this.customersService = customersService;
    }
    async create(createCustomerDto, tenantId) {
        return this.customersService.create(createCustomerDto, tenantId);
    }
    async findAll(query, tenantId) {
        return this.customersService.findAll(query, tenantId);
    }
    async getStats(tenantId) {
        return this.customersService.getStats(tenantId);
    }
    async findOne(id, tenantId) {
        return this.customersService.findOne(id, tenantId);
    }
    async update(id, updateCustomerDto, tenantId) {
        return this.customersService.update(id, updateCustomerDto, tenantId);
    }
    async remove(id, tenantId) {
        return this.customersService.remove(id, tenantId);
    }
    async exportCustomerData(gdprExportDto, tenantId, userId) {
        console.log(`GDPR Export requested by user ${userId} for customer ${gdprExportDto.customerId} in tenant ${tenantId}`);
        return this.customersService.exportCustomerData(gdprExportDto.customerId, tenantId);
    }
    async deleteCustomerDataPermanently(gdprDeleteDto, tenantId, userId) {
        if (!gdprDeleteDto.confirmDelete) {
            throw new Error('Delete confirmation required');
        }
        console.warn(`GDPR PERMANENT DELETION requested by user ${userId} for customer ${gdprDeleteDto.customerId} in tenant ${tenantId}`);
        return this.customersService.deleteCustomerDataPermanently(gdprDeleteDto.customerId, tenantId);
    }
    async getCustomerSalesHistory(id, tenantId) {
        return {
            customerId: id,
            salesHistory: [],
            totalSales: 0,
            message: 'Sales history feature - to be implemented with Sales module',
        };
    }
    async getCustomerRepairHistory(id, tenantId) {
        return {
            customerId: id,
            repairHistory: [],
            totalRepairs: 0,
            message: 'Repair history feature - to be implemented with Repairs module',
        };
    }
};
exports.CustomersController = CustomersController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({
        summary: 'Create a new customer',
        description: 'Create a new customer with GDPR compliance',
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Customer created successfully',
        type: customer_dto_1.CustomerResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Invalid input data',
    }),
    (0, swagger_1.ApiResponse)({
        status: 409,
        description: 'Customer already exists',
    }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, tenant_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [customer_dto_1.CreateCustomerDto, String]),
    __metadata("design:returntype", Promise)
], CustomersController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Get all customers',
        description: 'Retrieve customers with pagination, search, and filtering',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Customers retrieved successfully',
        type: (pagination_dto_1.PaginatedResponseDto),
    }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number, example: 1 }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number, example: 10 }),
    (0, swagger_1.ApiQuery)({
        name: 'search',
        required: false,
        type: String,
        example: 'Sarah Johnson',
    }),
    (0, swagger_1.ApiQuery)({ name: 'isActive', required: false, type: Boolean, example: true }),
    (0, swagger_1.ApiQuery)({ name: 'redFlag', required: false, type: Boolean, example: false }),
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
    __metadata("design:paramtypes", [customer_dto_1.CustomerQueryDto, String]),
    __metadata("design:returntype", Promise)
], CustomersController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('stats'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get customer statistics',
        description: 'Retrieve customer statistics and analytics',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Customer statistics retrieved successfully',
        type: customer_dto_1.CustomerStatsDto,
    }),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CustomersController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get customer by ID',
        description: 'Retrieve a specific customer by their ID',
    }),
    (0, swagger_1.ApiParam)({
        name: 'id',
        description: 'Customer ID',
        example: 'clv123abc456',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Customer retrieved successfully',
        type: customer_dto_1.CustomerResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Customer not found',
    }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, tenant_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], CustomersController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, swagger_1.ApiOperation)({
        summary: 'Update customer',
        description: 'Update customer information',
    }),
    (0, swagger_1.ApiParam)({
        name: 'id',
        description: 'Customer ID',
        example: 'clv123abc456',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Customer updated successfully',
        type: customer_dto_1.CustomerResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Customer not found',
    }),
    (0, swagger_1.ApiResponse)({
        status: 409,
        description: 'Conflict with existing customer data',
    }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, tenant_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, customer_dto_1.UpdateCustomerDto, String]),
    __metadata("design:returntype", Promise)
], CustomersController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, swagger_1.ApiOperation)({
        summary: 'Delete customer (permanent delete)',
        description: 'Permanently delete a customer and remove related records',
    }),
    (0, swagger_1.ApiParam)({
        name: 'id',
        description: 'Customer ID',
        example: 'clv123abc456',
    }),
    (0, swagger_1.ApiResponse)({
        status: 204,
        description: 'Customer permanently deleted successfully',
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Customer not found',
    }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, tenant_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], CustomersController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)('gdpr/export'),
    (0, swagger_1.ApiOperation)({
        summary: 'GDPR: Export customer data',
        description: 'Export all customer data for GDPR compliance',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Customer data exported successfully',
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Customer not found',
    }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, tenant_decorator_1.TenantId)()),
    __param(2, (0, user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [customer_dto_1.GDPRExportDto, String, String]),
    __metadata("design:returntype", Promise)
], CustomersController.prototype, "exportCustomerData", null);
__decorate([
    (0, common_1.Post)('gdpr/delete'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, swagger_1.ApiOperation)({
        summary: 'GDPR: Permanently delete customer data',
        description: 'Permanently delete all customer data (DANGEROUS - use with extreme caution)',
    }),
    (0, swagger_1.ApiResponse)({
        status: 204,
        description: 'Customer data permanently deleted',
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Invalid request or missing confirmation',
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Customer not found',
    }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, tenant_decorator_1.TenantId)()),
    __param(2, (0, user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [customer_dto_1.GDPRDeleteDto, String, String]),
    __metadata("design:returntype", Promise)
], CustomersController.prototype, "deleteCustomerDataPermanently", null);
__decorate([
    (0, common_1.Get)(':id/sales-history'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get customer sales history',
        description: 'Retrieve sales history for a specific customer',
    }),
    (0, swagger_1.ApiParam)({
        name: 'id',
        description: 'Customer ID',
        example: 'clv123abc456',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Customer sales history retrieved successfully',
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Customer not found',
    }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, tenant_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], CustomersController.prototype, "getCustomerSalesHistory", null);
__decorate([
    (0, common_1.Get)(':id/repair-history'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get customer repair history',
        description: 'Retrieve repair history for a specific customer',
    }),
    (0, swagger_1.ApiParam)({
        name: 'id',
        description: 'Customer ID',
        example: 'clv123abc456',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Customer repair history retrieved successfully',
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Customer not found',
    }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, tenant_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], CustomersController.prototype, "getCustomerRepairHistory", null);
exports.CustomersController = CustomersController = __decorate([
    (0, swagger_1.ApiTags)('Customers'),
    (0, common_1.Controller)('customers'),
    (0, common_1.UseGuards)(throttler_1.ThrottlerGuard, jwt_auth_guard_1.JwtAuthGuard, tenant_guard_1.TenantGuard),
    (0, swagger_1.ApiBearerAuth)('access-token'),
    __metadata("design:paramtypes", [customers_service_1.CustomersService])
], CustomersController);
//# sourceMappingURL=customers.controller.js.map