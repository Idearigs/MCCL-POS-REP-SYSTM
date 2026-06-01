-- Migration: add clientSaleId to sales for offline-first idempotency
-- Run this during off-peak hours BEFORE deploying the offline-sync frontend/backend update.
-- Safe to run on live DB — additive only, no existing rows affected.

ALTER TABLE sales ADD COLUMN IF NOT EXISTS "clientSaleId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "sales_tenantId_clientSaleId_key"
  ON sales ("tenantId", "clientSaleId")
  WHERE "clientSaleId" IS NOT NULL;
