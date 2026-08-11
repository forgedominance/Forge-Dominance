const express = require('express');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const supabase = require('../config/supabase');
const { authenticate, authorize } = require('../middleware/auth');
const redis = require('../lib/redisClient');

const router = express.Router();
const BACKEND_ROOT = path.resolve(__dirname, '..');
const SHARED_UPLOADS_DIR = path.resolve(__dirname, '..', '..', 'assets', 'uploads');
const PROMOTIONS_STORE_FILE = path.resolve(SHARED_UPLOADS_DIR, 'promotions-store.json');
const ADS_STORE_FILE = path.resolve(SHARED_UPLOADS_DIR, 'ads-store.json');
const COUPONS_STORE_FILE = path.resolve(SHARED_UPLOADS_DIR, 'coupons-store.json');
const COMMISSIONS_STORE_FILE = path.resolve(SHARED_UPLOADS_DIR, 'commissions-store.json');
const CAMPAIGN_STORE_FILE = path.resolve(SHARED_UPLOADS_DIR, 'campaign-email-logs.json');
const SETTINGS_FALLBACK_FILE = path.resolve(SHARED_UPLOADS_DIR, 'settings-fallback.json');
const DEFAULT_SMTP_SETTINGS = {
  smtpHost: 'smtp.gmail.com',
  smtpPort: 587,
  smtpEncryption: 'TLS',
  senderName: 'Bladesmith Admin'
};

fs.mkdirSync(path.dirname(PROMOTIONS_STORE_FILE), { recursive: true });

const { isMissingTableError } = require('../lib/dbUtils');

async function safeMaybeSingle(query) {
  const result = await query;
  if (result?.error && !isMissingTableError(result.error)) {
    throw result.error;
  }
  const data = result?.data;
  return Array.isArray(data) ? (data[0] || null) : (data || null);
}

function safeTableData(result) {
  return result?.data || null;
}

function readFallbackPromotions() {
  try {
    if (!fs.existsSync(PROMOTIONS_STORE_FILE)) return [];
    const raw = fs.readFileSync(PROMOTIONS_STORE_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeFallbackPromotions(rows) {
  fs.writeFileSync(PROMOTIONS_STORE_FILE, JSON.stringify(rows, null, 2));
}

function readFallbackList(filePath) {
  try {
    if (!fs.existsSync(filePath)) return [];
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeFallbackList(filePath, rows) {
  fs.writeFileSync(filePath, JSON.stringify(rows, null, 2));
}

function normalizeAdRecord(row) {
  if (!row) return row;
  const description = row.description ?? row.notes ?? null;
  return {
    id: row.id,
    title: row.title || '',
    description,
    badge: row.badge || null,
    kicker: row.kicker || null,
    cta_label: row.cta_label || row.ctaLabel || null,
    price: row.price ?? null,
    compare_price: row.compare_price ?? row.comparePrice ?? null,
    perk_1: row.perk_1 || row.perk1 || null,
    perk_2: row.perk_2 || row.perk2 || null,
    perk_3: row.perk_3 || row.perk3 || null,
    image_url: row.image_url || null,
    image_path: row.image_path || null,
    click_url: row.click_url || row.link || null,
    status: row.status || (row.is_active === false ? 'inactive' : 'active'),
    linked_to_sale: !!row.linked_to_sale,
    notes: row.notes || description || null,
    created_at: row.created_at || null,
    updated_at: row.updated_at || null
  };
}

function createFallbackRow(filePath, payload) {
  const rows = readFallbackList(filePath);
  const row = {
    id: Date.now(),
    ...payload,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  rows.unshift(row);
  writeFallbackList(filePath, rows);
  return row;
}

function deleteFallbackRow(filePath, id) {
  const rows = readFallbackList(filePath);
  const next = rows.filter((row) => String(row.id) !== String(id));
  writeFallbackList(filePath, next);
}

function buildTransportCandidates(settings) {
  const host = settings.smtpHost || 'smtp.gmail.com';
  const port = Number(settings.smtpPort || 587);
  const encryption = String(settings.smtpEncryption || 'TLS').toUpperCase();
  const candidates = [
    { host, port, secure: encryption === 'SSL' },
    { host, port: 465, secure: true },
    { host, port: 587, secure: false }
  ];

  const seen = new Set();
  return candidates.filter((candidate) => {
    const key = `${candidate.host}:${candidate.port}:${candidate.secure}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).map((candidate) => ({
    ...candidate,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    tls: { rejectUnauthorized: false },
    requireTLS: !candidate.secure
  }));
}

function createTransporter(candidate, senderEmail, appPassword) {
  return nodemailer.createTransport({
    host: candidate.host,
    port: candidate.port,
    secure: candidate.secure,
    auth: { user: senderEmail, pass: appPassword },
    connectionTimeout: candidate.connectionTimeout,
    greetingTimeout: candidate.greetingTimeout,
    socketTimeout: candidate.socketTimeout,
    tls: candidate.tls,
    requireTLS: candidate.requireTLS
  });
}

async function sendWithFallback(mailer, row) {
  let lastError = null;
  // console.log('[sendWithFallback] attempting to send to', row.email, 'with', mailer.candidates.length, 'candidates');
  
  // Create stunning HTML email template with Bladesmith theme
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #050505; }
        .email-wrapper { background: linear-gradient(135deg, #D4500A 0%, #9A3A07 100%); padding: 2px 0; }
        .container { max-width: 600px; margin: 0 auto; background: #0B0B0B; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(212,80,10,0.3); }
        .header { background: linear-gradient(135deg, #D4500A 0%, #9A3A07 100%); color: #F2F0EC; padding: 6px 8px; text-align: center; }
        .header h1 { font-size: 36px; font-weight: 700; margin-bottom: 10px; letter-spacing: -0.5px; color: #F2F0EC; }
        .header-subtitle { font-size: 14px; opacity: 0.9; text-transform: uppercase; letter-spacing: 2px; }
        .content { padding: 2px 4px; }
        .message { font-size: 15px; line-height: 1.2; color: #F2F0EC; margin-bottom: 2px; font-weight: 500; }
        .cta-button { 
          display: inline-block; 
          background: linear-gradient(135deg, #D4500A 0%, #F06020 100%); 
          color: #050505; 
          padding: 16px 40px; 
          text-decoration: none; 
          border-radius: 50px; 
          font-weight: 700; 
          font-size: 16px;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          box-shadow: 0 5px 20px rgba(212, 80, 10, 0.5);
          margin: 4px 0;
        }
        .cta-button:hover { transform: scale(1.08); box-shadow: 0 8px 25px rgba(240, 96, 32, 0.6); }
        .divider { height: 2px; background: linear-gradient(90deg, transparent, #D4500A, #C8A96E, transparent); margin: 6px 0; }
        .footer { background: #111; padding: 10px 12px; text-align: center; border-top: 1px solid rgba(212,80,10,0.28); }
        .footer-text { font-size: 12px; color: #9A9A9A; margin: 4px 0; }
        .badge { display: inline-block; background: rgba(212, 80, 10, 0.15); color: #F06020; padding: 8px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-bottom: 20px; border: 1px solid rgba(212,80,10,0.28); }
        .highlight { color: #C8A96E; font-weight: 700; }
      </style>
      <style>
        /* Mobile adjustments */
        @media (max-width: 480px) {
          .header { padding: 4px 6px; }
          .content { padding: 2px 4px; }
          .message { font-size: 14px; margin-bottom: 2px; }
          .cta-button { padding: 6px 10px; font-size: 13px; }
          .container { border-radius: 6px; }
        }
      </style>
    </head>
    <body>
      <div class="email-wrapper">
        <div class="container">
          <div class="header">
            <div class="header-subtitle">✨ Exclusive Offer ✨</div>
            <h1>${row.subject}</h1>
          </div>
          <div class="content">
            <div class="badge">🎁 Special Offer Inside</div>
            <div class="message">${row.content.replace(/\n/g, '<br>')}</div>
            <a href="https://forgeddominance.com" class="cta-button">🚀 Claim Your Offer Now</a>
            <div class="divider"></div>
            <p style="color: #888; font-size: 14px; line-height: 1.8;">
              Don't miss out on this <span class="highlight">limited-time opportunity</span>. 
              This exclusive offer is just for our valued customers like you.
            </p>
          </div>
          <div class="footer">
            <p class="footer-text"><strong>Bladesmith</strong> - Premium Quality Products</p>
            <p class="footer-text">© 2026 All Rights Reserved | You're receiving this because you're special 🌟</p>
            <p class="footer-text" style="margin-top: 15px; font-size: 11px;">This is an automated message. Please don't reply directly to this email.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  for (let i = 0; i < mailer.candidates.length; i++) {
    const candidate = mailer.candidates[i];
    try {
      // console.log('[sendWithFallback] trying candidate', i, `${candidate.host}:${candidate.port}`);
      const transporter = createTransporter(candidate, mailer.senderEmail, mailer.appPassword);
      // Prefer an explicit plain_text field when present, otherwise fallback to a stripped version of content
      const rawContent = String(row.plain_text || row.content || '');
      const textContent = rawContent || String(row.content || '').replace(/<[^>]+>/g, '\n').replace(/\n{2,}/g, '\n\n');
      await transporter.sendMail({
        from: `${mailer.senderName} <${mailer.senderEmail}>`,
        to: row.email,
        subject: `🎁 ${row.subject}`,
        html: htmlContent,
        text: textContent
      });
      // console.log('[sendWithFallback] SUCCESS sent to', row.email);
      return { ok: true };
    } catch (error) {
      console.error('[sendWithFallback] candidate', i, 'failed:', String(error));
      lastError = error;
    }
  }

  console.error('[sendWithFallback] ALL candidates failed for', row.email, 'last error:', String(lastError));
  return { ok: false, error: lastError?.message || 'SMTP send failed' };
}

const campaignJobs = new Map();

async function processCampaignQueue(logRows, mailer, jobId) {
  const job = jobId ? campaignJobs.get(jobId) : null;
  const CHUNK_SIZE = 50;
  const results = [];

  for (let i = 0; i < logRows.length; i += CHUNK_SIZE) {
    const chunk = logRows.slice(i, i + CHUNK_SIZE);

    const chunkResults = await Promise.allSettled(
      chunk.map(async (row) => {
        const result = await sendWithFallback(mailer, row);
        const updates = result.ok
          ? { status: 'sent', sent_at: new Date().toISOString(), error_message: null }
          : { status: 'failed', error_message: result.error, sent_at: null };
        return { id: row.id, email: row.email, ok: result.ok, status: updates.status, error: result.error || null, sent_at: updates.sent_at || null, _updates: updates };
      })
    );

    const batchResults = [];
    for (const settled of chunkResults) {
      if (settled.status === 'fulfilled') batchResults.push(settled.value);
      else batchResults.push({ id: null, email: null, ok: false, status: 'failed', error: String(settled.reason), sent_at: null, _updates: { status: 'failed', error_message: String(settled.reason) } });
    }

    // Batch DB updates after all emails in chunk are sent (not during)
    const sentIds = batchResults.filter(r => r.ok && r.id).map(r => r.id);
    const failedRows = batchResults.filter(r => !r.ok && r.id);

    try {
      if (sentIds.length) {
        await supabase.from('campaign_email_logs').update({ status: 'sent', sent_at: new Date().toISOString(), error_message: null }).in('id', sentIds);
      }
      for (const row of failedRows) {
        await supabase.from('campaign_email_logs').update(row._updates).eq('id', row.id).catch(() => {});
      }
    } catch (dbErr) {
      if (isMissingTableError(dbErr)) {
        const fallback = readFallbackCampaignLogs();
        batchResults.forEach(r => {
          const idx = fallback.findIndex(f => String(f.id) === String(r.id));
          if (idx !== -1) { fallback[idx] = { ...fallback[idx], ...r._updates, updated_at: new Date().toISOString() }; }
        });
        writeFallbackCampaignLogs(fallback);
      }
    }

    batchResults.forEach(r => { delete r._updates; results.push(r); });

    if (job) {
      job.sent = results.filter((r) => r.ok).length;
      job.failed = results.filter((r) => !r.ok).length;
      job.processed = results.length;
    }
  }

  if (job) {
    job.status = 'complete';
    job.completedAt = new Date().toISOString();
    job.results = results;
  }

  return results;
}

function createFallbackPromotion(payload) {
  const rows = readFallbackPromotions();
  const row = {
    id: Date.now(),
    ...payload,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  rows.unshift(row);
  writeFallbackPromotions(rows);
  return row;
}

function updateFallbackPromotion(id, updates) {
  const rows = readFallbackPromotions();
  const index = rows.findIndex((row) => String(row.id) === String(id));
  if (index === -1) return null;
  rows[index] = { ...rows[index], ...updates, updated_at: new Date().toISOString() };
  writeFallbackPromotions(rows);
  return rows[index];
}

function deleteFallbackPromotion(id) {
  const rows = readFallbackPromotions();
  const next = rows.filter((row) => String(row.id) !== String(id));
  writeFallbackPromotions(next);
}

function readFallbackCommissions() {
  try {
    if (!fs.existsSync(COMMISSIONS_STORE_FILE)) return [];
    const raw = fs.readFileSync(COMMISSIONS_STORE_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function readFallbackCampaignLogs() {
  try {
    if (!fs.existsSync(CAMPAIGN_STORE_FILE)) return [];
    const raw = fs.readFileSync(CAMPAIGN_STORE_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeFallbackCampaignLogs(rows) {
  fs.writeFileSync(CAMPAIGN_STORE_FILE, JSON.stringify(rows, null, 2));
}

function readFallbackSettings() {
  try {
    if (!fs.existsSync(SETTINGS_FALLBACK_FILE)) return {};
    const raw = fs.readFileSync(SETTINGS_FALLBACK_FILE, 'utf8');
    return JSON.parse(raw || '{}') || {};
  } catch {
    return {};
  }
}

async function getMailerFromSettings() {
  try {
    const normalizeSecret = (value) => String(value || '').replace(/\s+/g, '').trim();

    // Prefer explicit smtp_credentials table if present
    const smtpRow = await safeMaybeSingle(
      supabase.from('smtp_credentials').select('*').order('id', { ascending: false }).limit(1)
    );

    const [settingsResult, adminResult] = await Promise.all([
      safeMaybeSingle(supabase.from('admin_settings').select('value').eq('key', 'global').limit(1)),
      safeMaybeSingle(supabase.from('admins').select('email, app_password, sender_name, smtp_host, smtp_port, smtp_encryption').eq('id', 1).limit(1))
    ]);

    const fallbackSettings = readFallbackSettings();
    const settings = { ...(fallbackSettings || {}), ...(settingsResult?.value || {}) };
    const adminRow = adminResult || {};

    // Priority: smtp_credentials table -> admin_settings.global -> admins row -> DEFAULT_SMTP_SETTINGS
    const senderEmail = smtpRow?.sender_email || settings.senderEmail || adminRow?.email || '';
    const appPassword = normalizeSecret(smtpRow?.app_password || settings.appPassword || adminRow?.app_password || '');
    const smtpHost = smtpRow?.smtp_host || settings.smtpHost || adminRow?.smtp_host || DEFAULT_SMTP_SETTINGS.smtpHost;
    const smtpPort = Number(smtpRow?.smtp_port || settings.smtpPort || adminRow?.smtp_port || DEFAULT_SMTP_SETTINGS.smtpPort);
    const smtpEncryption = String(smtpRow?.smtp_encryption || settings.smtpEncryption || adminRow?.smtp_encryption || DEFAULT_SMTP_SETTINGS.smtpEncryption).toUpperCase();
    const senderName = smtpRow?.sender_name || settings.senderName || adminRow?.sender_name || DEFAULT_SMTP_SETTINGS.senderName;

    // Fallback to environment variables if explicit settings not present
    const envSender = process.env.SMTP_SENDER_EMAIL || process.env.SMTP_USER || '';
    const envPass = normalizeSecret(process.env.SMTP_PASSWORD || process.env.SMTP_PASS || process.env.SMTP_APP_PASSWORD || '');
    const envHost = process.env.SMTP_HOST || process.env.SMTP_SMTP_HOST || '';
    const envPort = process.env.SMTP_PORT || process.env.SMTP_SMTP_PORT || '';
    const envEncryption = process.env.SMTP_ENCRYPTION || '';

    const finalSenderEmail = senderEmail || envSender;
    const finalAppPassword = appPassword || envPass;
    const finalHost = smtpHost || envHost;
    const finalPort = smtpPort || (envPort ? Number(envPort) : undefined);
    const finalEncryption = smtpEncryption || envEncryption || DEFAULT_SMTP_SETTINGS.smtpEncryption;

    if (!finalSenderEmail || !finalAppPassword) return null;

    return {
      candidates: buildTransportCandidates({ smtpHost: finalHost, smtpPort: finalPort, smtpEncryption: finalEncryption }),
      senderEmail: finalSenderEmail,
      appPassword: finalAppPassword,
      senderName: senderName || DEFAULT_SMTP_SETTINGS.senderName
    };
  } catch {
    return null;
  }
}

// Redis cache configuration (60 second TTL)
const CACHE_TTL_SECONDS = 60;
const CACHE_KEYS = {
  ACTIVE_PROMOS: 'promotions:active',
  ALL_PROMOS: 'promotions:all',
  CAMPAIGN_RECIPIENTS: 'promotions:campaign:recipients'
};

// Fallback in-memory cache if Redis is unavailable
const PROMO_CACHE_TTL_MS = 60 * 1000;
let cachedActivePromos = null;
let cachedActivePromosAt = 0;
let cachedAllPromos = null;
let cachedAllPromosAt = 0;
let cachedCampaignRecipients = null;
let cachedCampaignRecipientsAt = 0;

function isPromoCacheFresh(ts) {
  return ts && (Date.now() - ts) < PROMO_CACHE_TTL_MS;
}

async function clearActivePromoCache() {
  cachedActivePromos = null;
  cachedActivePromosAt = 0;
  cachedAllPromos = null;
  cachedAllPromosAt = 0;
  await Promise.allSettled([
    redis.del(CACHE_KEYS.ACTIVE_PROMOS),
    redis.del(`${CACHE_KEYS.ACTIVE_PROMOS}:ad`),
    redis.del(CACHE_KEYS.ALL_PROMOS),
    redis.del('promotions:ads:public'),
    redis.del('promotions:ads:admin'),
    redis.del('promotions:coupons')
  ]);
}

// ===== ADS (separate table) =====
router.get('/ads/public', async (_req, res) => {
  try {
    const result = await redis.getOrFetch('promotions:ads:public', 180, async () => {
      const [adsResult, legacyResult, settingsResult] = await Promise.all([
        supabase.from('ads').select('*').eq('status', 'active').order('created_at', { ascending: false }),
        supabase.from('promotions').select('*').eq('type', 'ad').eq('is_active', true).order('created_at', { ascending: false }),
        supabase.from('admin_settings').select('value').eq('key', 'global').maybeSingle()
      ]);
      if (adsResult.error && !isMissingTableError(adsResult.error)) throw adsResult.error;
      if (legacyResult.error && !isMissingTableError(legacyResult.error)) throw legacyResult.error;
      const activeSale = settingsResult?.data?.value?.activeSale || null;
      const saleIsLive = !!(activeSale && activeSale.active && activeSale.endsAt && new Date(activeSale.endsAt).getTime() > Date.now());
      const combined = [
        ...((adsResult.data || []).map(normalizeAdRecord)),
        ...((legacyResult.data || []).map(normalizeAdRecord))
      ].filter((ad) => !ad.linked_to_sale || saleIsLive);
      const unique = [];
      const seen = new Set();
      combined.forEach((row) => {
        const key = `${String(row.title || '').toLowerCase()}|${row.image_url || ''}|${row.click_url || ''}`;
        if (seen.has(key)) return;
        seen.add(key);
        unique.push(row);
      });
      if (!unique.length) return { data: readFallbackList(ADS_STORE_FILE).map(normalizeAdRecord) };
      return { data: unique };
    });
    return res.json(result);
  } catch (error) {
    console.error('[Promotions] Error:', error);
    return res.status(500).json({ error: 'An internal server error occurred' });
  }
});

router.get('/ads', authenticate, async (_req, res) => {
  try {
    const result = await redis.getOrFetch('promotions:ads:admin', 60, async () => {
      const { data, error } = await supabase
        .from('ads')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        if (isMissingTableError(error)) {
          const legacy = await supabase.from('promotions').select('*').eq('type', 'ad').order('created_at', { ascending: false });
          if (!legacy?.error) return { data: (legacy.data || []).map(normalizeAdRecord) };
          return { data: readFallbackList(ADS_STORE_FILE).map(normalizeAdRecord) };
        }
        throw error;
      }
      return { data: (data || []).map(normalizeAdRecord) };
    });
    return res.json(result);
  } catch (error) {
    console.error('[Promotions] Error:', error);
    return res.status(500).json({ error: 'An internal server error occurred' });
  }
});

router.post('/ads', authenticate, authorize('admin'), async (req, res) => {
  try {
    const title = String(req.body?.title || '').trim();
    const imageUrl = String(req.body?.image_url || req.body?.imageUrl || '').trim();
    const imagePath = String(req.body?.image_path || req.body?.imagePath || '').trim() || null;
    const clickUrl = String(req.body?.click_url || req.body?.link || '').trim() || null;
    const status = String(req.body?.status || 'active').trim() || 'active';
    const description = String(req.body?.description || req.body?.notes || '').trim() || null;
    const badge = String(req.body?.badge || '').trim() || null;
    const kicker = String(req.body?.kicker || '').trim() || null;
    const ctaLabel = String(req.body?.cta_label || req.body?.ctaLabel || '').trim() || null;
    const perk1 = String(req.body?.perk_1 || req.body?.perk1 || '').trim() || null;
    const perk2 = String(req.body?.perk_2 || req.body?.perk2 || '').trim() || null;
    const perk3 = String(req.body?.perk_3 || req.body?.perk3 || '').trim() || null;
    const priceValue = Number(req.body?.price ?? req.body?.price_value ?? req.body?.priceValue ?? NaN);
    const compareValue = Number(req.body?.compare_price ?? req.body?.comparePrice ?? NaN);
    const price = Number.isFinite(priceValue) && priceValue > 0 ? priceValue : null;
    const comparePrice = Number.isFinite(compareValue) && compareValue > 0 ? compareValue : null;

    if (!title) return res.status(400).json({ error: 'title is required' });
    if (!imageUrl) return res.status(400).json({ error: 'image_url is required' });

    const payload = {
      title,
      image_url: imageUrl,
      image_path: imagePath,
      click_url: clickUrl,
      status,
      description,
      notes: description,
      badge,
      kicker,
      cta_label: ctaLabel,
      price,
      compare_price: comparePrice,
      perk_1: perk1,
      perk_2: perk2,
      perk_3: perk3,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const fallbackPayload = {
      title,
      image_url: imageUrl,
      image_path: imagePath,
      click_url: clickUrl,
      status,
      description,
      notes: description,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    let insertResult = await supabase.from('ads').insert(payload).select('*').single();
    if (insertResult.error && String(insertResult.error.message || '').toLowerCase().includes('column')) {
      const reduced = { ...fallbackPayload };
      const msg = String(insertResult.error.message || '').toLowerCase();
      if (msg.includes('description')) {
        delete reduced.description;
      }
      insertResult = await supabase.from('ads').insert(reduced).select('*').single();
    }

    const { data, error } = insertResult;
    if (error) {
      if (isMissingTableError(error)) {
        const legacyPayload = {
          title,
          type: 'ad',
          image_url: imageUrl,
          image_path: imagePath,
          link: clickUrl,
          is_active: status !== 'inactive',
          description,
          notes: description,
          badge,
          kicker,
          cta_label: ctaLabel,
          price,
          compare_price: comparePrice,
          perk_1: perk1,
          perk_2: perk2,
          perk_3: perk3,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        const legacy = await supabase.from('promotions').insert(legacyPayload).select('*').single();
        if (!legacy?.error && legacy?.data) {
          await clearActivePromoCache();
          return res.status(201).json(normalizeAdRecord(legacy.data));
        }
        await clearActivePromoCache();
        return res.status(201).json(normalizeAdRecord(createFallbackRow(ADS_STORE_FILE, payload)));
      }
      throw error;
    }

    await clearActivePromoCache();

    return res.status(201).json(normalizeAdRecord(data));
  } catch (error) {
    console.error('[Promotions] Error:', error);
    return res.status(500).json({ error: 'An internal server error occurred' });
  }
});

router.put('/ads/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};
    const payload = {
      title: body.title,
      description: body.description,
      notes: body.description,
      click_url: body.click_url,
      image_url: body.image_url,
      image_path: body.image_path,
      badge: body.badge || null,
      kicker: body.kicker || null,
      cta_label: body.cta_label || null,
      price: Number.isFinite(Number(body.price)) && Number(body.price) > 0 ? Number(body.price) : null,
      compare_price: Number.isFinite(Number(body.compare_price)) && Number(body.compare_price) > 0 ? Number(body.compare_price) : null,
      perk_1: body.perk_1 || null,
      perk_2: body.perk_2 || null,
      perk_3: body.perk_3 || null,
      linked_to_sale: !!body.linked_to_sale,
      updated_at: new Date().toISOString()
    };
    Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);
    const { data, error } = await supabase.from('ads').update(payload).eq('id', id).select().single();
    if (error) throw error;
    await redis.del('promotions:ads:public').catch(() => {});
    await redis.del('promotions:ads:admin').catch(() => {});
    return res.json({ data: normalizeAdRecord(data) });
  } catch (error) {
    console.error('[Promotions] Update ad error:', error);
    return res.status(500).json({ error: 'Could not update ad' });
  }
});

router.delete('/ads/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { error } = await supabase.from('ads').delete().eq('id', req.params.id);
    if (error) {
      if (isMissingTableError(error)) {
        const legacyDelete = await supabase.from('promotions').delete().eq('id', req.params.id).eq('type', 'ad');
        if (!legacyDelete?.error) {
          await clearActivePromoCache();
          return res.json({ message: 'Ad deleted' });
        }
        deleteFallbackRow(ADS_STORE_FILE, req.params.id);
        await clearActivePromoCache();
        return res.json({ message: 'Ad deleted' });
      }
      throw error;
    }

    await clearActivePromoCache();

    return res.json({ message: 'Ad deleted' });
  } catch (error) {
    console.error('[Promotions] Error:', error);
    return res.status(500).json({ error: 'An internal server error occurred' });
  }
});

// ===== COUPONS (separate table) =====

// Public: validate a coupon code from the storefront (no admin auth).
// Deliberately returns only what the customer needs to see a discount —
// never the full coupon list — so this is safe to expose publicly.
function isCouponUsable(coupon) {
  if (!coupon) return { ok: false, error: 'Coupon not found' };
  if (coupon.is_active === false) return { ok: false, error: 'This coupon is no longer active' };
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    return { ok: false, error: 'This coupon has expired' };
  }
  if (coupon.usage_limit != null && Number(coupon.used_count || 0) >= Number(coupon.usage_limit)) {
    return { ok: false, error: 'This coupon has reached its usage limit' };
  }
  return { ok: true };
}

async function findCouponByCode(code) {
  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .ilike('code', code)
    .limit(1);
  if (!error && data && data[0]) return data[0];

  if (error && !isMissingTableError(error)) throw error;

  // Legacy `promotions` table fallback (type = 'coupon')
  const legacy = await supabase
    .from('promotions')
    .select('*')
    .eq('type', 'coupon')
    .ilike('code', code)
    .limit(1);
  if (!legacy?.error && legacy.data && legacy.data[0]) {
    const row = legacy.data[0];
    return {
      id: row.id,
      code: row.code,
      coupon_type: 'percent',
      amount: Number(row.discount || 0),
      usage_limit: row.max_uses,
      used_count: 0,
      expires_at: row.expires_at,
      is_active: row.is_active !== false
    };
  }

  // File-based fallback store
  const fallback = readFallbackList(COUPONS_STORE_FILE)
    .find((c) => String(c.code || '').toLowerCase() === code.toLowerCase());
  return fallback || null;
}

router.post('/coupons/validate', async (req, res) => {
  try {
    const code = String(req.body?.code || '').trim();
    if (!code) return res.status(400).json({ valid: false, error: 'Coupon code is required' });

    const coupon = await findCouponByCode(code);
    const usable = isCouponUsable(coupon);
    if (!usable.ok) return res.status(coupon ? 400 : 404).json({ valid: false, error: usable.error });

    return res.json({
      valid: true,
      code: coupon.code,
      coupon_type: coupon.coupon_type === 'fixed' ? 'fixed' : 'percent',
      amount: Number(coupon.amount || 0)
    });
  } catch (error) {
    console.error('[Promotions] Coupon validate error:', error);
    return res.status(500).json({ valid: false, error: 'Could not validate coupon right now' });
  }
});

router.get('/coupons', authenticate, async (_req, res) => {
  try {
    const result = await redis.getOrFetch('promotions:coupons', 120, async () => {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        if (isMissingTableError(error)) {
          const legacy = await supabase.from('promotions').select('*').eq('type', 'coupon').order('created_at', { ascending: false });
          if (!legacy?.error) {
            const mapped = (legacy.data || []).map((row) => ({
              id: row.id, code: row.code, coupon_type: 'percent', amount: Number(row.discount || 0),
              usage_limit: row.max_uses, used_count: 0, expires_at: row.expires_at,
              is_active: row.is_active !== false, notes: row.notes || null,
              created_at: row.created_at, updated_at: row.updated_at
            }));
            return { data: mapped };
          }
          return { data: readFallbackList(COUPONS_STORE_FILE) };
        }
        throw error;
      }
      return { data: data || [] };
    });
    return res.json(result);
  } catch (error) {
    console.error('[Promotions] Error:', error);
    return res.status(500).json({ error: 'An internal server error occurred' });
  }
});

router.post('/coupons', authenticate, authorize('admin'), async (req, res) => {
  try {
    const code = String(req.body?.code || '').trim();
    const couponType = String(req.body?.coupon_type || req.body?.type || 'percent').trim();
    const amount = Number(req.body?.amount ?? req.body?.discount ?? 0);
    const usageLimit = (req.body?.usage_limit ?? req.body?.max_uses ?? null);
    const expiresAt = req.body?.expires_at || null;
    const isActive = req.body?.is_active !== false;
    const notes = req.body?.notes || null;

    if (!code) return res.status(400).json({ error: 'code is required' });

    const payload = {
      code,
      coupon_type: couponType,
      amount,
      usage_limit: usageLimit,
      expires_at: expiresAt,
      is_active: isActive,
      notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase.from('coupons').insert(payload).select('*').single();
    if (error) {
      if (isMissingTableError(error)) {
        const legacyPayload = {
          title: code,
          type: 'coupon',
          code,
          discount: amount,
          max_uses: usageLimit,
          expires_at: expiresAt,
          is_active: isActive,
          notes,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        const legacy = await supabase.from('promotions').insert(legacyPayload).select('*').single();
        if (!legacy?.error && legacy?.data) {
          await clearActivePromoCache();
          return res.status(201).json({
            id: legacy.data.id,
            code: legacy.data.code,
            coupon_type: 'percent',
            amount: Number(legacy.data.discount || 0),
            usage_limit: legacy.data.max_uses,
            used_count: 0,
            expires_at: legacy.data.expires_at,
            is_active: legacy.data.is_active !== false,
            notes: legacy.data.notes || null,
            created_at: legacy.data.created_at,
            updated_at: legacy.data.updated_at
          });
        }
        await clearActivePromoCache();
        return res.status(201).json(createFallbackRow(COUPONS_STORE_FILE, payload));
      }
      throw error;
    }

    await clearActivePromoCache();
    return res.status(201).json(data);
  } catch (error) {
    console.error('[Promotions] Error:', error);
    return res.status(500).json({ error: 'An internal server error occurred' });
  }
});

router.delete('/coupons/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { error } = await supabase.from('coupons').delete().eq('id', req.params.id);
    if (error) {
      if (isMissingTableError(error)) {
        const legacyDelete = await supabase.from('promotions').delete().eq('id', req.params.id).eq('type', 'coupon');
        if (!legacyDelete?.error) {
          await clearActivePromoCache();
          return res.json({ message: 'Coupon deleted' });
        }
        deleteFallbackRow(COUPONS_STORE_FILE, req.params.id);
        await clearActivePromoCache();
        return res.json({ message: 'Coupon deleted' });
      }
      throw error;
    }

    await clearActivePromoCache();
    return res.json({ message: 'Coupon deleted' });
  } catch (error) {
    console.error('[Promotions] Error:', error);
    return res.status(500).json({ error: 'An internal server error occurred' });
  }
});

router.get('/active', async (req, res) => {
  try {
    const type = String(req.query.type || 'ad');
    const cacheKey = `${CACHE_KEYS.ACTIVE_PROMOS}:${type}`;

    const activeData = await redis.getOrFetch(cacheKey, 120, async () => {
      if (type === 'ad') {
        const [adsResult, legacyResult] = await Promise.all([
          supabase.from('ads').select('*').eq('status', 'active').order('created_at', { ascending: false }).limit(5),
          supabase.from('promotions').select('*').eq('type', 'ad').eq('is_active', true).order('updated_at', { ascending: false }).limit(5)
        ]);
        if (adsResult.error && !isMissingTableError(adsResult.error)) throw adsResult.error;
        if (legacyResult.error && !isMissingTableError(legacyResult.error)) throw legacyResult.error;
        const merged = [...((adsResult.data || []).map(normalizeAdRecord)), ...((legacyResult.data || []).map(normalizeAdRecord))];
        const deduped = [];
        const seen = new Set();
        merged.forEach((row) => {
          const key = `${String(row.title || '').toLowerCase()}|${row.image_url || ''}|${row.click_url || ''}`;
          if (seen.has(key)) return;
          seen.add(key);
          deduped.push(row);
        });
        return deduped.length ? deduped : readFallbackList(ADS_STORE_FILE).map(normalizeAdRecord).filter((row) => row.status !== 'inactive');
      }
      const { data, error } = await supabase.from('promotions').select('*').eq('is_active', true).eq('type', type).order('updated_at', { ascending: false }).limit(5);
      if (error) {
        if (isMissingTableError(error)) return readFallbackPromotions().filter((row) => row.is_active !== false && String(row.type || 'ad') === type);
        throw error;
      }
      return data || [];
    });

    cachedActivePromos = activeData;
    cachedActivePromosAt = Date.now();
    res.json({ data: activeData });
  } catch (error) {
    console.error('[Promotions] Error:', error);
    res.status(500).json({ error: 'An internal server error occurred' });
  }
});

router.get('/', authenticate, async (req, res) => {
  try {
    // Try Redis cache first
    if (redis.isReady()) {
      const cached = await redis.get(CACHE_KEYS.ALL_PROMOS);
      if (cached) {
        // console.log('[Promotions] Cache HIT for all promos');
        return res.json({ data: cached });
      }
    }

    // Fallback to in-memory cache
    if (cachedAllPromos && isPromoCacheFresh(cachedAllPromosAt)) {
      // console.log('[Promotions] Fallback cache HIT for all promos');
      return res.json({ data: cachedAllPromos });
    }

    // console.log('[Promotions] Cache MISS for all promos, querying DB');

    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      if (isMissingTableError(error)) return res.json({ data: readFallbackPromotions() });
      throw error;
    }

    const result = data || [];

    // Store in Redis cache
    if (redis.isReady()) {
      await redis.set(CACHE_KEYS.ALL_PROMOS, result, CACHE_TTL_SECONDS);
    }

    // Also update in-memory fallback
    cachedAllPromos = result;
    cachedAllPromosAt = Date.now();

    res.json({ data: result });
  } catch (error) {
    console.error('[Promotions] Error:', error);
    res.status(500).json({ error: 'An internal server error occurred' });
  }
});

router.post('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    // Normalize image_url to absolute URL if it's a relative path
    let incomingImageUrl = req.body.image_url || req.body.imageUrl || null;
    if (incomingImageUrl && String(incomingImageUrl).startsWith('/')) {
      const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
      const host = req.headers['x-forwarded-host'] || req.get('host');
      incomingImageUrl = `${proto}://${host}${incomingImageUrl}`;
    }

    const payload = {
      title: req.body.title,
      type: req.body.type || 'ad',
      code: req.body.code || null,
      discount: req.body.discount || null,
      max_uses: req.body.max_uses || null,
      expires_at: req.body.expires_at || null,
      image_url: incomingImageUrl || req.body.image_url || null,
      image_path: req.body.image_path || null,
      link: req.body.link || null,
      is_active: req.body.is_active !== false,
      notes: req.body.notes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase.from('promotions').insert(payload).select('*').single();
    if (error) {
      if (isMissingTableError(error)) {
        await clearActivePromoCache();
        return res.status(201).json(createFallbackPromotion(payload));
      }
      throw error;
    }

    await clearActivePromoCache();

    res.status(201).json(data);
  } catch (error) {
    console.error('[Promotions] Error:', error);
    res.status(500).json({ error: 'An internal server error occurred' });
  }
});

router.get('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) {
      if (isMissingTableError(error)) return res.status(404).json({ error: 'Promotion not found' });
      throw error;
    }
    if (!data) return res.status(404).json({ error: 'Promotion not found' });

    res.json(data);
  } catch (error) {
    console.error('[Promotions] Error:', error);
    res.status(500).json({ error: 'An internal server error occurred' });
  }
});

router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const updates = {
      title: req.body.title,
      type: req.body.type,
      code: req.body.code,
      discount: req.body.discount,
      max_uses: req.body.max_uses,
      expires_at: req.body.expires_at,
      image_url: req.body.image_url,
      image_path: req.body.image_path,
      link: req.body.link,
      is_active: req.body.is_active,
      notes: req.body.notes,
      updated_at: new Date().toISOString()
    };

    Object.keys(updates).forEach((key) => updates[key] === undefined && delete updates[key]);
    const { data, error } = await supabase.from('promotions').update(updates).eq('id', req.params.id).select('*').single();
    if (error) {
      if (isMissingTableError(error)) {
        const row = updateFallbackPromotion(req.params.id, updates);
        if (!row) return res.status(404).json({ error: 'Promotion not found' });
        await clearActivePromoCache();
        return res.json(row);
      }
      throw error;
    }
    if (!data) return res.status(404).json({ error: 'Promotion not found' });
    await clearActivePromoCache();
    res.json(data);
  } catch (error) {
    console.error('[Promotions] Error:', error);
    res.status(500).json({ error: 'An internal server error occurred' });
  }
});

router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { error } = await supabase.from('promotions').delete().eq('id', req.params.id);
    if (error) {
      if (isMissingTableError(error)) {
        deleteFallbackPromotion(req.params.id);
        await clearActivePromoCache();
        return res.json({ message: 'Promotion deleted' });
      }
      throw error;
    }
    await clearActivePromoCache();
    res.json({ message: 'Promotion deleted' });
  } catch (error) {
    console.error('[Promotions] Error:', error);
    res.status(500).json({ error: 'An internal server error occurred' });
  }
});

router.get('/campaign-recipients', authenticate, authorize('admin'), async (_req, res) => {
  try {
    // Try Redis cache first
    if (redis.isReady()) {
      const cached = await redis.get(CACHE_KEYS.CAMPAIGN_RECIPIENTS);
      if (cached) {
        // console.log('[Promotions] Cache HIT for campaign recipients');
        return res.json({ data: cached });
      }
    }

    // Fallback to in-memory cache
    if (cachedCampaignRecipients && isPromoCacheFresh(cachedCampaignRecipientsAt)) {
      // console.log('[Promotions] Fallback cache HIT for campaign recipients');
      return res.json({ data: cachedCampaignRecipients });
    }

    // console.log('[Promotions] Cache MISS for campaign recipients, querying DB');

    const grouped = {
      orders: [],
      commissions: []
    };

    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, customer_id, created_at')
      .order('created_at', { ascending: false })
      .limit(500);
    if (ordersError && !isMissingTableError(ordersError)) throw ordersError;

    if ((orders || []).length) {
      const customerIds = [...new Set(orders.map((o) => o.customer_id).filter(Boolean))];
      if (customerIds.length) {
        const { data: orderCustomers, error: orderCustomersError } = await supabase
          .from('customers')
          .select('id, email, name')
          .in('id', customerIds)
          .not('email', 'is', null);
        if (orderCustomersError && !isMissingTableError(orderCustomersError)) throw orderCustomersError;
        const byId = new Map((orderCustomers || []).map((c) => [c.id, c]));
        grouped.orders = orders
          .map((o) => byId.get(o.customer_id))
          .filter(Boolean)
          .map((c) => ({
            sourceTable: 'orders',
            sourceId: String(c.id),
            email: c.email,
            label: c.name || c.email
          }));
      }
    }

    const { data: commissions, error: commissionsError } = await supabase
      .from('commissions')
      .select('id, email, full_name, created_at')
      .not('email', 'is', null)
      .order('created_at', { ascending: false })
      .limit(500);
    if (commissionsError && !isMissingTableError(commissionsError)) throw commissionsError;

    const commissionRows = isMissingTableError(commissionsError)
      ? readFallbackCommissions()
      : (commissions || []);

    grouped.commissions = commissionRows.map((row) => ({
      sourceTable: 'commissions',
      sourceId: String(row.id),
      email: row.email,
      label: row.full_name || row.email
    }));

    const all = [...grouped.orders, ...grouped.commissions];
    const dedup = new Map();
    all.forEach((item) => {
      if (!item.email) return;
      const key = String(item.email).toLowerCase();
      if (!dedup.has(key)) dedup.set(key, item);
    });

    res.json({
      data: {
        grouped,
        totalUniqueEmails: dedup.size,
        recipients: Array.from(dedup.values())
      }
    });

    // Cache result in Redis
    const cacheData = { grouped, totalUniqueEmails: dedup.size, recipients: Array.from(dedup.values()) };
    if (redis.isReady()) {
      await redis.set(CACHE_KEYS.CAMPAIGN_RECIPIENTS, cacheData, CACHE_TTL_SECONDS);
    }

    // Also update in-memory fallback
    cachedCampaignRecipients = cacheData;
    cachedCampaignRecipientsAt = Date.now();
  } catch (error) {
    console.error('[Promotions] Error:', error);
    res.status(500).json({ error: 'An internal server error occurred' });
  }
});

router.post('/campaigns/send', authenticate, authorize('admin'), async (req, res) => {
  try {
    const subject = String(req.body?.subject || '').trim();
    const content = String(req.body?.content || '').trim();
    const recipients = Array.isArray(req.body?.recipients) ? req.body.recipients : [];
    if (!subject || !content || !recipients.length) {
      return res.status(400).json({ error: 'Subject, content, and recipients are required' });
    }

    const rows = recipients.map((r) => ({
      source_table: String(r.sourceTable || 'unknown'),
      source_id: String(r.sourceId || ''),
      email: String(r.email || '').trim(),
      subject,
      content,
      created_by: req.user?.userId || null,
      created_at: new Date().toISOString()
    })).filter((r) => r.email);

    const mailer = await getMailerFromSettings().catch(() => null);
    if (!mailer) {
      return res.status(500).json({
        error: 'Email sender is not configured. Set SMTP settings before sending campaigns.'
      });
    }

    const queuedRows = rows.map((row) => ({
      ...row,
      status: 'queued',
      error_message: null,
      sent_at: null
    }));

    let logRows = [];
    try {
      const inserted = await supabase.from('campaign_email_logs').insert(queuedRows).select('id, email, subject, content');

      if (inserted.error) {
        if (isMissingTableError(inserted.error)) {
          const fallback = readFallbackCampaignLogs();
          const rowsToWrite = queuedRows.map((r) => ({ id: Date.now() + Math.floor(Math.random() * 10000), ...r }));
          const next = [...rowsToWrite, ...fallback];
          writeFallbackCampaignLogs(next);
          logRows = rowsToWrite;
        } else {
          throw inserted.error;
        }
      } else {
        logRows = Array.isArray(inserted.data) ? inserted.data : [];
      }
    } catch (err) {
      return res.status(500).json({ error: String(err) });
    }

    const jobId = `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    campaignJobs.set(jobId, {
      status: 'processing',
      total: logRows.length,
      processed: 0,
      sent: 0,
      failed: 0,
      startedAt: new Date().toISOString(),
      completedAt: null,
      results: null
    });

    setImmediate(() => {
      processCampaignQueue(logRows, mailer, jobId).catch((error) => {
        const job = campaignJobs.get(jobId);
        if (job) {
          job.status = 'error';
          job.error = error.message || String(error);
        }
      });
    });

    res.status(202).json({
      message: 'Campaign accepted for processing.',
      jobId,
      total: logRows.length
    });
  } catch (error) {
    console.error('[Promotions] Error:', error);
    res.status(500).json({ error: 'An internal server error occurred' });
  }
});

router.get('/campaigns/status/:jobId', authenticate, authorize('admin'), (req, res) => {
  const jobId = req.params.jobId;
  const job = campaignJobs.get(jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  res.json({
    jobId,
    status: job.status,
    total: job.total,
    processed: job.processed,
    sent: job.sent,
    failed: job.failed,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    results: job.status === 'complete' ? job.results : null
  });
});

router.get('/campaigns/queue', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('campaign_email_logs')
      .select('id, email, subject, status, error_message, sent_at, created_at')
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) {
      if (isMissingTableError(error)) {
        const fallback = readFallbackCampaignLogs();
        return res.json({ data: fallback });
      }
      throw error;
    }

    res.json({ data: data || [] });
  } catch (error) {
    console.error('[Promotions] Error:', error);
    res.status(500).json({ error: 'An internal server error occurred' });
  }
});

router.delete('/campaigns/queue/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const id = String(req.params.id || '').trim();
    if (!id) {
      return res.status(400).json({ error: 'Campaign log id is required' });
    }

    const del = await supabase.from('campaign_email_logs').delete().eq('id', id);
    if (del?.error) {
      if (isMissingTableError(del.error)) {
        const rows = readFallbackCampaignLogs();
        const next = rows.filter((row) => String(row.id) !== id);
        writeFallbackCampaignLogs(next);
        return res.json({ success: true, source: 'fallback' });
      }
      throw del.error;
    }

    return res.json({ success: true, source: 'database' });
  } catch (error) {
    console.error('[Promotions] Error:', error);
    return res.status(500).json({ error: 'An internal server error occurred' });
  }
});

module.exports = router;

module.exports.findCouponByCode = findCouponByCode;
module.exports.isCouponUsable = isCouponUsable;
