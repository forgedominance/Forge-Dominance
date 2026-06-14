-- Admin login tracking and user activity logging tables

-- CREATE admin_settings if it doesn't exist (fixes dependency issue)
CREATE TABLE IF NOT EXISTS admin_settings (
  key VARCHAR(80) PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  two_factor_method VARCHAR(50),
  session_timeout INT DEFAULT 3600,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_login_activity (
  id SERIAL PRIMARY KEY,
  admin_id INT REFERENCES users(id) ON DELETE SET NULL,
  email VARCHAR(255),
  ip_address VARCHAR(120),
  user_agent TEXT,
  login_time TIMESTAMP NOT NULL,
  logout_time TIMESTAMP,
  session_duration INT,
  actions JSONB DEFAULT '[]'::jsonb,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_tracking (
  id SERIAL PRIMARY KEY,
  visitor_id VARCHAR(120) NOT NULL,
  ip_address VARCHAR(120),
  user_agent TEXT,
  pages_visited JSONB DEFAULT '[]'::jsonb,
  total_time_spent INT DEFAULT 0,
  entry_page TEXT,
  exit_page TEXT,
  actions JSONB DEFAULT '[]'::jsonb,
  first_visit TIMESTAMP NOT NULL,
  last_visit TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_page_events (
  id SERIAL PRIMARY KEY,
  visitor_id VARCHAR(120) NOT NULL,
  page_path TEXT NOT NULL,
  action_type VARCHAR(100),
  element_details TEXT,
  time_on_page INT,
  entry_time TIMESTAMP,
  exit_time TIMESTAMP,
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_admin_login_email ON admin_login_activity(email);
CREATE INDEX IF NOT EXISTS idx_admin_login_created ON admin_login_activity(created_at);
CREATE INDEX IF NOT EXISTS idx_user_tracking_visitor ON user_tracking(visitor_id);
CREATE INDEX IF NOT EXISTS idx_user_page_visitor ON user_page_events(visitor_id);
CREATE INDEX IF NOT EXISTS idx_user_page_created ON user_page_events(created_at);
