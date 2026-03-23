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
exports.FinancialIntelligenceController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const throttler_1 = require("@nestjs/throttler");
const financial_intelligence_service_1 = require("./financial-intelligence.service");
const jwt_auth_guard_1 = require("../../shared/guards/jwt-auth.guard");
const tenant_guard_1 = require("../../shared/guards/tenant.guard");
const user_decorator_1 = require("../../shared/decorators/user.decorator");
const tenant_decorator_1 = require("../../shared/decorators/tenant.decorator");
const financial_intelligence_dto_1 = require("./dto/financial-intelligence.dto");
let FinancialIntelligenceController = class FinancialIntelligenceController {
    financialIntelligenceService;
    constructor(financialIntelligenceService) {
        this.financialIntelligenceService = financialIntelligenceService;
    }
    async generateAnalysis(dto, tenantId, userId) {
        return this.financialIntelligenceService.generateAnalysis(dto, tenantId, userId);
    }
    async getDashboard(tenantId) {
        return this.financialIntelligenceService.getDashboardSummary(tenantId);
    }
    async getAnalyses(tenantId, analysisType, limit) {
        return this.financialIntelligenceService.getAnalyses(tenantId, {
            analysisType,
            limit: limit ? parseInt(limit) : undefined,
        });
    }
    async getAnalysisById(id, tenantId) {
        return this.financialIntelligenceService.getAnalysisById(id, tenantId);
    }
    async getRecommendations(tenantId, status, category, priority, limit) {
        return this.financialIntelligenceService.getRecommendations(tenantId, {
            status,
            category,
            priority,
            limit: limit ? parseInt(limit) : undefined,
        });
    }
    async updateRecommendation(id, dto, tenantId, userId) {
        return this.financialIntelligenceService.updateRecommendation(id, dto, tenantId, userId);
    }
};
exports.FinancialIntelligenceController = FinancialIntelligenceController;
__decorate([
    (0, common_1.Post)('analyses'),
    (0, swagger_1.ApiOperation)({
        summary: 'Generate financial analysis with AI insights',
        description: 'Analyzes financial data for specified period and generates AI-powered insights and recommendations',
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Analysis generated successfully',
        type: financial_intelligence_dto_1.FinancialAnalysisResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Invalid request parameters',
    }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, tenant_decorator_1.TenantId)()),
    __param(2, (0, user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [financial_intelligence_dto_1.GenerateAnalysisDto, String, String]),
    __metadata("design:returntype", Promise)
], FinancialIntelligenceController.prototype, "generateAnalysis", null);
__decorate([
    (0, common_1.Get)('dashboard'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get dashboard summary',
        description: 'Retrieves key metrics, trends, and recent recommendations for dashboard display',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Dashboard summary retrieved successfully',
        type: financial_intelligence_dto_1.DashboardSummaryDto,
    }),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], FinancialIntelligenceController.prototype, "getDashboard", null);
__decorate([
    (0, common_1.Get)('analyses'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get list of financial analyses',
        description: 'Retrieves historical financial analyses with optional filtering',
    }),
    (0, swagger_1.ApiQuery)({ name: 'analysisType', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Analyses retrieved successfully',
        type: [financial_intelligence_dto_1.FinancialAnalysisResponseDto],
    }),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, common_1.Query)('analysisType')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], FinancialIntelligenceController.prototype, "getAnalyses", null);
__decorate([
    (0, common_1.Get)('analyses/:id'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get specific analysis by ID',
        description: 'Retrieves detailed financial analysis including AI insights',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Analysis retrieved successfully',
        type: financial_intelligence_dto_1.FinancialAnalysisResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Analysis not found',
    }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, tenant_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], FinancialIntelligenceController.prototype, "getAnalysisById", null);
__decorate([
    (0, common_1.Get)('recommendations'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get AI recommendations',
        description: 'Retrieves business recommendations generated by AI with filtering options',
    }),
    (0, swagger_1.ApiQuery)({ name: 'status', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'category', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'priority', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Recommendations retrieved successfully',
        type: [financial_intelligence_dto_1.RecommendationResponseDto],
    }),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('category')),
    __param(3, (0, common_1.Query)('priority')),
    __param(4, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], FinancialIntelligenceController.prototype, "getRecommendations", null);
__decorate([
    (0, common_1.Patch)('recommendations/:id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Update recommendation status',
        description: 'Updates recommendation status (e.g., mark as implemented, dismissed)',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Recommendation updated successfully',
        type: financial_intelligence_dto_1.RecommendationResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Recommendation not found',
    }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, tenant_decorator_1.TenantId)()),
    __param(3, (0, user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, financial_intelligence_dto_1.UpdateRecommendationDto, String, String]),
    __metadata("design:returntype", Promise)
], FinancialIntelligenceController.prototype, "updateRecommendation", null);
exports.FinancialIntelligenceController = FinancialIntelligenceController = __decorate([
    (0, swagger_1.ApiTags)('Financial Intelligence'),
    (0, common_1.Controller)('financial-intelligence'),
    (0, common_1.UseGuards)(throttler_1.ThrottlerGuard, jwt_auth_guard_1.JwtAuthGuard, tenant_guard_1.TenantGuard),
    (0, swagger_1.ApiBearerAuth)('access-token'),
    __metadata("design:paramtypes", [financial_intelligence_service_1.FinancialIntelligenceService])
], FinancialIntelligenceController);
//# sourceMappingURL=financial-intelligence.controller.js.map