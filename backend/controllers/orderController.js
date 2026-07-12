const Order = require('../models/Order');
const Customer = require('../models/Customer');
const redis = require('../lib/redisClient');

const MAX_LIMIT = 100;

function splitCustomerName(customerName) {
  const [firstName = '', ...lastNameParts] = String(customerName || '').trim().split(/\s+/).filter(Boolean);
  return {
    customerFirstName: firstName || undefined,
    customerLastName: lastNameParts.join(' ') || undefined
  };
}

function enrichOrderRecord(order, customer) {
  const customerName = customer?.name || order.customer_name || '';
  const nameParts = splitCustomerName(customerName);

  return {
    ...order,
    customer_name: customerName || undefined,
    customer_first_name: nameParts.customerFirstName,
    customer_last_name: nameParts.customerLastName,
    customer_email: customer?.email || order.customer_email || undefined,
    customer_phone: customer?.phone || order.customer_phone || undefined,
    customer_address: customer?.address || order.customer_address || undefined,
    customer_city: customer?.city || order.customer_city || undefined,
    customer_state: customer?.state || order.customer_state || undefined,
    customer_zip: customer?.zip || order.customer_zip || undefined,
    customer
  };
}

async function fetchCustomersByIds(customerIds) {
  const uniqueIds = [...new Set(customerIds.filter((id) => id !== undefined && id !== null))];
  if (!uniqueIds.length) return new Map();

  const supabase = require('../config/supabase');
  const { data: customers, error } = await supabase
    .from('customers')
    .select('id, name, email, phone, address, city, state, zip')
    .in('id', uniqueIds);

  if (error) throw error;

  return new Map((customers || []).map((customer) => [customer.id, customer]));
}

const orderController = {
  enrichOrder: async (order) => {
    if (!order) return order;

    let customer = null;
    if (order.customer_id) {
      try {
        customer = await Customer.findById(order.customer_id);
      } catch (error) {
        customer = null;
      }
    }

    const customerName = customer?.name || order.customer_name || '';
    return enrichOrderRecord(order, customer);
  },

  getAll: async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit) || 20, MAX_LIMIT);
      const offset = parseInt(req.query.offset) || 0;
      const cacheKey = `orders:list:${limit}:${offset}`;
      const result = await redis.getOrFetch(cacheKey, 20, async () => {
        const [orders, total] = await Promise.all([
          Order.findAll(limit, offset),
          Order.getTotalCount()
        ]);
        const customerMap = await fetchCustomersByIds((orders || []).map((order) => order.customer_id));
        const enriched = (orders || []).map((order) => enrichOrderRecord(order, customerMap.get(order.customer_id) || null));
        return { data: enriched, total, limit, offset };
      });
      res.json(result);
    } catch (error) {
      console.error('[Orders] Error:', error);
      res.status(500).json({ error: 'An internal server error occurred' });
    }
  },

  getById: async (req, res) => {
    try {
      const cacheKey = `orders:single:${req.params.id}`;
      const result = await redis.getOrFetch(cacheKey, 30, async () => {
        const order = await Order.findById(req.params.id);
        if (!order) return null;
        return orderController.enrichOrder(order);
      });
      if (!result) return res.status(404).json({ error: 'Order not found' });
      res.json(result);
    } catch (error) {
      console.error('[Orders] Error:', error);
      res.status(500).json({ error: 'An internal server error occurred' });
    }
  },

  create: async (req, res) => {
    try {
      let customerId = req.body.customer_id;
      
      // If customer details provided, create or find customer
      if (!customerId && req.body.customer_email) {
        let customer = await Customer.findByEmail(req.body.customer_email);
        if (!customer) {
          const customerName = String(req.body.customer_name || '').trim();
          const firstName = req.body.customer_first_name || customerName.split(/\s+/)[0] || 'Customer';
          const lastName = req.body.customer_last_name || customerName.split(/\s+/).slice(1).join(' ') || '';
          customer = await Customer.create({
            name: `${firstName} ${lastName}`.trim(),
            email: req.body.customer_email,
            phone: req.body.customer_phone || null,
            address: req.body.customer_address || null,
            city: req.body.customer_city || null,
            state: req.body.customer_state || null,
            zip: req.body.customer_zip || null
          });
        }
        customerId = customer.id;
      }

      const order = await Order.create({
        customer_id: customerId,
        status: req.body.status || 'Pending',
        total: req.body.total || 0,
        items: req.body.items || {}
      });
      res.status(201).json(await orderController.enrichOrder(order));
    } catch (error) {
      console.error('[Orders] Error:', error);
      res.status(500).json({ error: 'An internal server error occurred' });
    }
  },

  updateStatus: async (req, res) => {
    try {
      const { status } = req.body;
      const existingOrder = await Order.findById(req.params.id);
      if (!existingOrder) {
        return res.status(404).json({ error: 'Order not found' });
      }

      const previousStatus = (existingOrder.status || '').toLowerCase();
      const order = await Order.updateStatus(req.params.id, status);
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      let emailSent = false;
      const isPlacedTransition = (status === 'placed' || status === 'confirmed')
        && previousStatus !== 'placed' && previousStatus !== 'confirmed';

      if (isPlacedTransition) {
        try {
          let rawItems = order.items;
          if (typeof rawItems === 'string') { try { rawItems = JSON.parse(rawItems); } catch(_) { rawItems = {}; } }
          const itemsData = rawItems && typeof rawItems === 'object' && !Array.isArray(rawItems) ? rawItems : {};
          let customerEmail = itemsData.email || null;
          let customerName = itemsData.firstName ? `${itemsData.firstName} ${itemsData.lastName || ''}`.trim() : null;

          if (!customerEmail && order.customer_id) {
            const customer = await Customer.findById(order.customer_id);
            if (customer) {
              customerEmail = customer.email;
              customerName = customerName || customer.name || 'Customer';
            }
          }

          if (customerEmail) {
            const nodemailer = require('nodemailer');
            const supabase = require('../config/supabase');
            const { getOrderConfirmationEmail } = require('../lib/emailTemplates');

            const { data: smtp } = await supabase.from('smtp_credentials').select('*').order('id', { ascending: false }).limit(1).maybeSingle();
            const { data: settingsRow } = await supabase.from('admin_settings').select('value').eq('key', 'global').limit(1).maybeSingle();
            const cfg = settingsRow?.value || {};

            const senderEmail = smtp?.sender_email || cfg.senderEmail || process.env.SMTP_SENDER_EMAIL;
            const appPassword = (smtp?.app_password || cfg.appPassword || process.env.SMTP_APP_PASSWORD || '').replace(/\s+/g, '');
            const smtpHost = smtp?.smtp_host || cfg.smtpHost || process.env.SMTP_HOST || 'smtp.gmail.com';
            const smtpPort = Number(smtp?.smtp_port || cfg.smtpPort || process.env.SMTP_PORT || 587);

            if (senderEmail && appPassword) {
              const transporter = nodemailer.createTransport({
                host: smtpHost, port: smtpPort, secure: smtpPort === 465,
                auth: { user: senderEmail, pass: appPassword },
                connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
                tls: { rejectUnauthorized: false }
              });

              const cartItems = Array.isArray(itemsData.items) ? itemsData.items : [];
              const emailData = getOrderConfirmationEmail({
                ...order,
                customer_name: customerName || 'Customer',
                items: cartItems,
                total: order.total
              });

              await transporter.sendMail({
                from: `Forge Dominance <${senderEmail}>`,
                to: customerEmail,
                subject: emailData.subject,
                html: emailData.html
              });
              emailSent = true;
            }
          }
        } catch (emailErr) {
          console.error('[Order Confirm Email] Failed:', emailErr.message);
        }
      }

      res.json({ ...order, emailSent });
    } catch (error) {
      console.error('[Orders] Error:', error);
      res.status(500).json({ error: 'An internal server error occurred' });
    }
  },

  update: async (req, res) => {
    try {
      // If customer details provided, update customer
      if (req.body.customer_email) {
        const order = await Order.findById(req.params.id);
        if (order && order.customer_id) {
          const customerName = String(req.body.customer_name || '').trim();
          const firstName = req.body.customer_first_name || customerName.split(/\s+/)[0] || 'Customer';
          const lastName = req.body.customer_last_name || customerName.split(/\s+/).slice(1).join(' ') || '';
          const customerData = {
            name: `${firstName} ${lastName}`.trim(),
            email: req.body.customer_email,
            phone: req.body.customer_phone || null,
            address: req.body.customer_address || null,
            city: req.body.customer_city || null,
            state: req.body.customer_state || null,
            zip: req.body.customer_zip || null,
            updated_at: new Date().toISOString()
          };
          await Customer.update(order.customer_id, customerData);
        }
      }

      const updateData = {
        status: req.body.status,
        total: req.body.total,
        items: req.body.items
      };
      const order = await Order.update(req.params.id, updateData);
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }
      res.json(await orderController.enrichOrder(order));
    } catch (error) {
      console.error('[Orders] Error:', error);
      res.status(500).json({ error: 'An internal server error occurred' });
    }
  },

  getByStatus: async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit) || 20, MAX_LIMIT);
      const offset = parseInt(req.query.offset) || 0;
      const cacheKey = `orders:status:${req.params.status}:${limit}:${offset}`;
      const result = await redis.getOrFetch(cacheKey, 20, async () => {
        const orders = await Order.getByStatus(req.params.status, limit, offset);
        const customerMap = await fetchCustomersByIds((orders || []).map((order) => order.customer_id));
        const enriched = (orders || []).map((order) => enrichOrderRecord(order, customerMap.get(order.customer_id) || null));
        return { data: enriched, total: enriched.length, limit, offset };
      });
      res.json(result);
    } catch (error) {
      console.error('[Orders] Error:', error);
      res.status(500).json({ error: 'An internal server error occurred' });
    }
  },

  delete: async (req, res) => {
    try {
      await Order.delete(req.params.id);
      redis.del(`orders:single:${req.params.id}`).catch(() => {});
      redis.delPattern('orders:list:').catch(() => {});
      res.json({ message: 'Order deleted successfully' });
    } catch (error) {
      console.error('[Orders] Error:', error);
      res.status(500).json({ error: 'An internal server error occurred' });
    }
  },

  deleteAll: async (req, res) => {
    try {
      await Order.deleteAll();
      redis.delPattern('orders:list:').catch(() => {});
      redis.delPattern('orders:single:').catch(() => {});
      res.json({ message: 'All orders deleted successfully' });
    } catch (error) {
      console.error('[Orders] Error:', error);
      res.status(500).json({ error: 'An internal server error occurred' });
    }
  }
};

module.exports = orderController;


