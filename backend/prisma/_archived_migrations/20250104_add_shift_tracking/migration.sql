-- CreateEnum
CREATE TYPE "ShiftStatus" AS ENUM ('ACTIVE', 'CLOSED', 'ABANDONED', 'RECONCILED');

-- CreateTable
CREATE TABLE "shifts" (
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
    "status" "ShiftStatus" NOT NULL DEFAULT 'ACTIVE',
    "deviceInfo" TEXT,
    "ipAddress" TEXT,
    "location" TEXT,
    "openingNotes" TEXT,
    "closingNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shifts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shifts_shiftNumber_key" ON "shifts"("shiftNumber");

-- CreateIndex
CREATE INDEX "shifts_userId_startTime_idx" ON "shifts"("userId", "startTime");

-- CreateIndex
CREATE INDEX "shifts_tenantId_startTime_idx" ON "shifts"("tenantId", "startTime");

-- CreateIndex
CREATE INDEX "shifts_status_idx" ON "shifts"("status");

-- AlterTable sales - Add shiftId column
ALTER TABLE "sales" ADD COLUMN "shiftId" TEXT;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "shifts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
