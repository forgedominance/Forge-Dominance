const express = require('express');
const supabase = require('../config/supabase');
const { authenticate } = require('../middleware/auth');
const { isMissingTableError } = require('../lib/dbUtils');
const redis = require('../lib/redisClient');

const router = express.Router();

const MAX_SSE_CONNECTIONS = 50;
const sseClients = new Set();

function broadcastEventToSseClients(payload) {
  const msg = `data: ${JSON.stringify(payload)}\n\n`;
  sseClients.forEach((res) => {
    try {
      res.write(msg);
    } catch (err) {
      // ignore write errors; cleanup happens on close
    }
  });
}

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

router.post('/track', async (req, res) => {
  try {
    const events = Array.isArray(req.body?.events) ? req.body.events : [req.body];

    for (const evt of events) {
      const p = String(evt?.path || '');
      if (p && (p.length > 500 || !p.startsWith('/'))) {
        return res.status(400).json({ error: 'Validation failed', fields: { path: 'Path must start with / and be under 500 characters' } });
      }
    }

    const payloads = events.map((evt) => {
      let meta = evt?.meta || {};
      try {
        meta = JSON.parse(JSON.stringify(meta).replace(/\\u[dD][89aAbB][0-9a-fA-F]{2}/g, ''));
      } catch { meta = {}; }
      return {
        visitor_id: String(evt?.visitorId || 'unknown'),
        ip_address: getClientIp(req),
        user_agent: (req.headers['user-agent'] || '').slice(0, 500) || null,
        path: String(evt?.path || '/'),
        action: String(evt?.action || 'pageview'),
        meta,
        created_at: new Date().toISOString()
      };
    });

    const { error } = await supabase.from('visitor_events').insert(payloads);
    if (error) {
      if (isMissingTableError(error)) {
        payloads.forEach((p) => { try { broadcastEventToSseClients(p); } catch(e){} });
        return res.status(201).json({ ok: true, skipped: true, count: payloads.length });
      }
      throw error;
    }

    payloads.forEach((p) => { try { broadcastEventToSseClients(p); } catch (e) {} });

    res.status(201).json({ ok: true, count: payloads.length });
  } catch (error) {
    console.error('[Visitors] Error:', error);
    res.status(500).json({ error: 'An internal server error occurred' });
  }
});


router.get('/stream', (req, res) => {
  if (sseClients.size >= MAX_SSE_CONNECTIONS) {
    return res.status(503).json({ error: 'Max SSE connections reached. Try again later.' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  res.write(': connected\n\n');
  sseClients.add(res);

  const keepAlive = setInterval(() => {
    try { res.write(':\n\n'); } catch (e) { cleanup(); }
  }, 25000);

  const maxLifetime = setTimeout(() => { cleanup(); }, 2 * 60 * 60 * 1000);

  function cleanup() {
    clearInterval(keepAlive);
    clearTimeout(maxLifetime);
    sseClients.delete(res);
    try { res.end(); } catch (e) {}
  }

  req.on('close', cleanup);
  req.on('error', cleanup);
});

router.get('/events', authenticate, async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 500);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
    const sinceRaw = String(req.query.since || '').toLowerCase();
    const cacheKey = `visitors:events:${limit}:${offset}:${sinceRaw}`;

    const result = await redis.getOrFetch(cacheKey, 30, async () => {
      const end = offset + limit - 1;
      let cutoff = null;
      if (sinceRaw) {
        const m = sinceRaw.match(/^(\d+)(h|d|w|m)$/);
        if (m) {
          const n = parseInt(m[1], 10);
          const unit = m[2];
          let ms = 0;
          if (unit === 'h') ms = n * 60 * 60 * 1000;
          else if (unit === 'd') ms = n * 24 * 60 * 60 * 1000;
          else if (unit === 'w') ms = n * 7 * 24 * 60 * 60 * 1000;
          else if (unit === 'm') ms = n * 30 * 24 * 60 * 60 * 1000;
          if (ms > 0) cutoff = new Date(Date.now() - ms).toISOString();
        }
      }

      let query = supabase
        .from('visitor_events')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, end);
      if (cutoff) query = query.gte('created_at', cutoff);

      const [eventsRes, countRes] = await Promise.all([
        query,
        supabase.from('visitor_events').select('*', { count: 'exact', head: true })
      ]);

      if (eventsRes.error) {
        if (isMissingTableError(eventsRes.error)) return { data: [], total: 0, limit, offset };
        throw eventsRes.error;
      }
      const total = (countRes.error && !isMissingTableError(countRes.error)) ? 0 : (countRes.count || 0);
      return { data: eventsRes.data || [], total, limit, offset };
    });
    res.json(result);
  } catch (error) {
    console.error('[Visitors] Error:', error);
    res.status(500).json({ error: 'An internal server error occurred' });
  }
});

router.get('/summary', authenticate, async (req, res) => {
  try {
    const sinceRaw = String(req.query.since || '7d').toLowerCase();
    const cacheKey = `visitors:summary:${sinceRaw}`;

    const result = await redis.getOrFetch(cacheKey, 60, async () => {
      let cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const m = sinceRaw.match(/^(\d+)(h|d|w|m)$/);
      if (m) {
        const n = parseInt(m[1], 10);
        const unit = m[2];
        let ms = 0;
        if (unit === 'h') ms = n * 60 * 60 * 1000;
        else if (unit === 'd') ms = n * 24 * 60 * 60 * 1000;
        else if (unit === 'w') ms = n * 7 * 24 * 60 * 60 * 1000;
        else if (unit === 'm') ms = n * 30 * 24 * 60 * 60 * 1000;
        if (ms > 0) cutoff = new Date(Date.now() - ms).toISOString();
      }

      const { data, error } = await supabase
        .from('visitor_events')
        .select('*')
        .gte('created_at', cutoff)
        .order('created_at', { ascending: false })
        .range(0, 499);

      if (error) {
        if (isMissingTableError(error)) return { data: [] };
        throw error;
      }

      const allEvents = Array.isArray(data) ? data : [];
      const byVisitor = new Map();
      allEvents.forEach((entry) => {
        const id = entry.visitor_id || entry.ip_address || 'unknown';
        if (!byVisitor.has(id)) {
          byVisitor.set(id, { id, ip: entry.ip_address, lastSeen: entry.created_at, pageViews: 0, actions: 0, paths: new Set(), durationMs: 0, timeline: [] });
        }
        const v = byVisitor.get(id);
        if (entry.ip_address) v.ip = entry.ip_address;
        if (entry.action === 'pageview') v.pageViews += 1;
        else v.actions += 1;
        const duration = Number(entry.meta?.durationMs || 0);
        if (duration > 0) v.durationMs += duration;
        v.paths.add(entry.path);
        if (v.timeline.length < 40) {
          v.timeline.push({ at: entry.created_at, action: entry.action, path: entry.path, meta: entry.meta || {} });
        }
        if (new Date(entry.created_at) > new Date(v.lastSeen)) v.lastSeen = entry.created_at;
      });

      const visitors = Array.from(byVisitor.values()).map((v) => ({
        id: v.id, ip: v.ip, lastSeen: v.lastSeen, pageViews: v.pageViews, actions: v.actions,
        uniquePaths: v.paths.size, paths: Array.from(v.paths).slice(0, 20),
        durationMs: v.durationMs, durationMinutes: Math.round((v.durationMs / 60000) * 10) / 10,
        timeline: v.timeline.sort((a, b) => new Date(b.at) - new Date(a.at))
      }));
      return { data: visitors };
    });
    res.json(result);
  } catch (error) {
    console.error('[Visitors] Error:', error);
    res.status(500).json({ error: 'An internal server error occurred' });
  }
});

router.get('/summary-by-ip', authenticate, async (req, res) => {
  try {
    const sinceRaw = String(req.query.since || '7d').toLowerCase();
    const cacheKey = `visitors:summary-by-ip:${sinceRaw}`;

    if (redis.isReady()) {
      const cached = await redis.get(cacheKey);
      if (cached) return res.json(cached);
    }

    let cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    if (sinceRaw !== 'all') {
      const m = sinceRaw.match(/^(\d+)(h|d|w|m)$/);
      if (m) {
        const n = parseInt(m[1], 10);
        const unit = m[2];
        let ms = 0;
        if (unit === 'h') ms = n * 60 * 60 * 1000;
        else if (unit === 'd') ms = n * 24 * 60 * 60 * 1000;
        else if (unit === 'w') ms = n * 7 * 24 * 60 * 60 * 1000;
        else if (unit === 'm') ms = n * 30 * 24 * 60 * 60 * 1000;
        if (ms > 0) cutoff = new Date(Date.now() - ms).toISOString();
      }
    } else {
      cutoff = null;
    }

    let query = supabase
      .from('visitor_events')
      .select('*')
      .order('created_at', { ascending: false })
      .range(0, 499);

    if (cutoff) query = query.gte('created_at', cutoff);

    const { data, error } = await query;
    if (error) {
      if (isMissingTableError(error)) return res.json({ data: [] });
      throw error;
    }

    const allEvents = Array.isArray(data) ? data : [];

    const byVisitorId = new Map();
    const byIp = new Map();

    allEvents.forEach((entry) => {
      const ip = entry.ip_address || 'unknown';
      const visitorId = entry.visitor_id || 'unknown';

      if (!byVisitorId.has(visitorId)) {
        byVisitorId.set(visitorId, {
          visitor_id: visitorId,
          ip: ip,
          pageViews: 0,
          actions: 0,
          firstSeen: entry.created_at,
          lastSeen: entry.created_at,
          paths: new Set(),
          durationMs: 0
        });
      }
      const visitor = byVisitorId.get(visitorId);
      visitor.ip = ip;
      if (entry.action === 'pageview') visitor.pageViews += 1;
      else visitor.actions += 1;
      const duration = Number(entry.meta?.durationMs || 0);
      if (duration > 0) visitor.durationMs += duration;
      if (entry.path) visitor.paths.add(entry.path);
      if (new Date(entry.created_at) > new Date(visitor.lastSeen)) visitor.lastSeen = entry.created_at;
      if (new Date(entry.created_at) < new Date(visitor.firstSeen)) visitor.firstSeen = entry.created_at;

      if (!byIp.has(ip)) {
        byIp.set(ip, {
          ip,
          visitorIds: new Set(),
          pageViews: 0,
          actions: 0,
          paths: new Set(),
          durationMs: 0,
          lastSeen: entry.created_at,
          timeline: []
        });
      }
      const v = byIp.get(ip);
      v.visitorIds.add(visitorId);
      if (entry.action === 'pageview') v.pageViews += 1;
      else v.actions += 1;
      if (duration > 0) v.durationMs += duration;
      if (entry.path) v.paths.add(entry.path);
      if (v.timeline.length < 50) {
        v.timeline.push({ at: entry.created_at, action: entry.action, path: entry.path, meta: entry.meta || {} });
      }
      if (new Date(entry.created_at) > new Date(v.lastSeen)) v.lastSeen = entry.created_at;
    });

    const grouped = Array.from(byIp.values()).map((v) => ({
      ip: v.ip,
      count: v.visitorIds.size,
      pageViews: v.pageViews,
      actions: v.actions,
      uniquePaths: v.paths.size,
      paths: Array.from(v.paths).slice(0, 20),
      durationMs: v.durationMs,
      durationMinutes: Math.round((v.durationMs / 60000) * 10) / 10,
      lastSeen: v.lastSeen,
      timeline: v.timeline.sort((a, b) => new Date(b.at) - new Date(a.at)),
      visitors: Array.from(v.visitorIds).map(vid => {
        const visitor = byVisitorId.get(vid);
        return {
          visitor_id: visitor.visitor_id,
          pageViews: visitor.pageViews,
          actions: visitor.actions,
          durationMinutes: Math.round((visitor.durationMs / 60000) * 10) / 10,
          firstSeen: visitor.firstSeen,
          lastSeen: visitor.lastSeen,
          paths: Array.from(visitor.paths).slice(0, 10).join(', ')
        };
      }).sort((a, b) => new Date(b.lastSeen) - new Date(a.lastSeen))
    }));

    grouped.sort((a, b) => new Date(b.lastSeen) - new Date(a.lastSeen));

    const result = { data: grouped };
    if (redis.isReady()) await redis.set(cacheKey, result, 60);
    res.json(result);
  } catch (error) {
    console.error('[Visitors] Error:', error);
    res.status(500).json({ error: 'An internal server error occurred' });
  }
});

module.exports = router;
