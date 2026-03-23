export declare enum FinancialAnalysisType {
    DAILY = "DAILY",
    WEEKLY = "WEEKLY",
    MONTHLY = "MONTHLY",
    QUARTERLY = "QUARTERLY",
    YEARLY = "YEARLY",
    CUSTOM = "CUSTOM"
}
export declare enum RecommendationCategory {
    SALES_OPTIMIZATION = "SALES_OPTIMIZATION",
    INVENTORY_MANAGEMENT = "INVENTORY_MANAGEMENT",
    CUSTOMER_RETENTION = "CUSTOMER_RETENTION",
    COST_REDUCTION = "COST_REDUCTION",
    PRICING_STRATEGY = "PRICING_STRATEGY",
    MARKETING = "MARKETING",
    OPERATIONS = "OPERATIONS",
    STAFF_MANAGEMENT = "STAFF_MANAGEMENT",
    CASH_FLOW = "CASH_FLOW",
    GENERAL = "GENERAL"
}
export declare enum RecommendationPriority {
    LOW = "LOW",
    MEDIUM = "MEDIUM",
    HIGH = "HIGH",
    CRITICAL = "CRITICAL"
}
export declare enum RecommendationStatus {
    PENDING = "PENDING",
    IN_PROGRESS = "IN_PROGRESS",
    IMPLEMENTED = "IMPLEMENTED",
    DISMISSED = "DISMISSED"
}
export declare enum FinancialReportType {
    SALES_SUMMARY = "SALES_SUMMARY",
    PROFIT_LOSS = "PROFIT_LOSS",
    CASH_FLOW = "CASH_FLOW",
    INVENTORY_VALUATION = "INVENTORY_VALUATION",
    CUSTOMER_ANALYSIS = "CUSTOMER_ANALYSIS",
    PRODUCT_PERFORMANCE = "PRODUCT_PERFORMANCE",
    CUSTOM = "CUSTOM"
}
export declare class GenerateAnalysisDto {
    analysisType: FinancialAnalysisType;
    startDate: string;
    endDate: string;
    useAI?: boolean;
}
export declare class FinancialAnalysisResponseDto {
    id: string;
    analysisType: FinancialAnalysisType;
    reportPeriod: string;
    startDate: Date;
    endDate: Date;
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
    profitMargin: number;
    totalTransactions: number;
    averageTransaction: number;
    topProducts?: any[];
    topCustomers?: any[];
    salesTrends?: any;
    aiInsights?: string;
    aiRecommendations?: string;
    improvementAreas?: any[];
    warnings?: any[];
    opportunities?: any[];
    createdAt: Date;
}
export declare class RecommendationResponseDto {
    id: string;
    category: RecommendationCategory;
    priority: RecommendationPriority;
    title: string;
    description: string;
    reasoning?: string;
    expectedImpact?: string;
    actionItems?: string[];
    confidence?: number;
    status: RecommendationStatus;
    createdAt: Date;
}
export declare class UpdateRecommendationDto {
    status: RecommendationStatus;
    notes?: string;
}
export declare class FinancialReportResponseDto {
    id: string;
    reportType: FinancialReportType;
    reportName: string;
    reportPeriod: string;
    startDate: Date;
    endDate: Date;
    summary?: any;
    charts?: any;
    tables?: any;
    pdfUrl?: string;
    excelUrl?: string;
    createdAt: Date;
}
export declare class DashboardSummaryDto {
    currentPeriod: {
        revenue: number;
        profit: number;
        profitMargin: number;
        transactions: number;
        averageTransaction: number;
    };
    previousPeriod: {
        revenue: number;
        profit: number;
        profitMargin: number;
        transactions: number;
        averageTransaction: number;
    };
    changes: {
        revenueChange: number;
        profitChange: number;
        transactionsChange: number;
    };
    topProducts: any[];
    topCustomers: any[];
    recentRecommendations: RecommendationResponseDto[];
    alerts: any[];
}
