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
exports.FeaturesController = void 0;
const common_1 = require("@nestjs/common");
const features_service_1 = require("../services/features.service");
let FeaturesController = class FeaturesController {
    featuresService;
    constructor(featuresService) {
        this.featuresService = featuresService;
    }
    async create(data) {
        return this.featuresService.create(data);
    }
    async findAll(category, status) {
        return this.featuresService.findAll({ category, status });
    }
    async getStats() {
        return this.featuresService.getStats();
    }
    async getTenantFeatures(req) {
        const subdomain = req.headers['x-tenant-id'] || '';
        if (!subdomain)
            return { features: [], _source: 'no-tenant-id' };
        return this.featuresService.getTenantFeatures(subdomain);
    }
    async findOne(id) {
        return this.featuresService.findOne(id);
    }
    async update(id, data) {
        return this.featuresService.update(id, data);
    }
    async createVersion(id, data) {
        return this.featuresService.createVersion(id, data);
    }
    async deployVersion(id, versionId) {
        return this.featuresService.deployVersion(id, versionId);
    }
    async seedDefaults() {
        return this.featuresService.seedDefaultFeatures();
    }
};
exports.FeaturesController = FeaturesController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FeaturesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('category')),
    __param(1, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], FeaturesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('stats'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], FeaturesController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)('tenant-features'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FeaturesController.prototype, "getTenantFeatures", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], FeaturesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], FeaturesController.prototype, "update", null);
__decorate([
    (0, common_1.Post)(':id/versions'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], FeaturesController.prototype, "createVersion", null);
__decorate([
    (0, common_1.Post)(':id/versions/:versionId/deploy'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('versionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], FeaturesController.prototype, "deployVersion", null);
__decorate([
    (0, common_1.Post)('seed-defaults'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], FeaturesController.prototype, "seedDefaults", null);
exports.FeaturesController = FeaturesController = __decorate([
    (0, common_1.Controller)('mainframe/features'),
    __metadata("design:paramtypes", [features_service_1.FeaturesService])
], FeaturesController);
//# sourceMappingURL=features.controller.js.map