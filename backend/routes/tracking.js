const express = require('express');
const supabase = require('../config/supabase');
const { authenticate, authorize } = require('../middleware/auth');
const { isMissingTableError } = require('../lib/dbUtils');

const router = express.Router();

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  const realIp = req.headers['x-real-ip'];
  const connectingIp = req.headers['cf-connecting-ip'];
  const forwardedHeader = req.headers['forwarded'];

  const candidates = [
    connectingIp,
    realIp,
    forwardedHeader ? String(forwardedHeader).match(/for=([^;]+)/i)?.[1]?.replace(/"/g, '') : null,
    forwarded ? String(forwarded).split(',')[0].trim() : null,
    req.socket?.remoteAddress,
    req.ip
  ];

  const ip = candidates.find((value) => value && String(value).trim()) || 'unknown';
  return String(ip).replace(/^::ffff:/, '').replace(/^\[|\]$/g, '').trim();
}

// Track admin login
router.post('/admin/login', authenticate, async (req, res) => {
  try {
    const email = req.user?.email || null;
    const ip = getClientIp(req);
    const ua = req.headers['user-agent'] || null;

    const { data, error } = await supabase
      .from('admin_login_activity')
      .insert({
        admin_id: req.user?.userId || null,
        email,
        ip_address: ip,
        user_agent: ua,
        login_time: new Date().toISOString(),
        status: 'active',
        actions: []
      })
      .select();

    if (error && !isMissingTableError(error)) throw error;

    res.json({ ok: true, session: data?.[0] });
  } catch (error) {
    console.error('[Tracking] Error:', error);
    res.status(500).json({ error: 'An internal server error occurred' });
  }
});

// Track admin logout
router.post('/admin/logout', authenticate, async (req, res) => {
  try {
    const { sessionId } = req.body;
    const logoutTime = new Date().toISOString();
    const userEmail = req.user?.email || null;
    const userId = req.user?.userId || null;

    let targetSessionId = sessionId || null;

    if (!targetSessionId) {
      const { data: fallbackSession, error: fallbackError } = await supabase
        .from('admin_login_activity')
        .select('id')
        .eq('status', 'active')
        .or([
          userEmail ? `email.eq.${userEmail}` : null,
          userId ? `admin_id.eq.${userId}` : null
        ].filter(Boolean).join(','))
        .order('login_time', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fallbackError && !isMissingTableError(fallbackError)) throw fallbackError;
      targetSessionId = fallbackSession?.id || null;
    }

    if (!targetSessionId) return res.json({ ok: true, updated: 0 });

    const { data: sessionRow, error: sessionError } = await supabase
      .from('admin_login_activity')
      .select('login_time')
      .eq('id', targetSessionId)
      .maybeSingle();

    if (sessionError && !isMissingTableError(sessionError)) throw sessionError;

    const sessionDuration = sessionRow?.login_time
      ? Math.max(0, Math.floor((new Date(logoutTime).getTime() - new Date(sessionRow.login_time).getTime()) / 1000))
      : null;

    const { error } = await supabase
      .from('admin_login_activity')
      .update({
        logout_time: logoutTime,
        session_duration: sessionDuration,
        status: 'inactive'
      })
      .eq('id', targetSessionId);

    if (error && !isMissingTableError(error)) throw error;

    res.json({ ok: true, updated: 1, sessionId: targetSessionId });
  } catch (error) {
    console.error('[Tracking] Error:', error);
    res.status(500).json({ error: 'An internal server error occurred' });
  }
});

// Track admin action
router.post('/admin/action', authenticate, async (req, res) => {
  try {
    const { sessionId, action, details } = req.body;
    if (!sessionId || !action) return res.json({ ok: true });

    // Get current session
    const { data: session, error: sessionError } = await supabase
      .from('admin_login_activity')
      .select('actions')
      .eq('id', sessionId)
      .single();

    if (sessionError && !isMissingTableError(sessionError)) throw sessionError;

    const currentActions = session?.actions || [];
    currentActions.push({
      type: action,
      details,
      timestamp: new Date().toISOString()
    });

    const { error } = await supabase
      .from('admin_login_activity')
      .update({ actions: currentActions })
      .eq('id', sessionId);

    if (error && !isMissingTableError(error)) throw error;

    res.json({ ok: true });
  } catch (error) {
    console.error('[Tracking] Error:', error);
    res.status(500).json({ error: 'An internal server error occurred' });
  }
});

// Get admin login history
router.get('/admin/history', authenticate, async (req, res) => {
  try {
    const dayOffset = typeof req.query.dayOffset !== 'undefined' ? parseInt(req.query.dayOffset, 10) : null;

    let query = supabase.from('admin_login_activity').select('*').order('login_time', { ascending: false }).limit(100);

    if (!Number.isNaN(dayOffset) && dayOffset !== null && dayOffset >= 0 && dayOffset <= 6) {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - dayOffset);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      const startIso = start.toISOString();
      const endIso = end.toISOString();
      query = supabase.from('admin_login_activity').select('*').gte('login_time', startIso).lt('login_time', endIso).order('login_time', { ascending: false }).limit(1000);
    }

    const { data, error } = await query;

    if (error && !isMissingTableError(error)) throw error;

    res.json({ data: data || [] });
  } catch (error) {
    console.error('[Tracking] Error:', error);
    res.status(500).json({ error: 'An internal server error occurred' });
  }
});

// Delete a single admin login history entry (super-admin only)
router.delete('/admin/history/:id', authenticate, authorize('superadmin'), async (req, res) => {
  try {
    const { id } = req.params;
    // console.log('[tracking] Delete single history requested', { id, by: req.user?.userId || req.user?.email || null });

    const { data, error } = await supabase
      .from('admin_login_activity')
      .delete()
      .eq('id', id)
      .select();

    if (error && !isMissingTableError(error)) throw error;

    // console.log('[tracking] Delete single history result', { id, deletedCount: Array.isArray(data) ? data.length : (data ? 1 : 0) });

    res.json({ ok: true, deleted: Array.isArray(data) ? data.length : (data ? 1 : 0) });
  } catch (error) {
    console.error('[Tracking] Error:', error);
    res.status(500).json({ error: 'An internal server error occurred' });
  }
});

// Delete all admin login history (super-admin only)
router.delete('/admin/history', authenticate, authorize('superadmin'), async (req, res) => {
  try {
    // console.log('[tracking] Delete all history requested by', { by: req.user?.userId || req.user?.email || null, query: req.query });

    const dayOffset = typeof req.query.dayOffset !== 'undefined' ? parseInt(req.query.dayOffset, 10) : null;

    // Use a numeric-safe condition to target all rows (id is SERIAL integer)
    let delQuery = supabase.from('admin_login_activity').delete().gt('id', 0);

    if (!Number.isNaN(dayOffset) && dayOffset !== null && dayOffset >= 0 && dayOffset <= 6) {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - dayOffset);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      const startIso = start.toISOString();
      const endIso = end.toISOString();
      delQuery = supabase.from('admin_login_activity').delete().gte('login_time', startIso).lt('login_time', endIso);
    }

    const { data, error } = await delQuery.select();

    if (error && !isMissingTableError(error)) throw error;

    // console.log('[tracking] Delete all history result', { deletedCount: Array.isArray(data) ? data.length : (data ? 1 : 0) });

    res.json({ ok: true, deleted: Array.isArray(data) ? data.length : (data ? 1 : 0) });
  } catch (error) {
    console.error('[tracking] Delete all history error', error && (error.message || error));
    console.error('[Tracking] Error:', error);
    res.status(500).json({ error: 'An internal server error occurred' });
  }
});

// Debug: get raw recent rows (super-admin only)
router.get('/admin/history/raw', authenticate, authorize('superadmin'), async (req, res) => {
  try {
    const limit = Math.min(5000, Number(req.query.limit) || 1000);
    const { data, error } = await supabase.from('admin_login_activity').select('*').order('login_time', { ascending: false }).limit(limit);
    if (error && !isMissingTableError(error)) throw error;
    res.json({ data: data || [] });
  } catch (error) {
    console.error('[Tracking] Error:', error);
    res.status(500).json({ error: 'An internal server error occurred' });
  }
});

// Get logs for last 7 days (super-admin only)
router.get('/admin/history/week', authenticate, authorize('superadmin'), async (req, res) => {
  try {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 7);
    const { data, error } = await supabase.from('admin_login_activity').select('*').gte('login_time', start.toISOString()).lt('login_time', end.toISOString()).order('login_time', { ascending: false }).limit(5000);
    if (error && !isMissingTableError(error)) throw error;
    res.json({ data: data || [] });
  } catch (error) {
    console.error('[Tracking] Error:', error);
    res.status(500).json({ error: 'An internal server error occurred' });
  }
});

// Cleanup: delete logs older than 7 days (super-admin only)
router.delete('/admin/history/cleanup', authenticate, authorize('superadmin'), async (req, res) => {
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    const { data, error } = await supabase.from('admin_login_activity').delete().lt('login_time', cutoff.toISOString()).select();
    if (error && !isMissingTableError(error)) throw error;
    res.json({ ok: true, deleted: Array.isArray(data) ? data.length : (data ? 1 : 0) });
  } catch (error) {
    console.error('[Tracking] Error:', error);
    res.status(500).json({ error: 'An internal server error occurred' });
  }
});

// Track user page event
router.post('/track-page', async (req, res) => {
  try {
    const { visitorId, page, action, details, timeSpent } = req.body;

    const { error } = await supabase
      .from('user_page_events')
      .insert({
        visitor_id: String(visitorId || 'unknown'),
        page_path: String(page || '/'),
        action_type: String(action || 'view'),
        element_details: details,
        time_on_page: timeSpent || 0,
        entry_time: new Date().toISOString(),
        meta: {}
      });

    if (error && !isMissingTableError(error)) throw error;

    res.status(201).json({ ok: true });
  } catch (error) {
    console.error('[Tracking] Error:', error);
    res.status(500).json({ error: 'An internal server error occurred' });
  }
});

// Get user tracking summary
router.get('/track-summary', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('user_tracking')
      .select('*')
      .order('last_visit', { ascending: false })
      .limit(1000);

    if (error && !isMissingTableError(error)) throw error;

    res.json(data || []);
  } catch (error) {
    console.error('[Tracking] Error:', error);
    res.status(500).json({ error: 'An internal server error occurred' });
  }
});

// Get specific user tracking details
router.get('/track-details/:visitorId', authenticate, async (req, res) => {
  try {
    const { visitorId } = req.params;

    const { data, error } = await supabase
      .from('user_page_events')
      .select('*')
      .eq('visitor_id', visitorId)
      .order('created_at', { ascending: false })
      .limit(500);

    if (error && !isMissingTableError(error)) throw error;

    res.json(data || []);
  } catch (error) {
    console.error('[Tracking] Error:', error);
    res.status(500).json({ error: 'An internal server error occurred' });
  }
});

module.exports = router;
