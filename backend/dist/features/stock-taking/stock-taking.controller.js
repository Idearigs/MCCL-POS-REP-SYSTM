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
exports.StockTakingController = void 0;
const common_1 = require("@nestjs/common");
const stock_taking_service_1 = require("./stock-taking.service");
const dto_1 = require("./dto");
const jwt_auth_guard_1 = require("../../shared/guards/jwt-auth.guard");
const tenant_guard_1 = require("../../shared/guards/tenant.guard");
const user_decorator_1 = require("../../shared/decorators/user.decorator");
const tenant_decorator_1 = require("../../shared/decorators/tenant.decorator");
const client_1 = require("@prisma/client");
let StockTakingController = class StockTakingController {
    stockTakingService;
    constructor(stockTakingService) {
        this.stockTakingService = stockTakingService;
    }
    async createSession(tenantId, userId, createSessionDto) {
        return this.stockTakingService.createSession(tenantId, userId, createSessionDto);
    }
    async getSessions(tenantId, status) {
        return this.stockTakingService.getSessions(tenantId, status);
    }
    async getSession(tenantId, id) {
        return this.stockTakingService.getSession(tenantId, id);
    }
    async updateSession(tenantId, id, updateSessionDto) {
        return this.stockTakingService.updateSession(tenantId, id, updateSessionDto);
    }
    async deleteSession(tenantId, id) {
        return this.stockTakingService.deleteSession(tenantId, id);
    }
    async scanItem(tenantId, userId, id, scanItemDto) {
        return this.stockTakingService.scanItem(tenantId, id, userId, scanItemDto);
    }
    async completeSession(tenantId, userId, id) {
        return this.stockTakingService.completeSession(tenantId, id, userId);
    }
    async approveSession(tenantId, userId, id, approveSessionDto) {
        return this.stockTakingService.approveSession(tenantId, id, userId, approveSessionDto);
    }
    async deleteItem(tenantId, sessionId, itemId) {
        return this.stockTakingService.deleteItem(tenantId, sessionId, itemId);
    }
    async getSessionReport(tenantId, id) {
        return this.stockTakingService.getSessionReport(tenantId, id);
    }
    async getVarianceReport(tenantId, id) {
        return this.stockTakingService.getVarianceReport(tenantId, id);
    }
};
exports.StockTakingController = StockTakingController;
__decorate([
    (0, common_1.Post)('sessions'),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, user_decorator_1.CurrentUser)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, dto_1.CreateSessionDto]),
    __metadata("design:returntype", Promise)
], StockTakingController.prototype, "createSession", null);
__decorate([
    (0, common_1.Get)('sessions'),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], StockTakingController.prototype, "getSessions", null);
__decorate([
    (0, common_1.Get)('sessions/:id'),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], StockTakingController.prototype, "getSession", null);
__decorate([
    (0, common_1.Patch)('sessions/:id'),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, dto_1.UpdateSessionDto]),
    __metadata("design:returntype", Promise)
], StockTakingController.prototype, "updateSession", null);
__decorate([
    (0, common_1.Delete)('sessions/:id'),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], StockTakingController.prototype, "deleteSession", null);
__decorate([
    (0, common_1.Post)('sessions/:id/scan'),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, user_decorator_1.CurrentUser)('id')),
    __param(2, (0, common_1.Param)('id')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, dto_1.ScanItemDto]),
    __metadata("design:returntype", Promise)
], StockTakingController.prototype, "scanItem", null);
__decorate([
    (0, common_1.Patch)('sessions/:id/complete'),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, user_decorator_1.CurrentUser)('id')),
    __param(2, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], StockTakingController.prototype, "completeSession", null);
__decorate([
    (0, common_1.Patch)('sessions/:id/approve'),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, user_decorator_1.CurrentUser)('id')),
    __param(2, (0, common_1.Param)('id')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, dto_1.ApproveSessionDto]),
    __metadata("design:returntype", Promise)
], StockTakingController.prototype, "approveSession", null);
__decorate([
    (0, common_1.Delete)('sessions/:sessionId/items/:itemId'),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, common_1.Param)('sessionId')),
    __param(2, (0, common_1.Param)('itemId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], StockTakingController.prototype, "deleteItem", null);
__decorate([
    (0, common_1.Get)('sessions/:id/report'),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], StockTakingController.prototype, "getSessionReport", null);
__decorate([
    (0, common_1.Get)('sessions/:id/variance-report'),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], StockTakingController.prototype, "getVarianceReport", null);
exports.StockTakingController = StockTakingController = __decorate([
    (0, common_1.Controller)('stock-taking'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, tenant_guard_1.TenantGuard),
    __metadata("design:paramtypes", [stock_taking_service_1.StockTakingService])
], StockTakingController);
//# sourceMappingURL=stock-taking.controller.js.map