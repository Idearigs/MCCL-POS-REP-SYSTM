-- Add isMonthlyPayer flag to customers for monthly payment tracking
ALTER TABLE "customers"
  ADD COLUMN IF NOT EXISTS "isMonthlyPayer" BOOLEAN NOT NULL DEFAULT false;
