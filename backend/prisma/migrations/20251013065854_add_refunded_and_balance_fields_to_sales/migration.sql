-- AlterTable
ALTER TABLE "public"."sales" ADD COLUMN     "balanceDue" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "refundedAmount" DECIMAL(65,30) NOT NULL DEFAULT 0;
