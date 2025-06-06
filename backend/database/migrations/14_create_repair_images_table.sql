-- Create repair images table to store images related to repairs
CREATE TABLE IF NOT EXISTS `repair_images` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `repair_id` INT NOT NULL,
  `image_path` VARCHAR(255) NOT NULL,
  `drive_file_id` VARCHAR(100) NULL,
  `drive_view_link` VARCHAR(255) NULL,
  `image_type` ENUM('before', 'during', 'after', 'damage', 'other') NOT NULL DEFAULT 'other',
  `description` TEXT NULL,
  `created_by` INT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_repair_image_repair` (`repair_id`),
  INDEX `idx_repair_image_type` (`image_type`),
  CONSTRAINT `fk_repair_image_repair` FOREIGN KEY (`repair_id`) REFERENCES `repairs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_repair_image_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
