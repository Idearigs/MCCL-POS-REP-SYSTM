-- CreateTable
CREATE TABLE "public"."pos_tiles" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "saleName" TEXT NOT NULL,
    "defaultPrice" DECIMAL(65,30),
    "color" TEXT NOT NULL DEFAULT 'blue',
    "icon" TEXT NOT NULL DEFAULT 'Tag',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pos_tiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pos_tiles_tenantId_isActive_sortOrder_idx" ON "public"."pos_tiles"("tenantId", "isActive", "sortOrder");

-- AddForeignKey
ALTER TABLE "public"."pos_tiles" ADD CONSTRAINT "pos_tiles_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

