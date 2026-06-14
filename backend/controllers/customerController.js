const Customer = require('../models/Customer');
const redis = require('../lib/redisClient');

const MAX_LIMIT = 100;

const customerController = {
  getAll: async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit) || 20, MAX_LIMIT);
      const offset = parseInt(req.query.offset) || 0;
      const cacheKey = `customers:list:${limit}:${offset}`;
      const result = await redis.getOrFetch(cacheKey, 60, async () => {
        const [customers, total] = await Promise.all([
          Customer.findAll(limit, offset),
          Customer.getTotalCount()
        ]);
        return { data: customers, total, limit, offset };
      });
      res.json(result);
    } catch (error) {
      console.error('[Customers] Error:', error);
      res.status(500).json({ error: 'An internal server error occurred' });
    }
  },

  getById: async (req, res) => {
    try {
      const cacheKey = `customers:single:${req.params.id}`;
      const result = await redis.getOrFetch(cacheKey, 60, async () => {
        const [customer, notes] = await Promise.all([
          Customer.findById(req.params.id),
          Customer.getNotes(req.params.id)
        ]);
        if (!customer) return null;
        return { ...customer, notes };
      });
      if (!result) return res.status(404).json({ error: 'Customer not found' });
      res.json(result);
    } catch (error) {
      console.error('[Customers] Error:', error);
      res.status(500).json({ error: 'An internal server error occurred' });
    }
  },

  create: async (req, res) => {
    try {
      const customer = await Customer.create(req.body);
      res.status(201).json(customer);
    } catch (error) {
      console.error('[Customers] Error:', error);
      res.status(500).json({ error: 'An internal server error occurred' });
    }
  },

  update: async (req, res) => {
    try {
      const customer = await Customer.update(req.params.id, req.body);
      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }
      res.json(customer);
    } catch (error) {
      console.error('[Customers] Error:', error);
      res.status(500).json({ error: 'An internal server error occurred' });
    }
  },

  delete: async (req, res) => {
    try {
      await Customer.delete(req.params.id);
      res.json({ message: 'Customer deleted successfully' });
    } catch (error) {
      console.error('[Customers] Error:', error);
      res.status(500).json({ error: 'An internal server error occurred' });
    }
  },

  addNote: async (req, res) => {
    try {
      const { note } = req.body;
      const result = await Customer.addNote(req.params.id, note);
      res.status(201).json(result);
    } catch (error) {
      console.error('[Customers] Error:', error);
      res.status(500).json({ error: 'An internal server error occurred' });
    }
  }
};

module.exports = customerController;
