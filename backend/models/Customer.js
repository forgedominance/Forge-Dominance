const supabase = require('../config/supabase');
const { isMissingTableError } = require('../lib/dbUtils');

async function safeMaybeSingle(query) {
  const result = await query;
  if (result?.error && !isMissingTableError(result.error)) {
    throw result.error;
  }
  const data = result?.data;
  return Array.isArray(data) ? (data[0] || null) : (data || null);
}

class Customer {
  static async create(data) {
    const { name, email, phone, address, address_line2, city, state, zip, country } = data;
    const payload = { name, email, phone, address, address_line2, city, state, zip, country, created_at: new Date().toISOString() };
    const { data: result, error } = await supabase.from('customers').insert(payload).select('*').single();
    if (error) throw error;
    return result;
  }

  static async findAll(limit = 50, offset = 0) {
    const start = offset;
    const end = offset + limit - 1;
    const { data, error } = await supabase.from('customers').select('*').order('created_at', { ascending: false }).range(start, end);
    if (error) throw error;
    
    if (!data || data.length === 0) return [];
    
    // OPTIMIZED: Fetch all orders for all customers in ONE query instead of N+1
    const customerIds = data.map(c => c.id).filter(id => id !== undefined && id !== null);
    
    // Single query to get all orders for all customers
    const { data: allOrders, error: orderError } = await supabase
      .from('orders')
      .select('customer_id, total, status')
      .in('customer_id', customerIds);
    
    if (orderError) throw orderError;
    
    // Build a map of customer_id -> [orders]
    const ordersMap = new Map();
    (allOrders || []).forEach(order => {
      if (!ordersMap.has(order.customer_id)) {
        ordersMap.set(order.customer_id, []);
      }
      ordersMap.get(order.customer_id).push(order);
    });
    
    // Attach aggregated order stats to each customer
    const customers = data.map(c => {
      const customerOrders = ordersMap.get(c.id) || [];
      const ordersCount = customerOrders.length;
      const totalSpent = customerOrders.reduce((acc, r) => acc + (parseFloat(r.total) || 0), 0);
      return { ...c, orders: ordersCount, total_spent: totalSpent };
    });
    
    return customers;
  }

  static async findById(id) {
    const data = await safeMaybeSingle(supabase.from('customers').select('*').eq('id', id).limit(1));
    if (!data) return null;
    const { data: orders } = await supabase.from('orders').select('total').eq('customer_id', id);
    const ordersCount = (orders || []).length;
    const totalSpent = (orders || []).reduce((acc, r) => acc + (parseFloat(r.total) || 0), 0);
    return { ...data, orders: ordersCount, total_spent: totalSpent };
  }

  static async findByEmail(email) {
    return safeMaybeSingle(supabase.from('customers').select('*').eq('email', email).limit(1));
  }

  static async update(id, data) {
    const { name, email, phone, address, address_line2, city, state, zip, country } = data;
    return safeMaybeSingle(supabase.from('customers').update({ name, email, phone, address, address_line2, city, state, zip, country }).eq('id', id).select('*'));
  }

  static async getTotalCount() {
    const { error, count } = await supabase.from('customers').select('*', { count: 'exact', head: true });
    if (error) throw error;
    return count || 0;
  }

  static async addNote(customerId, note) {
    const payload = { customer_id: customerId, note, created_at: new Date().toISOString() };
    const { data: result, error } = await supabase.from('customer_notes').insert(payload).select('*').single();
    if (error) throw error;
    return result;
  }

  static async getNotes(customerId) {
    const { data, error } = await supabase.from('customer_notes').select('*').eq('customer_id', customerId).order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }

  static async delete(id) {
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) throw error;
  }
}

module.exports = Customer;


