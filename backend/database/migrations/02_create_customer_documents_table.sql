-- Create customer_documents table
CREATE TABLE IF NOT EXISTS customer_documents (
  id INT PRIMARY KEY AUTO_INCREMENT,
  customer_id INT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  file_size INT NOT NULL,
  drive_file_id VARCHAR(100) NOT NULL,
  drive_view_link VARCHAR(255) NOT NULL,
  document_type ENUM('contract', 'receipt', 'repair', 'other') NOT NULL DEFAULT 'other',
  notes TEXT,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add indexes for improved query performance
CREATE INDEX idx_customer_documents_customer_id ON customer_documents(customer_id);
CREATE INDEX idx_customer_documents_document_type ON customer_documents(document_type);
CREATE INDEX idx_customer_documents_created_at ON customer_documents(created_at);
