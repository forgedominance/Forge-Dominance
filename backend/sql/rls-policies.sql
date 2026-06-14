-- Supabase Row Level Security Policies
-- Run these in the Supabase SQL Editor to enforce server-side access control.
-- These policies assume all access goes through the service_role key (backend),
-- so they restrict direct client access if anon/authenticated keys are ever exposed.

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "Service role full access" ON users;
DROP POLICY IF EXISTS "Service role full access" ON orders;
DROP POLICY IF EXISTS "Service role full access" ON customers;
DROP POLICY IF EXISTS "Service role full access" ON products;
DROP POLICY IF EXISTS "Service role full access" ON commissions;

-- Service role (backend) gets full access
CREATE POLICY "Service role full access" ON users
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON orders
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON customers
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON products
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON commissions
  FOR ALL USING (auth.role() = 'service_role');

-- Block anon/authenticated direct access (no client-side reads/writes)
CREATE POLICY "Deny anon access" ON users
  FOR ALL USING (false);

CREATE POLICY "Deny anon access" ON orders
  FOR ALL USING (false);

CREATE POLICY "Deny anon access" ON customers
  FOR ALL USING (false);

CREATE POLICY "Deny anon access" ON products
  FOR ALL USING (false);

CREATE POLICY "Deny anon access" ON commissions
  FOR ALL USING (false);

-- If you later add authenticated user access (e.g., customers viewing their own orders):
-- CREATE POLICY "Customers view own orders" ON orders
--   FOR SELECT USING (auth.uid()::text = customer_id::text);
