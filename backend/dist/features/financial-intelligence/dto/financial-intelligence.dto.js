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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardSummaryDto = exports.FinancialReportResponseDto = exports.UpdateRecommendationDto = exports.RecommendationResponseDto = exports.FinancialAnalysisResponseDto = exports.GenerateAnalysisDto = exports.FinancialReportType = exports.RecommendationStatus = exports.RecommendationPriority = exports.RecommendationCategory = exports.FinancialAnalysisType = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
var FinancialAnalysisType;
(function (FinancialAnalysisType) {
    FinancialAnalysisType["DAILY"] = "DAILY";
    FinancialAnalysisType["WEEKLY"] = "WEEKLY";
    FinancialAnalysisType["MONTHLY"] = "MONTHLY";
    FinancialAnalysisType["QUARTERLY"] = "QUARTERLY";
    FinancialAnalysisType["YEARLY"] = "YEARLY";
    FinancialAnalysisType["CUSTOM"] = "CUSTOM";
})(FinancialAnalysisType || (exports.FinancialAnalysisType = FinancialAnalysisType = {}));
var RecommendationCategory;
(function (RecommendationCategory) {
    RecommendationCategory["SALES_OPTIMIZATION"] = "SALES_OPTIMIZATION";
    RecommendationCategory["INVENTORY_MANAGEMENT"] = "INVENTORY_MANAGEMENT";
    RecommendationCategory["CUSTOMER_RETENTION"] = "CUSTOMER_RETENTION";
    RecommendationCategory["COST_REDUCTION"] = "COST_REDUCTION";
    RecommendationCategory["PRICING_STRATEGY"] = "PRICING_STRATEGY";
    RecommendationCategory["MARKETING"] = "MARKETING";
    RecommendationCategory["OPERATIONS"] = "OPERATIONS";
    RecommendationCategory["STAFF_MANAGEMENT"] = "STAFF_MANAGEMENT";
    RecommendationCategory["CASH_FLOW"] = "CASH_FLOW";
    RecommendationCategory["GENERAL"] = "GENERAL";
})(RecommendationCategory || (exports.RecommendationCategory = RecommendationCategory = {}));
var RecommendationPriority;
(function (RecommendationPriority) {
    RecommendationPriority["LOW"] = "LOW";
    RecommendationPriority["MEDIUM"] = "MEDIUM";
    RecommendationPriority["HIGH"] = "HIGH";
    RecommendationPriority["CRITICAL"] = "CRITICAL";
})(RecommendationPriority || (exports.RecommendationPriority = RecommendationPriority = {}));
var RecommendationStatus;
(function (RecommendationStatus) {
    RecommendationStatus["PENDING"] = "PENDING";
    RecommendationStatus["IN_PROGRESS"] = "IN_PROGRESS";
    RecommendationStatus["IMPLEMENTED"] = "IMPLEMENTED";
    RecommendationStatus["DISMISSED"] = "DISMISSED";
})(RecommendationStatus || (exports.RecommendationStatus = RecommendationStatus = {}));
var FinancialReportType;
(function (FinancialReportType) {
    FinancialReportType["SALES_SUMMARY"] = "SALES_SUMMARY";
    FinancialReportType["PROFIT_LOSS"] = "PROFIT_LOSS";
    FinancialReportType["CASH_FLOW"] = "CASH_FLOW";
    FinancialReportType["INVENTORY_VALUATION"] = "INVENTORY_VALUATION";
    FinancialReportType["CUSTOMER_ANALYSIS"] = "CUSTOMER_ANALYSIS";
    FinancialReportType["PRODUCT_PERFORMANCE"] = "PRODUCT_PERFORMANCE";
    FinancialReportType["CUSTOM"] = "CUSTOM";
})(FinancialReportType || (exports.FinancialReportType = FinancialReportType = {}));
class GenerateAnalysisDto {
    analysisType;
    startDate;
    endDate;
    useAI;
}
exports.GenerateAnalysisDto = GenerateAnalysisDto;
__decorate([
    (0, swagger_1.ApiProperty)({ enum: FinancialAnalysisType }),
    (0, class_validator_1.IsEnum)(FinancialAnalysisType),
    __metadata("design:type", String)
], GenerateAnalysisDto.prototype, "analysisType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Start date for analysis period' }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], GenerateAnalysisDto.prototype, "startDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'End date for analysis period' }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], GenerateAnalysisDto.prototype, "endDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Whether to use AI for insights generation',
        default: true,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], GenerateAnalysisDto.prototype, "useAI", void 0);
class FinancialAnalysisResponseDto {
    id;
    analysisType;
    reportPeriod;
    startDate;
    endDate;
    totalRevenue;
    totalCost;
    totalProfit;
    profitMargin;
    totalTransactions;
    averageTransaction;
    topProducts;
    topCustomers;
    salesTrends;
    aiInsights;
    aiRecommendations;
    improvementAreas;
    warnings;
    opportunities;
    createdAt;
}
exports.FinancialAnalysisResponseDto = FinancialAnalysisResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], FinancialAnalysisResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], FinancialAnalysisResponseDto.prototype, "analysisType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], FinancialAnalysisResponseDto.prototype, "reportPeriod", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], FinancialAnalysisResponseDto.prototype, "startDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], FinancialAnalysisResponseDto.prototype, "endDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], FinancialAnalysisResponseDto.prototype, "totalRevenue", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], FinancialAnalysisResponseDto.prototype, "totalCost", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], FinancialAnalysisResponseDto.prototype, "totalProfit", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], FinancialAnalysisResponseDto.prototype, "profitMargin", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], FinancialAnalysisResponseDto.prototype, "totalTransactions", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], FinancialAnalysisResponseDto.prototype, "averageTransaction", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Array)
], FinancialAnalysisResponseDto.prototype, "topProducts", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Array)
], FinancialAnalysisResponseDto.prototype, "topCustomers", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Object)
], FinancialAnalysisResponseDto.prototype, "salesTrends", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", String)
], FinancialAnalysisResponseDto.prototype, "aiInsights", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", String)
], FinancialAnalysisResponseDto.prototype, "aiRecommendations", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Array)
], FinancialAnalysisResponseDto.prototype, "improvementAreas", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Array)
], FinancialAnalysisResponseDto.prototype, "warnings", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Array)
], FinancialAnalysisResponseDto.prototype, "opportunities", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], FinancialAnalysisResponseDto.prototype, "createdAt", void 0);
class RecommendationResponseDto {
    id;
    category;
    priority;
    title;
    description;
    reasoning;
    expectedImpact;
    actionItems;
    confidence;
    status;
    createdAt;
}
exports.RecommendationResponseDto = RecommendationResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], RecommendationResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: RecommendationCategory }),
    __metadata("design:type", String)
], RecommendationResponseDto.prototype, "category", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: RecommendationPriority }),
    __metadata("design:type", String)
], RecommendationResponseDto.prototype, "priority", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], RecommendationResponseDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], RecommendationResponseDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", String)
], RecommendationResponseDto.prototype, "reasoning", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", String)
], RecommendationResponseDto.prototype, "expectedImpact", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Array)
], RecommendationResponseDto.prototype, "actionItems", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Number)
], RecommendationResponseDto.prototype, "confidence", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: RecommendationStatus }),
    __metadata("design:type", String)
], RecommendationResponseDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], RecommendationResponseDto.prototype, "createdAt", void 0);
class UpdateRecommendationDto {
    status;
    notes;
}
exports.UpdateRecommendationDto = UpdateRecommendationDto;
__decorate([
    (0, swagger_1.ApiProperty)({ enum: RecommendationStatus }),
    (0, class_validator_1.IsEnum)(RecommendationStatus),
    __metadata("design:type", String)
], UpdateRecommendationDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateRecommendationDto.prototype, "notes", void 0);
class FinancialReportResponseDto {
    id;
    reportType;
    reportName;
    reportPeriod;
    startDate;
    endDate;
    summary;
    charts;
    tables;
    pdfUrl;
    excelUrl;
    createdAt;
}
exports.FinancialReportResponseDto = FinancialReportResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], FinancialReportResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: FinancialReportType }),
    __metadata("design:type", String)
], FinancialReportResponseDto.prototype, "reportType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], FinancialReportResponseDto.prototype, "reportName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], FinancialReportResponseDto.prototype, "reportPeriod", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], FinancialReportResponseDto.prototype, "startDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], FinancialReportResponseDto.prototype, "endDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Object)
], FinancialReportResponseDto.prototype, "summary", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Object)
], FinancialReportResponseDto.prototype, "charts", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Object)
], FinancialReportResponseDto.prototype, "tables", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", String)
], FinancialReportResponseDto.prototype, "pdfUrl", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", String)
], FinancialReportResponseDto.prototype, "excelUrl", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], FinancialReportResponseDto.prototype, "createdAt", void 0);
class DashboardSummaryDto {
    currentPeriod;
    previousPeriod;
    changes;
    topProducts;
    topCustomers;
    recentRecommendations;
    alerts;
}
exports.DashboardSummaryDto = DashboardSummaryDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Object)
], DashboardSummaryDto.prototype, "currentPeriod", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Object)
], DashboardSummaryDto.prototype, "previousPeriod", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Object)
], DashboardSummaryDto.prototype, "changes", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Array)
], DashboardSummaryDto.prototype, "topProducts", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Array)
], DashboardSummaryDto.prototype, "topCustomers", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Array)
], DashboardSummaryDto.prototype, "recentRecommendations", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Array)
], DashboardSummaryDto.prototype, "alerts", void 0);
//# sourceMappingURL=financial-intelligence.dto.js.map