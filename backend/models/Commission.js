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

class Commission {
  static async create(data) {
    const payload = {
      full_name: data.full_name,
      email: data.email,
      phone: data.phone || null,
      country: data.country || null,
      country_code: data.country_code || null,
      brief: data.brief,
      budget: data.budget || null,
      reference_image_url: data.reference_image_url || null,
      reference_image_path: data.reference_image_path || null,
      status: data.status || 'new',
      source: data.source || 'website',
      notes: data.notes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    const { data: result, error } = await supabase.from('commissions').insert(payload).select('*').single();
    if (error) throw error;
    return result;
  }

  static async findAll(limit = 50, offset = 0) {
    const start = offset;
    const end = offset + limit - 1;
    const { data, error } = await supabase.from('commissions').select('*').order('created_at', { ascending: false }).range(start, end);
    if (error) throw error;
    return data || [];
  }

  static async findById(id) {
    return safeMaybeSingle(supabase.from('commissions').select('*').eq('id', id).limit(1));
  }

  static async update(id, updates) {
    const payload = { ...updates, updated_at: new Date().toISOString() };
    return safeMaybeSingle(supabase.from('commissions').update(payload).eq('id', id).select('*'));
  }

  static async delete(id) {
    const { error } = await supabase.from('commissions').delete().eq('id', id);
    if (error) throw error;
  }

  static async deleteAll() {
    const { error } = await supabase.from('commissions').delete().neq('id', 0);
    if (error) throw error;
  }
}

module.exports = Commission;


