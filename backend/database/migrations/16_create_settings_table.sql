-- Create settings table to store system-wide configuration settings
CREATE TABLE IF NOT EXISTS `settings` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `setting_key` VARCHAR(100) NOT NULL,
  `setting_value` TEXT NULL,
  `setting_type` ENUM('string', 'number', 'boolean', 'json', 'array') NOT NULL DEFAULT 'string',
  `description` TEXT NULL,
  `is_public` BOOLEAN NOT NULL DEFAULT 0,
  `created_by` INT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `idx_setting_key` (`setting_key`),
  CONSTRAINT `fk_setting_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default settings
INSERT INTO `settings` (`setting_key`, `setting_value`, `setting_type`, `description`, `is_public`) VALUES
('company_name', 'MCCL POS and Repair System', 'string', 'Company name displayed in the system', 1),
('company_address', '123 Main Street, City, State, Country', 'string', 'Company address displayed on invoices', 1),
('company_phone', '+91 1234567890', 'string', 'Company contact phone number', 1),
('company_email', 'contact@example.com', 'string', 'Company contact email', 1),
('tax_rate', '18', 'number', 'Default tax rate percentage', 1),
('currency', 'INR', 'string', 'Default currency code', 1),
('invoice_prefix', 'INV-', 'string', 'Prefix for invoice numbers', 0),
('repair_prefix', 'REP-', 'string', 'Prefix for repair numbers', 0),
('google_drive_folder_id', '', 'string', 'Root Google Drive folder ID for file storage', 0);
