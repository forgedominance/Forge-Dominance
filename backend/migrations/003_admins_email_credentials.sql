-- Admin email credentials table

CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL DEFAULT '',
  app_password TEXT DEFAULT '',
  sender_name VARCHAR(255) DEFAULT 'Bladesmith Admin',
  smtp_host VARCHAR(255) DEFAULT '',
  smtp_port INT DEFAULT 587,
  smtp_encryption VARCHAR(20) DEFAULT 'TLS',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_admins_email ON admins(email);
