-- Admin Pages Performance Indexes
-- Purpose: Speed up admin panel queries for promotions, logs, coupons, ads

-- Admin Login Activity: Optimize history queries (used in logs page)
CREATE INDEX IF NOT EXISTS idx_admin_login_activity_login_time
  ON admin_login_activity(login_time DESC);

CREATE INDEX IF NOT EXISTS idx_admin_login_activity_status
  ON admin_login_activity(status, login_time DESC);

-- Ads: Optimize listing queries
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ads') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_ads_status_created ON ads(status, created_at DESC)';
  END IF;
END $$;

-- Coupons: Optimize active coupon queries
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'coupons') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons(is_active, created_at DESC) WHERE is_active = true';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code)';
  END IF;
END $$;

-- Campaign Queue: Optimize status queries
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'campaign_queue') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_campaign_queue_status ON campaign_queue(status, created_at DESC)';
  END IF;
END $$;

-- Orders: Index on total for revenue aggregation (used in KPI queries)
CREATE INDEX IF NOT EXISTS idx_orders_status_total
  ON orders(status, total) WHERE status = 'completed';

-- Customer Notes: Optimize notes fetch by customer
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer_notes') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_customer_notes_customer ON customer_notes(customer_id, created_at DESC)';
  END IF;
END $$;

-- Products: category index for filtered queries
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- Commissions: Optimize listing
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'commissions') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_commissions_created ON commissions(created_at DESC)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_commissions_email ON commissions(email)';
  END IF;
END $$;

-- Settings: key lookup
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'settings') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key) WHERE key IS NOT NULL';
  END IF;
END $$;

-- Users: email lookup (critical for auth)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
    EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email)';
  END IF;
END $$;

-- Analyze updated tables
ANALYZE admin_login_activity;
ANALYZE orders;
ANALYZE products;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'coupons') THEN
    EXECUTE 'ANALYZE coupons';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ads') THEN
    EXECUTE 'ANALYZE ads';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'commissions') THEN
    EXECUTE 'ANALYZE commissions';
  END IF;
END $$;
