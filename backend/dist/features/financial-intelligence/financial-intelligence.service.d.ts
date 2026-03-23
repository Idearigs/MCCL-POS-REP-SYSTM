import { PrismaService } from '../../core/prisma/prisma.service';
import { OpenAIService } from '../../integrations/openai/openai.service';
import { CacheService } from '../../core/cache/cache.service';
import { GenerateAnalysisDto, FinancialAnalysisResponseDto, RecommendationResponseDto, UpdateRecommendationDto, DashboardSummaryDto } from './dto/financial-intelligence.dto';
export declare class FinancialIntelligenceService {
    private prismaService;
    private openAIService;
    private cacheService;
    private readonly logger;
    constructor(prismaService: PrismaService, openAIService: OpenAIService, cacheService: CacheService);
    generateAnalysis(dto: GenerateAnalysisDto, tenantId: string, userId: string): Promise<FinancialAnalysisResponseDto>;
    getDashboardSummary(tenantId: string): Promise<DashboardSummaryDto>;
    getAnalyses(tenantId: string, filters?: any): Promise<FinancialAnalysisResponseDto[]>;
    getAnalysisById(id: string, tenantId: string): Promise<FinancialAnalysisResponseDto>;
    getRecommendations(tenantId: string, filters?: any): Promise<RecommendationResponseDto[]>;
    updateRecommendation(id: string, dto: UpdateRecommendationDto, tenantId: string, userId: string): Promise<RecommendationResponseDto>;
    private aggregateFinancialData;
    private calculateSalesTrends;
    private saveRecommendations;
    private generateAlerts;
    private calculatePercentageChange;
    private getReportPeriod;
    private mapAnalysisToResponse;
    private mapRecommendationToResponse;
}
