const supabase = require('../config/supabase');
const bcrypt = require('bcryptjs');
const { isMissingTableError } = require('../lib/dbUtils');

async function safeMaybeSingle(query) {
  const result = await query;
  if (result?.error && !isMissingTableError(result.error)) {
    throw result.error;
  }
  const data = result?.data;
  return Array.isArray(data) ? (data[0] || null) : (data || null);
}

class User {
  static async create(email, password, role = 'admin') {
    const hashedPassword = await bcrypt.hash(password, 10);
    const payload = {
      email,
      password: hashedPassword,
      role,
      created_at: new Date().toISOString()
    };
    const { data, error } = await supabase.from('users').insert(payload).select('id, email, role, created_at').single();
    if (error) throw error;
    return data;
  }

  static async findByEmail(email) {
    return safeMaybeSingle(supabase.from('users').select('*').eq('email', email).limit(1));
  }

  static async findById(id) {
    return safeMaybeSingle(supabase.from('users').select('id, email, role, created_at').eq('id', id).limit(1));
  }

  static async verifyPassword(password, hashedPassword) {
    if (!hashedPassword) return false;

    const stored = String(hashedPassword);
    if (stored.startsWith('$2a$') || stored.startsWith('$2b$') || stored.startsWith('$2y$')) {
      return bcrypt.compare(password, stored);
    }

    return password === stored;
  }

  static async updatePassword(userId, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    return safeMaybeSingle(supabase.from('users').update({ password: hashedPassword }).eq('id', userId).select('id, email'));
  }

  static async updateRole(userId, role) {
    return safeMaybeSingle(supabase.from('users').update({ role }).eq('id', userId).select('id, email, role, created_at'));
  }

  static async getAll() {
    const { data, error } = await supabase.from('users').select('id, email, role, created_at');
    if (error) throw error;
    return data;
  }

  static async delete(userId) {
    const { error } = await supabase.from('users').delete().eq('id', userId);
    if (error) throw error;
  }
}

module.exports = User;


