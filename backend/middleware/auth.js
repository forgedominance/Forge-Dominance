const { verifyAccessToken } = require('../config/jwt');

// Enforce admin requests MUST come from admin.forgedominance.com subdomain only
const PUBLIC_SUBPATHS = [
  /^\/public(\/|$)/,
  /^\/track$/,
  /^\/ads\/public$/,
  /^\/coupons\/validate$/
];

const requireAdminSubdomain = (req, res, next) => {
  // Skip the admin-host check for known public sub-routes (settings, visitors tracking, promo ads)
  if (PUBLIC_SUBPATHS.some((re) => re.test(req.path))) {
    return next();
  }

  const host = (req.headers.host || '').toLowerCase().trim();
  
  // Extract the actual hostname (without port)
  const hostname = host.split(':')[0];
  
  // In production, strictly require admin.forgedominance.com
  const blocked = process.env.NODE_ENV === 'production'
    ? (hostname !== 'admin.forgedominance.com')
    : (!hostname.includes('admin') && hostname !== 'localhost' && hostname !== '127.0.0.1');

  if (blocked) {
    // Respond exactly like the site's real 404 — indistinguishable from a
    // route that genuinely doesn't exist, so /admin/* is never fingerprintable
    // from the main domain.
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'Route not found' });
    }
    const notFoundPage = require('path').join(__dirname, '..', '..', '404.html');
    if (require('fs').existsSync(notFoundPage)) {
      return res.status(404).sendFile(notFoundPage);
    }
    return res.status(404).json({ error: 'Route not found' });
  }

  next();
};

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No authentication token provided' });
  }

  const token = authHeader.substring(7);
  const decoded = verifyAccessToken(token);

  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.user = decoded;
  next();
};

function normalizeRole(role) {
  return String(role || '').toLowerCase() === 'super_admin' ? 'superadmin' : String(role || '').toLowerCase();
}

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (normalizeRole(req.user.role) === 'superadmin') {
      return next();
    }

    const normalizedRoles = roles.map(normalizeRole);
    if (!normalizedRoles.includes(normalizeRole(req.user.role))) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

module.exports = { authenticate, authorize, requireAdminSubdomain };


