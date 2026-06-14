-- Performance Optimization: Add Missing Indexes
-- Created: May 8, 2026
-- Purpose: Improve query performance for dashboard, product pages, and customer lists

-- ====== CRITICAL INDEXES ======

-- Products: Optimize ORDER BY created_at (used in findAll, getFeatured, getByCategory)
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);

-- Products: Optimize featured products query
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(featured) WHERE featured = true;

-- Products: Composite index for featured + created_at
CREATE INDEX IF NOT EXISTS idx_products_featured_created ON products(featured, created_at DESC) WHERE featured = true;

-- Orders: Optimize ORDER BY created_at (used in dashboard analytics)
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- Orders: Composite index for status + created_at (common filter + sort)
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(status, created_at DESC);

-- Customers: Optimize ORDER BY created_at (used in customer list)
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at DESC);

-- ====== SECONDARY PERFORMANCE INDEXES ======

-- Product Images: Already has product_id index, but add sort_order for ordering
CREATE INDEX IF NOT EXISTS idx_product_images_sort ON product_images(product_id, sort_order ASC);

-- Orders: customer_id + created_at for customer order history
CREATE INDEX IF NOT EXISTS idx_orders_customer_created ON orders(customer_id, created_at DESC);

-- Visitor Events: Optimize path-based queries
CREATE INDEX IF NOT EXISTS idx_visitor_events_path ON visitor_events(path, created_at DESC);

-- Visitor Events: Composite for common dashboard queries
CREATE INDEX IF NOT EXISTS idx_visitor_events_path_created ON visitor_events(path, created_at DESC) WHERE action = 'pageview';

-- ====== SKU LOOKUP ======

-- Products: SKU is already UNIQUE, so it has an implicit index, but explicit is better
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku) WHERE sku IS NOT NULL;

-- ====== OPTIONAL: For future scaling ======

-- Campaign Email Logs: Useful when email reports needed
-- Only create if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'campaign_email_logs') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_campaign_email_logs_created ON campaign_email_logs(created_at DESC)';
  END IF;
END $$;

-- Promotions: For active promotions queries
-- Only create if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'promotions') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_promotions_active_updated ON promotions(is_active, updated_at DESC) WHERE is_active = true';
  END IF;
END $$;

-- ====== STATISTICS & QUERY PLANNING ======

-- Analyze tables for query planner to get accurate estimates
ANALYZE products;
ANALYZE orders;
ANALYZE customers;
ANALYZE product_images;
ANALYZE visitor_events;

-- Analyze optional tables if they exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'campaign_email_logs') THEN
    EXECUTE 'ANALYZE campaign_email_logs';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'promotions') THEN
    EXECUTE 'ANALYZE promotions';
  END IF;
END $$;

-- Query to see index sizes (run after):
-- SELECT schemaname, tablename, indexname, idx_size 
-- FROM pg_indexes 
-- JOIN pg_class ON relname = indexname 
-- JOIN pg_stat_user_indexes ON indexrelname = indexname
-- ORDER BY idx_size DESC;
