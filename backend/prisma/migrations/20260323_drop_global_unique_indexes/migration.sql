-- Fix: Drop the old globally-unique indexes that were not removed by the previous migration.
-- The previous migration used DROP CONSTRAINT which silently did nothing because Prisma
-- creates unique indexes (not named constraints). We must use DROP INDEX instead.

DROP INDEX IF EXISTS "sales_saleNumber_key";
DROP INDEX IF EXISTS "sales_receiptNumber_key";
DROP INDEX IF EXISTS "repairs_repairNumber_key";
DROP INDEX IF EXISTS "shifts_shiftNumber_key";
DROP INDEX IF EXISTS "float_sessions_floatNumber_key";
DROP INDEX IF EXISTS "petty_cash_accounts_accountNumber_key";
DROP INDEX IF EXISTS "petty_cash_transactions_transactionNumber_key";
