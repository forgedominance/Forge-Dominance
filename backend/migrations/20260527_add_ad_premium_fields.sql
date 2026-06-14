ALTER TABLE IF EXISTS public.ads
  ADD COLUMN IF NOT EXISTS badge text,
  ADD COLUMN IF NOT EXISTS kicker text,
  ADD COLUMN IF NOT EXISTS cta_label text,
  ADD COLUMN IF NOT EXISTS price numeric,
  ADD COLUMN IF NOT EXISTS compare_price numeric,
  ADD COLUMN IF NOT EXISTS perk_1 text,
  ADD COLUMN IF NOT EXISTS perk_2 text,
  ADD COLUMN IF NOT EXISTS perk_3 text;

ALTER TABLE IF EXISTS public.promotions
  ADD COLUMN IF NOT EXISTS badge text,
  ADD COLUMN IF NOT EXISTS kicker text,
  ADD COLUMN IF NOT EXISTS cta_label text,
  ADD COLUMN IF NOT EXISTS price numeric,
  ADD COLUMN IF NOT EXISTS compare_price numeric,
  ADD COLUMN IF NOT EXISTS perk_1 text,
  ADD COLUMN IF NOT EXISTS perk_2 text,
  ADD COLUMN IF NOT EXISTS perk_3 text;
