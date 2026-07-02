const path = require('path');
const fs = require('fs');

require('dotenv').config({ path: path.resolve(__dirname, '.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const logger = require('./lib/logger');
const supabase = require('./config/supabase');
const redis = require('./lib/redisClient');
const { verifyAccessToken } = require('./config/jwt');
const { requireAdminSubdomain } = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const productsRoutes = require('./routes/products');
const ordersRoutes = require('./routes/orders');
const customersRoutes = require('./routes/customers');
const dashboardRoutes = require('./routes/dashboard');
const promotionsRoutes = require('./routes/promotions');
const settingsRoutes = require('./routes/settings');
const themesRoutes = require('./routes/themes');
const editorRoutes = require('./routes/editor');
const visitorsRoutes = require('./routes/visitors');
const trackingRoutes = require('./routes/tracking');
const usersRoutes = require('./routes/users');
const uploadsRoutes = require('./routes/uploads');
const commissionsRoutes = require('./routes/commissions');
const chatRoutes = require('./routes/chat');
const faqRoutes = require('./routes/faq');
const homepageContentRoutes = require('./routes/homepage-content');
const stripeRoutes = require('./routes/stripe');
const { primeSiteSettingsCache } = require('./lib/siteSettings');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const SUPABASE_CONFIGURED = Boolean(SUPABASE_URL && SUPABASE_KEY);

const app = express();
app.disable('x-powered-by');
const PORT = process.env.PORT || 5000;
const ROOT_DIR = path.resolve(__dirname, '..');
const rateLimitMaps = {
  auth: new Map(),
  commissionsPublic: new Map(),
  ordersPublic: new Map(),
  chat: new Map(),
  visitorTrack: new Map(),
  global: new Map()
};

// Cleanup stale rate-limit entries every 10 minutes to prevent unbounded Map growth
setInterval(() => {
  const now = Date.now();
  for (const map of Object.values(rateLimitMaps)) {
    for (const [ip, item] of map) {
      if (now > item.resetAt) {
        map.delete(ip);
      }
    }
  }
}, 10 * 60 * 1000).unref();

// In Docker: __dirname=/app, ROOT_DIR=/
// Locally: __dirname=e:\Main\backend, ROOT_DIR=e:\Main
// This helper finds the first existing path from a list of candidates.
function resolveStaticDir(name) {
  const candidates = [
    path.join(ROOT_DIR, name),
    `/${name}`
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function parseAllowedOrigins() {
  if (process.env.NODE_ENV === 'production') {
    const raw = String(process.env.FRONTEND_URL || '');
    const origins = raw.split(',').map((o) => o.trim()).filter(Boolean);
    if (origins.length === 0) {
      console.warn('[CORS] WARNING: FRONTEND_URL is not set in production. No origins will be allowed.');
    }
    return origins;
  }
  const raw = String(process.env.FRONTEND_URL || 'http://localhost,http://localhost:80,http://localhost:5000,http://127.0.0.1,http://127.0.0.1:5000');
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function resolveFirstExistingPath(paths) {
  for (const candidate of paths) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function applySecurityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');

  if (req.path.startsWith('/admin/') || req.path.startsWith('/admin')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, nosnippet');
    res.setHeader('Content-Security-Policy',
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "font-src 'self' https://fonts.gstatic.com; " +
      "img-src 'self' data: blob: https:; " +
      "connect-src 'self'; " +
      "frame-ancestors 'none';"
    );
  } else {
    res.setHeader('Content-Security-Policy',
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://cdn.jsdelivr.net; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "font-src 'self' https://fonts.gstatic.com data:; " +
      "img-src 'self' data: blob: https:; " +
      "media-src 'self'; " +
      "connect-src 'self' https://www.google-analytics.com; " +
      "frame-ancestors 'none'; " +
      "base-uri 'self'; " +
      "form-action 'self';"
    );
  }

  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  next();
}

function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
}

function makeRateLimiter(mapName, windowMs, maxRequests, message) {
  return (req, res, next) => {
    const ip = getClientIp(req);
    const now = Date.now();
    const map = rateLimitMaps[mapName];
    const item = map.get(ip) || { count: 0, resetAt: now + windowMs };

    if (now > item.resetAt) {
      item.count = 0;
      item.resetAt = now + windowMs;
    }
    item.count += 1;
    map.set(ip, item);

    if (item.count > maxRequests) {
      return res.status(429).json({ error: message });
    }
    next();
  };
}

const authRateLimit = (req, res, next) => {
  if (!req.path.startsWith('/api/auth/')) return next();
  return makeRateLimiter('auth', 10 * 60 * 1000, 80, 'Too many authentication requests. Please try again later.')(req, res, next);
};

const commissionsPublicRateLimit = makeRateLimiter('commissionsPublic', 60 * 60 * 1000, 5, 'Too many commission submissions. Please try again later.');
const ordersPublicRateLimit = makeRateLimiter('ordersPublic', 60 * 60 * 1000, 10, 'Too many order submissions. Please try again later.');
const chatRateLimitInner = makeRateLimiter('chat', 10 * 60 * 1000, 30, 'Too many chat messages. Please try again later.');
const chatRateLimit = (req, res, next) => {
  if (req.method === 'POST' && (req.path === '/' || req.path === '')) {
    return chatRateLimitInner(req, res, next);
  }
  next();
};
const visitorTrackRateLimit = makeRateLimiter('visitorTrack', 60 * 1000, 100, 'Too many tracking requests.');

// Serve robots.txt before other routes
app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.sendFile(path.join(ROOT_DIR, 'robots.txt'));
});

// Dynamic sitemap with 1-hour in-memory cache
let sitemapCache = { xml: null, expiry: 0 };
app.get('/sitemap.xml', async (req, res) => {
  const now = Date.now();
  if (sitemapCache.xml && now < sitemapCache.expiry) {
    res.type('application/xml').send(sitemapCache.xml);
    return;
  }

  const DOMAIN = 'https://forgedominance.com';
  const staticPages = [
    { loc: '/', changefreq: 'weekly', priority: '1.0' },
    { loc: '/pages/collection.html', changefreq: 'daily', priority: '0.9' },
    { loc: '/pages/commission.html', changefreq: 'monthly', priority: '0.8' },
    { loc: '/pages/about.html', changefreq: 'monthly', priority: '0.7' },
    { loc: '/pages/faq.html', changefreq: 'monthly', priority: '0.6' },
    { loc: '/pages/press.html', changefreq: 'monthly', priority: '0.5' },
    { loc: '/pages/privacy.html', changefreq: 'yearly', priority: '0.3' },
    { loc: '/pages/terms.html', changefreq: 'yearly', priority: '0.3' },
    { loc: '/pages/shipping-info.html', changefreq: 'yearly', priority: '0.3' },
    { loc: '/pages/warranty-policy.html', changefreq: 'yearly', priority: '0.3' },
    { loc: '/pages/blade-laws-by-state.html', changefreq: 'yearly', priority: '0.3' },
    { loc: '/pages/akti-compliance.html', changefreq: 'yearly', priority: '0.3' }
  ];

  try {
    const { data: products, error } = await supabase
      .from('products')
      .select('id, updated_at')
      .order('id');

    let urls = staticPages.map(p =>
      `  <url>\n    <loc>${DOMAIN}${p.loc}</loc>\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>`
    );

    if (!error && products) {
      for (const product of products) {
        const lastmod = product.updated_at ? new Date(product.updated_at).toISOString().split('T')[0] : '';
        urls.push(`  <url>\n    <loc>${DOMAIN}/pages/product.html?id=${product.id}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''}\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>`);
      }
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`;
    sitemapCache = { xml, expiry: now + 3600000 };
    res.type('application/xml').send(xml);
  } catch (err) {
    // Fallback to static sitemap file
    const staticFile = path.join(ROOT_DIR, 'sitemap-static.xml');
    if (fs.existsSync(staticFile)) {
      res.type('application/xml').sendFile(staticFile);
    } else {
      res.status(500).send('Sitemap generation failed');
    }
  }
});

// Request timeout - allow slower catalog/admin/product uploads a little more room
app.use((req, res, next) => {
  req.setTimeout(120000);
  res.setTimeout(120000, () => {
    if (!res.headersSent) {
      res.status(503).json({ error: 'Request timed out' });
    }
  });
  next();
});

// Middleware
app.set('trust proxy', 1);

// Apply Helmet for comprehensive security headers
// This adds protections like X-Content-Type-Options, X-Frame-Options, CSP, HSTS, etc.
app.use(helmet({
  contentSecurityPolicy: false, // We have custom CSP in applySecurityHeaders
  crossOriginResourcePolicy: { policy: 'same-origin' },
  crossOriginOpenerPolicy: false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true }
}));

const allowedOrigins = parseAllowedOrigins();
console.log(`[CORS] Allowed origins (${process.env.NODE_ENV || 'development'}):`, allowedOrigins);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  const dynamicOrigins = [...allowedOrigins];

  // Allow same-host requests (admin pages served from same server)
  if (origin && req.headers.host) {
    const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const sameOrigin = `${proto}://${req.headers.host}`;
    if (!dynamicOrigins.includes(sameOrigin)) dynamicOrigins.push(sameOrigin);
  }

  cors({
    origin(reqOrigin, callback) {
      if (!reqOrigin) return callback(null, true);
      if (dynamicOrigins.includes(reqOrigin)) return callback(null, true);

      if (process.env.NODE_ENV === 'production') {
        // In production, ONLY allow origins in the dynamicOrigins list.
        // No Cloudflare tunnels, no trycloudflare.com, no exceptions.
        return callback(new Error('Not allowed by CORS'));
      }

      // In development, be permissive
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })(req, res, next);
});
app.use(applySecurityHeaders);
app.use(authRateLimit);
app.use(express.json({
  limit: '10mb',
  reviver: (key, value) => {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') return undefined;
    return value;
  }
}));

// Security: sanitize all input, prevent prototype pollution and operator injection
const { sanitizeObject, preventPrototypePollution, removeMongoOperators } = require('./lib/sanitize');
app.use((req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    preventPrototypePollution(req.body);
    removeMongoOperators(req.body);
    req.body = sanitizeObject(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    preventPrototypePollution(req.query);
    removeMongoOperators(req.query);
    for (const key of Object.keys(req.query)) {
      if (Array.isArray(req.query[key])) req.query[key] = req.query[key][0];
    }
    req.query = sanitizeObject(req.query, { maxLength: 500 });
  }
  next();
});
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    logger[level]('HTTP', { method: req.method, path: req.path, status: res.statusCode, ms, ip: req.ip });
  });
  next();
});

// Admin subdomain routing: Enforce that admin.forgedominance.com ONLY serves admin content
// Non-admin paths redirect to /admin/login.html (if not authenticated) or /admin/dashboard.html (if authenticated)
const adminSubdomainRouting = (req, res, next) => {
  const host = (req.headers.host || '').toLowerCase().trim();
  const hostname = host.split(':')[0];
  
  // Check if this is a request to the admin subdomain
  const isAdminHost = hostname.includes('admin');
  if (!isAdminHost) {
    return next();
  }
  
  // If path is /admin or starts with /admin/, allow it through to be handled normally
  if (req.path === '/admin' || req.path.startsWith('/admin/')) {
    return next();
  }

  // Allow static assets (CSS, JS, images, fonts) through without redirect
  if (/\.(css|js|mjs|png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf|eot|map)$/i.test(req.path)) {
    return next();
  }

  // Allow API calls through without redirect (login, dashboard data, etc.)
  if (req.path.startsWith('/api/')) {
    return next();
  }
  
  // For any other path on admin subdomain, determine auth status and redirect
  let isAuthenticated = false;
  
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    try {
      const token = req.headers.authorization.substring(7);
      const decoded = verifyAccessToken(token);
      isAuthenticated = !!decoded;
    } catch (_err) {
      // Token verification failed, treat as not authenticated
      isAuthenticated = false;
    }
  }
  
  // Redirect to appropriate page based on auth status
  if (isAuthenticated) {
    // User has valid token, redirect to admin dashboard
    return res.redirect(302, '/admin/dashboard.html');
  } else {
    // User not authenticated, redirect to admin login
    return res.redirect(302, '/admin/login.html');
  }
};

app.use(adminSubdomainRouting);

// Static file serving — works in both Docker and local development
const assetsDir = resolveStaticDir('assets');
const adminDir = resolveStaticDir('admin');
const pagesDir = resolveStaticDir('pages');

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getPublicBaseUrl(req) {
  // In production, use FRONTEND_URL from environment for canonical URLs
  if (process.env.NODE_ENV === 'production' && process.env.FRONTEND_URL) {
    return process.env.FRONTEND_URL.replace(/\/$/, '');
  }
  // In development, construct from request headers
  const host = req.get('host') || 'localhost';
  // Use https:// if x-forwarded-proto header indicates it (for proxy/tunnel setup)
  const proto = (req.get('x-forwarded-proto') || req.protocol || 'http');
  return `${proto}://${host}`;
}

const HTML_CACHE_MAX = 100;
const htmlCache = {};
let htmlCacheKeys = [];

function htmlCacheSet(key, value) {
  if (htmlCache[key]) return;
  if (htmlCacheKeys.length >= HTML_CACHE_MAX) {
    const evict = htmlCacheKeys.shift();
    delete htmlCache[evict];
  }
  htmlCache[key] = value;
  htmlCacheKeys.push(key);
}

app.get('/pages/product.html', async (req, res, next) => {
  const productId = String(req.query.id || '').trim();
  if (!productId) return next();
  if (!pagesDir) return next();

  if (htmlCache[productId]) {
    res.type('html').send(htmlCache[productId]);
    return;
  }

  try {
    const templatePath = path.join(pagesDir, 'product.html');
    const templateHtml = fs.readFileSync(templatePath, 'utf8');

    const { data: product, error: productError } = await supabase
      .from('products')
      .select('name, price, category, description')
      .eq('id', productId)
      .single();

    if (productError || !product) return next();

    const { data: thumbnails, error: imageError } = await supabase
      .from('product_images')
      .select('image_url')
      .eq('product_id', productId)
      .eq('is_thumbnail', true)
      .limit(1);

    if (imageError) return next();

    const baseUrl = getPublicBaseUrl(req);
    const fallbackImagePath = '/assets/images/logo.jpg';
    const rawImageUrl = thumbnails?.[0]?.image_url || fallbackImagePath;
    const absoluteImageUrl = /^https?:\/\//i.test(rawImageUrl)
      ? rawImageUrl
      : `${baseUrl}${rawImageUrl.startsWith('/') ? rawImageUrl : `/${rawImageUrl}`}`;
    const pageUrl = `${baseUrl}/pages/product.html?id=${encodeURIComponent(productId)}`;
    const shortDesc = (product.description || '').replace(/\s+/g, ' ').trim().slice(0, 160);

    let html = templateHtml;
    html = html.replace(
      /<meta\s+id="og-title"\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,
      `<meta id="og-title" property="og:title" content="${escapeHtml(product.name || '')} — Forge Dominance" />`
    );
    html = html.replace(
      /<meta\s+id="og-description"\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
      `<meta id="og-description" property="og:description" content="${escapeHtml(shortDesc)}" />`
    );
    html = html.replace(
      /<meta\s+id="og-image"\s+property="og:image"\s+content="[^"]*"\s*\/?>/i,
      `<meta id="og-image" property="og:image" content="${escapeHtml(absoluteImageUrl)}" />`
    );
    html = html.replace(
      /<meta\s+id="og-image-width"\s+property="og:image:width"\s+content="[^"]*"\s*\/?>/i,
      '<meta id="og-image-width" property="og:image:width" content="1200" />'
    );
    html = html.replace(
      /<meta\s+id="og-image-height"\s+property="og:image:height"\s+content="[^"]*"\s*\/?>/i,
      '<meta id="og-image-height" property="og:image:height" content="630" />'
    );
    html = html.replace(
      /<meta\s+id="og-url"\s+property="og:url"\s+content="[^"]*"\s*\/?>/i,
      `<meta id="og-url" property="og:url" content="${escapeHtml(pageUrl)}" />`
    );
    html = html.replace(
      /<meta\s+id="og-type"\s+property="og:type"\s+content="[^"]*"\s*\/?>/i,
      '<meta id="og-type" property="og:type" content="product" />'
    );

    htmlCacheSet(productId, html);
    res.type('html').send(html);
  } catch (error) {
    console.error('Failed to render dynamic product HTML:', error);
    return next();
  }
});

app.get('/pages/order.html', async (req, res, next) => {
  if (!pagesDir) return next();

  try {
    const templatePath = path.join(pagesDir, 'order.html');
    const templateHtml = fs.readFileSync(templatePath, 'utf8');
    const baseUrl = getPublicBaseUrl(req);
    let imageUrl = `${baseUrl}/assets/images/logo.jpg`;
    let orderTitle = 'Bladesmith — Your Order';
    const pageUrl = `${baseUrl}/pages/order.html`;

    // If single product ID provided, use its thumbnail for WhatsApp preview
    const productId = req.query.product;
    if (productId) {
      try {
        const { data: product } = await supabase.from('products').select('name').eq('id', productId).maybeSingle();
        const { data: media } = await supabase.from('product_images').select('image_url').eq('product_id', productId).eq('is_thumbnail', true).limit(1).maybeSingle();
        if (media?.image_url) {
          const img = media.image_url;
          imageUrl = img.startsWith('http') ? img : `${baseUrl}${img.startsWith('/') ? '' : '/'}${img}`;
        }
        if (product?.name) orderTitle = `Bladesmith — ${product.name}`;
      } catch (_) {}
    }

    let html = templateHtml;
    html = html.replace(
      /<meta\s+id="og-title"\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,
      `<meta id="og-title" property="og:title" content="${escapeHtml(orderTitle)}" />`
    );
    html = html.replace(
      /<meta\s+id="og-description"\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
      '<meta id="og-description" property="og:description" content="Review your selected blades and send your order details to Bladesmith." />'
    );
    html = html.replace(
      /<meta\s+id="og-image"\s+property="og:image"\s+content="[^"]*"\s*\/?>/i,
      `<meta id="og-image" property="og:image" content="${escapeHtml(imageUrl)}" />`
    );
    html = html.replace(
      /<meta\s+id="og-image-width"\s+property="og:image:width"\s+content="[^"]*"\s*\/?>/i,
      '<meta id="og-image-width" property="og:image:width" content="1200" />'
    );
    html = html.replace(
      /<meta\s+id="og-image-height"\s+property="og:image:height"\s+content="[^"]*"\s*\/?>/i,
      '<meta id="og-image-height" property="og:image:height" content="630" />'
    );
    html = html.replace(
      /<meta\s+id="og-url"\s+property="og:url"\s+content="[^"]*"\s*\/?>/i,
      `<meta id="og-url" property="og:url" content="${escapeHtml(pageUrl)}" />`
    );
    html = html.replace(
      /<meta\s+id="og-type"\s+property="og:type"\s+content="[^"]*"\s*\/?>/i,
      '<meta id="og-type" property="og:type" content="website" />'
    );

    res.type('html').send(html);
  } catch (error) {
    console.error('Failed to render dynamic order HTML:', error);
    return next();
  }
});

if (assetsDir) {
  app.use('/assets', express.static(assetsDir, { maxAge: '1d' }));
}
if (adminDir) {
  app.use('/admin', requireAdminSubdomain, express.static(adminDir));
}
if (pagesDir) {
  app.use('/pages', express.static(pagesDir));
}

// Ensure uploads directory exists
const uploadsBaseDir = path.join(ROOT_DIR, 'assets', 'uploads');
fs.mkdirSync(uploadsBaseDir, { recursive: true });

// Test Supabase connection (simple query) with retries to warm DB on start.
async function testSupabase({ retries = 8, delay = 1000 } = {}) {
  if (!SUPABASE_CONFIGURED) {
    console.warn('⚠️ Supabase startup check skipped: SUPABASE_URL or SUPABASE_KEY is not configured.');
    return false;
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const { data, error } = await supabase.from('users').select('id').limit(1);
      if (error) {
        console.warn(`⚠️ Supabase test query attempt ${attempt} returned error:`, error.message || error);
      } else {
        console.log(`✅ Supabase ready (attempt ${attempt})`);
        return true;
      }
    } catch (err) {
      console.warn(`⚠️ Supabase connection attempt ${attempt} failed:`, err.message || err);
    }
    // wait before next attempt
    await new Promise(r => setTimeout(r, delay));
    delay = Math.min(5000, delay * 1.8); // gradual backoff
  }
  console.warn('⚠️ Supabase did not become ready after retries. Continuing startup — requests may fail until DB is ready.');
  return false;
}

// Global rate limit fallback: 200 requests per minute per IP across all API routes
const globalRateLimit = makeRateLimiter('global', 60 * 1000, 200, 'Too many requests. Please slow down.');
app.use('/api', globalRateLimit);

// Route-specific rate limits for public endpoints (must be before route handlers)
app.use('/api/commissions/public', commissionsPublicRateLimit);
app.use('/api/orders/public', ordersPublicRateLimit);
app.use('/api/chat', chatRateLimit);
app.use('/api/visitors/track', visitorTrackRateLimit);

// Routes - Admin-only routes require admin subdomain
app.use('/api/auth', authRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/customers', requireAdminSubdomain, customersRoutes);
app.use('/api/dashboard', requireAdminSubdomain, dashboardRoutes);
app.use('/api/promotions', requireAdminSubdomain, promotionsRoutes);
app.use('/api/settings', requireAdminSubdomain, settingsRoutes);
app.use('/api/themes', requireAdminSubdomain, themesRoutes);
app.use('/api/editor', requireAdminSubdomain, editorRoutes);
app.use('/api/visitors', requireAdminSubdomain, visitorsRoutes);
app.use('/api/tracking', requireAdminSubdomain, trackingRoutes);
app.use('/api/users', requireAdminSubdomain, usersRoutes);
app.use('/api/uploads', requireAdminSubdomain, uploadsRoutes);
app.use('/api/commissions', requireAdminSubdomain, commissionsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/faq', faqRoutes);
app.use('/api/homepage-content', homepageContentRoutes);
app.use('/api/stripe', stripeRoutes);

// Health check
app.get('/health', (req, res) => {
  const mem = process.memoryUsage();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    version: require('./package.json').version,
    redis: redis.getStatus(),
    memory: {
      heapUsed: Math.round(mem.heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(mem.heapTotal / 1024 / 1024) + 'MB',
      rss: Math.round(mem.rss / 1024 / 1024) + 'MB',
    },
    pid: process.pid
  });
});

// Silence favicon 404 noise in browser console/network.
app.get('/favicon.ico', (_req, res) => {
  res.status(204).end();
});

// Main page — both / and /index.html should work
app.get(['/', '/index.html'], (req, res) => {
  const indexFile = resolveFirstExistingPath([
    '/index.html',
    path.join(ROOT_DIR, 'index.html')
  ]);
  if (!indexFile) {
    return res.status(404).json({ error: 'Root page is not configured' });
  }
  const baseUrl = getPublicBaseUrl(req);
  let html = fs.readFileSync(indexFile, 'utf8');
  html = html.replace(/https:\/\/YOUR_DOMAIN\.COM/g, baseUrl);
  res.type('html').send(html);
});

// 404 handler — serve HTML for browsers, JSON for API requests
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Route not found' });
  }
  const notFoundPage = path.join(ROOT_DIR, '404.html');
  if (fs.existsSync(notFoundPage)) {
    return res.status(404).sendFile(notFoundPage);
  }
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack, path: req.path });
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

// Start server after attempting to warm the Supabase connection
let server;
(async () => {
  await testSupabase({ retries: 8, delay: 1000 });
  await primeSiteSettingsCache().catch((error) => {
    logger.warn('Site settings cache priming failed', { error: error.message || String(error) });
  });

  // Initialize Redis cache unless explicitly disabled for local development.
  if (process.env.DISABLE_REDIS !== 'true') {
    await redis.initRedis();
  }

  server = app.listen(PORT, () => {
    logger.info('Server started', { port: PORT, env: process.env.NODE_ENV || 'development', redis: redis.getStatus() });
    if (process.send) process.send('ready');

    // Start visitor buffer auto-flush (pushes yesterday's data to Supabase every hour)
    try { require('./lib/visitorBuffer').startAutoFlush(); } catch (e) { logger.warn('Visitor buffer auto-flush init failed', { error: e.message }); }
  });

  setTimeout(() => {
    const status = redis.getStatus ? redis.getStatus() : 'unknown';
    if (!status.includes('connected')) {
      logger.warn('Redis not connected — in-memory fallback active', { status });
    }
  }, 2000);

  // Keep-alive timeout: allow long-lived connections but prevent stale sockets
  server.keepAliveTimeout = 65000;
  server.headersTimeout = 66000;
})();

// Graceful shutdown — close connections properly on SIGTERM/SIGINT (PM2 sends these)
function gracefulShutdown(signal) {
  logger.info('Graceful shutdown initiated', { signal });
  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed');
      try { await redis.disconnect(); } catch (e) {}
      logger.info('Redis connection closed');
      process.exit(0);
    });
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000).unref();
  } else {
    process.exit(0);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', { error: err.message, stack: err.stack });
  setTimeout(() => process.exit(1), 5000);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

module.exports = app;


