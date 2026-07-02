const path = require('path');

function escapeHtml(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function stripTags(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/<[^>]*>/g, '');
}

function sanitizeString(str, { allowHtml = false, maxLength = 10000 } = {}) {
  if (str === null || str === undefined) return str;
  if (typeof str !== 'string') return str;
  let cleaned = str.trim();
  if (!allowHtml) cleaned = stripTags(cleaned);
  if (cleaned.length > maxLength) cleaned = cleaned.substring(0, maxLength);
  return cleaned;
}

function sanitizeObject(obj, options = {}) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(item =>
      typeof item === 'string' ? sanitizeString(item, options) :
      typeof item === 'object' && item !== null ? sanitizeObject(item, options) : item
    );
  }
  const sanitized = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (typeof val === 'string') {
      sanitized[key] = sanitizeString(val, options);
    } else if (Array.isArray(val)) {
      sanitized[key] = val.map(item =>
        typeof item === 'string' ? sanitizeString(item, options) :
        typeof item === 'object' && item !== null ? sanitizeObject(item, options) : item
      );
    } else if (typeof val === 'object' && val !== null) {
      sanitized[key] = sanitizeObject(val, options);
    } else {
      sanitized[key] = val;
    }
  }
  return sanitized;
}

function sanitizeFilename(filename) {
  if (typeof filename !== 'string') return 'file';
  return filename
    .replace(/\.\./g, '')
    .replace(/[\/\\]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .substring(0, 255);
}

function preventPrototypePollution(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const dangerous = ['__proto__', 'constructor', 'prototype'];
  for (const key of dangerous) {
    if (key in obj) delete obj[key];
  }
  for (const val of Object.values(obj)) {
    if (val && typeof val === 'object') preventPrototypePollution(val);
  }
  return obj;
}

function removeMongoOperators(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  for (const key of Object.keys(obj)) {
    if (key.startsWith('$')) {
      delete obj[key];
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      removeMongoOperators(obj[key]);
    }
  }
  return obj;
}

module.exports = {
  escapeHtml,
  stripTags,
  sanitizeString,
  sanitizeObject,
  sanitizeFilename,
  preventPrototypePollution,
  removeMongoOperators
};


