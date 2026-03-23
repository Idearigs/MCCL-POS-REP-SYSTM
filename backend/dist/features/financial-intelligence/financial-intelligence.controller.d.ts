import { FinancialIntelligenceService } from './financial-intelligence.service';
import { GenerateAnalysisDto, FinancialAnalysisResponseDto, RecommendationResponseDto, UpdateRecommendationDto, DashboardSummaryDto } from './dto/financial-intelligence.dto';
export declare class FinancialIntelligenceController {
    private readonly financialIntelligenceService;
    constructor(financialIntelligenceService: FinancialIntelligenceService);
    generateAnalysis(dto: GenerateAnalysisDto, tenantId: string, userId: string): Promise<FinancialAnalysisResponseDto>;
    getDashboard(tenantId: string): Promise<DashboardSummaryDto>;
    getAnalyses(tenantId: string, analysisType?: string, limit?: string): Promise<FinancialAnalysisResponseDto[]>;
    getAnalysisById(id: string, tenantId: string): Promise<FinancialAnalysisResponseDto>;
    getRecommendations(tenantId: string, status?: string, category?: string, priority?: string, limit?: string): Promise<RecommendationResponseDto[]>;
    updateRecommendation(id: string, dto: UpdateRecommendationDto, tenantId: string, userId: string): Promise<RecommendationResponseDto>;
}
