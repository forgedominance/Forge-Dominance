const { verifyAccessToken } = require('../config/jwt');

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

module.exports = { authenticate, authorize };


