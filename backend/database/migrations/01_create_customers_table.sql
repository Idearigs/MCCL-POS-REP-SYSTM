-- Create customers table if it doesn't exist
CREATE TABLE IF NOT EXISTS `customers` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NULL,
  `phone` VARCHAR(50) NOT NULL,
  `notes` TEXT NULL,
  `marketing_email` BOOLEAN NOT NULL DEFAULT 0,
  `marketing_sms` BOOLEAN NOT NULL DEFAULT 0,
  `marketing_phone` BOOLEAN NOT NULL DEFAULT 0,
  `data_processing_consent` BOOLEAN NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_customer_name` (`name`),
  INDEX `idx_customer_email` (`email`),
  INDEX `idx_customer_phone` (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
