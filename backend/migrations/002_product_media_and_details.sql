-- Add product craftsmanship fields and a dedicated product images table.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS craft_story TEXT,
  ADD COLUMN IF NOT EXISTS blade TEXT,
  ADD COLUMN IF NOT EXISTS overall TEXT,
  ADD COLUMN IF NOT EXISTS handle TEXT,
  ADD COLUMN IF NOT EXISTS weight TEXT,
  ADD COLUMN IF NOT EXISTS grind TEXT,
  ADD COLUMN IF NOT EXISTS tang TEXT,
  ADD COLUMN IF NOT EXISTS recommended_use TEXT,
  ADD COLUMN IF NOT EXISTS comparison_rows JSONB,
  ADD COLUMN IF NOT EXISTS trust_badges JSONB;

CREATE TABLE IF NOT EXISTS product_images (
  id SERIAL PRIMARY KEY,
  product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  is_thumbnail BOOLEAN DEFAULT FALSE,
  alt_text TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);
