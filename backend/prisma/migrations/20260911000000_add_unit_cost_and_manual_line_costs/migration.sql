-- AlterTable: COGS snapshot captured at sale time (nullable, backward-compatible)
ALTER TABLE "public"."sale_items" ADD COLUMN "unitCost" DECIMAL(65,30);

-- CreateTable: cost + source-bill entered after the fact for note-only sale
-- lines (second-hand / bespoke custom-tile & manual entries) that have no
-- sale_items row. Keyed by (saleId, lineKey = recovered line title).
CREATE TABLE "public"."manual_line_costs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "lineKey" TEXT NOT NULL,
    "cost" DECIMAL(65,30) NOT NULL,
    "sourceBillNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "manual_line_costs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "manual_line_costs_saleId_lineKey_key" ON "public"."manual_line_costs"("saleId", "lineKey");

-- CreateIndex
CREATE INDEX "manual_line_costs_tenantId_idx" ON "public"."manual_line_costs"("tenantId");
