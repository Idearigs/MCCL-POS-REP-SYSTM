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
exports.PettyCashController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const petty_cash_service_1 = require("./petty-cash.service");
const petty_cash_dto_1 = require("./dto/petty-cash.dto");
const jwt_auth_guard_1 = require("../../shared/guards/jwt-auth.guard");
let PettyCashController = class PettyCashController {
    pettyCashService;
    constructor(pettyCashService) {
        this.pettyCashService = pettyCashService;
    }
    async createAccount(req, dto) {
        const tenantId = req.user.tenantId;
        const userId = req.user.sub;
        return this.pettyCashService.createAccount(tenantId, userId, dto);
    }
    async getAccounts(req) {
        const tenantId = req.user.tenantId;
        return this.pettyCashService.getAccounts(tenantId);
    }
    async getAccountById(req, accountId) {
        const tenantId = req.user.tenantId;
        return this.pettyCashService.getAccountById(tenantId, accountId);
    }
    async updateAccount(req, accountId, dto) {
        const tenantId = req.user.tenantId;
        return this.pettyCashService.updateAccount(tenantId, accountId, dto);
    }
    async replenishAccount(req, accountId, dto) {
        const tenantId = req.user.tenantId;
        const userId = req.user.sub;
        return this.pettyCashService.replenishAccount(tenantId, userId, accountId, dto);
    }
    async createTransaction(req, dto) {
        const tenantId = req.user.tenantId;
        const userId = req.user.sub;
        return this.pettyCashService.createTransaction(tenantId, userId, dto);
    }
    async getTransactions(req, dto) {
        const tenantId = req.user.tenantId;
        return this.pettyCashService.getTransactions(tenantId, dto);
    }
    async getTransactionById(req, transactionId) {
        const tenantId = req.user.tenantId;
        return this.pettyCashService.getTransactionById(tenantId, transactionId);
    }
    async approveTransaction(req, transactionId, dto) {
        const tenantId = req.user.tenantId;
        const userId = req.user.sub;
        return this.pettyCashService.approveTransaction(tenantId, userId, transactionId, dto);
    }
    async rejectTransaction(req, transactionId, dto) {
        const tenantId = req.user.tenantId;
        const userId = req.user.sub;
        return this.pettyCashService.rejectTransaction(tenantId, userId, transactionId, dto);
    }
    async cancelTransaction(req, transactionId) {
        const tenantId = req.user.tenantId;
        const userId = req.user.sub;
        return this.pettyCashService.cancelTransaction(tenantId, userId, transactionId);
    }
    async getSummaryReport(req, accountId, startDate, endDate) {
        const tenantId = req.user.tenantId;
        return this.pettyCashService.getSummaryReport(tenantId, accountId, startDate, endDate);
    }
};
exports.PettyCashController = PettyCashController;
__decorate([
    (0, common_1.Post)('accounts'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new petty cash account' }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Account created successfully',
        type: petty_cash_dto_1.PettyCashAccountResponseDto,
    }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, petty_cash_dto_1.CreatePettyCashAccountDto]),
    __metadata("design:returntype", Promise)
], PettyCashController.prototype, "createAccount", null);
__decorate([
    (0, common_1.Get)('accounts'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all petty cash accounts' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Accounts retrieved successfully',
        type: [petty_cash_dto_1.PettyCashAccountResponseDto],
    }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PettyCashController.prototype, "getAccounts", null);
__decorate([
    (0, common_1.Get)('accounts/:accountId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get petty cash account by ID' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Account retrieved successfully',
        type: petty_cash_dto_1.PettyCashAccountResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Account not found',
    }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('accountId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PettyCashController.prototype, "getAccountById", null);
__decorate([
    (0, common_1.Put)('accounts/:accountId'),
    (0, swagger_1.ApiOperation)({ summary: 'Update petty cash account' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Account updated successfully',
        type: petty_cash_dto_1.PettyCashAccountResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Account not found',
    }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('accountId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, petty_cash_dto_1.UpdatePettyCashAccountDto]),
    __metadata("design:returntype", Promise)
], PettyCashController.prototype, "updateAccount", null);
__decorate([
    (0, common_1.Post)('accounts/:accountId/replenish'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Replenish petty cash account' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Account replenished successfully',
        type: petty_cash_dto_1.PettyCashAccountResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Account not found',
    }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('accountId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, petty_cash_dto_1.ReplenishPettyCashDto]),
    __metadata("design:returntype", Promise)
], PettyCashController.prototype, "replenishAccount", null);
__decorate([
    (0, common_1.Post)('transactions'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({
        summary: 'Create a new petty cash transaction (expense request)',
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Transaction created successfully',
        type: petty_cash_dto_1.PettyCashTransactionResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Bad request (insufficient balance, inactive account, etc.)',
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Account not found',
    }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, petty_cash_dto_1.CreatePettyCashTransactionDto]),
    __metadata("design:returntype", Promise)
], PettyCashController.prototype, "createTransaction", null);
__decorate([
    (0, common_1.Get)('transactions'),
    (0, swagger_1.ApiOperation)({ summary: 'Get petty cash transactions with filters' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Transactions retrieved successfully',
    }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, petty_cash_dto_1.GetPettyCashTransactionsDto]),
    __metadata("design:returntype", Promise)
], PettyCashController.prototype, "getTransactions", null);
__decorate([
    (0, common_1.Get)('transactions/:transactionId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get transaction by ID' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Transaction retrieved successfully',
        type: petty_cash_dto_1.PettyCashTransactionResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Transaction not found',
    }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('transactionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PettyCashController.prototype, "getTransactionById", null);
__decorate([
    (0, common_1.Post)('transactions/:transactionId/approve'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Approve a petty cash transaction' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Transaction approved successfully',
        type: petty_cash_dto_1.PettyCashTransactionResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Transaction already processed or invalid state',
    }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'Cannot approve own transaction',
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Transaction not found',
    }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('transactionId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, petty_cash_dto_1.ApprovePettyCashTransactionDto]),
    __metadata("design:returntype", Promise)
], PettyCashController.prototype, "approveTransaction", null);
__decorate([
    (0, common_1.Post)('transactions/:transactionId/reject'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Reject a petty cash transaction' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Transaction rejected successfully',
        type: petty_cash_dto_1.PettyCashTransactionResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Transaction already processed or invalid state',
    }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'Cannot reject own transaction',
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Transaction not found',
    }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('transactionId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, petty_cash_dto_1.RejectPettyCashTransactionDto]),
    __metadata("design:returntype", Promise)
], PettyCashController.prototype, "rejectTransaction", null);
__decorate([
    (0, common_1.Post)('transactions/:transactionId/cancel'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Cancel a petty cash transaction (by requester)' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Transaction cancelled successfully',
        type: petty_cash_dto_1.PettyCashTransactionResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Can only cancel pending transactions',
    }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'Can only cancel own transactions',
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Transaction not found',
    }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('transactionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PettyCashController.prototype, "cancelTransaction", null);
__decorate([
    (0, common_1.Get)('reports/summary'),
    (0, swagger_1.ApiOperation)({ summary: 'Get petty cash summary report' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Summary report retrieved successfully',
    }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('accountId')),
    __param(2, (0, common_1.Query)('startDate')),
    __param(3, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", Promise)
], PettyCashController.prototype, "getSummaryReport", null);
exports.PettyCashController = PettyCashController = __decorate([
    (0, swagger_1.ApiTags)('Petty Cash Management'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('petty-cash'),
    __metadata("design:paramtypes", [petty_cash_service_1.PettyCashService])
], PettyCashController);
//# sourceMappingURL=petty-cash.controller.js.map