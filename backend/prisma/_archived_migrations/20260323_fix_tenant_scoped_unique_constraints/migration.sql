-- Fix: Change globally unique number fields to be unique per-tenant
-- Previously all tenants shared the same number sequences, causing
-- unique constraint violations (500 errors) when new tenants tried
-- to create their first sale/repair/shift with the same number that
-- another tenant had already used.

-- repairs: repairNumber
ALTER TABLE "repairs" DROP CONSTRAINT IF EXISTS "repairs_repairNumber_key";
CREATE UNIQUE INDEX IF NOT EXISTS "repairs_tenantId_repairNumber_key" ON "repairs"("tenantId", "repairNumber");

-- sales: saleNumber
ALTER TABLE "sales" DROP CONSTRAINT IF EXISTS "sales_saleNumber_key";
CREATE UNIQUE INDEX IF NOT EXISTS "sales_tenantId_saleNumber_key" ON "sales"("tenantId", "saleNumber");

-- sales: receiptNumber (nullable — NULLs are excluded from unique check automatically)
ALTER TABLE "sales" DROP CONSTRAINT IF EXISTS "sales_receiptNumber_key";
CREATE UNIQUE INDEX IF NOT EXISTS "sales_tenantId_receiptNumber_key" ON "sales"("tenantId", "receiptNumber") WHERE "receiptNumber" IS NOT NULL;

-- shifts: shiftNumber
ALTER TABLE "shifts" DROP CONSTRAINT IF EXISTS "shifts_shiftNumber_key";
CREATE UNIQUE INDEX IF NOT EXISTS "shifts_tenantId_shiftNumber_key" ON "shifts"("tenantId", "shiftNumber");

-- float_sessions: floatNumber
ALTER TABLE "float_sessions" DROP CONSTRAINT IF EXISTS "float_sessions_floatNumber_key";
CREATE UNIQUE INDEX IF NOT EXISTS "float_sessions_tenantId_floatNumber_key" ON "float_sessions"("tenantId", "floatNumber");

-- petty_cash_accounts: accountNumber
ALTER TABLE "petty_cash_accounts" DROP CONSTRAINT IF EXISTS "petty_cash_accounts_accountNumber_key";
CREATE UNIQUE INDEX IF NOT EXISTS "petty_cash_accounts_tenantId_accountNumber_key" ON "petty_cash_accounts"("tenantId", "accountNumber");

-- petty_cash_transactions: transactionNumber
ALTER TABLE "petty_cash_transactions" DROP CONSTRAINT IF EXISTS "petty_cash_transactions_transactionNumber_key";
CREATE UNIQUE INDEX IF NOT EXISTS "petty_cash_transactions_tenantId_transactionNumber_key" ON "petty_cash_transactions"("tenantId", "transactionNumber");
