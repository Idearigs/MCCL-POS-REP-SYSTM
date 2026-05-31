-- Create Financial Intelligence Enums
CREATE TYPE "FinancialAnalysisType" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM');
CREATE TYPE "RecommendationCategory" AS ENUM ('SALES_OPTIMIZATION', 'INVENTORY_MANAGEMENT', 'CUSTOMER_RETENTION', 'COST_REDUCTION', 'PRICING_STRATEGY', 'MARKETING', 'OPERATIONS', 'STAFF_MANAGEMENT', 'CASH_FLOW', 'GENERAL');
CREATE TYPE "RecommendationPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "RecommendationStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'IMPLEMENTED', 'DISMISSED');
CREATE TYPE "FinancialReportType" AS ENUM ('SALES_SUMMARY', 'PROFIT_LOSS', 'CASH_FLOW', 'INVENTORY_VALUATION', 'CUSTOMER_ANALYSIS', 'PRODUCT_PERFORMANCE', 'CUSTOM');

-- Create Financial Analyses Table
CREATE TABLE "financial_analyses" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "analysisType" "FinancialAnalysisType" NOT NULL,
    "reportPeriod" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "totalRevenue" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalCost" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalProfit" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "profitMargin" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalTransactions" INTEGER NOT NULL DEFAULT 0,
    "averageTransaction" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "topProducts" JSONB,
    "topCustomers" JSONB,
    "salesTrends" JSONB,
    "aiInsights" TEXT,
    "aiRecommendations" TEXT,
    "improvementAreas" JSONB,
    "warnings" JSONB,
    "opportunities" JSONB,
    "metadata" JSONB,
    "generatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_analyses_pkey" PRIMARY KEY ("id")
);

-- Create AI Recommendations Table
CREATE TABLE "ai_recommendations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "analysisId" TEXT,
    "category" "RecommendationCategory" NOT NULL,
    "priority" "RecommendationPriority" NOT NULL DEFAULT 'MEDIUM',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "reasoning" TEXT,
    "expectedImpact" TEXT,
    "actionItems" JSONB,
    "metrics" JSONB,
    "confidence" DECIMAL(65,30),
    "status" "RecommendationStatus" NOT NULL DEFAULT 'PENDING',
    "implementedDate" TIMESTAMP(3),
    "implementedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_recommendations_pkey" PRIMARY KEY ("id")
);

-- Create Financial Reports Table
CREATE TABLE "financial_reports" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "reportType" "FinancialReportType" NOT NULL,
    "reportName" TEXT NOT NULL,
    "reportPeriod" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "summary" JSONB,
    "charts" JSONB,
    "tables" JSONB,
    "pdfUrl" TEXT,
    "excelUrl" TEXT,
    "generatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_reports_pkey" PRIMARY KEY ("id")
);

-- Create Indexes for financial_analyses
CREATE INDEX "financial_analyses_tenantId_reportPeriod_idx" ON "financial_analyses"("tenantId", "reportPeriod");
CREATE INDEX "financial_analyses_tenantId_analysisType_idx" ON "financial_analyses"("tenantId", "analysisType");

-- Create Indexes for ai_recommendations
CREATE INDEX "ai_recommendations_tenantId_status_idx" ON "ai_recommendations"("tenantId", "status");
CREATE INDEX "ai_recommendations_tenantId_category_idx" ON "ai_recommendations"("tenantId", "category");
CREATE INDEX "ai_recommendations_tenantId_priority_idx" ON "ai_recommendations"("tenantId", "priority");

-- Create Indexes for financial_reports
CREATE INDEX "financial_reports_tenantId_reportType_idx" ON "financial_reports"("tenantId", "reportType");
CREATE INDEX "financial_reports_tenantId_reportPeriod_idx" ON "financial_reports"("tenantId", "reportPeriod");

-- Add Foreign Keys
ALTER TABLE "financial_analyses" ADD CONSTRAINT "financial_analyses_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "financial_analyses" ADD CONSTRAINT "financial_analyses_generatedBy_fkey" FOREIGN KEY ("generatedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ai_recommendations" ADD CONSTRAINT "ai_recommendations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_recommendations" ADD CONSTRAINT "ai_recommendations_implementedBy_fkey" FOREIGN KEY ("implementedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "financial_reports" ADD CONSTRAINT "financial_reports_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "financial_reports" ADD CONSTRAINT "financial_reports_generatedBy_fkey" FOREIGN KEY ("generatedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add Comments
COMMENT ON TABLE "financial_analyses" IS 'Stores AI-powered financial analysis results with insights and recommendations';
COMMENT ON TABLE "ai_recommendations" IS 'Stores AI-generated business recommendations with priority and implementation tracking';
COMMENT ON TABLE "financial_reports" IS 'Stores generated financial reports with charts and export URLs';
