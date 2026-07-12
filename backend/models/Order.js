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

class Order {
  static async generateOrderId() {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const yyyy = String(now.getFullYear());
    const { count } = await supabase.from('orders').select('*', { count: 'exact', head: true });
    const seq = String((count || 0) + 1);
    return parseInt(`${dd}${yyyy}${seq}`, 10);
  }

  static async create(data) {
    const { customer_id, status, total, items } = data;
    const orderId = await Order.generateOrderId();
    const payload = { id: orderId, customer_id, status, total, items: JSON.stringify(items), created_at: new Date().toISOString() };
    const { data: result, error } = await supabase.from('orders').insert(payload).select('*').single();
    if (error) throw error;
    const order = result;
    try { order.items = JSON.parse(order.items); } catch (e) { /* ignore */ }
    return order;
  }

  static async findAll(limit = 50, offset = 0) {
    const start = offset;
    const end = offset + limit - 1;
    const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false }).range(start, end);
    if (error) throw error;
    return data.map(o => { try { o.items = JSON.parse(o.items); } catch (e) {} return o; });
  }

  static async findById(id) {
    const data = await safeMaybeSingle(supabase.from('orders').select('*').eq('id', id).limit(1));
    if (data && data.items) {
      try { data.items = JSON.parse(data.items); } catch (e) { }
    }
    return data;
  }

  static async updateStatus(id, status) {
    return safeMaybeSingle(supabase.from('orders').update({ status, updated_at: new Date().toISOString() }).eq('id', id).select('*'));
  }

  static async update(id, data) {
    const payload = { ...data, updated_at: new Date().toISOString() };
    if (payload.items && typeof payload.items === 'object') {
      payload.items = JSON.stringify(payload.items);
    }
    const result = await safeMaybeSingle(supabase.from('orders').update(payload).eq('id', id).select('*'));
    if (result && result.items) {
      try { result.items = JSON.parse(result.items); } catch (e) { }
    }
    return result;
  }

  static async getByStatus(status, limit = 50, offset = 0) {
    const start = offset;
    const end = offset + limit - 1;
    const { data, error } = await supabase.from('orders').select('*').eq('status', status).order('created_at', { ascending: false }).range(start, end);
    if (error) throw error;
    return data.map(o => { try { o.items = JSON.parse(o.items); } catch (e) {} return o; });
  }

  static async getTotalRevenue() {
    const { data, error } = await supabase.from('orders').select('total').eq('status', 'completed');
    if (error) throw error;
    const sum = (data || []).reduce((acc, r) => acc + (parseFloat(r.total) || 0), 0);
    return sum;
  }

  static async getCompletedStats() {
    const { data, error, count } = await supabase
      .from('orders')
      .select('total', { count: 'exact' })
      .eq('status', 'completed');
    if (error) throw error;

    const completedOrders = count || (data ? data.length : 0);
    const totalRevenue = (data || []).reduce((acc, row) => acc + (parseFloat(row.total) || 0), 0);

    return { completedOrders, totalRevenue };
  }

  static async getTotalCount() {
    const { error, count } = await supabase.from('orders').select('*', { count: 'exact', head: true });
    if (error) throw error;
    return count || 0;
  }

  static async delete(id) {
    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (error) throw error;
    return { message: 'Order deleted successfully' };
  }

  static async deleteAll() {
    const { error } = await supabase.from('orders').delete().not('id', 'is', null);
    if (error) throw error;
  }
}

module.exports = Order;


