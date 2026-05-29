-- Performance indexes for high-frequency filter/sort columns.
--
-- IMPORTANT: Run this directly against the database with psql, NOT through
-- `prisma migrate` — CREATE INDEX CONCURRENTLY cannot run inside the
-- transaction block that Prisma migrations use.
--
-- CONCURRENTLY builds the index WITHOUT taking an ACCESS EXCLUSIVE lock, so
-- reads and writes on these operational tables continue uninterrupted while
-- the index is built (satisfies the "do not lock active tables" guardrail).
--
-- IF NOT EXISTS makes this safe to re-run (idempotent).
--
-- Apply:
--   psql "$DATABASE_URL" -f prisma/migrations/manual/20260529_add_perf_indexes.sql
-- Then sync Prisma's view without re-applying:
--   npx prisma db pull   (or mark resolved)  — the @@index entries already
--   reflect these in schema.prisma.

-- ── sales (Sales Ledger) ────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS "sales_tenantId_createdAt_idx"
  ON "sales" ("tenantId", "createdAt");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "sales_customerId_idx"
  ON "sales" ("customerId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "sales_status_idx"
  ON "sales" ("status");

-- ── repairs ─────────────────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS "repairs_tenantId_createdAt_idx"
  ON "repairs" ("tenantId", "createdAt");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "repairs_customerId_idx"
  ON "repairs" ("customerId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "repairs_status_idx"
  ON "repairs" ("status");

-- ── customers (search / listing) ────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS "customers_tenantId_createdAt_idx"
  ON "customers" ("tenantId", "createdAt");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "customers_phone_idx"
  ON "customers" ("phone");
