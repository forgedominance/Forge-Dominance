CREATE TABLE IF NOT EXISTS commissions (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  country VARCHAR(100),
  country_code VARCHAR(10),
  brief TEXT NOT NULL,
  budget DECIMAL(10,2),
  reference_image_url TEXT,
  reference_image_path TEXT,
  status VARCHAR(50) DEFAULT 'new',
  source VARCHAR(80) DEFAULT 'website',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_commissions_email ON commissions(email);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON commissions(status);
CREATE INDEX IF NOT EXISTS idx_commissions_created ON commissions(created_at);