const fs = require('fs');
const path = require('path');
const supabase = require('../config/supabase');
const { isMissingTableError } = require('./dbUtils');

const SITE_SETTINGS_STORE_FILE = path.resolve(__dirname, '..', '..', 'assets', 'uploads', 'site-settings-fallback.json');

const DEFAULT_SITE_SETTINGS = {
  siteName: 'Forge Dominance',
  contactEmail: 'forgedominance@gmail.com',
  whatsappNumber: '923298399619',
  whatsappMessage: "Hi Forge Dominance, I'm interested in a knife.",
  supportName: 'James',
  supportLabel: 'Forge Dominance'
};

fs.mkdirSync(path.dirname(SITE_SETTINGS_STORE_FILE), { recursive: true });

let cachedSiteSettings = null;
let cachedSiteSettingsAt = 0;

function readFallbackSiteSettings() {
  try {
    if (!fs.existsSync(SITE_SETTINGS_STORE_FILE)) return {};
    const raw = fs.readFileSync(SITE_SETTINGS_STORE_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeFallbackSiteSettings(settings) {
  try {
    fs.writeFileSync(SITE_SETTINGS_STORE_FILE, JSON.stringify(settings || {}, null, 2));
  } catch {
    // ignore fallback write errors
  }
}

function normalizeSiteSettings(input) {
  const raw = input && typeof input === 'object' ? input : {};
  const whatsappNumber = String(raw.whatsappNumber || raw.whatsapp || DEFAULT_SITE_SETTINGS.whatsappNumber)
    .replace(/[^\d+]/g, '')
    .replace(/^\+/, '');

  return {
    siteName: String(raw.siteName || raw.websiteName || DEFAULT_SITE_SETTINGS.siteName).trim() || DEFAULT_SITE_SETTINGS.siteName,
    contactEmail: String(raw.contactEmail || raw.supportEmail || DEFAULT_SITE_SETTINGS.contactEmail).trim() || DEFAULT_SITE_SETTINGS.contactEmail,
    whatsappNumber: whatsappNumber || DEFAULT_SITE_SETTINGS.whatsappNumber,
    whatsappMessage: String(raw.whatsappMessage || DEFAULT_SITE_SETTINGS.whatsappMessage).trim() || DEFAULT_SITE_SETTINGS.whatsappMessage,
    supportName: String(raw.supportName || DEFAULT_SITE_SETTINGS.supportName).trim() || DEFAULT_SITE_SETTINGS.supportName,
    supportLabel: String(raw.supportLabel || DEFAULT_SITE_SETTINGS.supportLabel).trim() || DEFAULT_SITE_SETTINGS.supportLabel,
    updatedAt: raw.updatedAt || raw.updated_at || null
  };
}

function getCachedSiteSettings() {
  return cachedSiteSettings ? { ...cachedSiteSettings } : null;
}

function setCachedSiteSettings(settings) {
  cachedSiteSettings = normalizeSiteSettings(settings);
  cachedSiteSettingsAt = Date.now();
  return getCachedSiteSettings();
}

async function safeSingle(query) {
  const result = await query;
  if (result?.error && !isMissingTableError(result.error)) {
    throw result.error;
  }
  const data = result?.data;
  return Array.isArray(data) ? (data[0] || null) : (data || null);
}

async function loadSiteSettingsFromStorage() {
  const fallback = normalizeSiteSettings(readFallbackSiteSettings());

  const siteRow = await safeSingle(
    supabase.from('site_settings').select('*').eq('id', 1).limit(1)
  ).catch(() => null);

  if (siteRow) {
    return normalizeSiteSettings({
      ...fallback,
      ...siteRow,
      siteName: siteRow.site_name,
      contactEmail: siteRow.contact_email,
      whatsappNumber: siteRow.whatsapp_number,
      whatsappMessage: siteRow.whatsapp_message,
      supportName: siteRow.support_name,
      supportLabel: siteRow.support_label,
      updatedAt: siteRow.updated_at
    });
  }

  const settingsRow = await safeSingle(
    supabase.from('admin_settings').select('value, updated_at').eq('key', 'global').limit(1)
  ).catch(() => null);

  if (settingsRow?.value) {
    return normalizeSiteSettings({
      ...fallback,
      ...settingsRow.value,
      updatedAt: settingsRow.updated_at
    });
  }

  return fallback;
}

async function primeSiteSettingsCache() {
  const loaded = await loadSiteSettingsFromStorage();
  return setCachedSiteSettings(loaded);
}

function getSiteSettingsSnapshot() {
  return getCachedSiteSettings() || normalizeSiteSettings(readFallbackSiteSettings());
}

async function saveSiteSettings(input) {
  const next = normalizeSiteSettings(input);
  const payload = {
    id: 1,
    site_name: next.siteName,
    contact_email: next.contactEmail,
    whatsapp_number: next.whatsappNumber,
    whatsapp_message: next.whatsappMessage,
    support_name: next.supportName,
    support_label: next.supportLabel,
    updated_at: new Date().toISOString()
  };

  try {
    const { data, error } = await supabase.from('site_settings').upsert(payload, { onConflict: 'id' }).select('*').single();
    if (error) {
      if (isMissingTableError(error)) {
        writeFallbackSiteSettings(next);
        return setCachedSiteSettings(next);
      }
      throw error;
    }

    const saved = normalizeSiteSettings({
      ...next,
      ...data,
      siteName: data?.site_name || next.siteName,
      contactEmail: data?.contact_email || next.contactEmail,
      whatsappNumber: data?.whatsapp_number || next.whatsappNumber,
      whatsappMessage: data?.whatsapp_message || next.whatsappMessage,
      supportName: data?.support_name || next.supportName,
      supportLabel: data?.support_label || next.supportLabel,
      updatedAt: data?.updated_at || next.updatedAt
    });

    setCachedSiteSettings(saved);
    return saved;
  } catch (error) {
    if (isMissingTableError(error)) {
      writeFallbackSiteSettings(next);
      return setCachedSiteSettings(next);
    }
    throw error;
  }
}

module.exports = {
  DEFAULT_SITE_SETTINGS,
  getCachedSiteSettings,
  getSiteSettingsSnapshot,
  loadSiteSettingsFromStorage,
  normalizeSiteSettings,
  primeSiteSettingsCache,
  saveSiteSettings,
  setCachedSiteSettings,
  readFallbackSiteSettings,
  writeFallbackSiteSettings,
  SITE_SETTINGS_STORE_FILE,
  cachedSiteSettingsAt: () => cachedSiteSettingsAt
};

