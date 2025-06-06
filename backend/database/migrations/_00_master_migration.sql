-- MCCL POS and Repair Management System
-- Master Database Migration File
-- This file includes all database migrations in the correct order

-- Set character set and collation
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- Include all migration files in order
SOURCE 00_create_users_table.sql;
SOURCE 01_create_customers_table.sql;
SOURCE 02_create_customer_documents_table.sql;
SOURCE 03_create_categories_table.sql;
SOURCE 04_create_brands_table.sql;
SOURCE 05_create_products_table.sql;
SOURCE 06_create_product_variants_table.sql;
SOURCE 07_create_product_images_table.sql;
SOURCE 08_create_sales_table.sql;
SOURCE 09_create_sale_items_table.sql;
SOURCE 10_create_payments_table.sql;
SOURCE 11_create_repairs_table.sql;
SOURCE 12_create_repair_items_table.sql;
SOURCE 13_create_repair_status_history_table.sql;
SOURCE 14_create_repair_images_table.sql;
SOURCE 15_create_drive_files_table.sql;
SOURCE 16_create_settings_table.sql;

SET FOREIGN_KEY_CHECKS = 1;

-- End of master migration file
