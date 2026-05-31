-- Add new TenantStatus enum values and billing fields to tenants

-- Step 1: Add new enum values (PostgreSQL requires ALTER TYPE)
ALTER TYPE "TenantStatus" ADD VALUE IF NOT EXISTS 'PAYMENT_DUE';
ALTER TYPE "TenantStatus" ADD VALUE IF NOT EXISTS 'PAYMENT_WARNING';

-- Step 2: Add billing/suspension tracking columns
ALTER TABLE "tenants"
  ADD COLUMN IF NOT EXISTS "suspendedAt"     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "suspendedReason" TEXT,
  ADD COLUMN IF NOT EXISTS "billingDueDate"  TIMESTAMPTZ;
