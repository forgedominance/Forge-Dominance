-- Commissions table for Bladesmith

CREATE TABLE IF NOT EXISTS commissions (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  country VARCHAR(100),
  budget DECIMAL(10,2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'new',
  brief TEXT,
  reference_image_url TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_commissions_status ON commissions(status);
CREATE INDEX IF NOT EXISTS idx_commissions_email ON commissions(email);
