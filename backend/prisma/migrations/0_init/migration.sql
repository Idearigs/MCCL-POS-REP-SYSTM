-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."ShiftStatus" AS ENUM ('ACTIVE', 'CLOSED', 'ABANDONED', 'RECONCILED');

-- CreateEnum
CREATE TYPE "public"."ContactType" AS ENUM ('EMAIL', 'PHONE', 'SMS');

-- CreateEnum
CREATE TYPE "public"."CustomerGroup" AS ENUM ('RETAIL', 'WHOLESALE', 'VIP', 'TRADE', 'CORPORATE', 'REGULAR');

-- CreateEnum
CREATE TYPE "public"."EventType" AS ENUM ('REPAIR', 'DELIVERY', 'APPOINTMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."DocumentType" AS ENUM ('CONTRACT', 'RECEIPT', 'INVOICE', 'REPAIR_DOCUMENT', 'APPRAISAL', 'CERTIFICATE', 'WARRANTY', 'INSURANCE', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."InventoryLogType" AS ENUM ('SALE', 'PURCHASE', 'ADJUSTMENT', 'DAMAGE', 'RETURN', 'TRANSFER');

-- CreateEnum
CREATE TYPE "public"."JewelryMaterial" AS ENUM ('GOLD', 'YELLOW_GOLD', 'WHITE_GOLD', 'ROSE_GOLD', 'SILVER', 'PLATINUM', 'DIAMOND', 'PEARL', 'GEMSTONE', 'STAINLESS_STEEL', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."ProductCondition" AS ENUM ('BRAND_NEW', 'USED');

-- CreateEnum
CREATE TYPE "public"."PaymentMethod" AS ENUM ('CASH', 'CARD', 'BANK_TRANSFER', 'CHEQUE', 'DIGITAL_WALLET', 'INSTALLMENT', 'GIFT_CARD');

-- CreateEnum
CREATE TYPE "public"."GiftCardStatus" AS ENUM ('ACTIVE', 'REDEEMED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED');

-- CreateEnum
CREATE TYPE "public"."RepairPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "public"."RepairStatus" AS ENUM ('RECEIVED', 'QUOTED', 'APPROVED', 'IN_PROGRESS', 'COMPLETED', 'READY_FOR_COLLECTION', 'COLLECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."SaleStatus" AS ENUM ('DRAFT', 'COMPLETED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "public"."TenantStatus" AS ENUM ('ACTIVE', 'PAYMENT_DUE', 'PAYMENT_WARNING', 'SUSPENDED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('OWNER', 'MANAGER', 'STAFF', 'READONLY');

-- CreateEnum
CREATE TYPE "public"."StockTakeStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."StockTakeItemStatus" AS ENUM ('VERIFIED', 'MISSING', 'UNEXPECTED', 'DAMAGED');

-- CreateEnum
CREATE TYPE "public"."FloatStatus" AS ENUM ('OPEN', 'CLOSED', 'BALANCED', 'DISCREPANCY');

-- CreateEnum
CREATE TYPE "public"."FloatTransactionType" AS ENUM ('CASH_IN', 'CASH_OUT', 'SALE', 'REFUND', 'EXPENSE');

-- CreateEnum
CREATE TYPE "public"."PettyCashStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."PettyCashCategory" AS ENUM ('OFFICE_SUPPLIES', 'TRANSPORT', 'MEALS', 'UTILITIES', 'MAINTENANCE', 'CLEANING', 'REFRESHMENTS', 'POSTAGE', 'BANKING_FEES', 'MISCELLANEOUS', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."FinancialAnalysisType" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "public"."RecommendationCategory" AS ENUM ('SALES_OPTIMIZATION', 'INVENTORY_MANAGEMENT', 'CUSTOMER_RETENTION', 'COST_REDUCTION', 'PRICING_STRATEGY', 'MARKETING', 'OPERATIONS', 'STAFF_MANAGEMENT', 'CASH_FLOW', 'GENERAL');

-- CreateEnum
CREATE TYPE "public"."RecommendationPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "public"."RecommendationStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'IMPLEMENTED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "public"."FinancialReportType" AS ENUM ('SALES_SUMMARY', 'PROFIT_LOSS', 'CASH_FLOW', 'INVENTORY_VALUATION', 'CUSTOMER_ANALYSIS', 'PRODUCT_PERFORMANCE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "public"."CustomerProfileStatus" AS ENUM ('PENDING_SETUP', 'ACTIVE', 'SUSPENDED', 'MAINTENANCE', 'DEACTIVATED');

-- CreateEnum
CREATE TYPE "public"."SubscriptionPlan" AS ENUM ('STARTER', 'PROFESSIONAL', 'BUSINESS', 'ENTERPRISE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "public"."BillingCycle" AS ENUM ('MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "public"."FeatureStatus" AS ENUM ('STABLE', 'BETA', 'ALPHA', 'DEPRECATED', 'DISABLED');

-- CreateEnum
CREATE TYPE "public"."BugPriority" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "public"."BugStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'TESTING', 'RESOLVED', 'CLOSED', 'WONT_FIX');

-- CreateEnum
CREATE TYPE "public"."FeatureRequestStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'IN_DEVELOPMENT', 'TESTING', 'RELEASED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "public"."TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."RepairAssignmentStatus" AS ENUM ('ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."HrmsEmployeeStatus" AS ENUM ('PROBATION', 'ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "public"."HrmsEmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'ZERO_HOURS', 'CASUAL', 'FIXED_TERM', 'CONTRACTOR', 'APPRENTICE', 'INTERN');

-- CreateEnum
CREATE TYPE "public"."HrmsContractType" AS ENUM ('PERMANENT', 'FIXED_TERM', 'CASUAL', 'AGENCY', 'SELF_EMPLOYED', 'ZERO_HOURS');

-- CreateEnum
CREATE TYPE "public"."HrmsPayFrequency" AS ENUM ('WEEKLY', 'FORTNIGHTLY', 'FOUR_WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "public"."HrmsNiCategory" AS ENUM ('A', 'B', 'C', 'H', 'J', 'M', 'Z');

-- CreateEnum
CREATE TYPE "public"."HrmsGender" AS ENUM ('MALE', 'FEMALE', 'NON_BINARY', 'PREFER_NOT_TO_SAY');

-- CreateEnum
CREATE TYPE "public"."HrmsMaritalStatus" AS ENUM ('SINGLE', 'MARRIED', 'CIVIL_PARTNERSHIP', 'DIVORCED', 'WIDOWED', 'SEPARATED', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."HrmsTitleType" AS ENUM ('MR', 'MRS', 'MS', 'MISS', 'DR', 'PROF', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."HrmsStarterDeclaration" AS ENUM ('A', 'B', 'C');

-- CreateEnum
CREATE TYPE "public"."HrmsLeaveType" AS ENUM ('ANNUAL', 'SICK', 'MATERNITY', 'PATERNITY', 'SHARED_PARENTAL', 'COMPASSIONATE', 'JURY_DUTY', 'STUDY', 'UNPAID', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."HrmsLeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."HrmsDocumentType" AS ENUM ('P45', 'P60', 'P11D', 'CONTRACT', 'RIGHT_TO_WORK', 'DBS_CHECK', 'OFFER_LETTER', 'DISCIPLINARY', 'APPRAISAL', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."HrmsPayrollStatus" AS ENUM ('DRAFT', 'PROCESSING', 'COMPLETED', 'LOCKED');

-- CreateEnum
CREATE TYPE "public"."HrmsPayslipStatus" AS ENUM ('DRAFT', 'FINAL');

-- CreateEnum
CREATE TYPE "public"."HrmsTimesheetStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."HrmsEntryType" AS ENUM ('REGULAR', 'OVERTIME', 'SICK', 'ANNUAL_LEAVE', 'BANK_HOLIDAY', 'TRAINING', 'UNPAID', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."HrmsP11dBenefitType" AS ENUM ('COMPANY_CAR', 'MEDICAL_INSURANCE', 'LIFE_INSURANCE', 'GYM_MEMBERSHIP', 'INTEREST_FREE_LOAN', 'VOUCHERS', 'ACCOMMODATION', 'TRAVEL_SUBSISTENCE', 'ENTERTAINMENT', 'OTHER');

-- CreateTable
CREATE TABLE "public"."audit_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "oldData" JSONB,
    "newData" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."calendar_events" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "eventType" "public"."EventType" NOT NULL DEFAULT 'APPOINTMENT',
    "isAllDay" BOOLEAN NOT NULL DEFAULT false,
    "startTime" TEXT,
    "endTime" TEXT,
    "location" TEXT,
    "customerId" TEXT,
    "repairId" TEXT,
    "reminderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."categories" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "parentId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."customers" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "postalCode" TEXT,
    "country" TEXT,
    "birthDate" TIMESTAMP(3),
    "anniversaryDate" TIMESTAMP(3),
    "notes" TEXT,
    "totalSpent" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "visitCount" INTEGER NOT NULL DEFAULT 0,
    "loyaltyPoints" INTEGER NOT NULL DEFAULT 0,
    "preferredContact" "public"."ContactType" NOT NULL DEFAULT 'EMAIL',
    "marketingEmail" BOOLEAN NOT NULL DEFAULT false,
    "marketingSms" BOOLEAN NOT NULL DEFAULT false,
    "marketingPhone" BOOLEAN NOT NULL DEFAULT false,
    "dataProcessingConsent" BOOLEAN NOT NULL DEFAULT false,
    "consentDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "redFlag" BOOLEAN NOT NULL DEFAULT false,
    "redFlagReason" TEXT,
    "isMonthlyPayer" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "creditLimit" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "customerGroup" "public"."CustomerGroup" DEFAULT 'RETAIL',
    "lastPurchaseDate" TIMESTAMP(3),
    "outstandingBalance" DECIMAL(65,30) NOT NULL DEFAULT 0,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."documents" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT,
    "uploadedBy" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "documentType" "public"."DocumentType" NOT NULL,
    "driveFileId" TEXT,
    "driveViewLink" TEXT,
    "notes" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."inventory_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "type" "public"."InventoryLogType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "previousQty" INTEGER NOT NULL,
    "newQty" INTEGER NOT NULL,
    "reason" TEXT,
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."payments" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "method" "public"."PaymentMethod" NOT NULL,
    "status" "public"."PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "transactionId" TEXT,
    "processorData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."product_images" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "driveFileId" TEXT,
    "driveViewLink" TEXT,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "isMain" BOOLEAN NOT NULL DEFAULT false,
    "alt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."products" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sku" TEXT NOT NULL,
    "barcode" TEXT,
    "categoryId" TEXT,
    "supplierId" TEXT,
    "costPrice" DECIMAL(65,30),
    "sellingPrice" DECIMAL(65,30) NOT NULL,
    "discountPrice" DECIMAL(65,30),
    "stockQuantity" INTEGER NOT NULL DEFAULT 0,
    "minStockLevel" INTEGER NOT NULL DEFAULT 1,
    "maxStockLevel" INTEGER,
    "material" "public"."JewelryMaterial",
    "weight" DECIMAL(65,30),
    "purity" TEXT,
    "gemstone" TEXT,
    "certification" TEXT,
    "color" TEXT,
    "size" TEXT,
    "location" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDamaged" BOOLEAN NOT NULL DEFAULT false,
    "damageNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "supplierName" TEXT,
    "qrCode" TEXT,
    "taxRate" DECIMAL(65,30) DEFAULT 0,
    "condition" "public"."ProductCondition" DEFAULT 'BRAND_NEW',
    "rfidTag" TEXT,
    "materials" TEXT,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."repair_photos" (
    "id" TEXT NOT NULL,
    "repairId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "driveFileId" TEXT,
    "driveViewLink" TEXT,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "description" TEXT,
    "stage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "repair_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."repair_status_history" (
    "id" TEXT NOT NULL,
    "repairId" TEXT NOT NULL,
    "oldStatus" "public"."RepairStatus",
    "newStatus" "public"."RepairStatus" NOT NULL,
    "notes" TEXT,
    "changedBy" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "repair_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."repairs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT,
    "createdBy" TEXT NOT NULL,
    "repairNumber" TEXT NOT NULL,
    "itemDescription" TEXT NOT NULL,
    "issueDescription" TEXT NOT NULL,
    "estimatedCost" DECIMAL(65,30),
    "finalCost" DECIMAL(65,30),
    "receivedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estimatedDueDate" TIMESTAMP(3),
    "completedDate" TIMESTAMP(3),
    "collectedDate" TIMESTAMP(3),
    "status" "public"."RepairStatus" NOT NULL DEFAULT 'RECEIVED',
    "priority" "public"."RepairPriority" NOT NULL DEFAULT 'NORMAL',
    "customerNotes" TEXT,
    "internalNotes" TEXT,
    "isInsuranceClaim" BOOLEAN NOT NULL DEFAULT false,
    "insuranceNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "rmaId" TEXT,
    "tagId" TEXT,

    CONSTRAINT "repairs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."repair_tags" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT 'gray',
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "repair_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sale_items" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(65,30) NOT NULL,
    "discount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalPrice" DECIMAL(65,30) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "sale_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sales" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT,
    "createdBy" TEXT NOT NULL,
    "saleNumber" TEXT NOT NULL,
    "subtotal" DECIMAL(65,30) NOT NULL,
    "taxAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(65,30) NOT NULL,
    "paymentMethod" "public"."PaymentMethod" NOT NULL,
    "paymentStatus" "public"."PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paidAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "changeAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "receiptNumber" TEXT,
    "clientSaleId" TEXT,
    "status" "public"."SaleStatus" NOT NULL DEFAULT 'COMPLETED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "balanceDue" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "refundedAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "shiftId" TEXT,

    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."shifts" (
    "id" TEXT NOT NULL,
    "shiftNumber" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(3),
    "duration" INTEGER,
    "openingFloat" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "closingFloat" DECIMAL(65,30),
    "expectedFloat" DECIMAL(65,30),
    "variance" DECIMAL(65,30),
    "status" "public"."ShiftStatus" NOT NULL DEFAULT 'ACTIVE',
    "deviceInfo" TEXT,
    "ipAddress" TEXT,
    "location" TEXT,
    "openingNotes" TEXT,
    "closingNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."suppliers" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactPerson" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "website" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "subdomain" TEXT NOT NULL,
    "settings" JSONB,
    "subscriptionPlan" TEXT NOT NULL DEFAULT 'basic',
    "status" "public"."TenantStatus" NOT NULL DEFAULT 'ACTIVE',
    "suspendedAt" TIMESTAMP(3),
    "suspendedReason" TEXT,
    "billingDueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."outlets" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "address" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outlets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "public"."UserRole" NOT NULL DEFAULT 'STAFF',
    "permissions" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLogin" TIMESTAMP(3),
    "refreshToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."stock_take_sessions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sessionName" TEXT NOT NULL,
    "location" TEXT,
    "remarks" TEXT,
    "status" "public"."StockTakeStatus" NOT NULL DEFAULT 'DRAFT',
    "createdBy" TEXT NOT NULL,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_take_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."stock_take_items" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "productId" TEXT,
    "scannedCode" TEXT NOT NULL,
    "productName" TEXT,
    "productSku" TEXT,
    "expectedQuantity" INTEGER,
    "scannedQuantity" INTEGER NOT NULL DEFAULT 1,
    "systemQuantity" INTEGER,
    "variance" INTEGER,
    "status" "public"."StockTakeItemStatus" NOT NULL,
    "notes" TEXT,
    "scannedBy" TEXT NOT NULL,
    "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_take_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."float_sessions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "floatNumber" TEXT NOT NULL,
    "registerName" TEXT,
    "openingBalance" DECIMAL(65,30) NOT NULL,
    "expectedClosing" DECIMAL(65,30),
    "actualClosing" DECIMAL(65,30),
    "difference" DECIMAL(65,30) DEFAULT 0,
    "totalSales" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalCashIn" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalCashOut" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalRefunds" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "status" "public"."FloatStatus" NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "closingNotes" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "float_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."float_transactions" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "public"."FloatTransactionType" NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "reason" TEXT NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "float_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."petty_cash_accounts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "registerName" TEXT,
    "location" TEXT,
    "openingBalance" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "currentBalance" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "monthlyBudget" DECIMAL(65,30),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "petty_cash_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."petty_cash_transactions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "transactionNumber" TEXT NOT NULL,
    "category" "public"."PettyCashCategory" NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "description" TEXT NOT NULL,
    "vendor" TEXT,
    "receiptNumber" TEXT,
    "receiptImage" TEXT,
    "status" "public"."PettyCashStatus" NOT NULL DEFAULT 'PENDING',
    "requestedBy" TEXT NOT NULL,
    "approvedBy" TEXT,
    "rejectedBy" TEXT,
    "approvalDate" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "notes" TEXT,
    "transactionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "petty_cash_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."financial_analyses" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "analysisType" "public"."FinancialAnalysisType" NOT NULL,
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

-- CreateTable
CREATE TABLE "public"."ai_recommendations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "analysisId" TEXT,
    "category" "public"."RecommendationCategory" NOT NULL,
    "priority" "public"."RecommendationPriority" NOT NULL DEFAULT 'MEDIUM',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "reasoning" TEXT,
    "expectedImpact" TEXT,
    "actionItems" JSONB,
    "metrics" JSONB,
    "confidence" DECIMAL(65,30),
    "status" "public"."RecommendationStatus" NOT NULL DEFAULT 'PENDING',
    "implementedDate" TIMESTAMP(3),
    "implementedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."financial_reports" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "reportType" "public"."FinancialReportType" NOT NULL,
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

-- CreateTable
CREATE TABLE "public"."mf_customer_profiles" (
    "id" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "businessEmail" TEXT NOT NULL,
    "businessPhone" TEXT,
    "businessAddress" TEXT,
    "city" TEXT,
    "country" TEXT,
    "postalCode" TEXT,
    "subdomain" TEXT NOT NULL,
    "customDomain" TEXT,
    "databaseName" TEXT NOT NULL,
    "databaseHost" TEXT,
    "databaseConnectionString" TEXT,
    "status" "public"."CustomerProfileStatus" NOT NULL DEFAULT 'PENDING_SETUP',
    "setupCompletedAt" TIMESTAMP(3),
    "logoUrl" TEXT,
    "primaryColor" TEXT DEFAULT '#3B82F6',
    "secondaryColor" TEXT DEFAULT '#6366F1',
    "contactFirstName" TEXT NOT NULL,
    "contactLastName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT,
    "internalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mf_customer_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."mf_customer_users" (
    "id" TEXT NOT NULL,
    "customerProfileId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "passwordSalt" TEXT,
    "tempPassword" TEXT,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "role" "public"."UserRole" NOT NULL DEFAULT 'STAFF',
    "permissions" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "loginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mf_customer_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."mf_features" (
    "id" TEXT NOT NULL,
    "featureKey" TEXT NOT NULL,
    "featureName" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "currentVersion" TEXT NOT NULL DEFAULT '1.0.0',
    "betaVersion" TEXT,
    "status" "public"."FeatureStatus" NOT NULL DEFAULT 'STABLE',
    "isIncludedInBase" BOOLEAN NOT NULL DEFAULT true,
    "additionalCost" DECIMAL(65,30) DEFAULT 0,
    "dependsOn" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "isBeta" BOOLEAN NOT NULL DEFAULT false,
    "requiresSetup" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mf_features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."mf_feature_versions" (
    "id" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "versionType" "public"."FeatureStatus" NOT NULL,
    "releaseNotes" TEXT,
    "changelog" JSONB,
    "deployedAt" TIMESTAMP(3),
    "deployedBy" TEXT,
    "canRollback" BOOLEAN NOT NULL DEFAULT true,
    "previousVersionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mf_feature_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."mf_customer_features" (
    "id" TEXT NOT NULL,
    "customerProfileId" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "version" TEXT,
    "config" JSONB,
    "lastUsedAt" TIMESTAMP(3),
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "enabledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disabledAt" TIMESTAMP(3),

    CONSTRAINT "mf_customer_features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."mf_subscriptions" (
    "id" TEXT NOT NULL,
    "customerProfileId" TEXT NOT NULL,
    "plan" "public"."SubscriptionPlan" NOT NULL DEFAULT 'STARTER',
    "billingCycle" "public"."BillingCycle" NOT NULL DEFAULT 'MONTHLY',
    "basePrice" DECIMAL(65,30) NOT NULL,
    "perUserPrice" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "includedUsers" INTEGER NOT NULL DEFAULT 1,
    "maxUsers" INTEGER,
    "currentUsers" INTEGER NOT NULL DEFAULT 1,
    "discountPercent" DECIMAL(65,30) DEFAULT 0,
    "discountReason" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentPeriodStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "nextBillingDate" TIMESTAMP(3) NOT NULL,
    "isOnTrial" BOOLEAN NOT NULL DEFAULT false,
    "trialEndsAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "paymentMethod" TEXT,
    "lastPaymentAt" TIMESTAMP(3),
    "lastPaymentAmount" DECIMAL(65,30),
    "lsSubscriptionId" TEXT,
    "lsCustomerId" TEXT,
    "lsVariantId" TEXT,
    "lsOrderId" TEXT,
    "lsStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mf_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."mf_invoices" (
    "id" TEXT NOT NULL,
    "customerProfileId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "invoiceNumber" TEXT NOT NULL,
    "subtotal" DECIMAL(65,30) NOT NULL,
    "discount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "tax" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "total" DECIMAL(65,30) NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "paymentMethod" TEXT,
    "transactionId" TEXT,
    "pdfUrl" TEXT,
    "lineItems" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mf_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."mf_bug_reports" (
    "id" TEXT NOT NULL,
    "customerProfileId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" "public"."BugPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "public"."BugStatus" NOT NULL DEFAULT 'OPEN',
    "featureKey" TEXT,
    "affectedVersion" TEXT,
    "browser" TEXT,
    "os" TEXT,
    "deviceType" TEXT,
    "stepsToReproduce" TEXT,
    "expectedBehavior" TEXT,
    "actualBehavior" TEXT,
    "screenshots" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "errorLogs" TEXT,
    "assignedTo" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolution" TEXT,
    "fixedInVersion" TEXT,
    "errorStackTrace" TEXT,
    "userAgent" TEXT,
    "pageUrl" TEXT,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mf_bug_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."mf_feature_requests" (
    "id" TEXT NOT NULL,
    "customerProfileId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "public"."FeatureRequestStatus" NOT NULL DEFAULT 'SUBMITTED',
    "priority" "public"."BugPriority" NOT NULL DEFAULT 'MEDIUM',
    "votes" INTEGER NOT NULL DEFAULT 0,
    "votedBy" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "targetVersion" TEXT,
    "targetFeatureKey" TEXT,
    "assignedTo" TEXT,
    "estimatedEffort" TEXT,
    "implementedAt" TIMESTAMP(3),
    "implementedInVersion" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mf_feature_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."mf_activity_logs" (
    "id" TEXT NOT NULL,
    "customerProfileId" TEXT,
    "action" TEXT NOT NULL,
    "description" TEXT,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT,
    "actorEmail" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mf_activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."mf_admins" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "permissions" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mf_admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."mf_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mf_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tasks" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" "public"."TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "public"."TaskStatus" NOT NULL DEFAULT 'TODO',
    "createdBy" TEXT NOT NULL,
    "assignedTo" TEXT[],
    "dueDate" TIMESTAMP(3),
    "startDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "attachments" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."task_comments" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."task_activities" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."external_repairers" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "businessName" TEXT,
    "specialization" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "passwordHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "totalRepairs" INTEGER NOT NULL DEFAULT 0,
    "completedRepairs" INTEGER NOT NULL DEFAULT 0,
    "averageRating" DOUBLE PRECISION,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_repairers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."repair_assignments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "repairId" TEXT NOT NULL,
    "repairerId" TEXT NOT NULL,
    "assignedBy" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedCompletionDate" TIMESTAMP(3),
    "status" "public"."RepairAssignmentStatus" NOT NULL DEFAULT 'ASSIGNED',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "assignmentNotes" TEXT,
    "completionNotes" TEXT,

    CONSTRAINT "repair_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."repair_status_updates" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "repairId" TEXT NOT NULL,
    "repairerId" TEXT,
    "userId" TEXT,
    "previousStatus" TEXT NOT NULL,
    "newStatus" TEXT NOT NULL,
    "notes" TEXT,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "repair_status_updates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."hrms_departments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "managerId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hrms_departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."hrms_positions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "department" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hrms_positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."hrms_employees" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeNumber" TEXT NOT NULL,
    "title" "public"."HrmsTitleType",
    "firstName" TEXT NOT NULL,
    "middleName" TEXT,
    "lastName" TEXT NOT NULL,
    "preferredName" TEXT,
    "gender" "public"."HrmsGender",
    "dateOfBirth" TIMESTAMP(3),
    "maritalStatus" "public"."HrmsMaritalStatus",
    "nationality" TEXT,
    "ethnicity" TEXT,
    "personalEmail" TEXT,
    "workEmail" TEXT,
    "personalPhone" TEXT,
    "workPhone" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "county" TEXT,
    "postcode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'GB',
    "departmentId" TEXT,
    "positionId" TEXT,
    "managerId" TEXT,
    "jobTitle" TEXT,
    "status" "public"."HrmsEmployeeStatus" NOT NULL DEFAULT 'PROBATION',
    "employmentType" "public"."HrmsEmploymentType" NOT NULL DEFAULT 'FULL_TIME',
    "contractType" "public"."HrmsContractType" NOT NULL DEFAULT 'PERMANENT',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "probationEndDate" TIMESTAMP(3),
    "noticePeriodDays" INTEGER,
    "niNumber" TEXT,
    "taxCode" TEXT DEFAULT '1257L',
    "niCategory" "public"."HrmsNiCategory" NOT NULL DEFAULT 'A',
    "payFrequency" "public"."HrmsPayFrequency" NOT NULL DEFAULT 'MONTHLY',
    "salary" DECIMAL(10,2),
    "hourlyRate" DECIMAL(10,4),
    "contractedHours" DECIMAL(5,2),
    "bankAccountName" TEXT,
    "bankSortCode" TEXT,
    "bankAccountNo" TEXT,
    "bankName" TEXT,
    "starterDeclaration" "public"."HrmsStarterDeclaration",
    "p45Received" BOOLEAN NOT NULL DEFAULT false,
    "pensionEligible" BOOLEAN NOT NULL DEFAULT false,
    "pensionEnrolled" BOOLEAN NOT NULL DEFAULT false,
    "pensionOptOut" BOOLEAN NOT NULL DEFAULT false,
    "pensionOptOutDate" TIMESTAMP(3),
    "employerPensionPct" DECIMAL(5,2) DEFAULT 3.00,
    "employeePensionPct" DECIMAL(5,2) DEFAULT 5.00,
    "annualLeaveEntitlement" DECIMAL(5,2) NOT NULL DEFAULT 28.00,
    "holidayYearStart" TIMESTAMP(3),
    "studentLoanPlan" TEXT,
    "rightToWorkChecked" BOOLEAN NOT NULL DEFAULT false,
    "rightToWorkExpiry" TIMESTAMP(3),
    "emergencyName" TEXT,
    "emergencyPhone" TEXT,
    "emergencyRelation" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hrms_employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."hrms_leave_requests" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "leaveType" "public"."HrmsLeaveType" NOT NULL,
    "status" "public"."HrmsLeaveStatus" NOT NULL DEFAULT 'PENDING',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "days" DECIMAL(5,2) NOT NULL,
    "notes" TEXT,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hrms_leave_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."hrms_employee_documents" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" "public"."HrmsDocumentType" NOT NULL DEFAULT 'OTHER',
    "fileName" TEXT NOT NULL,
    "filePath" TEXT,
    "driveFileId" TEXT,
    "uploadedBy" TEXT NOT NULL,
    "notes" TEXT,
    "expiryDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hrms_employee_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."hrms_payroll_runs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "payDate" TIMESTAMP(3) NOT NULL,
    "payFrequency" "public"."HrmsPayFrequency" NOT NULL DEFAULT 'MONTHLY',
    "status" "public"."HrmsPayrollStatus" NOT NULL DEFAULT 'DRAFT',
    "employeeCount" INTEGER NOT NULL DEFAULT 0,
    "totalGross" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalTax" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalEmployeeNI" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalEmployerNI" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalEmployeePension" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalEmployerPension" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalNetPay" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdBy" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hrms_payroll_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."hrms_payslips" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "payrollRunId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "employeeNumber" TEXT NOT NULL,
    "employeeName" TEXT NOT NULL,
    "payPeriodStart" TIMESTAMP(3) NOT NULL,
    "payPeriodEnd" TIMESTAMP(3) NOT NULL,
    "payDate" TIMESTAMP(3) NOT NULL,
    "payFrequency" "public"."HrmsPayFrequency" NOT NULL DEFAULT 'MONTHLY',
    "taxCode" TEXT NOT NULL DEFAULT '1257L',
    "niCategory" "public"."HrmsNiCategory" NOT NULL DEFAULT 'A',
    "basicPay" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "overtimePay" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "bonusPay" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "commissionPay" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "sickPay" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "holidayPay" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "otherAdditions" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "grossPay" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "paye" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "employeeNI" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "employerNI" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "employeePension" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "employerPension" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "studentLoanRepayment" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "otherDeductions" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalDeductions" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "netPay" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "pensionEligible" BOOLEAN NOT NULL DEFAULT false,
    "pensionEnrolled" BOOLEAN NOT NULL DEFAULT false,
    "ytdGross" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "ytdTax" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "ytdEmployeeNI" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "status" "public"."HrmsPayslipStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hrms_payslips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."hrms_timesheets" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "weekStartDate" DATE NOT NULL,
    "status" "public"."HrmsTimesheetStatus" NOT NULL DEFAULT 'DRAFT',
    "totalHours" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "regularHours" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "overtimeHours" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "submittedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedReason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hrms_timesheets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."hrms_timesheet_entries" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "timesheetId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "entryDate" DATE NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "breakMinutes" INTEGER NOT NULL DEFAULT 0,
    "hoursWorked" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "entryType" "public"."HrmsEntryType" NOT NULL DEFAULT 'REGULAR',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hrms_timesheet_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."hrms_timesheet_tokens" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "weekStart" DATE NOT NULL,
    "weekEnd" DATE NOT NULL,
    "pinHash" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hrms_timesheet_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."hrms_bank_holidays" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "name" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "region" TEXT NOT NULL DEFAULT 'ENGLAND_WALES',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hrms_bank_holidays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."hrms_p11d_benefits" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "taxYear" TEXT NOT NULL,
    "benefitType" "public"."HrmsP11dBenefitType" NOT NULL DEFAULT 'OTHER',
    "description" TEXT NOT NULL,
    "cashEquivalent" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hrms_p11d_benefits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."gift_cards" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "initialBalance" DECIMAL(10,2) NOT NULL,
    "balance" DECIMAL(10,2) NOT NULL,
    "status" "public"."GiftCardStatus" NOT NULL DEFAULT 'ACTIVE',
    "recipientName" TEXT,
    "recipientEmail" TEXT,
    "purchasedBy" TEXT,
    "expiresAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gift_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."gift_card_transactions" (
    "id" TEXT NOT NULL,
    "giftCardId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "type" TEXT NOT NULL,
    "reference" TEXT,
    "performedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gift_card_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customers_tenantId_createdAt_idx" ON "public"."customers"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "customers_phone_idx" ON "public"."customers"("phone");

-- CreateIndex
CREATE INDEX "repairs_tenantId_createdAt_idx" ON "public"."repairs"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "repairs_customerId_idx" ON "public"."repairs"("customerId");

-- CreateIndex
CREATE INDEX "repairs_status_idx" ON "public"."repairs"("status");

-- CreateIndex
CREATE UNIQUE INDEX "repairs_tenantId_repairNumber_key" ON "public"."repairs"("tenantId", "repairNumber");

-- CreateIndex
CREATE INDEX "sales_tenantId_createdAt_idx" ON "public"."sales"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "sales_customerId_idx" ON "public"."sales"("customerId");

-- CreateIndex
CREATE INDEX "sales_status_idx" ON "public"."sales"("status");

-- CreateIndex
CREATE UNIQUE INDEX "sales_tenantId_saleNumber_key" ON "public"."sales"("tenantId", "saleNumber");

-- CreateIndex
CREATE UNIQUE INDEX "sales_tenantId_receiptNumber_key" ON "public"."sales"("tenantId", "receiptNumber");

-- CreateIndex
CREATE UNIQUE INDEX "sales_tenantId_clientSaleId_key" ON "public"."sales"("tenantId", "clientSaleId");

-- CreateIndex
CREATE INDEX "shifts_userId_startTime_idx" ON "public"."shifts"("userId", "startTime");

-- CreateIndex
CREATE INDEX "shifts_tenantId_startTime_idx" ON "public"."shifts"("tenantId", "startTime");

-- CreateIndex
CREATE INDEX "shifts_status_idx" ON "public"."shifts"("status");

-- CreateIndex
CREATE UNIQUE INDEX "shifts_tenantId_shiftNumber_key" ON "public"."shifts"("tenantId", "shiftNumber");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_domain_key" ON "public"."tenants"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_subdomain_key" ON "public"."tenants"("subdomain");

-- CreateIndex
CREATE INDEX "outlets_tenantId_idx" ON "public"."outlets"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "outlets_tenantId_code_key" ON "public"."outlets"("tenantId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_tenantId_key" ON "public"."users"("email", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "float_sessions_tenantId_floatNumber_key" ON "public"."float_sessions"("tenantId", "floatNumber");

-- CreateIndex
CREATE UNIQUE INDEX "petty_cash_accounts_tenantId_accountNumber_key" ON "public"."petty_cash_accounts"("tenantId", "accountNumber");

-- CreateIndex
CREATE UNIQUE INDEX "petty_cash_transactions_tenantId_transactionNumber_key" ON "public"."petty_cash_transactions"("tenantId", "transactionNumber");

-- CreateIndex
CREATE INDEX "financial_analyses_tenantId_reportPeriod_idx" ON "public"."financial_analyses"("tenantId", "reportPeriod");

-- CreateIndex
CREATE INDEX "financial_analyses_tenantId_analysisType_idx" ON "public"."financial_analyses"("tenantId", "analysisType");

-- CreateIndex
CREATE INDEX "ai_recommendations_tenantId_status_idx" ON "public"."ai_recommendations"("tenantId", "status");

-- CreateIndex
CREATE INDEX "ai_recommendations_tenantId_category_idx" ON "public"."ai_recommendations"("tenantId", "category");

-- CreateIndex
CREATE INDEX "ai_recommendations_tenantId_priority_idx" ON "public"."ai_recommendations"("tenantId", "priority");

-- CreateIndex
CREATE INDEX "financial_reports_tenantId_reportType_idx" ON "public"."financial_reports"("tenantId", "reportType");

-- CreateIndex
CREATE INDEX "financial_reports_tenantId_reportPeriod_idx" ON "public"."financial_reports"("tenantId", "reportPeriod");

-- CreateIndex
CREATE UNIQUE INDEX "mf_customer_profiles_businessEmail_key" ON "public"."mf_customer_profiles"("businessEmail");

-- CreateIndex
CREATE UNIQUE INDEX "mf_customer_profiles_subdomain_key" ON "public"."mf_customer_profiles"("subdomain");

-- CreateIndex
CREATE UNIQUE INDEX "mf_customer_profiles_databaseName_key" ON "public"."mf_customer_profiles"("databaseName");

-- CreateIndex
CREATE INDEX "mf_customer_profiles_subdomain_idx" ON "public"."mf_customer_profiles"("subdomain");

-- CreateIndex
CREATE INDEX "mf_customer_profiles_status_idx" ON "public"."mf_customer_profiles"("status");

-- CreateIndex
CREATE INDEX "mf_customer_profiles_businessEmail_idx" ON "public"."mf_customer_profiles"("businessEmail");

-- CreateIndex
CREATE INDEX "mf_customer_users_customerProfileId_idx" ON "public"."mf_customer_users"("customerProfileId");

-- CreateIndex
CREATE INDEX "mf_customer_users_email_idx" ON "public"."mf_customer_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "mf_customer_users_customerProfileId_email_key" ON "public"."mf_customer_users"("customerProfileId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "mf_features_featureKey_key" ON "public"."mf_features"("featureKey");

-- CreateIndex
CREATE INDEX "mf_features_featureKey_idx" ON "public"."mf_features"("featureKey");

-- CreateIndex
CREATE INDEX "mf_features_status_idx" ON "public"."mf_features"("status");

-- CreateIndex
CREATE INDEX "mf_feature_versions_featureId_idx" ON "public"."mf_feature_versions"("featureId");

-- CreateIndex
CREATE UNIQUE INDEX "mf_feature_versions_featureId_version_key" ON "public"."mf_feature_versions"("featureId", "version");

-- CreateIndex
CREATE INDEX "mf_customer_features_customerProfileId_idx" ON "public"."mf_customer_features"("customerProfileId");

-- CreateIndex
CREATE INDEX "mf_customer_features_featureId_idx" ON "public"."mf_customer_features"("featureId");

-- CreateIndex
CREATE UNIQUE INDEX "mf_customer_features_customerProfileId_featureId_key" ON "public"."mf_customer_features"("customerProfileId", "featureId");

-- CreateIndex
CREATE UNIQUE INDEX "mf_subscriptions_customerProfileId_key" ON "public"."mf_subscriptions"("customerProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "mf_subscriptions_lsSubscriptionId_key" ON "public"."mf_subscriptions"("lsSubscriptionId");

-- CreateIndex
CREATE INDEX "mf_subscriptions_plan_idx" ON "public"."mf_subscriptions"("plan");

-- CreateIndex
CREATE INDEX "mf_subscriptions_nextBillingDate_idx" ON "public"."mf_subscriptions"("nextBillingDate");

-- CreateIndex
CREATE INDEX "mf_subscriptions_lsSubscriptionId_idx" ON "public"."mf_subscriptions"("lsSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "mf_invoices_invoiceNumber_key" ON "public"."mf_invoices"("invoiceNumber");

-- CreateIndex
CREATE INDEX "mf_invoices_customerProfileId_idx" ON "public"."mf_invoices"("customerProfileId");

-- CreateIndex
CREATE INDEX "mf_invoices_status_idx" ON "public"."mf_invoices"("status");

-- CreateIndex
CREATE INDEX "mf_invoices_dueDate_idx" ON "public"."mf_invoices"("dueDate");

-- CreateIndex
CREATE INDEX "mf_bug_reports_customerProfileId_idx" ON "public"."mf_bug_reports"("customerProfileId");

-- CreateIndex
CREATE INDEX "mf_bug_reports_priority_idx" ON "public"."mf_bug_reports"("priority");

-- CreateIndex
CREATE INDEX "mf_bug_reports_status_idx" ON "public"."mf_bug_reports"("status");

-- CreateIndex
CREATE INDEX "mf_bug_reports_featureKey_idx" ON "public"."mf_bug_reports"("featureKey");

-- CreateIndex
CREATE INDEX "mf_feature_requests_customerProfileId_idx" ON "public"."mf_feature_requests"("customerProfileId");

-- CreateIndex
CREATE INDEX "mf_feature_requests_status_idx" ON "public"."mf_feature_requests"("status");

-- CreateIndex
CREATE INDEX "mf_feature_requests_votes_idx" ON "public"."mf_feature_requests"("votes");

-- CreateIndex
CREATE INDEX "mf_activity_logs_customerProfileId_idx" ON "public"."mf_activity_logs"("customerProfileId");

-- CreateIndex
CREATE INDEX "mf_activity_logs_action_idx" ON "public"."mf_activity_logs"("action");

-- CreateIndex
CREATE INDEX "mf_activity_logs_createdAt_idx" ON "public"."mf_activity_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "mf_admins_email_key" ON "public"."mf_admins"("email");

-- CreateIndex
CREATE INDEX "mf_admins_email_idx" ON "public"."mf_admins"("email");

-- CreateIndex
CREATE INDEX "mf_admins_role_idx" ON "public"."mf_admins"("role");

-- CreateIndex
CREATE UNIQUE INDEX "mf_settings_key_key" ON "public"."mf_settings"("key");

-- CreateIndex
CREATE INDEX "mf_settings_key_idx" ON "public"."mf_settings"("key");

-- CreateIndex
CREATE INDEX "tasks_tenantId_idx" ON "public"."tasks"("tenantId");

-- CreateIndex
CREATE INDEX "tasks_createdBy_idx" ON "public"."tasks"("createdBy");

-- CreateIndex
CREATE INDEX "tasks_status_idx" ON "public"."tasks"("status");

-- CreateIndex
CREATE INDEX "tasks_priority_idx" ON "public"."tasks"("priority");

-- CreateIndex
CREATE INDEX "tasks_dueDate_idx" ON "public"."tasks"("dueDate");

-- CreateIndex
CREATE INDEX "task_comments_taskId_idx" ON "public"."task_comments"("taskId");

-- CreateIndex
CREATE INDEX "task_comments_userId_idx" ON "public"."task_comments"("userId");

-- CreateIndex
CREATE INDEX "task_activities_taskId_idx" ON "public"."task_activities"("taskId");

-- CreateIndex
CREATE INDEX "task_activities_userId_idx" ON "public"."task_activities"("userId");

-- CreateIndex
CREATE INDEX "task_activities_action_idx" ON "public"."task_activities"("action");

-- CreateIndex
CREATE INDEX "external_repairers_tenantId_idx" ON "public"."external_repairers"("tenantId");

-- CreateIndex
CREATE INDEX "external_repairers_email_idx" ON "public"."external_repairers"("email");

-- CreateIndex
CREATE INDEX "external_repairers_isActive_idx" ON "public"."external_repairers"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "external_repairers_tenantId_email_key" ON "public"."external_repairers"("tenantId", "email");

-- CreateIndex
CREATE INDEX "repair_assignments_tenantId_idx" ON "public"."repair_assignments"("tenantId");

-- CreateIndex
CREATE INDEX "repair_assignments_repairId_idx" ON "public"."repair_assignments"("repairId");

-- CreateIndex
CREATE INDEX "repair_assignments_repairerId_idx" ON "public"."repair_assignments"("repairerId");

-- CreateIndex
CREATE INDEX "repair_assignments_status_idx" ON "public"."repair_assignments"("status");

-- CreateIndex
CREATE INDEX "repair_status_updates_tenantId_idx" ON "public"."repair_status_updates"("tenantId");

-- CreateIndex
CREATE INDEX "repair_status_updates_repairId_idx" ON "public"."repair_status_updates"("repairId");

-- CreateIndex
CREATE INDEX "repair_status_updates_repairerId_idx" ON "public"."repair_status_updates"("repairerId");

-- CreateIndex
CREATE INDEX "repair_status_updates_userId_idx" ON "public"."repair_status_updates"("userId");

-- CreateIndex
CREATE INDEX "repair_status_updates_createdAt_idx" ON "public"."repair_status_updates"("createdAt");

-- CreateIndex
CREATE INDEX "hrms_departments_tenantId_idx" ON "public"."hrms_departments"("tenantId");

-- CreateIndex
CREATE INDEX "hrms_departments_tenantId_isActive_idx" ON "public"."hrms_departments"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "hrms_departments_tenantId_code_key" ON "public"."hrms_departments"("tenantId", "code");

-- CreateIndex
CREATE INDEX "hrms_positions_tenantId_idx" ON "public"."hrms_positions"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "hrms_positions_tenantId_code_key" ON "public"."hrms_positions"("tenantId", "code");

-- CreateIndex
CREATE INDEX "hrms_employees_tenantId_status_idx" ON "public"."hrms_employees"("tenantId", "status");

-- CreateIndex
CREATE INDEX "hrms_employees_tenantId_departmentId_idx" ON "public"."hrms_employees"("tenantId", "departmentId");

-- CreateIndex
CREATE INDEX "hrms_employees_tenantId_isActive_idx" ON "public"."hrms_employees"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "hrms_employees_tenantId_employeeNumber_key" ON "public"."hrms_employees"("tenantId", "employeeNumber");

-- CreateIndex
CREATE INDEX "hrms_leave_requests_tenantId_employeeId_idx" ON "public"."hrms_leave_requests"("tenantId", "employeeId");

-- CreateIndex
CREATE INDEX "hrms_leave_requests_tenantId_status_idx" ON "public"."hrms_leave_requests"("tenantId", "status");

-- CreateIndex
CREATE INDEX "hrms_leave_requests_tenantId_startDate_idx" ON "public"."hrms_leave_requests"("tenantId", "startDate");

-- CreateIndex
CREATE INDEX "hrms_employee_documents_tenantId_employeeId_idx" ON "public"."hrms_employee_documents"("tenantId", "employeeId");

-- CreateIndex
CREATE INDEX "hrms_employee_documents_tenantId_type_idx" ON "public"."hrms_employee_documents"("tenantId", "type");

-- CreateIndex
CREATE INDEX "hrms_payroll_runs_tenantId_status_idx" ON "public"."hrms_payroll_runs"("tenantId", "status");

-- CreateIndex
CREATE INDEX "hrms_payroll_runs_tenantId_payDate_idx" ON "public"."hrms_payroll_runs"("tenantId", "payDate");

-- CreateIndex
CREATE INDEX "hrms_payslips_tenantId_employeeId_idx" ON "public"."hrms_payslips"("tenantId", "employeeId");

-- CreateIndex
CREATE INDEX "hrms_payslips_tenantId_payrollRunId_idx" ON "public"."hrms_payslips"("tenantId", "payrollRunId");

-- CreateIndex
CREATE INDEX "hrms_payslips_tenantId_payDate_idx" ON "public"."hrms_payslips"("tenantId", "payDate");

-- CreateIndex
CREATE UNIQUE INDEX "hrms_payslips_payrollRunId_employeeId_key" ON "public"."hrms_payslips"("payrollRunId", "employeeId");

-- CreateIndex
CREATE INDEX "hrms_timesheets_tenantId_weekStartDate_idx" ON "public"."hrms_timesheets"("tenantId", "weekStartDate");

-- CreateIndex
CREATE INDEX "hrms_timesheets_tenantId_employeeId_idx" ON "public"."hrms_timesheets"("tenantId", "employeeId");

-- CreateIndex
CREATE INDEX "hrms_timesheets_tenantId_status_idx" ON "public"."hrms_timesheets"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "hrms_timesheets_tenantId_employeeId_weekStartDate_key" ON "public"."hrms_timesheets"("tenantId", "employeeId", "weekStartDate");

-- CreateIndex
CREATE INDEX "hrms_timesheet_entries_tenantId_employeeId_entryDate_idx" ON "public"."hrms_timesheet_entries"("tenantId", "employeeId", "entryDate");

-- CreateIndex
CREATE UNIQUE INDEX "hrms_timesheet_entries_timesheetId_entryDate_key" ON "public"."hrms_timesheet_entries"("timesheetId", "entryDate");

-- CreateIndex
CREATE UNIQUE INDEX "hrms_timesheet_tokens_token_key" ON "public"."hrms_timesheet_tokens"("token");

-- CreateIndex
CREATE INDEX "hrms_timesheet_tokens_tenantId_employeeId_idx" ON "public"."hrms_timesheet_tokens"("tenantId", "employeeId");

-- CreateIndex
CREATE INDEX "hrms_timesheet_tokens_token_idx" ON "public"."hrms_timesheet_tokens"("token");

-- CreateIndex
CREATE INDEX "hrms_bank_holidays_date_idx" ON "public"."hrms_bank_holidays"("date");

-- CreateIndex
CREATE INDEX "hrms_bank_holidays_tenantId_date_idx" ON "public"."hrms_bank_holidays"("tenantId", "date");

-- CreateIndex
CREATE INDEX "hrms_p11d_benefits_tenantId_taxYear_idx" ON "public"."hrms_p11d_benefits"("tenantId", "taxYear");

-- CreateIndex
CREATE INDEX "hrms_p11d_benefits_tenantId_employeeId_taxYear_idx" ON "public"."hrms_p11d_benefits"("tenantId", "employeeId", "taxYear");

-- CreateIndex
CREATE UNIQUE INDEX "gift_cards_code_key" ON "public"."gift_cards"("code");

-- CreateIndex
CREATE INDEX "gift_cards_tenantId_status_idx" ON "public"."gift_cards"("tenantId", "status");

-- CreateIndex
CREATE INDEX "gift_cards_tenantId_code_idx" ON "public"."gift_cards"("tenantId", "code");

-- CreateIndex
CREATE INDEX "gift_card_transactions_giftCardId_idx" ON "public"."gift_card_transactions"("giftCardId");

-- AddForeignKey
ALTER TABLE "public"."audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."calendar_events" ADD CONSTRAINT "calendar_events_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."calendar_events" ADD CONSTRAINT "calendar_events_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."categories" ADD CONSTRAINT "categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."categories" ADD CONSTRAINT "categories_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."customers" ADD CONSTRAINT "customers_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."documents" ADD CONSTRAINT "documents_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."documents" ADD CONSTRAINT "documents_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."documents" ADD CONSTRAINT "documents_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."inventory_logs" ADD CONSTRAINT "inventory_logs_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."inventory_logs" ADD CONSTRAINT "inventory_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payments" ADD CONSTRAINT "payments_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "public"."sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."product_images" ADD CONSTRAINT "product_images_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."products" ADD CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."products" ADD CONSTRAINT "products_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "public"."suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."products" ADD CONSTRAINT "products_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."repair_photos" ADD CONSTRAINT "repair_photos_repairId_fkey" FOREIGN KEY ("repairId") REFERENCES "public"."repairs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."repair_status_history" ADD CONSTRAINT "repair_status_history_repairId_fkey" FOREIGN KEY ("repairId") REFERENCES "public"."repairs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."repairs" ADD CONSTRAINT "repairs_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."repairs" ADD CONSTRAINT "repairs_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."repairs" ADD CONSTRAINT "repairs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."repair_tags" ADD CONSTRAINT "repair_tags_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sale_items" ADD CONSTRAINT "sale_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sale_items" ADD CONSTRAINT "sale_items_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "public"."sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sales" ADD CONSTRAINT "sales_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sales" ADD CONSTRAINT "sales_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sales" ADD CONSTRAINT "sales_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "public"."shifts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sales" ADD CONSTRAINT "sales_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."shifts" ADD CONSTRAINT "shifts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."shifts" ADD CONSTRAINT "shifts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."suppliers" ADD CONSTRAINT "suppliers_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."outlets" ADD CONSTRAINT "outlets_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."stock_take_sessions" ADD CONSTRAINT "stock_take_sessions_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."stock_take_sessions" ADD CONSTRAINT "stock_take_sessions_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."stock_take_sessions" ADD CONSTRAINT "stock_take_sessions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."stock_take_items" ADD CONSTRAINT "stock_take_items_scannedBy_fkey" FOREIGN KEY ("scannedBy") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."stock_take_items" ADD CONSTRAINT "stock_take_items_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."stock_take_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."float_sessions" ADD CONSTRAINT "float_sessions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."float_sessions" ADD CONSTRAINT "float_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."float_transactions" ADD CONSTRAINT "float_transactions_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."float_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."float_transactions" ADD CONSTRAINT "float_transactions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."float_transactions" ADD CONSTRAINT "float_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."petty_cash_accounts" ADD CONSTRAINT "petty_cash_accounts_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."petty_cash_accounts" ADD CONSTRAINT "petty_cash_accounts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."petty_cash_transactions" ADD CONSTRAINT "petty_cash_transactions_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."petty_cash_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."petty_cash_transactions" ADD CONSTRAINT "petty_cash_transactions_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."petty_cash_transactions" ADD CONSTRAINT "petty_cash_transactions_rejectedBy_fkey" FOREIGN KEY ("rejectedBy") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."petty_cash_transactions" ADD CONSTRAINT "petty_cash_transactions_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."petty_cash_transactions" ADD CONSTRAINT "petty_cash_transactions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."financial_analyses" ADD CONSTRAINT "financial_analyses_generatedBy_fkey" FOREIGN KEY ("generatedBy") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."financial_analyses" ADD CONSTRAINT "financial_analyses_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ai_recommendations" ADD CONSTRAINT "ai_recommendations_implementedBy_fkey" FOREIGN KEY ("implementedBy") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ai_recommendations" ADD CONSTRAINT "ai_recommendations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."financial_reports" ADD CONSTRAINT "financial_reports_generatedBy_fkey" FOREIGN KEY ("generatedBy") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."financial_reports" ADD CONSTRAINT "financial_reports_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."mf_customer_users" ADD CONSTRAINT "mf_customer_users_customerProfileId_fkey" FOREIGN KEY ("customerProfileId") REFERENCES "public"."mf_customer_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."mf_feature_versions" ADD CONSTRAINT "mf_feature_versions_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "public"."mf_features"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."mf_customer_features" ADD CONSTRAINT "mf_customer_features_customerProfileId_fkey" FOREIGN KEY ("customerProfileId") REFERENCES "public"."mf_customer_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."mf_customer_features" ADD CONSTRAINT "mf_customer_features_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "public"."mf_features"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."mf_subscriptions" ADD CONSTRAINT "mf_subscriptions_customerProfileId_fkey" FOREIGN KEY ("customerProfileId") REFERENCES "public"."mf_customer_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."mf_invoices" ADD CONSTRAINT "mf_invoices_customerProfileId_fkey" FOREIGN KEY ("customerProfileId") REFERENCES "public"."mf_customer_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."mf_invoices" ADD CONSTRAINT "mf_invoices_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "public"."mf_subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."mf_bug_reports" ADD CONSTRAINT "mf_bug_reports_customerProfileId_fkey" FOREIGN KEY ("customerProfileId") REFERENCES "public"."mf_customer_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."mf_feature_requests" ADD CONSTRAINT "mf_feature_requests_customerProfileId_fkey" FOREIGN KEY ("customerProfileId") REFERENCES "public"."mf_customer_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."mf_activity_logs" ADD CONSTRAINT "mf_activity_logs_customerProfileId_fkey" FOREIGN KEY ("customerProfileId") REFERENCES "public"."mf_customer_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tasks" ADD CONSTRAINT "tasks_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tasks" ADD CONSTRAINT "tasks_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."task_comments" ADD CONSTRAINT "task_comments_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "public"."tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."task_comments" ADD CONSTRAINT "task_comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."task_activities" ADD CONSTRAINT "task_activities_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "public"."tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."task_activities" ADD CONSTRAINT "task_activities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."external_repairers" ADD CONSTRAINT "external_repairers_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."repair_assignments" ADD CONSTRAINT "repair_assignments_assignedBy_fkey" FOREIGN KEY ("assignedBy") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."repair_assignments" ADD CONSTRAINT "repair_assignments_repairId_fkey" FOREIGN KEY ("repairId") REFERENCES "public"."repairs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."repair_assignments" ADD CONSTRAINT "repair_assignments_repairerId_fkey" FOREIGN KEY ("repairerId") REFERENCES "public"."external_repairers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."repair_assignments" ADD CONSTRAINT "repair_assignments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."repair_status_updates" ADD CONSTRAINT "repair_status_updates_repairId_fkey" FOREIGN KEY ("repairId") REFERENCES "public"."repairs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."repair_status_updates" ADD CONSTRAINT "repair_status_updates_repairerId_fkey" FOREIGN KEY ("repairerId") REFERENCES "public"."external_repairers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."repair_status_updates" ADD CONSTRAINT "repair_status_updates_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."repair_status_updates" ADD CONSTRAINT "repair_status_updates_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."hrms_employees" ADD CONSTRAINT "hrms_employees_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "public"."hrms_departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."hrms_employees" ADD CONSTRAINT "hrms_employees_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "public"."hrms_positions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."hrms_leave_requests" ADD CONSTRAINT "hrms_leave_requests_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."hrms_employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."hrms_employee_documents" ADD CONSTRAINT "hrms_employee_documents_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."hrms_employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."hrms_payslips" ADD CONSTRAINT "hrms_payslips_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "public"."hrms_payroll_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."hrms_payslips" ADD CONSTRAINT "hrms_payslips_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."hrms_employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."hrms_timesheets" ADD CONSTRAINT "hrms_timesheets_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."hrms_employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."hrms_timesheet_entries" ADD CONSTRAINT "hrms_timesheet_entries_timesheetId_fkey" FOREIGN KEY ("timesheetId") REFERENCES "public"."hrms_timesheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."hrms_timesheet_entries" ADD CONSTRAINT "hrms_timesheet_entries_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."hrms_employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."hrms_timesheet_tokens" ADD CONSTRAINT "hrms_timesheet_tokens_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."hrms_employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."hrms_p11d_benefits" ADD CONSTRAINT "hrms_p11d_benefits_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."hrms_employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."gift_cards" ADD CONSTRAINT "gift_cards_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."gift_cards" ADD CONSTRAINT "gift_cards_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."gift_card_transactions" ADD CONSTRAINT "gift_card_transactions_giftCardId_fkey" FOREIGN KEY ("giftCardId") REFERENCES "public"."gift_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

