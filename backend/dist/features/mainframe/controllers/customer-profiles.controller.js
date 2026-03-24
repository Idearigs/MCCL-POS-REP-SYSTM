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
exports.CustomerProfilesController = void 0;
const common_1 = require("@nestjs/common");
const customer_profiles_service_1 = require("../services/customer-profiles.service");
const subdomain_service_1 = require("../services/subdomain.service");
const credentials_export_service_1 = require("../services/credentials-export.service");
const customer_profile_dto_1 = require("../dto/customer-profile.dto");
let CustomerProfilesController = class CustomerProfilesController {
    customerProfilesService;
    subdomainService;
    credentialsExportService;
    constructor(customerProfilesService, subdomainService, credentialsExportService) {
        this.customerProfilesService = customerProfilesService;
        this.subdomainService = subdomainService;
        this.credentialsExportService = credentialsExportService;
    }
    async create(dto) {
        return this.customerProfilesService.create(dto);
    }
    async findAll(page, limit, status, search) {
        return this.customerProfilesService.findAll({
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 20,
            status,
            search,
        });
    }
    async getDashboardStats() {
        return this.customerProfilesService.getDashboardStats();
    }
    async checkSubdomain(subdomain) {
        const validation = this.subdomainService.validateSubdomainFormat(subdomain);
        if (!validation.valid) {
            return { available: false, error: validation.error };
        }
        const available = await this.subdomainService.isSubdomainAvailable(subdomain);
        return { available, subdomain: subdomain.toLowerCase() };
    }
    async suggestSubdomain(businessName) {
        if (!businessName) {
            return { suggestions: [] };
        }
        const suggestions = await this.subdomainService.suggestSubdomains(businessName);
        return { suggestions };
    }
    async findOne(id) {
        return this.customerProfilesService.findOne(id);
    }
    async findBySubdomain(subdomain) {
        return this.customerProfilesService.findBySubdomain(subdomain);
    }
    async update(id, dto) {
        return this.customerProfilesService.update(id, dto);
    }
    async updateStatus(id, body) {
        return this.customerProfilesService.updateStatus(id, body.status, {
            suspendedReason: body.suspendedReason,
            billingDueDate: body.billingDueDate,
        });
    }
    async enableFeature(id, featureKey) {
        return this.customerProfilesService.enableFeature(id, featureKey);
    }
    async disableFeature(id, featureKey) {
        return this.customerProfilesService.disableFeature(id, featureKey);
    }
    async getActivityLogs(id, limit) {
        return this.customerProfilesService.getActivityLogs(id, limit ? parseInt(limit) : 50);
    }
    async getCredentials(id) {
        return this.credentialsExportService.generateCredentialsDocument(id);
    }
    async getCredentialsHtml(id, res) {
        const html = await this.credentialsExportService.generateHtmlDocument(id);
        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Content-Disposition', `attachment; filename="credentials-${id}.html"`);
        res.send(html);
    }
    async reprovisionSubdomain(id) {
        const profile = await this.customerProfilesService.findOne(id);
        await this.subdomainService.provisionSubdomain(id, profile.subdomain);
        return { success: true, message: 'Reprovisioning started' };
    }
    async deprovisionSubdomain(id) {
        await this.subdomainService.deprovisionSubdomain(id);
        return { success: true, message: 'Subdomain deprovisioned' };
    }
};
exports.CustomerProfilesController = CustomerProfilesController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [customer_profile_dto_1.CreateCustomerProfileDto]),
    __metadata("design:returntype", Promise)
], CustomerProfilesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('status')),
    __param(3, (0, common_1.Query)('search')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], CustomerProfilesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('stats'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CustomerProfilesController.prototype, "getDashboardStats", null);
__decorate([
    (0, common_1.Get)('check-subdomain/:subdomain'),
    __param(0, (0, common_1.Param)('subdomain')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CustomerProfilesController.prototype, "checkSubdomain", null);
__decorate([
    (0, common_1.Get)('suggest-subdomain'),
    __param(0, (0, common_1.Query)('businessName')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CustomerProfilesController.prototype, "suggestSubdomain", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CustomerProfilesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)('subdomain/:subdomain'),
    __param(0, (0, common_1.Param)('subdomain')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CustomerProfilesController.prototype, "findBySubdomain", null);
__decorate([
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, customer_profile_dto_1.UpdateCustomerProfileDto]),
    __metadata("design:returntype", Promise)
], CustomerProfilesController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)(':id/status'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CustomerProfilesController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Post)(':id/features/:featureKey/enable'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('featureKey')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], CustomerProfilesController.prototype, "enableFeature", null);
__decorate([
    (0, common_1.Post)(':id/features/:featureKey/disable'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('featureKey')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], CustomerProfilesController.prototype, "disableFeature", null);
__decorate([
    (0, common_1.Get)(':id/activity-logs'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], CustomerProfilesController.prototype, "getActivityLogs", null);
__decorate([
    (0, common_1.Get)(':id/credentials'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CustomerProfilesController.prototype, "getCredentials", null);
__decorate([
    (0, common_1.Get)(':id/credentials/html'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CustomerProfilesController.prototype, "getCredentialsHtml", null);
__decorate([
    (0, common_1.Post)(':id/reprovision'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CustomerProfilesController.prototype, "reprovisionSubdomain", null);
__decorate([
    (0, common_1.Post)(':id/deprovision'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CustomerProfilesController.prototype, "deprovisionSubdomain", null);
exports.CustomerProfilesController = CustomerProfilesController = __decorate([
    (0, common_1.Controller)('mainframe/customer-profiles'),
    __metadata("design:paramtypes", [customer_profiles_service_1.CustomerProfilesService,
        subdomain_service_1.SubdomainService,
        credentials_export_service_1.CredentialsExportService])
], CustomerProfilesController);
//# sourceMappingURL=customer-profiles.controller.js.map