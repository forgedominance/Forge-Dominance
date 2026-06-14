-- Backfill and harden schema for admin settings, promotions, editor, visitors, and super admin controls

CREATE TABLE IF NOT EXISTS promotions (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'ad',
  code VARCHAR(100),
  discount NUMERIC(10,2),
  max_uses INT,
  expires_at TIMESTAMP,
  image_url TEXT,
  image_path TEXT,
  link TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_settings (
  key VARCHAR(80) PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS editor_content (
  id SERIAL PRIMARY KEY,
  page_key VARCHAR(120) UNIQUE NOT NULL,
  content TEXT NOT NULL,
  updated_by INT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS visitor_events (
  id SERIAL PRIMARY KEY,
  visitor_id VARCHAR(120),
  ip_address VARCHAR(120),
  user_agent TEXT,
  path TEXT,
  action VARCHAR(80) DEFAULT 'pageview',
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS campaign_email_logs (
  id SERIAL PRIMARY KEY,
  source_table VARCHAR(80) NOT NULL,
  source_id VARCHAR(120),
  email VARCHAR(255) NOT NULL,
  subject TEXT,
  content TEXT,
  created_by INT,
  status VARCHAR(30) DEFAULT 'queued',
  error_message TEXT,
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE promotions
  ADD COLUMN IF NOT EXISTS image_path TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'ad';

ALTER TABLE admins
  ADD COLUMN IF NOT EXISTS sender_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS smtp_host VARCHAR(255),
  ADD COLUMN IF NOT EXISTS smtp_port INT,
  ADD COLUMN IF NOT EXISTS smtp_encryption VARCHAR(20);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

UPDATE users
SET role = 'superadmin', updated_at = CURRENT_TIMESTAMP
WHERE lower(email) = 'faiqsajjad652@gmail.com';

CREATE INDEX IF NOT EXISTS idx_promotions_type ON promotions(type);
CREATE INDEX IF NOT EXISTS idx_promotions_active ON promotions(is_active);
CREATE INDEX IF NOT EXISTS idx_visitor_events_visitor ON visitor_events(visitor_id);
CREATE INDEX IF NOT EXISTS idx_visitor_events_created ON visitor_events(created_at);
CREATE INDEX IF NOT EXISTS idx_campaign_email_logs_email ON campaign_email_logs(email);
CREATE INDEX IF NOT EXISTS idx_campaign_email_logs_status ON campaign_email_logs(status);
