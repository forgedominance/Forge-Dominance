-- Extended schema for admin data, tracking, and editor persistence

CREATE TABLE IF NOT EXISTS promotions (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'ad',
  code VARCHAR(100),
  discount NUMERIC(10,2),
  max_uses INT,
  expires_at TIMESTAMP,
  image_url TEXT,
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

CREATE INDEX IF NOT EXISTS idx_promotions_type ON promotions(type);
CREATE INDEX IF NOT EXISTS idx_promotions_active ON promotions(is_active);
CREATE INDEX IF NOT EXISTS idx_editor_page_key ON editor_content(page_key);
CREATE INDEX IF NOT EXISTS idx_visitor_events_visitor ON visitor_events(visitor_id);
CREATE INDEX IF NOT EXISTS idx_visitor_events_created ON visitor_events(created_at);
