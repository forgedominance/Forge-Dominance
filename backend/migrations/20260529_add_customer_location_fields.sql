ALTER TABLE IF EXISTS public.customers
  ADD COLUMN IF NOT EXISTS address_line2 text,
  ADD COLUMN IF NOT EXISTS country text;