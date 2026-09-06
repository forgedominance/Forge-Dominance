const crypto = require('crypto');

const PIXEL_ID = process.env.META_PIXEL_ID;
const ACCESS_TOKEN = process.env.META_CAPI_ACCESS_TOKEN;
const API_VERSION = 'v21.0';

function sha256(value) {
  if (!value) return null;
  return crypto.createHash('sha256').update(String(value).trim().toLowerCase()).digest('hex');
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  const realIp = req.headers['x-real-ip'];
  const connectingIp = req.headers['cf-connecting-ip'];
  const candidates = [
    connectingIp,
    realIp,
    forwarded ? String(forwarded).split(',')[0].trim() : null,
    req.socket?.remoteAddress,
    req.ip
  ];
  const ip = candidates.find((v) => v && String(v).trim()) || null;
  return ip ? String(ip).replace(/^::ffff:/, '').replace(/^\[|\]$/g, '').trim() : null;
}

async function sendEvent({ eventName, req, contentIds, contentType = 'product', value, currency = 'USD', email, phone, eventId }) {
  if (!PIXEL_ID || !ACCESS_TOKEN) {
    console.warn('[MetaCAPI] Missing META_PIXEL_ID or META_CAPI_ACCESS_TOKEN, skipping event:', eventName);
    return;
  }

  const userData = {
    client_ip_address: getClientIp(req),
    client_user_agent: req.headers['user-agent'] || null,
  };
  if (email) userData.em = [sha256(email)];
  if (phone) userData.ph = [sha256(String(phone).replace(/[^0-9]/g, ''))];

  const customData = {
    content_type: contentType,
    content_ids: Array.isArray(contentIds) ? contentIds : [contentIds]
  };
  if (value !== undefined) customData.value = String(value);
  if (currency) customData.currency = currency;

  const payload = {
    data: [{
      event_name: eventName,
      event_time: Math.floor(Date.now() / 1000),
      action_source: 'website',
      event_source_url: req.headers['referer'] || `https://forgedominance.com${req.originalUrl || ''}`,
      event_id: eventId || undefined,
      user_data: userData,
      custom_data: customData
    }]
  };

  try {
    const resp = await fetch(`https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await resp.json();
    if (!resp.ok) {
      console.error('[MetaCAPI] Error sending event', eventName, json);
    }
    return json;
  } catch (err) {
    console.error('[MetaCAPI] Request failed for event', eventName, err.message);
  }
}

module.exports = { sendEvent };
