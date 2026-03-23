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
exports.SubscriptionsController = void 0;
const common_1 = require("@nestjs/common");
const subscriptions_service_1 = require("../services/subscriptions.service");
let SubscriptionsController = class SubscriptionsController {
    subscriptionsService;
    constructor(subscriptionsService) {
        this.subscriptionsService = subscriptionsService;
    }
    async getStats() {
        return this.subscriptionsService.getStats();
    }
    async findByProfile(profileId) {
        return this.subscriptionsService.findByProfile(profileId);
    }
    async updatePlan(profileId, data) {
        return this.subscriptionsService.updatePlan(profileId, data);
    }
    async cancel(profileId, reason) {
        return this.subscriptionsService.cancel(profileId, reason);
    }
    async generateInvoice(profileId) {
        return this.subscriptionsService.generateInvoice(profileId);
    }
    async getInvoices(profileId) {
        return this.subscriptionsService.getInvoices(profileId);
    }
    async markInvoicePaid(invoiceId, transactionId) {
        return this.subscriptionsService.markInvoicePaid(invoiceId, transactionId);
    }
};
exports.SubscriptionsController = SubscriptionsController;
__decorate([
    (0, common_1.Get)('stats'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)('profile/:profileId'),
    __param(0, (0, common_1.Param)('profileId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "findByProfile", null);
__decorate([
    (0, common_1.Put)('profile/:profileId/plan'),
    __param(0, (0, common_1.Param)('profileId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "updatePlan", null);
__decorate([
    (0, common_1.Post)('profile/:profileId/cancel'),
    __param(0, (0, common_1.Param)('profileId')),
    __param(1, (0, common_1.Body)('reason')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "cancel", null);
__decorate([
    (0, common_1.Post)('profile/:profileId/generate-invoice'),
    __param(0, (0, common_1.Param)('profileId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "generateInvoice", null);
__decorate([
    (0, common_1.Get)('profile/:profileId/invoices'),
    __param(0, (0, common_1.Param)('profileId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "getInvoices", null);
__decorate([
    (0, common_1.Post)('invoices/:invoiceId/mark-paid'),
    __param(0, (0, common_1.Param)('invoiceId')),
    __param(1, (0, common_1.Body)('transactionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "markInvoicePaid", null);
exports.SubscriptionsController = SubscriptionsController = __decorate([
    (0, common_1.Controller)('mainframe/subscriptions'),
    __metadata("design:paramtypes", [subscriptions_service_1.SubscriptionsService])
], SubscriptionsController);
//# sourceMappingURL=subscriptions.controller.js.map