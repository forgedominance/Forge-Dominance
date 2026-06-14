-- Visitor tracking table for Bladesmith

CREATE TABLE IF NOT EXISTS visitor_events (
  id SERIAL PRIMARY KEY,
  visitor_id VARCHAR(255),
  ip_address VARCHAR(45),
  user_agent TEXT,
  path VARCHAR(500),
  action VARCHAR(50),
  meta JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_visitor_events_visitor_id ON visitor_events(visitor_id);
CREATE INDEX IF NOT EXISTS idx_visitor_events_ip ON visitor_events(ip_address);
CREATE INDEX IF NOT EXISTS idx_visitor_events_created ON visitor_events(created_at);
CREATE INDEX IF NOT EXISTS idx_visitor_events_action ON visitor_events(action);
