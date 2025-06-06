-- Create brands table for product brands
CREATE TABLE IF NOT EXISTS `brands` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT NULL,
  `logo_path` VARCHAR(255) NULL,
  `drive_logo_id` VARCHAR(100) NULL,
  `website` VARCHAR(255) NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT 1,
  `created_by` INT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `idx_brand_name` (`name`),
  CONSTRAINT `fk_brand_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
