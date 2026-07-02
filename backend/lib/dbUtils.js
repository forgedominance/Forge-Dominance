function isMissingTableError(error) {
  const msg = String(error?.message || '').toLowerCase();
  const code = error?.code || '';
  if (code === '42703') return false;
  if (msg.includes('column') && msg.includes('does not exist')) return false;
  return msg.includes('does not exist') || msg.includes('schema cache');
}

module.exports = { isMissingTableError };


