-- Create drive files table to store Google Drive file metadata
CREATE TABLE IF NOT EXISTS `drive_files` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `file_id` VARCHAR(100) NOT NULL,
  `file_name` VARCHAR(255) NOT NULL,
  `mime_type` VARCHAR(100) NOT NULL,
  `file_size` INT NOT NULL,
  `view_link` VARCHAR(255) NOT NULL,
  `download_link` VARCHAR(255) NULL,
  `thumbnail_link` VARCHAR(255) NULL,
  `parent_folder_id` VARCHAR(100) NULL,
  `created_by` INT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `idx_drive_file_id` (`file_id`),
  INDEX `idx_drive_file_name` (`file_name`),
  INDEX `idx_drive_file_mime_type` (`mime_type`),
  CONSTRAINT `fk_drive_file_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
