const Product = require('../models/Product');
const Order = require('../models/Order');
const Customer = require('../models/Customer');
const redis = require('../lib/redisClient');

const dashboardController = {
  getKPIs: async (req, res) => {
    try {
      const payload = await redis.getOrFetch('dashboard:kpis', 60, async () => {
        const [completedStats, totalCustomers, totalProducts] = await Promise.all([
          Order.getCompletedStats(),
          Customer.getTotalCount(),
          Product.getTotalCount()
        ]);
        const totalRevenue = completedStats.totalRevenue;
        const totalOrders = completedStats.completedOrders;
        const conversionRate = totalCustomers > 0 ? ((totalOrders / totalCustomers) * 100).toFixed(2) : 0;
        return { totalRevenue, totalOrders, totalCustomers, totalProducts, conversionRate };
      });
      res.json(payload);
    } catch (error) {
      console.error('[Dashboard] Error:', error);
      res.status(500).json({ error: 'An internal server error occurred' });
    }
  },

  getRevenueChart: async (req, res) => {
    try {
      const period = req.query.period || '7d';
      const rows = await redis.getOrFetch(`dashboard:revenue:${period}`, 120, async () => {
        const daysMap = { '7d': 7, '30d': 30, '90d': 90 };
        const days = daysMap[period] || 7;
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
        const supabase = require('../config/supabase');
        const { data: orders, error } = await supabase
          .from('orders')
          .select('total, created_at')
          .eq('status', 'completed')
          .gte('created_at', since)
          .order('created_at', { ascending: true });
        if (error) throw error;
        const byDay = {};
        (orders || []).forEach(o => {
          const day = new Date(o.created_at).toISOString().slice(0, 10);
          byDay[day] = (byDay[day] || 0) + (parseFloat(o.total) || 0);
        });
        return Object.keys(byDay).sort().map(day => ({ day, revenue: byDay[day] }));
      });
      res.json(rows);
    } catch (error) {
      console.error('[Dashboard] Error:', error);
      res.status(500).json({ error: 'An internal server error occurred' });
    }
  },

  getOrderStatusChart: async (req, res) => {
    try {
      const rows = await redis.getOrFetch('dashboard:order-status', 60, async () => {
        const supabase = require('../config/supabase');
        const statuses = ['pending', 'processing', 'completed', 'shipped', 'cancelled'];
        const counts = await Promise.all(
          statuses.map(async (status) => {
            const { count, error } = await supabase
              .from('orders')
              .select('*', { count: 'exact', head: true })
              .eq('status', status);
            if (error) return { status, count: 0 };
            return { status, count: count || 0 };
          })
        );
        return counts.filter(r => r.count > 0);
      });
      res.json(rows);
    } catch (error) {
      console.error('[Dashboard] Error:', error);
      res.status(500).json({ error: 'An internal server error occurred' });
    }
  },

  getRecentOrders: async (req, res) => {
    try {
      const enriched = await redis.getOrFetch('dashboard:recent-orders', 30, async () => {
        const orders = await Order.findAll(10, 0);
        if (!orders || orders.length === 0) return [];
        const customerIds = (orders || [])
          .map(o => o.customer_id)
          .filter(id => id !== undefined && id !== null);
        if (customerIds.length === 0) return orders;
        const supabase = require('../config/supabase');
        const { data: customers } = await supabase
          .from('customers')
          .select('id, name')
          .in('id', customerIds);
        const customerMap = new Map((customers || []).map(c => [c.id, c.name]));
        return (orders || []).map(o => ({
          ...o,
          customer_name: customerMap.get(o.customer_id) || null
        }));
      });
      res.json(enriched);
    } catch (error) {
      console.error('[Dashboard] Error:', error);
      res.status(500).json({ error: 'An internal server error occurred' });
    }
  },

  getAnalytics: async (req, res) => {
    try {
      const payload = await redis.getOrFetch('dashboard:analytics', 120, async () => {
        const [completedStats, totalCustomers, totalProducts, orders, customers] = await Promise.all([
          Order.getCompletedStats(),
          Customer.getTotalCount(),
          Product.getTotalCount(),
          Order.getByStatus('completed', 1000, 0),
          Customer.findAll(100, 0)
        ]);
        const totalRevenue = completedStats.totalRevenue;
        const totalOrders = completedStats.completedOrders;
        const conversionRate = totalCustomers > 0 ? ((totalOrders / totalCustomers) * 100).toFixed(2) : 0;
        const last7 = (orders || []).filter(o => new Date(o.created_at) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
        const byDay = {};
        last7.forEach(o => {
          const day = new Date(o.created_at).toISOString().slice(0, 10);
          byDay[day] = (byDay[day] || 0) + (parseFloat(o.total) || 0);
        });
        const revenueChart = Object.keys(byDay).sort().map(day => ({ day, revenue: byDay[day] }));
        const counts = {};
        (orders || []).forEach(o => { counts[o.status] = (counts[o.status] || 0) + 1; });
        const orderStatus = Object.keys(counts).map(k => ({ status: k, count: counts[k] }));
        const topCustomers = (customers || []).sort((a,b) => (b.total_spent||0) - (a.total_spent||0)).slice(0,5).map(c => ({ id: c.id, name: c.name, email: c.email, orders: c.orders, total_spent: c.total_spent }));
        return {
          kpis: { totalRevenue, totalOrders, totalCustomers, totalProducts, conversionRate },
          revenueChart,
          orderStatus,
          topCustomers
        };
      });
      res.json(payload);
    } catch (error) {
      console.error('[Dashboard] Error:', error);
      res.status(500).json({ error: 'An internal server error occurred' });
    }
  }
};

module.exports = dashboardController;


