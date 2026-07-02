const { verifyAccessToken } = require('../config/jwt');

// Enforce admin requests MUST come from admin.forgedominance.com subdomain only
const requireAdminSubdomain = (req, res, next) => {
  const host = (req.headers.host || '').toLowerCase().trim();
  
  // Extract the actual hostname (without port)
  const hostname = host.split(':')[0];
  
  // In production, strictly require admin.forgedominance.com
  if (process.env.NODE_ENV === 'production') {
    if (hostname !== 'admin.forgedominance.com') {
      return res.status(403).json({ error: 'Forbidden' });
    }
  } else {
    // In dev, allow localhost or admin.localhost variants for testing
    if (!hostname.includes('admin') && hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return res.status(403).json({ error: 'Forbidden' });
    }
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


