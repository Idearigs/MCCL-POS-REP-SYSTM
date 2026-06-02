-- CreateEnum
CREATE TYPE "public"."ShiftCashMovementType" AS ENUM ('PAY_IN', 'PAY_OUT');

-- AlterTable
ALTER TABLE "public"."shifts" ADD COLUMN     "auditResolutionNote" TEXT,
ADD COLUMN     "auditResolvedAt" TIMESTAMP(3),
ADD COLUMN     "auditResolvedById" TEXT,
ADD COLUMN     "cardActual" DECIMAL(65,30),
ADD COLUMN     "cardExpected" DECIMAL(65,30),
ADD COLUMN     "cardVariance" DECIMAL(65,30),
ADD COLUMN     "cashPayIns" DECIMAL(65,30) DEFAULT 0,
ADD COLUMN     "cashPayOuts" DECIMAL(65,30) DEFAULT 0,
ADD COLUMN     "cashRefunds" DECIMAL(65,30) DEFAULT 0,
ADD COLUMN     "declaredCash" DECIMAL(65,30),
ADD COLUMN     "denominations" JSONB,
ADD COLUMN     "giftCardSales" DECIMAL(65,30) DEFAULT 0,
ADD COLUMN     "layawayDeposits" DECIMAL(65,30) DEFAULT 0,
ADD COLUMN     "managerOverrideAt" TIMESTAMP(3),
ADD COLUMN     "managerOverrideById" TEXT,
ADD COLUMN     "varianceReason" TEXT;

-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "cashUpPin" TEXT;

-- CreateTable
CREATE TABLE "public"."shift_cash_movements" (
    "id" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "public"."ShiftCashMovementType" NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shift_cash_movements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shift_cash_movements_shiftId_idx" ON "public"."shift_cash_movements"("shiftId");

-- CreateIndex
CREATE INDEX "shift_cash_movements_tenantId_createdAt_idx" ON "public"."shift_cash_movements"("tenantId", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."shifts" ADD CONSTRAINT "shifts_managerOverrideById_fkey" FOREIGN KEY ("managerOverrideById") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."shifts" ADD CONSTRAINT "shifts_auditResolvedById_fkey" FOREIGN KEY ("auditResolvedById") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."shift_cash_movements" ADD CONSTRAINT "shift_cash_movements_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "public"."shifts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."shift_cash_movements" ADD CONSTRAINT "shift_cash_movements_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."shift_cash_movements" ADD CONSTRAINT "shift_cash_movements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

