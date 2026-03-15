import { apiClient } from './apiClient';

export interface FinancialAnalysis {
  id: string;
  analysisType: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'CUSTOM';
  reportPeriod: string;
  startDate: string;
  endDate: string;
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
  createdAt: string;
}

export interface Recommendation {
  id: string;
  category: 'SALES_OPTIMIZATION' | 'INVENTORY_MANAGEMENT' | 'CUSTOMER_RETENTION' | 'COST_REDUCTION' | 'PRICING_STRATEGY' | 'MARKETING' | 'OPERATIONS' | 'STAFF_MANAGEMENT' | 'CASH_FLOW' | 'GENERAL';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  reasoning?: string;
  expectedImpact?: string;
  actionItems?: string[];
  confidence?: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'IMPLEMENTED' | 'DISMISSED';
  createdAt: string;
}

export interface DashboardSummary {
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
  recentRecommendations: Recommendation[];
  alerts: any[];
}

export interface GenerateAnalysisRequest {
  analysisType: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'CUSTOM';
  startDate: string;
  endDate: string;
  useAI?: boolean;
}

class FinancialIntelligenceService {
  private readonly baseUrl = '/financial-intelligence';

  /**
   * Generate new financial analysis
   */
  async generateAnalysis(data: GenerateAnalysisRequest): Promise<FinancialAnalysis> {
    try {
      return await apiClient.post<FinancialAnalysis>(
        `${this.baseUrl}/analyses`,
        data,
        { timeout: 120000 } // 2 minutes for AI processing
      );
    } catch (error) {
      console.error('Failed to generate analysis:', error);
      throw error;
    }
  }

  /**
   * Get dashboard summary
   */
  async getDashboardSummary(): Promise<DashboardSummary> {
    try {
      return await apiClient.get<DashboardSummary>(`${this.baseUrl}/dashboard`);
    } catch (error) {
      console.error('Failed to get dashboard summary:', error);
      throw error;
    }
  }

  /**
   * Get list of analyses
   */
  async getAnalyses(filters?: { analysisType?: string; limit?: number }): Promise<FinancialAnalysis[]> {
    try {
      return await apiClient.get<FinancialAnalysis[]>(`${this.baseUrl}/analyses`, filters);
    } catch (error) {
      console.error('Failed to get analyses:', error);
      throw error;
    }
  }

  /**
   * Get specific analysis by ID
   */
  async getAnalysisById(id: string): Promise<FinancialAnalysis> {
    try {
      return await apiClient.get<FinancialAnalysis>(`${this.baseUrl}/analyses/${id}`);
    } catch (error) {
      console.error(`Failed to get analysis ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get recommendations
   */
  async getRecommendations(filters?: {
    status?: string;
    category?: string;
    priority?: string;
    limit?: number;
  }): Promise<Recommendation[]> {
    try {
      return await apiClient.get<Recommendation[]>(`${this.baseUrl}/recommendations`, filters);
    } catch (error) {
      console.error('Failed to get recommendations:', error);
      throw error;
    }
  }

  /**
   * Update recommendation status
   */
  async updateRecommendation(
    id: string,
    data: { status: Recommendation['status']; notes?: string }
  ): Promise<Recommendation> {
    try {
      return await apiClient.patch<Recommendation>(`${this.baseUrl}/recommendations/${id}`, data);
    } catch (error) {
      console.error(`Failed to update recommendation ${id}:`, error);
      throw error;
    }
  }

  /**
   * Format currency
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  }

  /**
   * Format percentage
   */
  formatPercentage(value: number): string {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  }

  /**
   * Get priority color
   */
  getPriorityColor(priority: Recommendation['priority']): string {
    switch (priority) {
      case 'CRITICAL':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'HIGH':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'MEDIUM':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'LOW':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  }

  /**
   * Get category display name
   */
  getCategoryName(category: Recommendation['category']): string {
    const names: Record<Recommendation['category'], string> = {
      SALES_OPTIMIZATION: 'Sales Optimization',
      INVENTORY_MANAGEMENT: 'Inventory Management',
      CUSTOMER_RETENTION: 'Customer Retention',
      COST_REDUCTION: 'Cost Reduction',
      PRICING_STRATEGY: 'Pricing Strategy',
      MARKETING: 'Marketing',
      OPERATIONS: 'Operations',
      STAFF_MANAGEMENT: 'Staff Management',
      CASH_FLOW: 'Cash Flow',
      GENERAL: 'General',
    };
    return names[category] || category;
  }
}

export const financialIntelligenceService = new FinancialIntelligenceService();
export default financialIntelligenceService;
