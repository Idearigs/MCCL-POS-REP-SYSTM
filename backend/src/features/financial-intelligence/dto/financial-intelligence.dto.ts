import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsDateString,
  IsNumber,
  IsArray,
  IsBoolean,
} from 'class-validator';

export enum FinancialAnalysisType {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY',
  CUSTOM = 'CUSTOM',
}

export enum RecommendationCategory {
  SALES_OPTIMIZATION = 'SALES_OPTIMIZATION',
  INVENTORY_MANAGEMENT = 'INVENTORY_MANAGEMENT',
  CUSTOMER_RETENTION = 'CUSTOMER_RETENTION',
  COST_REDUCTION = 'COST_REDUCTION',
  PRICING_STRATEGY = 'PRICING_STRATEGY',
  MARKETING = 'MARKETING',
  OPERATIONS = 'OPERATIONS',
  STAFF_MANAGEMENT = 'STAFF_MANAGEMENT',
  CASH_FLOW = 'CASH_FLOW',
  GENERAL = 'GENERAL',
}

export enum RecommendationPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum RecommendationStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  IMPLEMENTED = 'IMPLEMENTED',
  DISMISSED = 'DISMISSED',
}

export enum FinancialReportType {
  SALES_SUMMARY = 'SALES_SUMMARY',
  PROFIT_LOSS = 'PROFIT_LOSS',
  CASH_FLOW = 'CASH_FLOW',
  INVENTORY_VALUATION = 'INVENTORY_VALUATION',
  CUSTOMER_ANALYSIS = 'CUSTOMER_ANALYSIS',
  PRODUCT_PERFORMANCE = 'PRODUCT_PERFORMANCE',
  CUSTOM = 'CUSTOM',
}

// Generate Analysis DTO
export class GenerateAnalysisDto {
  @ApiProperty({ enum: FinancialAnalysisType })
  @IsEnum(FinancialAnalysisType)
  analysisType: FinancialAnalysisType;

  @ApiProperty({ description: 'Start date for analysis period' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'End date for analysis period' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({
    description: 'Whether to use AI for insights generation',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  useAI?: boolean;
}

// Financial Analysis Response DTO
export class FinancialAnalysisResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  analysisType: FinancialAnalysisType;

  @ApiProperty()
  reportPeriod: string;

  @ApiProperty()
  startDate: Date;

  @ApiProperty()
  endDate: Date;

  @ApiProperty()
  totalRevenue: number;

  @ApiProperty()
  totalCost: number;

  @ApiProperty()
  totalProfit: number;

  @ApiProperty()
  profitMargin: number;

  @ApiProperty()
  totalTransactions: number;

  @ApiProperty()
  averageTransaction: number;

  @ApiPropertyOptional()
  topProducts?: any[];

  @ApiPropertyOptional()
  topCustomers?: any[];

  @ApiPropertyOptional()
  salesTrends?: any;

  @ApiPropertyOptional()
  aiInsights?: string;

  @ApiPropertyOptional()
  aiRecommendations?: string;

  @ApiPropertyOptional()
  improvementAreas?: any[];

  @ApiPropertyOptional()
  warnings?: any[];

  @ApiPropertyOptional()
  opportunities?: any[];

  @ApiProperty()
  createdAt: Date;
}

// Recommendation Response DTO
export class RecommendationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: RecommendationCategory })
  category: RecommendationCategory;

  @ApiProperty({ enum: RecommendationPriority })
  priority: RecommendationPriority;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiPropertyOptional()
  reasoning?: string;

  @ApiPropertyOptional()
  expectedImpact?: string;

  @ApiPropertyOptional()
  actionItems?: string[];

  @ApiPropertyOptional()
  confidence?: number;

  @ApiProperty({ enum: RecommendationStatus })
  status: RecommendationStatus;

  @ApiProperty()
  createdAt: Date;
}

// Update Recommendation Status DTO
export class UpdateRecommendationDto {
  @ApiProperty({ enum: RecommendationStatus })
  @IsEnum(RecommendationStatus)
  status: RecommendationStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

// Financial Report Response DTO
export class FinancialReportResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: FinancialReportType })
  reportType: FinancialReportType;

  @ApiProperty()
  reportName: string;

  @ApiProperty()
  reportPeriod: string;

  @ApiProperty()
  startDate: Date;

  @ApiProperty()
  endDate: Date;

  @ApiPropertyOptional()
  summary?: any;

  @ApiPropertyOptional()
  charts?: any;

  @ApiPropertyOptional()
  tables?: any;

  @ApiPropertyOptional()
  pdfUrl?: string;

  @ApiPropertyOptional()
  excelUrl?: string;

  @ApiProperty()
  createdAt: Date;
}

// Dashboard Summary DTO
export class DashboardSummaryDto {
  @ApiProperty()
  currentPeriod: {
    revenue: number;
    profit: number;
    profitMargin: number;
    transactions: number;
    averageTransaction: number;
  };

  @ApiProperty()
  previousPeriod: {
    revenue: number;
    profit: number;
    profitMargin: number;
    transactions: number;
    averageTransaction: number;
  };

  @ApiProperty()
  changes: {
    revenueChange: number;
    profitChange: number;
    transactionsChange: number;
  };

  @ApiProperty()
  topProducts: any[];

  @ApiProperty()
  topCustomers: any[];

  @ApiProperty()
  recentRecommendations: RecommendationResponseDto[];

  @ApiProperty()
  alerts: any[];
}
