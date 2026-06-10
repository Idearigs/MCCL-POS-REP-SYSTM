-- AlterTable
ALTER TABLE "public"."products" ADD COLUMN     "goldPricingEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastGoldPricedAt" TIMESTAMP(3);

