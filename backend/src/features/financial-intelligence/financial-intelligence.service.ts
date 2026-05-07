import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { OpenAIService } from '../../integrations/openai/openai.service';
import { CacheService } from '../../core/cache/cache.service';
import { generateId } from '../../shared/utils/id-generator';
import {
  GenerateAnalysisDto,
  FinancialAnalysisResponseDto,
  RecommendationResponseDto,
  UpdateRecommendationDto,
  DashboardSummaryDto,
  FinancialAnalysisType,
  RecommendationStatus,
  RecommendationPriority,
} from './dto/financial-intelligence.dto';
import {
  startOfDay,
  endOfDay,
  subDays,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  startOfYear,
  endOfYear,
  format,
} from 'date-fns';

@Injectable()
export class FinancialIntelligenceService {
  private readonly logger = new Logger(FinancialIntelligenceService.name);

  constructor(
    private prismaService: PrismaService,
    private openAIService: OpenAIService,
    private cacheService: CacheService,
  ) {}

  /**
   * Generate comprehensive financial analysis with AI insights
   */
  async generateAnalysis(
    dto: GenerateAnalysisDto,
    tenantId: string,
    userId: string,
  ): Promise<FinancialAnalysisResponseDto> {
    this.logger.log(
      `Generating ${dto.analysisType} analysis for tenant ${tenantId}`,
    );

    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    // Calculate report period string
    const reportPeriod = this.getReportPeriod(dto.analysisType, startDate);

    // Aggregate financial data
    const financialData = await this.aggregateFinancialData(
      tenantId,
      startDate,
      endDate,
    );

    // Generate AI insights if enabled
    let aiInsights: string | null = null;
    const aiRecommendations: string | null = null;
    let improvementAreas: any[] = [];
    let warnings: any[] = [];
    let opportunities: any[] = [];

    if (dto.useAI !== false && this.openAIService.isConfigured()) {
      try {
        // Generate insights
        aiInsights = await this.openAIService.generateFinancialInsights({
          ...financialData,
          period: reportPeriod,
          analysisType: dto.analysisType,
        });

        // Generate recommendations
        const recommendations =
          await this.openAIService.generateRecommendations({
            ...financialData,
            period: reportPeriod,
            analysisType: dto.analysisType,
          });

        // Save recommendations to database
        await this.saveRecommendations(recommendations, tenantId);

        // Generate improvement areas
        improvementAreas = await this.openAIService.generateImprovementAreas({
          ...financialData,
          period: reportPeriod,
          analysisType: dto.analysisType,
        });

        // Generate warnings
        warnings = await this.openAIService.generateWarnings({
          ...financialData,
          period: reportPeriod,
          analysisType: dto.analysisType,
        });

        // Generate opportunities
        opportunities = await this.openAIService.generateOpportunities({
          ...financialData,
          period: reportPeriod,
          analysisType: dto.analysisType,
        });
      } catch (error) {
        this.logger.error('Failed to generate AI insights:', error);
        // Continue without AI insights
      }
    }

    // Save analysis to database
    const analysis = await this.prismaService.financial_analyses.create({
      data: {
        id: generateId(),
        tenantId,
        analysisType: dto.analysisType as any,
        reportPeriod,
        startDate,
        endDate,
        totalRevenue: financialData.totalRevenue,
        totalCost: financialData.totalCost,
        totalProfit: financialData.totalProfit,
        profitMargin: financialData.profitMargin,
        totalTransactions: financialData.totalTransactions,
        averageTransaction: financialData.averageTransaction,
        topProducts: financialData.topProducts as any,
        topCustomers: financialData.topCustomers as any,
        salesTrends: financialData.salesTrends as any,
        aiInsights,
        improvementAreas: improvementAreas as any,
        warnings: warnings as any,
        opportunities: opportunities as any,
        generatedBy: userId,
        updatedAt: new Date(),
      },
    });

    this.logger.log(`Analysis generated: ${analysis.id}`);

    return this.mapAnalysisToResponse(analysis);
  }

  /**
   * Get dashboard summary with current metrics
   */
  async getDashboardSummary(tenantId: string): Promise<DashboardSummaryDto> {
    const cacheKey = `dashboard:summary:${tenantId}`;
    const cached = await this.cacheService.getTenantData<DashboardSummaryDto>(
      tenantId,
      cacheKey,
    );
    if (cached) return cached;

    // Current month
    const currentStart = startOfMonth(new Date());
    const currentEnd = endOfMonth(new Date());
    const currentData = await this.aggregateFinancialData(
      tenantId,
      currentStart,
      currentEnd,
    );

    // Previous month
    const previousStart = startOfMonth(subMonths(new Date(), 1));
    const previousEnd = endOfMonth(subMonths(new Date(), 1));
    const previousData = await this.aggregateFinancialData(
      tenantId,
      previousStart,
      previousEnd,
    );

    // Calculate changes
    const revenueChange = this.calculatePercentageChange(
      previousData.totalRevenue,
      currentData.totalRevenue,
    );
    const profitChange = this.calculatePercentageChange(
      previousData.totalProfit,
      currentData.totalProfit,
    );
    const transactionsChange = this.calculatePercentageChange(
      previousData.totalTransactions,
      currentData.totalTransactions,
    );

    // Get recent recommendations (all statuses, prioritize pending)
    const recentRecommendations =
      await this.prismaService.ai_recommendations.findMany({
        where: {
          tenantId,
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        take: 10, // Show more recommendations
      });

    // Generate alerts
    const alerts = this.generateAlerts(currentData);

    const summary: DashboardSummaryDto = {
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
      recentRecommendations: recentRecommendations.map(
        this.mapRecommendationToResponse,
      ),
      alerts,
    };

    // Cache for 1 hour
    await this.cacheService.setTenantData(tenantId, cacheKey, summary, 3600);

    return summary;
  }

  /**
   * Get list of analyses
   */
  async getAnalyses(
    tenantId: string,
    filters?: any,
  ): Promise<FinancialAnalysisResponseDto[]> {
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

  /**
   * Get specific analysis by ID
   */
  async getAnalysisById(
    id: string,
    tenantId: string,
  ): Promise<FinancialAnalysisResponseDto> {
    const analysis = await this.prismaService.financial_analyses.findFirst({
      where: { id, tenantId },
    });

    if (!analysis) {
      throw new NotFoundException('Analysis not found');
    }

    return this.mapAnalysisToResponse(analysis);
  }

  /**
   * Get recommendations
   */
  async getRecommendations(
    tenantId: string,
    filters?: any,
  ): Promise<RecommendationResponseDto[]> {
    const recommendations =
      await this.prismaService.ai_recommendations.findMany({
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

  /**
   * Update recommendation status
   */
  async updateRecommendation(
    id: string,
    dto: UpdateRecommendationDto,
    tenantId: string,
    userId: string,
  ): Promise<RecommendationResponseDto> {
    const recommendation =
      await this.prismaService.ai_recommendations.findFirst({
        where: { id, tenantId },
      });

    if (!recommendation) {
      throw new NotFoundException('Recommendation not found');
    }

    const updated = await this.prismaService.ai_recommendations.update({
      where: { id },
      data: {
        status: dto.status as any,
        notes: dto.notes,
        implementedBy:
          dto.status === RecommendationStatus.IMPLEMENTED ? userId : null,
        implementedDate:
          dto.status === RecommendationStatus.IMPLEMENTED ? new Date() : null,
        updatedAt: new Date(),
      },
    });

    return this.mapRecommendationToResponse(updated);
  }

  /**
   * Aggregate financial data from sales, products, customers
   */
  private async aggregateFinancialData(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ) {
    // Get all sales in period
    const sales = await this.prismaService.sales.findMany({
      where: {
        tenantId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        status: 'COMPLETED' as any,
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

    // Calculate metrics
    const totalRevenue = sales.reduce(
      (sum, sale) => sum + Number(sale.totalAmount),
      0,
    );
    const totalCost = sales.reduce((sum, sale) => {
      const itemsCost = sale.sale_items.reduce((itemSum, item) => {
        return itemSum + Number(item.products?.costPrice || 0) * item.quantity;
      }, 0);
      return sum + itemsCost;
    }, 0);
    const totalProfit = totalRevenue - totalCost;
    const profitMargin =
      totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    const totalTransactions = sales.length;
    const averageTransaction =
      totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    // Top products
    const productSales = new Map<
      string,
      { product: any; revenue: number; units: number }
    >();
    sales.forEach((sale) => {
      sale.sale_items.forEach((item) => {
        const key = item.productId;
        const existing = productSales.get(key);
        if (existing) {
          existing.revenue += Number(item.unitPrice) * item.quantity;
          existing.units += item.quantity;
        } else {
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

    // Top customers
    const customerSales = new Map<
      string,
      { customer: any; totalSpent: number; transactions: number }
    >();
    sales.forEach((sale) => {
      if (sale.customerId) {
        const existing = customerSales.get(sale.customerId);
        if (existing) {
          existing.totalSpent += Number(sale.totalAmount);
          existing.transactions += 1;
        } else {
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
        name:
          `${c.customer?.firstName || ''} ${c.customer?.lastName || ''}`.trim() ||
          'Walk-in Customer',
        totalSpent: c.totalSpent,
        transactions: c.transactions,
      }));

    // Sales trends (daily aggregation)
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

  /**
   * Calculate sales trends
   */
  private calculateSalesTrends(sales: any[], startDate: Date, endDate: Date) {
    const trends: Record<string, number> = {};

    sales.forEach((sale) => {
      const dateKey = format(new Date(sale.createdAt), 'yyyy-MM-dd');
      trends[dateKey] = (trends[dateKey] || 0) + Number(sale.totalAmount);
    });

    return trends;
  }

  /**
   * Save AI recommendations to database
   */
  private async saveRecommendations(recommendations: any[], tenantId: string) {
    for (const rec of recommendations) {
      try {
        await this.prismaService.ai_recommendations.create({
          data: {
            id: generateId(),
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
      } catch (error) {
        this.logger.error('Failed to save recommendation:', error);
      }
    }
  }

  /**
   * Generate alerts based on metrics
   */
  private generateAlerts(data: any): any[] {
    const alerts: any[] = [];

    if (data.profitMargin < 15) {
      alerts.push({
        type: 'CRITICAL',
        message: `Profit margin is critically low at ${data.profitMargin.toFixed(2)}%`,
      });
    } else if (data.profitMargin < 25) {
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

  /**
   * Calculate percentage change
   */
  private calculatePercentageChange(
    oldValue: number,
    newValue: number,
  ): number {
    if (oldValue === 0) return newValue > 0 ? 100 : 0;
    return ((newValue - oldValue) / oldValue) * 100;
  }

  /**
   * Get report period string
   */
  private getReportPeriod(type: FinancialAnalysisType, date: Date): string {
    switch (type) {
      case FinancialAnalysisType.DAILY:
        return format(date, 'yyyy-MM-dd');
      case FinancialAnalysisType.WEEKLY:
        return `${format(startOfWeek(date), 'yyyy-MM-dd')} to ${format(endOfWeek(date), 'yyyy-MM-dd')}`;
      case FinancialAnalysisType.MONTHLY:
        return format(date, 'yyyy-MM');
      case FinancialAnalysisType.QUARTERLY: {
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        return `${date.getFullYear()}-Q${quarter}`;
      }
      case FinancialAnalysisType.YEARLY:
        return date.getFullYear().toString();
      default:
        return format(date, 'yyyy-MM-dd');
    }
  }

  /**
   * Map database entity to response DTO
   */
  private mapAnalysisToResponse(analysis: any): FinancialAnalysisResponseDto {
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

  /**
   * Map recommendation to response DTO
   */
  private mapRecommendationToResponse(rec: any): RecommendationResponseDto {
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
}
