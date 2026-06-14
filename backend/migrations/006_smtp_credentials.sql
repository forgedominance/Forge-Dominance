-- Migration: create smtp_credentials table to store SMTP sender credentials
CREATE TABLE IF NOT EXISTS smtp_credentials (
  id SERIAL PRIMARY KEY,
  sender_email VARCHAR(255) NOT NULL,
  app_password TEXT NOT NULL,
  smtp_host VARCHAR(255) DEFAULT 'smtp.gmail.com',
  smtp_port INT DEFAULT 587,
  smtp_encryption VARCHAR(20) DEFAULT 'TLS',
  sender_name VARCHAR(255) DEFAULT 'Bladesmith Admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Keep only the most recent credential row in use; admins can insert/update as needed.
