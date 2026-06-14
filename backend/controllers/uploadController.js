const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const MAX_UPLOAD_MB = Number(process.env.MAX_UPLOAD_MB || 5);
const MAX_UPLOAD_BYTES = Math.max(1, MAX_UPLOAD_MB) * 1024 * 1024;

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MIME_TO_EXT = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/gif': ['.gif']
};

const BLOCKED_EXTENSIONS = new Set([
  '.exe', '.bat', '.cmd', '.com', '.msi', '.scr', '.pif',
  '.sh', '.bash', '.ps1', '.vbs', '.js', '.wsh', '.wsf',
  '.php', '.php3', '.php4', '.php5', '.phtml', '.asp', '.aspx',
  '.jsp', '.cgi', '.pl', '.py', '.rb', '.htaccess', '.htpasswd',
  '.svg', '.html', '.htm', '.xml', '.shtml'
]);

const MAGIC_BYTES = {
  'image/jpeg': [Buffer.from([0xFF, 0xD8, 0xFF])],
  'image/png': [Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])],
  'image/gif': [Buffer.from('GIF87a'), Buffer.from('GIF89a')],
  'image/webp': [Buffer.from('RIFF')]
};

function verifyMagicBytes(filePath, mimetype) {
  const signatures = MAGIC_BYTES[mimetype];
  if (!signatures) return false;
  const fd = fs.openSync(filePath, 'r');
  const buf = Buffer.alloc(12);
  fs.readSync(fd, buf, 0, 12, 0);
  fs.closeSync(fd);
  return signatures.some(sig => buf.slice(0, sig.length).equals(sig));
}

function generateSecureFilename(ext) {
  return crypto.randomBytes(16).toString('hex') + ext;
}

function fileFilter(_req, file, cb) {
  if (!ALLOWED_TYPES.has(file.mimetype)) {
    return cb(new Error('Only JPEG, PNG, WebP, and GIF images are allowed'));
  }
  const ext = path.extname(file.originalname).toLowerCase();
  if (BLOCKED_EXTENSIONS.has(ext)) {
    return cb(new Error('File type not allowed'));
  }
  const allowedExts = MIME_TO_EXT[file.mimetype] || [];
  if (ext && !allowedExts.includes(ext)) {
    return cb(new Error('File extension does not match its content type'));
  }
  cb(null, true);
}

function resolveWritableDir(candidates) {
  for (const candidate of candidates) {
    try {
      fs.mkdirSync(candidate, { recursive: true });
      fs.accessSync(candidate, fs.constants.W_OK);
      return candidate;
    } catch (_err) {
      // try next path
    }
  }
  throw new Error(`No writable upload directory found: ${candidates.join(', ')}`);
}

const ROOT_DIR = path.resolve(__dirname, '../..');
const UPLOADS_BASE = path.join(ROOT_DIR, 'assets', 'uploads');

const UPLOAD_DIR = resolveWritableDir([path.join(ROOT_DIR, 'assets', 'products')]);
const AD_UPLOAD_DIR = resolveWritableDir([path.join(UPLOADS_BASE, 'ad')]);
const REVIEW_UPLOAD_DIR = resolveWritableDir([path.join(UPLOADS_BASE, 'reviews')]);
const ADMIN_UPLOAD_DIR = resolveWritableDir([path.join(UPLOADS_BASE, 'admin')]);

function toPublicPath(absFilePath) {
  const normalized = String(absFilePath).replace(/\\/g, '/');
  const rootNormalized = String(ROOT_DIR).replace(/\\/g, '/');
  if (normalized.startsWith(rootNormalized)) {
    return `/${normalized.slice(rootNormalized.length + 1)}`;
  }
  return `/assets/uploads/${path.basename(absFilePath)}`;
}

// Multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, generateSecureFilename(ext));
  }
});

const upload = multer({ storage, fileFilter, limits: { fileSize: MAX_UPLOAD_BYTES } });

const adStorage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, AD_UPLOAD_DIR);
  },
  filename: function (_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, 'ad-' + generateSecureFilename(ext));
  }
});

const adUpload = multer({ storage: adStorage, fileFilter, limits: { fileSize: MAX_UPLOAD_BYTES } });

const reviewStorage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, REVIEW_UPLOAD_DIR);
  },
  filename: function (_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, 'review-' + generateSecureFilename(ext));
  }
});

const reviewUpload = multer({ storage: reviewStorage, fileFilter, limits: { fileSize: MAX_UPLOAD_BYTES } });

const adminAvatarStorage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, ADMIN_UPLOAD_DIR);
  },
  filename: function (_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, 'avatar-' + generateSecureFilename(ext));
  }
});

const adminAvatarUpload = multer({ storage: adminAvatarStorage, fileFilter, limits: { fileSize: MAX_UPLOAD_BYTES } });

function validateUploadedFile(file) {
  const filePath = file.path;
  if (!verifyMagicBytes(filePath, file.mimetype)) {
    try { fs.unlinkSync(filePath); } catch (_) {}
    return false;
  }
  return true;
}

// Controller methods
const uploadController = {
  uploadImage: [upload.single('image'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });
      if (!validateUploadedFile(req.file)) {
        return res.status(400).json({ success: false, error: 'File content does not match declared type' });
      }
      const filename = req.file.filename;
      const filePath = req.file.path || path.join(UPLOAD_DIR, filename);
      const relPath = toPublicPath(filePath).replace(/^\//, '');
      const url = `/${relPath}`;
      res.json({ success: true, filename, path: relPath, url });
    } catch (err) {
      console.error('[Upload] uploadImage error:', err);
      res.status(500).json({ success: false, error: 'An internal server error occurred' });
    }
  }],

  uploadBase64: async (req, res) => {
    try {
      const { image, filename: hint } = req.body;
      if (!image) return res.status(400).json({ success: false, error: 'No base64 image provided' });

      // image may be data:<mime>;base64,<data>
      const matches = image.match(/^data:(.+);base64,(.+)$/);
      let data = image;
      let ext = '';
      if (matches) {
        data = matches[2];
        const mime = matches[1];
        const mext = mime.split('/').pop();
        ext = '.' + mext;
      } else if (hint) {
        ext = path.extname(hint) || '';
      }

      const buffer = Buffer.from(data, 'base64');
      if (BLOCKED_EXTENSIONS.has(ext)) {
        return res.status(400).json({ success: false, error: 'File type not allowed' });
      }
      const name = generateSecureFilename(ext || '.bin');
      const outPath = path.join(UPLOAD_DIR, name);
      fs.writeFileSync(outPath, buffer);
      const detectedMime = ext === '.png' ? 'image/png' : ext === '.gif' ? 'image/gif' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
      if (!verifyMagicBytes(outPath, detectedMime)) {
        try { fs.unlinkSync(outPath); } catch (_) {}
        return res.status(400).json({ success: false, error: 'File content does not match declared type' });
      }
      const relPath = toPublicPath(outPath).replace(/^\//, '');
      const url = `/${relPath}`;
      res.json({ success: true, filename: name, path: relPath, url });
    } catch (err) {
      console.error('[Upload] uploadBase64 error:', err);
      res.status(500).json({ success: false, error: 'An internal server error occurred' });
    }
  },

  uploadAdImage: [adUpload.single('image'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });
      if (!validateUploadedFile(req.file)) {
        return res.status(400).json({ success: false, error: 'File content does not match declared type' });
      }
      const filename = req.file.filename;
      const filePath = req.file.path || path.join(AD_UPLOAD_DIR, filename);
      const relPath = toPublicPath(filePath).replace(/^\//, '');
      const url = `/${relPath}`;
      res.json({ success: true, filename, path: relPath, url });
    } catch (err) {
      console.error('[Upload] uploadAdImage error:', err);
      res.status(500).json({ success: false, error: 'An internal server error occurred' });
    }
  }],

  uploadReviewImage: [reviewUpload.single('image'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });
      if (!validateUploadedFile(req.file)) {
        return res.status(400).json({ success: false, error: 'File content does not match declared type' });
      }
      const filename = req.file.filename;
      const filePath = req.file.path || path.join(REVIEW_UPLOAD_DIR, filename);
      const relPath = toPublicPath(filePath).replace(/^\//, '');
      const url = `/${relPath}`;
      res.json({ success: true, filename, path: relPath, url });
    } catch (err) {
      console.error('[Upload] uploadReviewImage error:', err);
      res.status(500).json({ success: false, error: 'An internal server error occurred' });
    }
  }],

  uploadAdminAvatar: [adminAvatarUpload.single('image'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });
      if (!validateUploadedFile(req.file)) {
        return res.status(400).json({ success: false, error: 'File content does not match declared type' });
      }
      const filename = req.file.filename;
      const filePath = req.file.path || path.join(ADMIN_UPLOAD_DIR, filename);
      const relPath = toPublicPath(filePath).replace(/^\//, '');
      const url = `/${relPath}`;
      res.json({ success: true, filename, path: relPath, url });
    } catch (err) {
      console.error('[Upload] uploadAdminAvatar error:', err);
      res.status(500).json({ success: false, error: 'An internal server error occurred' });
    }
  }]
};

module.exports = uploadController;
