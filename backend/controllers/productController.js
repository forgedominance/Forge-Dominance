const Product = require('../models/Product');
const redis = require('../lib/redisClient');

const CACHE_TTL = 120; // 2 minutes
const MAX_LIMIT = 1000;
const VALID_CATEGORIES = [
  'Hunters',
  'Camp & Trail',
  'Skinning Knives',
  'Folding Knives'
];

async function invalidateProductCaches(id) {
  const keys = [
    'products:featured',
    ...VALID_CATEGORIES.map(c => `products:category:${c}`)
  ];
  if (id) keys.push(`products:${id}`);
  for (let offset = 0; offset < 2000; offset += 200) {
    keys.push(`products:all:200:${offset}`);
  }
  keys.push('products:all:1000:0');
  keys.push('products:all:100:0');
  keys.push('products:all:20:0');
  await Promise.all(keys.map(k => redis.del(k)));
  redis.memFlush();
}

const productController = {
  getAll: async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit) || 20, MAX_LIMIT);
      const offset = parseInt(req.query.offset) || 0;
      const cacheKey = `products:all:${limit}:${offset}`;

      const result = await redis.getOrFetch(cacheKey, CACHE_TTL, async () => {
        const [products, total] = await Promise.all([
          Product.findAll(limit, offset),
          Product.getTotalCount()
        ]);
        return { data: products || [], total, limit, offset };
      });
      res.json(result);
    } catch (error) {
      console.error('[Products] Error:', error);
      res.status(500).json({ error: 'An internal server error occurred' });
    }
  },

  getById: async (req, res) => {
    try {
      const cacheKey = `products:${req.params.id}`;
      const result = await redis.getOrFetch(cacheKey, CACHE_TTL, async () => {
        const product = await Product.findById(req.params.id);
        if (!product) return null;
        return Product.attachImages(product);
      });
      if (!result) return res.status(404).json({ error: 'Product not found' });
      res.json(result);
    } catch (error) {
      console.error('[Products] Error:', error);
      res.status(500).json({ error: 'An internal server error occurred' });
    }
  },

  create: async (req, res) => {
    try {
      if (req.body.category && !VALID_CATEGORIES.includes(req.body.category)) {
        return res.status(400).json({ error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}` });
      }
      const product = await Product.create(req.body);
      const [normalized] = await Product.attachThumbnailsToProducts([product]);
      await invalidateProductCaches(null);
      res.status(201).json(normalized);
    } catch (error) {
      console.error('[Products] Error:', error);
      res.status(500).json({ error: 'An internal server error occurred' });
    }
  },

  update: async (req, res) => {
    try {
      if (req.body.category && !VALID_CATEGORIES.includes(req.body.category)) {
        return res.status(400).json({ error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}` });
      }
      const product = await Product.update(req.params.id, req.body);
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
      const [normalized] = await Product.attachThumbnailsToProducts([product]);
      await invalidateProductCaches(req.params.id);
      res.json(normalized);
    } catch (error) {
      console.error('[Products] Error:', error);
      res.status(500).json({ error: 'An internal server error occurred' });
    }
  },

  delete: async (req, res) => {
    try {
      await Product.delete(req.params.id);
      await invalidateProductCaches(req.params.id);
      res.json({ message: 'Product deleted successfully' });
    } catch (error) {
      console.error('[Products] Error:', error);
      res.status(500).json({ error: 'An internal server error occurred' });
    }
  },

  getFeatured: async (req, res) => {
    try {
      const result = await redis.getOrFetch('products:featured', 300, async () => {
        const products = await Product.getFeatured();
        return Product.attachThumbnailsToProducts(products || []);
      });
      res.json(result);
    } catch (error) {
      console.error('[Products] Error:', error);
      res.status(500).json({ error: 'An internal server error occurred' });
    }
  },

  getByCategory: async (req, res) => {
    try {
      const category = req.params.category;
      if (!VALID_CATEGORIES.includes(category)) {
        return res.status(400).json({ error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}` });
      }
      const result = await redis.getOrFetch(`products:category:${category}`, CACHE_TTL, async () => {
        const products = await Product.getByCategory(category);
        return Product.attachThumbnailsToProducts(products || []);
      });
      res.json(result);
    } catch (error) {
      console.error('[Products] Error:', error);
      res.status(500).json({ error: 'An internal server error occurred' });
    }
  },

  updateSortOrder: async (req, res) => {
    try {
      const { category, orderedIds } = req.body;
      if (!category || !VALID_CATEGORIES.includes(category)) {
        return res.status(400).json({ error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}` });
      }
      if (!Array.isArray(orderedIds) || !orderedIds.length) {
        return res.status(400).json({ error: 'orderedIds must be a non-empty array of product IDs' });
      }
      const mapped = orderedIds.map((id, index) => ({ id, sort_order: index + 1 }));
      await Product.updateSortOrder(mapped);
      await invalidateProductCaches(null);
      res.json({ message: 'Sort order updated', count: mapped.length });
    } catch (error) {
      console.error('[Products] Sort order error:', error);
      res.status(500).json({ error: 'An internal server error occurred' });
    }
  }
};

module.exports = productController;
module.exports.VALID_CATEGORIES = VALID_CATEGORIES;


