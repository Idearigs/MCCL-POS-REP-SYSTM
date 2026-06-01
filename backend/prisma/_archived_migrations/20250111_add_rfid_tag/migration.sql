-- Add RFID tag field to products table for RFID tracking support
-- This enables fast inventory scanning using RFID readers

ALTER TABLE "products" ADD COLUMN "rfidTag" TEXT;

-- Create index for fast RFID lookups during stock taking
CREATE INDEX "idx_products_rfid_tag" ON "products"("rfidTag") WHERE "rfidTag" IS NOT NULL AND "isActive" = true;

-- Add comment for documentation
COMMENT ON COLUMN "products"."rfidTag" IS 'RFID tag identifier for fast inventory scanning and tracking';
