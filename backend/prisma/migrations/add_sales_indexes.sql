-- Sales Management Performance Indexes
-- Add indexes for faster sales queries and reporting

-- Index for sorting sales by date (most common query)
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales("createdAt" DESC);

-- Index for quick receipt number lookups
CREATE INDEX IF NOT EXISTS idx_sales_receipt_number ON sales("receiptNumber") WHERE "receiptNumber" IS NOT NULL;

-- Composite index for customer sales history
CREATE INDEX IF NOT EXISTS idx_sales_customer_date ON sales("customerId", "createdAt" DESC) WHERE "customerId" IS NOT NULL;

-- Index for filtering by payment method and status
CREATE INDEX IF NOT EXISTS idx_sales_payment_method ON sales("paymentMethod");
CREATE INDEX IF NOT EXISTS idx_sales_payment_status ON sales("paymentStatus");
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status);

-- Index for cashier performance reports
CREATE INDEX IF NOT EXISTS idx_sales_created_by_date ON sales("createdBy", "createdAt" DESC);

-- Index for tenant-based queries (multi-tenant support)
CREATE INDEX IF NOT EXISTS idx_sales_tenant_date ON sales("tenantId", "createdAt" DESC);

-- Index for amount-based queries (reporting)
CREATE INDEX IF NOT EXISTS idx_sales_total_amount ON sales("totalAmount");

-- Composite index for common filter combinations
CREATE INDEX IF NOT EXISTS idx_sales_tenant_status_date ON sales("tenantId", status, "createdAt" DESC);

-- Sale items performance
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items("saleId");
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON sale_items("productId");

-- Payments index
CREATE INDEX IF NOT EXISTS idx_payments_sale_id ON payments("saleId");
CREATE INDEX IF NOT EXISTS idx_payments_method ON payments(method);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- Note: These indexes improve query performance for:
-- 1. Sales listing with date sorting
-- 2. Receipt number searches
-- 3. Customer purchase history
-- 4. Payment method filtering
-- 5. Cashier reports
-- 6. Analytics and reporting queries
