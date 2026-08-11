const express = require('express');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const supabase = require('../config/supabase');
const { authenticate, authorize } = require('../middleware/auth');
const redis = require('../lib/redisClient');
const {
  DEFAULT_SITE_SETTINGS,
  getCachedSiteSettings,
  normalizeSiteSettings,
  primeSiteSettingsCache,
  saveSiteSettings,
  setCachedSiteSettings
} = require('../lib/siteSettings');

const router = express.Router();

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const SETTINGS_FALLBACK_FILE = path.resolve(PROJECT_ROOT, 'assets', 'uploads', 'settings-fallback.json');

function rewriteBrandInHtmlFiles(newName) {
  const name = String(newName || '').trim();
  if (!name) return;
  const upper = name.toUpperCase();
  const words = upper.split(/\s+/);
  let firstPart, secondPart;
  if (words.length >= 2) {
    firstPart = words.slice(0, Math.ceil(words.length / 2)).join('');
    secondPart = words.slice(Math.ceil(words.length / 2)).join('');
  } else {
    firstPart = upper.slice(0, Math.ceil(upper.length / 2));
    secondPart = upper.slice(Math.ceil(upper.length / 2));
  }
  const brandHtml = firstPart + '<span>' + secondPart + '</span>';

  const htmlFiles = [
    'index.html', '404.html',
    'pages/about.html', 'pages/collection.html', 'pages/commission.html',
    'pages/order.html', 'pages/product.html',
    'pages/privacy.html', 'pages/terms.html', 'pages/shipping-info.html',
    'pages/checkout/cart.html', 'pages/checkout/checkout.html',
    'pages/checkout/success.html', 'pages/checkout/cancel.html',
    'admin/dashboard.html', 'admin/orders.html', 'admin/customers.html',
    'admin/products-v2.html', 'admin/analytics.html', 'admin/promotions.html',
    'admin/settings.html', 'admin/logs.html', 'admin/chat.html',
    'admin/editor.html', 'admin/login.html'
  ];

  const brandPattern = /(<(?:a|div|h3)\b[^>]*class="[^"]*(?:nav-logo|pl-logo|fb|brand|sidebar-brand-text)[^"]*"[^>]*>)[^<]*<span>[^<]*<\/span>/gi;
  const titlePattern = /(<title>)([^<]*)(<\/title>)/gi;

  for (const rel of htmlFiles) {
    const filePath = path.join(PROJECT_ROOT, rel);
    if (!fs.existsSync(filePath)) continue;
    let html = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    const newHtml = html
      .replace(brandPattern, (match, openTag) => {
        changed = true;
        return openTag + brandHtml;
      })
      .replace(titlePattern, (match, open, content, close) => {
        const oldTitle = content;
        const newTitle = oldTitle.replace(/[A-Z][a-z]+\s*[A-Z][a-z]+|FORGE\s*DOMINANCE|[A-Z]+<span>[A-Z]+<\/span>/gi, name);
        if (newTitle !== oldTitle) changed = true;
        return open + newTitle + close;
      });

    if (changed) {
      fs.writeFileSync(filePath, newHtml, 'utf8');
    }
  }
}

fs.mkdirSync(path.dirname(SETTINGS_FALLBACK_FILE), { recursive: true });

const DEFAULT_SETTINGS = {
  require2FA: false,
  authType: 'email',
  // Set via admin settings panel or SMTP_SENDER_EMAIL / SMTP_APP_PASSWORD env vars
  senderEmail: process.env.SMTP_SENDER_EMAIL || '',
  appPassword: process.env.SMTP_APP_PASSWORD || '',
  senderName: process.env.SMTP_SENDER_NAME || 'Forge Dominance Admin',
  runningEmail: process.env.SMTP_RUNNING_EMAIL || '',
  smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
  smtpPort: parseInt(process.env.SMTP_PORT) || 587,
  smtpEncryption: process.env.SMTP_ENCRYPTION || 'TLS',
  superAdmin: '',
  gaMeasurementId: '',
  gaApiSecret: '',
  reviewSection: {
    enabled: true,
    title: 'Hunters Don\'t Lie',
    subtitle: 'From the Field',
    layout: 'stacked',
    reviews: [
      {
        name: 'Marcus W.',
        role: 'Wilderness Guide · Fairbanks, Alaska · Verified Buyer',
        quote: 'I\'ve been a hunting guide in Alaska for 22 years. I\'ve carried every blade that matters — Bark River, Busse, White River. The Forge Dominance Hunter Pro sits next to all of them. The edge geometry is unlike anything I\'ve held. After three seasons of hard use, it still shaves hair off my arm without touching a strop.',
        avatar: '/assets/uploads/reviews/avatar-marcus.png',
        rating: 5
      },
      {
        name: 'Jason T.',
        role: 'Outfitter · Bozeman, Montana',
        quote: 'Three elk hunts, two deer, one bear. Same knife. Never sharpened. Still terrifyingly sharp. I\'ve recommended Forge Dominance to every guide I know and I\'ll keep recommending it.',
        avatar: '/assets/uploads/reviews/avatar-jason.png',
        rating: 5
      },
      {
        name: 'Dale R.',
        role: 'Ranch Owner · Amarillo, Texas',
        quote: 'Bought the Heritage Elite for my son\'s first hunt. He cried. The certificate, the sheath, the blade finish — this is an heirloom, not a knife. Worth every penny and more.',
        avatar: '/assets/uploads/reviews/avatar-dale.png',
        rating: 5
      }
    ]
  },
  roles: [
    { name: 'Super Admin', permission: 'view_dashboard, manage_products, manage_orders, view_customers, manage_promotions, manage_settings, view_logs' },
    { name: 'Admin', permission: 'view_dashboard, manage_products, manage_orders, view_customers, manage_promotions, manage_settings' },
    { name: 'Product Manager', permission: 'view_dashboard, manage_products, view_customers' }
  ],
  theme: 'ember-default',
  sessionTimeout: 1800,
  socialLinks: {
    instagram: { enabled: false, username: '' },
    tiktok: { enabled: false, username: '' },
    youtube: { enabled: false, username: '' },
    facebook: { enabled: false, username: '' },
    twitter: { enabled: false, username: '' },
    pinterest: { enabled: false, username: '' },
    linkedin: { enabled: false, username: '' }
  },
  ...DEFAULT_SITE_SETTINGS
};

function readFallbackSettings() {
  try {
    if (!fs.existsSync(SETTINGS_FALLBACK_FILE)) return {};
    const raw = fs.readFileSync(SETTINGS_FALLBACK_FILE, 'utf8');
    return JSON.parse(raw || '{}') || {};
  } catch {
    return {};
  }
}

function writeFallbackSettings(obj) {
  try {
    fs.writeFileSync(SETTINGS_FALLBACK_FILE, JSON.stringify(obj || {}, null, 2));
  } catch (e) {
    // ignore
  }
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

const { isMissingTableError } = require('../lib/dbUtils');

function normalizeSessionTimeoutSeconds(value, fallbackSeconds = DEFAULT_SETTINGS.sessionTimeout) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return Number(fallbackSeconds || DEFAULT_SETTINGS.sessionTimeout);
  }
  // Value is always in seconds (min 300s = 5min, max 86400s = 24h)
  if (parsed < 300) return 300;
  if (parsed > 86400) return 86400;
  return parsed;
}

function sessionTimeoutMinutesFromSeconds(value) {
  return Math.max(1, Math.round(normalizeSessionTimeoutSeconds(value) / 60));
}

async function safeSingle(query) {
  const result = await query;
  if (result?.error && !isMissingTableError(result.error)) {
    throw result.error;
  }
  const data = result?.data;
  return Array.isArray(data) ? (data[0] || null) : (data || null);
}

function mapAdminRow(row) {
  if (!row) return {};
  return {
    senderEmail: row.email || '',
    appPassword: row.app_password || '',
    senderName: row.sender_name || DEFAULT_SETTINGS.senderName,
    smtpHost: row.smtp_host || '',
    smtpPort: row.smtp_port || DEFAULT_SETTINGS.smtpPort,
    smtpEncryption: row.smtp_encryption || DEFAULT_SETTINGS.smtpEncryption
  };
}

function normalizeStripeSettings(incoming, existing) {
  const prev = existing && typeof existing === 'object' ? existing : {};
  const next = incoming && typeof incoming === 'object' ? incoming : {};
  return {
    enabled: !!next.enabled,
    publishableKey: String(next.publishableKey || prev.publishableKey || '').trim(),
    secretKey: next.secretKey ? String(next.secretKey).trim() : (prev.secretKey || ''),
    webhookSecret: next.webhookSecret ? String(next.webhookSecret).trim() : (prev.webhookSecret || ''),
    currency: String(next.currency || prev.currency || 'usd').toLowerCase()
  };
}

function normalizeReviewSection(value) {
  const fallback = DEFAULT_SETTINGS.reviewSection;
  const section = value && typeof value === 'object' ? value : {};
  const reviews = Array.isArray(section.reviews) ? section.reviews : fallback.reviews;
  const normalizeReviewImagePath = (input) => {
    const raw = String(input || '').trim();
    if (!raw) return '';
    return raw
      .replace(/^\/?assets\/images\//i, 'assets/uploads/reviews/')
      .replace(/^\/?assets\/reviews\//i, 'assets/uploads/reviews/')
      .replace(/^\/?assets\/Products\//i, 'assets/uploads/reviews/')
      .replace(/^\/?uploads\/reviews\//i, 'assets/uploads/reviews/');
  };

  return {
    enabled: section.enabled !== undefined ? !!section.enabled : fallback.enabled,
    title: String(section.title || fallback.title || '').trim(),
    subtitle: String(section.subtitle || fallback.subtitle || '').trim(),
    layout: String(section.layout || fallback.layout || 'stacked').trim() || 'stacked',
    reviews: reviews.map((review) => ({
      name: String(review?.name || '').trim(),
      role: String(review?.role || '').trim(),
      quote: String(review?.quote || '').trim(),
      avatar: normalizeReviewImagePath(review?.avatar || ''),
      rating: Math.max(1, Math.min(5, Number(review?.rating || 5) || 5))
    })).filter((review) => review.name || review.quote)
  };
}

const SOCIAL_PLATFORMS = ['instagram', 'tiktok', 'youtube', 'facebook', 'twitter', 'pinterest', 'linkedin'];

function normalizeSocialLinks(value) {
  const raw = value && typeof value === 'object' ? value : {};
  const out = {};
  SOCIAL_PLATFORMS.forEach((key) => {
    const entry = raw[key] && typeof raw[key] === 'object' ? raw[key] : {};
    const username = String(entry.username || '')
      .trim()
      .replace(/^@/, '')
      .replace(/^https?:\/\/\S+$/i, '');
    out[key] = { enabled: !!entry.enabled, username };
  });
  return out;
}

async function loadCurrentMailSettings() {
  const [smtp, settingsRow, adminRow] = await Promise.all([
    safeSingle(supabase.from('smtp_credentials').select('*').order('id', { ascending: false }).limit(1)),
    safeSingle(supabase.from('admin_settings').select('value').eq('key', 'global').limit(1)),
    safeSingle(supabase.from('admins').select('email, app_password, sender_name, smtp_host, smtp_port, smtp_encryption').eq('id', 1).limit(1))
  ]);

  const fallback = readFallbackSettings();
  const settings = { ...(fallback || {}), ...(settingsRow?.value || {}) };
  const admin = adminRow || {};
  const reviewSection = normalizeReviewSection(settings.reviewSection || fallback.reviewSection || DEFAULT_SETTINGS.reviewSection);
  const siteSettings = getCachedSiteSettings() || normalizeSiteSettings({ ...(fallback || {}), ...(settings || {}) });

  return {
    senderEmail: smtp?.sender_email || settings.senderEmail || admin.email || '',
    appPassword: smtp?.app_password || settings.appPassword || admin.app_password || '',
    senderName: smtp?.sender_name || settings.senderName || admin.sender_name || DEFAULT_SETTINGS.senderName,
    smtpHost: smtp?.smtp_host || settings.smtpHost || admin.smtp_host || DEFAULT_SETTINGS.smtpHost,
    smtpPort: Number(smtp?.smtp_port || settings.smtpPort || admin.smtp_port || DEFAULT_SETTINGS.smtpPort),
    smtpEncryption: String(smtp?.smtp_encryption || settings.smtpEncryption || admin.smtp_encryption || DEFAULT_SETTINGS.smtpEncryption).toUpperCase(),
    gaMeasurementId: settings.gaMeasurementId || '',
    gaApiSecret: settings.gaApiSecret || '',
    require2FA: !!settings.require2FA,
    authType: settings.authType || DEFAULT_SETTINGS.authType,
    sessionTimeout: normalizeSessionTimeoutSeconds(settings.sessionTimeout || settings.session_timeout || DEFAULT_SETTINGS.sessionTimeout),
    sessionTimeoutMinutes: sessionTimeoutMinutesFromSeconds(settings.sessionTimeout || settings.session_timeout || DEFAULT_SETTINGS.sessionTimeout),
    roles: Array.isArray(settings.roles) ? settings.roles : DEFAULT_SETTINGS.roles,
    theme: settings.theme || DEFAULT_SETTINGS.theme,
    runningEmail: settings.runningEmail || DEFAULT_SETTINGS.runningEmail,
    superAdmin: settings.superAdmin || DEFAULT_SETTINGS.superAdmin,
    siteName: siteSettings.siteName,
    contactEmail: siteSettings.contactEmail,
    whatsappNumber: siteSettings.whatsappNumber,
    whatsappMessage: siteSettings.whatsappMessage,
    supportName: siteSettings.supportName,
    supportLabel: siteSettings.supportLabel,
    socialLinks: normalizeSocialLinks(settings.socialLinks || DEFAULT_SETTINGS.socialLinks),
    ageGateEnabled: settings.ageGateEnabled !== false,
    stripe: {
      enabled: !!(settings.stripe && settings.stripe.enabled),
      publishableKey: (settings.stripe && settings.stripe.publishableKey) || '',
      hasSecretKey: !!(settings.stripe && settings.stripe.secretKey),
      hasWebhookSecret: !!(settings.stripe && settings.stripe.webhookSecret),
      currency: (settings.stripe && settings.stripe.currency) || 'usd'
    },
    reviewSection,
    tableMissing: !smtp && !settingsRow && !adminRow && Object.keys(fallback || {}).length > 0
  };
}

// Redis cache configuration (60 second TTL)
const CACHE_TTL_SECONDS = 60;
const CACHE_KEYS = {
  SETTINGS: 'settings:global',
  ROLES: 'settings:roles'
};

// In-memory cache for settings to reduce DB pressure (fallback if Redis unavailable)
const SETTINGS_CACHE_TTL_MS = 60 * 1000;
let cachedSettings = null;
let cachedSettingsAt = 0;

function isSettingsCacheFresh(ts) {
  return ts && (Date.now() - ts) < SETTINGS_CACHE_TTL_MS;
}

router.get('/', authenticate, async (req, res) => {
  try {
    const skipCache = req.query.fresh === '1';
    const fetcher = async () => {
      const [current, settingsRow, adminRow] = await Promise.all([
        loadCurrentMailSettings(),
        safeSingle(supabase.from('admin_settings').select('updated_at').eq('key', 'global').limit(1)).catch(() => null),
        safeSingle(supabase.from('admins').select('updated_at').eq('id', 1).limit(1)).catch(() => null)
      ]);
      return {
        data: {
          ...DEFAULT_SETTINGS,
          ...current,
          senderEmail: current.senderEmail || '',
          appPassword: '',
          sessionTimeout: current.sessionTimeout,
          sessionTimeoutMinutes: current.sessionTimeoutMinutes,
        },
        updatedAt: settingsRow?.updated_at || adminRow?.updated_at || null
      };
    };

    let result;
    if (skipCache) {
      result = await fetcher();
    } else {
      result = await redis.getOrFetch(CACHE_KEYS.SETTINGS, CACHE_TTL_SECONDS, fetcher);
    }
    cachedSettings = result;
    cachedSettingsAt = Date.now();
    res.json(result);
  } catch (error) {
    console.error('[Settings] Error:', error);
    res.status(500).json({ error: 'An internal server error occurred' });
  }
});

router.get('/public', async (_req, res) => {
  try {
    const siteSettings = getCachedSiteSettings() || await primeSiteSettingsCache();
    const settingsRow = await safeSingle(supabase.from('admin_settings').select('value').eq('key', 'global').limit(1)).catch(() => null);
    const globalVal = settingsRow?.value || {};
    const ageGateEnabled = globalVal.ageGateEnabled !== false;
    const socialLinks = normalizeSocialLinks(globalVal.socialLinks || DEFAULT_SETTINGS.socialLinks);
    const activeSale = normalizeActiveSale(globalVal.activeSale);
    res.json({ data: { ...(siteSettings || normalizeSiteSettings(DEFAULT_SITE_SETTINGS)), ageGateEnabled, socialLinks, activeSale } });
  } catch (error) {
    console.error('[Settings] Error:', error);
    res.status(500).json({ error: 'An internal server error occurred' });
  }
});

router.get('/public/reviews', async (req, res) => {
  try {
    const result = await redis.getOrFetch('settings:public:reviews', 300, async () => {
      const current = await loadCurrentMailSettings();
      return { data: current.reviewSection || DEFAULT_SETTINGS.reviewSection };
    });
    res.json(result);
  } catch (error) {
    console.error('[Settings] Error:', error);
    res.status(500).json({ error: 'An internal server error occurred' });
  }
});

// Get current admin's preferences (per-admin key)
router.get('/me', authenticate, async (req, res) => {
  try {
    const adminId = req.user?.id || '1';
    const key = `prefs:${adminId}`;
    const row = await safeSingle(supabase.from('admin_settings').select('value').eq('key', key).limit(1)).catch(() => null);
    return res.json({ data: row?.value || {} });
  } catch (error) {
    if (isMissingTableError(error)) {
      return res.json({ data: {} });
    }
    console.error('[Settings] Error:', error);
    res.status(500).json({ error: 'An internal server error occurred' });
  }
});

// Update current admin's preferences
router.put('/me', authenticate, async (req, res) => {
  try {
    const adminId = req.user?.id || '1';
    const key = `prefs:${adminId}`;
    const prefs = req.body || {};
    let usedFallback = false;
    let saved = null;
    try {
      const up = await supabase.from('admin_settings').upsert({ key, value: prefs, updated_at: new Date().toISOString() }, { onConflict: 'key' }).select('value, updated_at').single();
      saved = up?.data || prefs;
      if (up?.error && !isMissingTableError(up.error)) throw up.error;
      if (isMissingTableError(up?.error)) usedFallback = true;
    } catch (e) {
      if (!isMissingTableError(e)) throw e;
      usedFallback = true;
    }

    // fallback to filesystem if table missing
    if (usedFallback) {
      const fallback = readFallbackSettings() || {};
      fallback[`prefs:${adminId}`] = prefs;
      writeFallbackSettings(fallback);
    }

    res.json({ data: saved || prefs, fallback: usedFallback });
  } catch (error) {
    console.error('[Settings] Error:', error);
    res.status(500).json({ error: 'An internal server error occurred' });
  }
});

function normalizeActiveSale(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const discountPercent = Math.max(1, Math.min(90, Math.round(Number(r.discountPercent) || 0)));
  const startedAt = r.startedAt || null;
  const endsAt = r.endsAt || null;
  const endsAtMs = endsAt ? new Date(endsAt).getTime() : 0;
  const active = !!r.active && !!endsAt && endsAtMs > Date.now() && discountPercent > 0;
  const saleName = r.saleName ? String(r.saleName).trim().slice(0, 80) : null;
  const linkedAdId = r.linkedAdId || null;
  const scheduledStartAt = r.scheduledStartAt || null;
  const scheduledDiscountPercent = r.scheduledDiscountPercent ? Math.max(1, Math.min(90, Math.round(Number(r.scheduledDiscountPercent) || 0))) : null;
  const scheduledDurationHours = r.scheduledDurationHours ? Math.max(0.1, Number(r.scheduledDurationHours)) : null;
  return { active, discountPercent, startedAt, endsAt, saleName, linkedAdId, scheduledStartAt, scheduledDiscountPercent, scheduledDurationHours };
}

router.put('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const existing = await loadCurrentMailSettings().catch(() => ({}));
    const body = req.body || {};
    const removeCredentials = !!body.removeCredentials;

    // Only override fields that are explicitly sent in the request
    const pick = (key, fallback) => key in body ? body[key] : (existing[key] !== undefined ? existing[key] : fallback);

    const incomingSenderEmail = String(pick('senderEmail', '') || '').trim();
    const incomingAppPassword = String(pick('appPassword', '') || '').trim();
    const nextSenderEmail = removeCredentials ? '' : (incomingSenderEmail || String(existing.senderEmail || '').trim());
    const nextAppPassword = removeCredentials ? '' : (incomingAppPassword || String(existing.appPassword || '').trim());
    const hasCredentials = !!nextSenderEmail && !!nextAppPassword;
    const rawTimeout = 'sessionTimeout' in body ? body.sessionTimeout : existing.sessionTimeout;
    const normalizedSessionTimeout = normalizeSessionTimeoutSeconds(rawTimeout || DEFAULT_SETTINGS.sessionTimeout);
    const globalSettings = {
      require2FA: 'require2FA' in body ? !!body.require2FA : !!existing.require2FA,
      authType: pick('authType', DEFAULT_SETTINGS.authType),
      sessionTimeout: normalizedSessionTimeout,
      senderName: pick('senderName', DEFAULT_SETTINGS.senderName),
      runningEmail: pick('runningEmail', DEFAULT_SETTINGS.runningEmail),
      smtpHost: pick('smtpHost', '') || '',
      smtpPort: Number(pick('smtpPort', DEFAULT_SETTINGS.smtpPort)),
      smtpEncryption: pick('smtpEncryption', DEFAULT_SETTINGS.smtpEncryption),
      gaMeasurementId: pick('gaMeasurementId', ''),
      gaApiSecret: pick('gaApiSecret', ''),
      superAdmin: pick('superAdmin', DEFAULT_SETTINGS.superAdmin),
      reviewSection: normalizeReviewSection('reviewSection' in body ? body.reviewSection : (existing.reviewSection || DEFAULT_SETTINGS.reviewSection)),
      roles: Array.isArray(body.roles) ? body.roles : (Array.isArray(existing.roles) ? existing.roles : DEFAULT_SETTINGS.roles),
      theme: pick('theme', DEFAULT_SETTINGS.theme),
      socialLinks: normalizeSocialLinks('socialLinks' in body ? body.socialLinks : existing.socialLinks),
      activeSale: normalizeActiveSale('activeSale' in body ? body.activeSale : existing.activeSale),
      ageGateEnabled: 'ageGateEnabled' in body ? !!body.ageGateEnabled : (existing.ageGateEnabled !== false),
      stripe: 'stripe' in body ? normalizeStripeSettings(body.stripe, existing.stripe) : (existing.stripe || { enabled: false }),
      siteName: pick('siteName', DEFAULT_SITE_SETTINGS.siteName),
      contactEmail: pick('contactEmail', DEFAULT_SITE_SETTINGS.contactEmail),
      whatsappNumber: String(pick('whatsappNumber', DEFAULT_SITE_SETTINGS.whatsappNumber)).replace(/[^\d+]/g, '').replace(/^\+/, ''),
      whatsappMessage: pick('whatsappMessage', DEFAULT_SITE_SETTINGS.whatsappMessage),
      supportName: pick('supportName', DEFAULT_SITE_SETTINGS.supportName),
      supportLabel: pick('supportLabel', DEFAULT_SITE_SETTINGS.supportLabel)
    };
    let usedFallback = false;
    let settingsData = null;
    let adminData = null;

    try {
      await saveSiteSettings({
        siteName: globalSettings.siteName,
        contactEmail: globalSettings.contactEmail,
        whatsappNumber: globalSettings.whatsappNumber,
        whatsappMessage: globalSettings.whatsappMessage,
        supportName: globalSettings.supportName,
        supportLabel: globalSettings.supportLabel
      });

      const settingsRes = await supabase
        .from('admin_settings')
        .upsert({ key: 'global', value: globalSettings, updated_at: new Date().toISOString() }, { onConflict: 'key' })
        .select('value, updated_at')
        .single();
      settingsData = settingsRes?.data;
      if (settingsRes?.error && !isMissingTableError(settingsRes.error)) throw settingsRes.error;
      if (isMissingTableError(settingsRes?.error)) usedFallback = true;
    } catch (e) {
      if (!isMissingTableError(e)) throw e;
      usedFallback = true;
    }

    try {
      const adminRes = await supabase
        .from('admins')
        .upsert({
          id: 1,
          email: nextSenderEmail || '',
          app_password: nextAppPassword || '',
          sender_name: globalSettings.senderName || DEFAULT_SETTINGS.senderName,
          smtp_host: globalSettings.smtpHost || '',
          smtp_port: Number(globalSettings.smtpPort || DEFAULT_SETTINGS.smtpPort),
          smtp_encryption: globalSettings.smtpEncryption || DEFAULT_SETTINGS.smtpEncryption,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' })
        .select('email, app_password, sender_name, smtp_host, smtp_port, smtp_encryption, updated_at')
        .single();
      adminData = adminRes?.data;
      if (adminRes?.error && !isMissingTableError(adminRes.error)) throw adminRes.error;
      if (isMissingTableError(adminRes?.error)) usedFallback = true;
    } catch (e) {
      if (!isMissingTableError(e)) throw e;
      usedFallback = true;
    }

    // Only keep fallback file if DB operations failed
    if (usedFallback) {
      const smtpFallback = {
        ...(readFallbackSettings() || {}),
        ...(globalSettings || {}),
        senderEmail: nextSenderEmail || '',
        appPassword: nextAppPassword || '',
        senderName: globalSettings.senderName || DEFAULT_SETTINGS.senderName,
        smtpHost: globalSettings.smtpHost || '',
        smtpPort: Number(globalSettings.smtpPort || DEFAULT_SETTINGS.smtpPort),
        smtpEncryption: globalSettings.smtpEncryption || DEFAULT_SETTINGS.smtpEncryption
      };
      writeFallbackSettings(smtpFallback);
    } else {
      cachedSettings = null;
      cachedSettingsAt = 0;
      redis.del(CACHE_KEYS.SETTINGS).catch(() => {});
      redis.del('settings:public:reviews').catch(() => {});
      redis.del(CACHE_KEYS.ROLES).catch(() => {});
    }

    setCachedSiteSettings({
      siteName: globalSettings.siteName,
      contactEmail: globalSettings.contactEmail,
      whatsappNumber: globalSettings.whatsappNumber,
      whatsappMessage: globalSettings.whatsappMessage,
      supportName: globalSettings.supportName,
      supportLabel: globalSettings.supportLabel
    });

    // Rewrite brand name directly in HTML files
    try {
      rewriteBrandInHtmlFiles(globalSettings.siteName);
    } catch (rewriteErr) {
      console.warn('HTML brand rewrite failed:', rewriteErr.message);
    }

    res.json({
      data: {
        ...DEFAULT_SETTINGS,
        ...mapAdminRow(adminData),
        ...globalSettings,
        senderEmail: hasCredentials ? nextSenderEmail : '',
        appPassword: ''
      },
      updatedAt: settingsData?.updated_at || adminData?.updated_at || new Date().toISOString(),
      fallback: usedFallback
    });
  } catch (error) {
    console.error('[Settings] Error:', error);
    res.status(500).json({ error: 'An internal server error occurred' });
  }
});

router.post('/sale/start', authenticate, authorize('admin'), async (req, res) => {
  try {
    const discountPercent = Math.max(1, Math.min(90, Math.round(Number(req.body?.discountPercent) || 0)));
    const durationHours = Math.max(0.1, Number(req.body?.durationHours) || 24);
    const saleName = req.body?.saleName ? String(req.body.saleName).trim().slice(0, 80) : null;
    const linkedAdId = req.body?.linkedAdId || null;
    const scheduledStartAt = req.body?.scheduledStartAt ? new Date(req.body.scheduledStartAt).toISOString() : null;
    if (!discountPercent) return res.status(400).json({ error: 'discountPercent must be between 1 and 90' });

    const isFutureSchedule = !!(scheduledStartAt && new Date(scheduledStartAt).getTime() > Date.now() + 60000);

    let activeSale;
    if (isFutureSchedule) {
      activeSale = { active: false, discountPercent, startedAt: null, endsAt: null, saleName, linkedAdId, scheduledStartAt, scheduledDiscountPercent: discountPercent, scheduledDurationHours: durationHours };
    } else {
      const startedAt = new Date().toISOString();
      const endsAt = new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString();
      activeSale = { active: true, discountPercent, startedAt, endsAt, saleName, linkedAdId, scheduledStartAt: null, scheduledDiscountPercent: null, scheduledDurationHours: null };
    }

    const existingRow = await safeSingle(supabase.from('admin_settings').select('value').eq('key', 'global').limit(1)).catch(() => null);
    const existingValue = (existingRow && existingRow.value) || {};
    const nextValue = { ...existingValue, activeSale };
    await supabase.from('admin_settings').upsert({ key: 'global', value: nextValue, updated_at: new Date().toISOString() }, { onConflict: 'key' });

    res.json({ ok: true, activeSale });
  } catch (error) {
    console.error('[Settings] Sale start error:', error);
    res.status(500).json({ error: 'Could not start sale' });
  }
});

router.post('/sale/end', authenticate, authorize('admin'), async (req, res) => {
  try {
    const existingRow = await safeSingle(supabase.from('admin_settings').select('value').eq('key', 'global').limit(1)).catch(() => null);
    const existingValue = (existingRow && existingRow.value) || {};
    const prevSale = existingValue.activeSale || {};
    const activeSale = { ...prevSale, active: false, scheduledStartAt: null, scheduledDiscountPercent: null, scheduledDurationHours: null, linkedAdId: null };
    const nextValue = { ...existingValue, activeSale };
    await supabase.from('admin_settings').upsert({ key: 'global', value: nextValue, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    res.json({ ok: true, activeSale });
  } catch (error) {
    console.error('[Settings] Sale end error:', error);
    res.status(500).json({ error: 'Could not end sale' });
  }
});

router.post('/test-email', authenticate, authorize('admin'), async (req, res) => {
  try {
    const existing = await loadCurrentMailSettings().catch(() => ({}));
    const normalizeSecret = (value) => String(value || '').replace(/\s+/g, '').trim();
    const senderEmail = String(req.body?.senderEmail || existing.senderEmail || '').trim();
    const appPassword = normalizeSecret(req.body?.appPassword || existing.appPassword || '');
    const smtpHost = String(req.body?.smtpHost || '').trim() || 'smtp.gmail.com';
    const smtpPort = Number(req.body?.smtpPort || 587);
    const smtpEncryption = String(req.body?.smtpEncryption || 'TLS').toUpperCase();
    const senderName = String(req.body?.senderName || 'Forge Dominance Admin').trim();
    const testEmail = String(req.body?.testEmail || senderEmail).trim();

    if (!senderEmail || !appPassword || !smtpPort || !testEmail) {
      return res.status(400).json({ error: 'Sender email, app password, SMTP port, and test email are required.' });
    }

    const candidates = buildTransportCandidates({ senderEmail, appPassword, smtpHost, smtpPort, smtpEncryption, senderName });
    let lastError = null;
    for (const candidate of candidates) {
      try {
        const transporter = nodemailer.createTransport({
          host: candidate.host,
          port: candidate.port,
          secure: candidate.secure,
          auth: {
            user: senderEmail,
            pass: appPassword
          },
          connectionTimeout: candidate.connectionTimeout,
          greetingTimeout: candidate.greetingTimeout,
          socketTimeout: candidate.socketTimeout,
          tls: candidate.tls,
          requireTLS: candidate.requireTLS
        });

        await transporter.verify();
        await transporter.sendMail({
          from: `${senderName} <${senderEmail}>`,
          to: testEmail,
          subject: 'Forge Dominance Admin SMTP Test',
          text: `SMTP test successful at ${new Date().toISOString()}`
        });

        return res.json({ message: 'SMTP connection verified and test email sent.' });
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error('SMTP connection failed');
  } catch (error) {
    const message = String(error?.message || 'SMTP test failed.');
    const friendly = message.includes('ETIMEDOUT')
      ? 'SMTP connection timed out. Try port 465 with SSL, or check outbound firewall/network access.'
      : message;
    res.status(400).json({ error: friendly });
  }
});

// GET /session-config - Return current session timeout
router.get('/session-config', authenticate, async (req, res) => {
  try {
    const settings = await loadCurrentMailSettings().catch(() => ({}));
    const timeoutSeconds = settings.sessionTimeout || DEFAULT_SETTINGS.sessionTimeout;
    const timeoutMinutes = sessionTimeoutMinutesFromSeconds(timeoutSeconds);
    res.json({
      data: {
        sessionTimeoutSeconds: timeoutSeconds,
        sessionTimeoutMinutes: timeoutMinutes
      }
    });
  } catch (error) {
    console.error('[Settings] Error:', error);
    res.status(500).json({ error: 'An internal server error occurred' });
  }
});

// GET /roles - Return roles from settings
router.get('/roles', authenticate, async (req, res) => {
  try {
    // Try to get settings from cache or database
    let settings = {};
    if (cachedSettings && isSettingsCacheFresh(cachedSettingsAt)) {
      settings = cachedSettings.data || {};
    } else {
      try {
        const settingsRow = await safeSingle(supabase.from('admin_settings').select('value').eq('key', 'global').limit(1)).catch(() => null);
        if (settingsRow?.value) {
          settings = settingsRow.value;
        }
      } catch (e) {
        // fall back to defaults
      }
    }
    const roles = settings?.roles || DEFAULT_SETTINGS.roles || [];
    
    // Format roles with id field for dropdown compatibility
    const formattedRoles = roles.map((role, idx) => ({
      id: (role.name || role)?.toLowerCase().replace(/\s+/g, '-') || `role-${idx}`,
      name: role.name || role,
      permission: role.permission || 'limited'
    }));
    
    res.json({ data: formattedRoles });
  } catch (error) {
    console.error('[Settings] Error:', error);
    res.status(500).json({ error: 'An internal server error occurred' });
  }
});

// POST /roles - Create a new role
router.post('/roles', authenticate, authorize('superadmin'), async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    const permissions = req.body?.permissions;

    if (!name) return res.status(400).json({ error: 'name is required' });
    if (!permissions || (typeof permissions !== 'string' && !Array.isArray(permissions))) {
      return res.status(400).json({ error: 'permissions is required (string or array)' });
    }

    const permission = Array.isArray(permissions) ? permissions.join(', ') : permissions;

    const settingsRow = await safeSingle(supabase.from('admin_settings').select('value').eq('key', 'global').limit(1)).catch(() => null);
    const settings = settingsRow?.value || {};
    const roles = Array.isArray(settings.roles) ? settings.roles : DEFAULT_SETTINGS.roles;

    const newRole = { name, permission };
    roles.push(newRole);

    await supabase
      .from('admin_settings')
      .upsert({ key: 'global', value: { ...settings, roles }, updated_at: new Date().toISOString() }, { onConflict: 'key' });

    cachedSettings = null;
    cachedSettingsAt = 0;
    if (redis.isReady()) redis.del(CACHE_KEYS.SETTINGS).catch(() => {});

    const id = name.toLowerCase().replace(/\s+/g, '-');
    res.status(201).json({ id, name, permission });
  } catch (error) {
    console.error('[Settings] Error:', error);
    res.status(500).json({ error: 'An internal server error occurred' });
  }
});

// PUT /roles/:id - Update an existing role
router.put('/roles/:id', authenticate, authorize('superadmin'), async (req, res) => {
  try {
    const roleId = req.params.id;
    const name = String(req.body?.name || '').trim();
    const permissions = req.body?.permissions;

    if (!name) return res.status(400).json({ error: 'name is required' });
    if (!permissions || (typeof permissions !== 'string' && !Array.isArray(permissions))) {
      return res.status(400).json({ error: 'permissions is required (string or array)' });
    }

    const permission = Array.isArray(permissions) ? permissions.join(', ') : permissions;

    const settingsRow = await safeSingle(supabase.from('admin_settings').select('value').eq('key', 'global').limit(1)).catch(() => null);
    const settings = settingsRow?.value || {};
    const roles = Array.isArray(settings.roles) ? settings.roles : DEFAULT_SETTINGS.roles;

    const idx = roles.findIndex((r) => {
      const id = (r.name || '').toLowerCase().replace(/\s+/g, '-');
      return id === roleId;
    });

    if (idx === -1) return res.status(404).json({ error: 'Role not found' });

    roles[idx] = { name, permission };

    await supabase
      .from('admin_settings')
      .upsert({ key: 'global', value: { ...settings, roles }, updated_at: new Date().toISOString() }, { onConflict: 'key' });

    cachedSettings = null;
    cachedSettingsAt = 0;
    if (redis.isReady()) redis.del(CACHE_KEYS.SETTINGS).catch(() => {});

    const id = name.toLowerCase().replace(/\s+/g, '-');
    res.json({ id, name, permission });
  } catch (error) {
    console.error('[Settings] Error:', error);
    res.status(500).json({ error: 'An internal server error occurred' });
  }
});

// DELETE /roles/:id - Delete a role (prevent deleting superadmin/admin)
router.delete('/roles/:id', authenticate, authorize('superadmin'), async (req, res) => {
  try {
    const roleId = req.params.id;

    if (roleId === 'superadmin' || roleId === 'admin' || roleId === 'super-admin') {
      return res.status(403).json({ error: 'Cannot delete protected role' });
    }

    const settingsRow = await safeSingle(supabase.from('admin_settings').select('value').eq('key', 'global').limit(1)).catch(() => null);
    const settings = settingsRow?.value || {};
    const roles = Array.isArray(settings.roles) ? settings.roles : DEFAULT_SETTINGS.roles;

    const filtered = roles.filter((r) => {
      const id = (r.name || '').toLowerCase().replace(/\s+/g, '-');
      return id !== roleId;
    });

    if (filtered.length === roles.length) return res.status(404).json({ error: 'Role not found' });

    await supabase
      .from('admin_settings')
      .upsert({ key: 'global', value: { ...settings, roles: filtered }, updated_at: new Date().toISOString() }, { onConflict: 'key' });

    cachedSettings = null;
    cachedSettingsAt = 0;
    if (redis.isReady()) redis.del(CACHE_KEYS.SETTINGS).catch(() => {});

    res.json({ message: 'Role deleted' });
  } catch (error) {
    console.error('[Settings] Error:', error);
    res.status(500).json({ error: 'An internal server error occurred' });
  }
});

module.exports = router;




// Periodic check: activate any scheduled sale whose start time has arrived
setInterval(async () => {
  try {
    const existingRow = await safeSingle(supabase.from('admin_settings').select('value').eq('key', 'global').limit(1)).catch(() => null);
    const existingValue = (existingRow && existingRow.value) || {};
    const sale = existingValue.activeSale;
    if (!sale || sale.active || !sale.scheduledStartAt) return;
    if (new Date(sale.scheduledStartAt).getTime() > Date.now()) return;
    const discountPercent = sale.scheduledDiscountPercent || sale.discountPercent;
    const durationHours = sale.scheduledDurationHours || 24;
    const startedAt = new Date().toISOString();
    const endsAt = new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString();
    const activeSale = { ...sale, active: true, startedAt, endsAt, discountPercent, scheduledStartAt: null, scheduledDiscountPercent: null, scheduledDurationHours: null };
    const nextValue = { ...existingValue, activeSale };
    await supabase.from('admin_settings').upsert({ key: 'global', value: nextValue, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    console.log('[Settings] Scheduled sale activated:', activeSale.saleName || '(unnamed)');
  } catch (e) {
    console.error('[Settings] Scheduled sale check failed:', e.message);
  }
}, 60000);
