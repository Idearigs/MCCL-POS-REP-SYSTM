-- Create repair status history table to track status changes in repairs
CREATE TABLE IF NOT EXISTS `repair_status_history` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `repair_id` INT NOT NULL,
  `status` ENUM('received', 'diagnosed', 'waiting_parts', 'in_progress', 'completed', 'delivered', 'cancelled') NOT NULL,
  `notes` TEXT NULL,
  `created_by` INT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_repair_status_history_repair` (`repair_id`),
  INDEX `idx_repair_status_history_status` (`status`),
  INDEX `idx_repair_status_history_created_at` (`created_at`),
  CONSTRAINT `fk_repair_status_history_repair` FOREIGN KEY (`repair_id`) REFERENCES `repairs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_repair_status_history_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
