-- Drop the problematic composite unique constraints
DROP INDEX IF EXISTS "unique_active_sku";
DROP INDEX IF EXISTS "unique_active_barcode";

-- Create partial unique indexes that only apply when isActive = true
-- This allows multiple products with the same SKU/barcode when they are deleted (isActive = false)

CREATE UNIQUE INDEX "unique_active_sku"
ON "products" ("tenantId", "sku")
WHERE "isActive" = true;

CREATE UNIQUE INDEX "unique_active_barcode"
ON "products" ("tenantId", "barcode")
WHERE "isActive" = true AND "barcode" IS NOT NULL;

-- Verify the indexes
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM
    pg_indexes
WHERE
    tablename = 'products'
    AND indexname LIKE 'unique_active%'
ORDER BY
    indexname;
