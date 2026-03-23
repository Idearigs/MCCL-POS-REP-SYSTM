export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}
export interface ChatCompletionResponse {
    choices: Array<{
        message: {
            role: string;
            content: string;
        };
        finish_reason: string;
    }>;
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}
export interface FinancialAnalysisRequest {
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
    profitMargin: number;
    totalTransactions: number;
    averageTransaction: number;
    topProducts: any[];
    topCustomers: any[];
    salesTrends: any;
    period: string;
    analysisType: string;
}
export declare class OpenAIService {
    private readonly logger;
    private readonly apiClient;
    private readonly apiKey;
    private readonly model;
    constructor();
    isConfigured(): boolean;
    generateFinancialInsights(data: FinancialAnalysisRequest): Promise<string>;
    generateRecommendations(data: FinancialAnalysisRequest): Promise<any[]>;
    generateImprovementAreas(data: FinancialAnalysisRequest): Promise<any[]>;
    generateWarnings(data: FinancialAnalysisRequest): Promise<any[]>;
    generateOpportunities(data: FinancialAnalysisRequest): Promise<any[]>;
    chat(messages: ChatMessage[], options?: {
        temperature?: number;
        max_tokens?: number;
    }): Promise<string>;
    private chatCompletion;
    private buildFinancialAnalysisPrompt;
    private buildRecommendationsPrompt;
    private extractRecommendationsFromText;
}
