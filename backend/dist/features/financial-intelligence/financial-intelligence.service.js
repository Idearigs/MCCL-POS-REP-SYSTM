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
var FinancialIntelligenceService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinancialIntelligenceService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../core/prisma/prisma.service");
const openai_service_1 = require("../../integrations/openai/openai.service");
const cache_service_1 = require("../../core/cache/cache.service");
const id_generator_1 = require("../../shared/utils/id-generator");
const financial_intelligence_dto_1 = require("./dto/financial-intelligence.dto");
const date_fns_1 = require("date-fns");
let FinancialIntelligenceService = FinancialIntelligenceService_1 = class FinancialIntelligenceService {
    prismaService;
    openAIService;
    cacheService;
    logger = new common_1.Logger(FinancialIntelligenceService_1.name);
    constructor(prismaService, openAIService, cacheService) {
        this.prismaService = prismaService;
        this.openAIService = openAIService;
        this.cacheService = cacheService;
    }
    async generateAnalysis(dto, tenantId, userId) {
        this.logger.log(`Generating ${dto.analysisType} analysis for tenant ${tenantId}`);
        const startDate = new Date(dto.startDate);
        const endDate = new Date(dto.endDate);
        const reportPeriod = this.getReportPeriod(dto.analysisType, startDate);
        const financialData = await this.aggregateFinancialData(tenantId, startDate, endDate);
        let aiInsights = null;
        const aiRecommendations = null;
        let improvementAreas = [];
        let warnings = [];
        let opportunities = [];
        if (dto.useAI !== false && this.openAIService.isConfigured()) {
            try {
                aiInsights = await this.openAIService.generateFinancialInsights({
                    ...financialData,
                    period: reportPeriod,
                    analysisType: dto.analysisType,
                });
                const recommendations = await this.openAIService.generateRecommendations({
                    ...financialData,
                    period: reportPeriod,
                    analysisType: dto.analysisType,
                });
                await this.saveRecommendations(recommendations, tenantId);
                improvementAreas = await this.openAIService.generateImprovementAreas({
                    ...financialData,
                    period: reportPeriod,
                    analysisType: dto.analysisType,
                });
                warnings = await this.openAIService.generateWarnings({
                    ...financialData,
                    period: reportPeriod,
                    analysisType: dto.analysisType,
                });
                opportunities = await this.openAIService.generateOpportunities({
                    ...financialData,
                    period: reportPeriod,
                    analysisType: dto.analysisType,
                });
            }
            catch (error) {
                this.logger.error('Failed to generate AI insights:', error);
            }
        }
        const analysis = await this.prismaService.financial_analyses.create({
            data: {
                id: (0, id_generator_1.generateId)(),
                tenantId,
                analysisType: dto.analysisType,
                reportPeriod,
                startDate,
                endDate,
                totalRevenue: financialData.totalRevenue,
                totalCost: financialData.totalCost,
                totalProfit: financialData.totalProfit,
                profitMargin: financialData.profitMargin,
                totalTransactions: financialData.totalTransactions,
                averageTransaction: financialData.averageTransaction,
                topProducts: financialData.topProducts,
                topCustomers: financialData.topCustomers,
                salesTrends: financialData.salesTrends,
                aiInsights,
                improvementAreas: improvementAreas,
                warnings: warnings,
                opportunities: opportunities,
                generatedBy: userId,
                updatedAt: new Date(),
            },
        });
        this.logger.log(`Analysis generated: ${analysis.id}`);
        return this.mapAnalysisToResponse(analysis);
    }
    async getDashboardSummary(tenantId) {
        const cacheKey = `dashboard:summary:${tenantId}`;
        const cached = await this.cacheService.getTenantData(tenantId, cacheKey);
        if (cached)
            return cached;
        const currentStart = (0, date_fns_1.startOfMonth)(new Date());
        const currentEnd = (0, date_fns_1.endOfMonth)(new Date());
        const currentData = await this.aggregateFinancialData(tenantId, currentStart, currentEnd);
        const previousStart = (0, date_fns_1.startOfMonth)((0, date_fns_1.subMonths)(new Date(), 1));
        const previousEnd = (0, date_fns_1.endOfMonth)((0, date_fns_1.subMonths)(new Date(), 1));
        const previousData = await this.aggregateFinancialData(tenantId, previousStart, previousEnd);
        const revenueChange = this.calculatePercentageChange(previousData.totalRevenue, currentData.totalRevenue);
        const profitChange = this.calculatePercentageChange(previousData.totalProfit, currentData.totalProfit);
        const transactionsChange = this.calculatePercentageChange(previousData.totalTransactions, currentData.totalTransactions);
        const recentRecommendations = await this.prismaService.ai_recommendations.findMany({
            where: {
                tenantId,
            },
            orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
            take: 10,
        });
        const alerts = this.generateAlerts(currentData);
        const summary = {
            currentPeriod: {
                revenue: currentData.totalRevenue,
                profit: currentData.totalProfit,
                profitMargin: currentData.profitMargin,
                transactions: currentData.totalTransactions,
                averageTransaction: currentData.averageTransaction,
            },
            previousPeriod: {
                revenue: previousData.totalRevenue,
                profit: previousData.totalProfit,
                profitMargin: previousData.profitMargin,
                transactions: previousData.totalTransactions,
                averageTransaction: previousData.averageTransaction,
            },
            changes: {
                revenueChange,
                profitChange,
                transactionsChange,
            },
            topProducts: currentData.topProducts.slice(0, 5),
            topCustomers: currentData.topCustomers.slice(0, 5),
            recentRecommendations: recentRecommendations.map(this.mapRecommendationToResponse),
            alerts,
        };
        await this.cacheService.setTenantData(tenantId, cacheKey, summary, 3600);
        return summary;
    }
    async getAnalyses(tenantId, filters) {
        const analyses = await this.prismaService.financial_analyses.findMany({
            where: {
                tenantId,
                ...(filters?.analysisType && { analysisType: filters.analysisType }),
            },
            orderBy: { createdAt: 'desc' },
            take: filters?.limit || 50,
        });
        return analyses.map(this.mapAnalysisToResponse);
    }
    async getAnalysisById(id, tenantId) {
        const analysis = await this.prismaService.financial_analyses.findFirst({
            where: { id, tenantId },
        });
        if (!analysis) {
            throw new common_1.NotFoundException('Analysis not found');
        }
        return this.mapAnalysisToResponse(analysis);
    }
    async getRecommendations(tenantId, filters) {
        const recommendations = await this.prismaService.ai_recommendations.findMany({
            where: {
                tenantId,
                ...(filters?.status && { status: filters.status }),
                ...(filters?.category && { category: filters.category }),
                ...(filters?.priority && { priority: filters.priority }),
            },
            orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
            take: filters?.limit || 100,
        });
        return recommendations.map(this.mapRecommendationToResponse);
    }
    async updateRecommendation(id, dto, tenantId, userId) {
        const recommendation = await this.prismaService.ai_recommendations.findFirst({
            where: { id, tenantId },
        });
        if (!recommendation) {
            throw new common_1.NotFoundException('Recommendation not found');
        }
        const updated = await this.prismaService.ai_recommendations.update({
            where: { id },
            data: {
                status: dto.status,
                notes: dto.notes,
                implementedBy: dto.status === financial_intelligence_dto_1.RecommendationStatus.IMPLEMENTED ? userId : null,
                implementedDate: dto.status === financial_intelligence_dto_1.RecommendationStatus.IMPLEMENTED ? new Date() : null,
                updatedAt: new Date(),
            },
        });
        return this.mapRecommendationToResponse(updated);
    }
    async aggregateFinancialData(tenantId, startDate, endDate) {
        const sales = await this.prismaService.sales.findMany({
            where: {
                tenantId,
                createdAt: {
                    gte: startDate,
                    lte: endDate,
                },
                status: 'COMPLETED',
            },
            include: {
                sale_items: {
                    include: {
                        products: true,
                    },
                },
                customers: true,
            },
        });
        const totalRevenue = sales.reduce((sum, sale) => sum + Number(sale.totalAmount), 0);
        const totalCost = sales.reduce((sum, sale) => {
            const itemsCost = sale.sale_items.reduce((itemSum, item) => {
                return itemSum + Number(item.products?.costPrice || 0) * item.quantity;
            }, 0);
            return sum + itemsCost;
        }, 0);
        const totalProfit = totalRevenue - totalCost;
        const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
        const totalTransactions = sales.length;
        const averageTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
        const productSales = new Map();
        sales.forEach((sale) => {
            sale.sale_items.forEach((item) => {
                const key = item.productId;
                const existing = productSales.get(key);
                if (existing) {
                    existing.revenue += Number(item.unitPrice) * item.quantity;
                    existing.units += item.quantity;
                }
                else {
                    productSales.set(key, {
                        product: item.products,
                        revenue: Number(item.unitPrice) * item.quantity,
                        units: item.quantity,
                    });
                }
            });
        });
        const topProducts = Array.from(productSales.values())
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10)
            .map((p) => ({
            id: p.product?.id,
            name: p.product?.name || 'Unknown',
            sku: p.product?.sku,
            revenue: p.revenue,
            units: p.units,
        }));
        const customerSales = new Map();
        sales.forEach((sale) => {
            if (sale.customerId) {
                const existing = customerSales.get(sale.customerId);
                if (existing) {
                    existing.totalSpent += Number(sale.totalAmount);
                    existing.transactions += 1;
                }
                else {
                    customerSales.set(sale.customerId, {
                        customer: sale.customers,
                        totalSpent: Number(sale.totalAmount),
                        transactions: 1,
                    });
                }
            }
        });
        const topCustomers = Array.from(customerSales.values())
            .sort((a, b) => b.totalSpent - a.totalSpent)
            .slice(0, 10)
            .map((c) => ({
            id: c.customer?.id,
            name: `${c.customer?.firstName || ''} ${c.customer?.lastName || ''}`.trim() ||
                'Walk-in Customer',
            totalSpent: c.totalSpent,
            transactions: c.transactions,
        }));
        const salesTrends = this.calculateSalesTrends(sales, startDate, endDate);
        return {
            totalRevenue,
            totalCost,
            totalProfit,
            profitMargin,
            totalTransactions,
            averageTransaction,
            topProducts,
            topCustomers,
            salesTrends,
        };
    }
    calculateSalesTrends(sales, startDate, endDate) {
        const trends = {};
        sales.forEach((sale) => {
            const dateKey = (0, date_fns_1.format)(new Date(sale.createdAt), 'yyyy-MM-dd');
            trends[dateKey] = (trends[dateKey] || 0) + Number(sale.totalAmount);
        });
        return trends;
    }
    async saveRecommendations(recommendations, tenantId) {
        for (const rec of recommendations) {
            try {
                await this.prismaService.ai_recommendations.create({
                    data: {
                        id: (0, id_generator_1.generateId)(),
                        tenantId,
                        category: rec.category || 'GENERAL',
                        priority: rec.priority || 'MEDIUM',
                        title: rec.title,
                        description: rec.description,
                        reasoning: rec.reasoning,
                        expectedImpact: rec.expectedImpact,
                        actionItems: rec.actionItems || [],
                        confidence: rec.confidence,
                        status: 'PENDING',
                        updatedAt: new Date(),
                    },
                });
            }
            catch (error) {
                this.logger.error('Failed to save recommendation:', error);
            }
        }
    }
    generateAlerts(data) {
        const alerts = [];
        if (data.profitMargin < 15) {
            alerts.push({
                type: 'CRITICAL',
                message: `Profit margin is critically low at ${data.profitMargin.toFixed(2)}%`,
            });
        }
        else if (data.profitMargin < 25) {
            alerts.push({
                type: 'WARNING',
                message: `Profit margin is below optimal level at ${data.profitMargin.toFixed(2)}%`,
            });
        }
        if (data.totalTransactions === 0) {
            alerts.push({
                type: 'CRITICAL',
                message: 'No transactions recorded in current period',
            });
        }
        return alerts;
    }
    calculatePercentageChange(oldValue, newValue) {
        if (oldValue === 0)
            return newValue > 0 ? 100 : 0;
        return ((newValue - oldValue) / oldValue) * 100;
    }
    getReportPeriod(type, date) {
        switch (type) {
            case financial_intelligence_dto_1.FinancialAnalysisType.DAILY:
                return (0, date_fns_1.format)(date, 'yyyy-MM-dd');
            case financial_intelligence_dto_1.FinancialAnalysisType.WEEKLY:
                return `${(0, date_fns_1.format)((0, date_fns_1.startOfWeek)(date), 'yyyy-MM-dd')} to ${(0, date_fns_1.format)((0, date_fns_1.endOfWeek)(date), 'yyyy-MM-dd')}`;
            case financial_intelligence_dto_1.FinancialAnalysisType.MONTHLY:
                return (0, date_fns_1.format)(date, 'yyyy-MM');
            case financial_intelligence_dto_1.FinancialAnalysisType.QUARTERLY: {
                const quarter = Math.floor(date.getMonth() / 3) + 1;
                return `${date.getFullYear()}-Q${quarter}`;
            }
            case financial_intelligence_dto_1.FinancialAnalysisType.YEARLY:
                return date.getFullYear().toString();
            default:
                return (0, date_fns_1.format)(date, 'yyyy-MM-dd');
        }
    }
    mapAnalysisToResponse(analysis) {
        return {
            id: analysis.id,
            analysisType: analysis.analysisType,
            reportPeriod: analysis.reportPeriod,
            startDate: analysis.startDate,
            endDate: analysis.endDate,
            totalRevenue: Number(analysis.totalRevenue),
            totalCost: Number(analysis.totalCost),
            totalProfit: Number(analysis.totalProfit),
            profitMargin: Number(analysis.profitMargin),
            totalTransactions: analysis.totalTransactions,
            averageTransaction: Number(analysis.averageTransaction),
            topProducts: analysis.topProducts,
            topCustomers: analysis.topCustomers,
            salesTrends: analysis.salesTrends,
            aiInsights: analysis.aiInsights,
            aiRecommendations: analysis.aiRecommendations,
            improvementAreas: analysis.improvementAreas,
            warnings: analysis.warnings,
            opportunities: analysis.opportunities,
            createdAt: analysis.createdAt,
        };
    }
    mapRecommendationToResponse(rec) {
        return {
            id: rec.id,
            category: rec.category,
            priority: rec.priority,
            title: rec.title,
            description: rec.description,
            reasoning: rec.reasoning,
            expectedImpact: rec.expectedImpact,
            actionItems: rec.actionItems,
            confidence: rec.confidence ? Number(rec.confidence) : undefined,
            status: rec.status,
            createdAt: rec.createdAt,
        };
    }
};
exports.FinancialIntelligenceService = FinancialIntelligenceService;
exports.FinancialIntelligenceService = FinancialIntelligenceService = FinancialIntelligenceService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        openai_service_1.OpenAIService,
        cache_service_1.CacheService])
], FinancialIntelligenceService);
//# sourceMappingURL=financial-intelligence.service.js.map