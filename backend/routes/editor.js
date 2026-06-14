const express = require('express');
const fs = require('fs');
const path = require('path');
const supabase = require('../config/supabase');
const { authenticate, authorize } = require('../middleware/auth');
const { isMissingTableError } = require('../lib/dbUtils');

const router = express.Router();
const EDITOR_STORE_FILE = path.resolve(__dirname, '..', '..', 'assets', 'uploads', 'editor-content-store.json');

fs.mkdirSync(path.dirname(EDITOR_STORE_FILE), { recursive: true });

async function safeMaybeSingle(query) {
  const result = await query;
  if (result?.error && !isMissingTableError(result.error)) {
    throw result.error;
  }
  const data = result?.data;
  return Array.isArray(data) ? (data[0] || null) : (data || null);
}

function readFallbackEditorStore() {
  try {
    if (!fs.existsSync(EDITOR_STORE_FILE)) return {};
    const raw = fs.readFileSync(EDITOR_STORE_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeFallbackEditorStore(store) {
  fs.writeFileSync(EDITOR_STORE_FILE, JSON.stringify(store, null, 2));
}

router.get('/', authenticate, async (req, res) => {
  try {
    const pageKey = String(req.query.pageKey || 'index');
    const data = await safeMaybeSingle(
      supabase
        .from('editor_content')
        .select('page_key, content, updated_at')
        .eq('page_key', pageKey)
        .limit(1)
    );

    if (!data) {
      const fallback = readFallbackEditorStore();
      const row = fallback[pageKey] || { content: '', updatedAt: null };
      if (row.content !== undefined) {
        return res.json({ pageKey, content: row.content || '', updatedAt: row.updatedAt || null, tableMissing: true });
      }
    }

    res.json({
      pageKey,
      content: data?.content || '',
      updatedAt: data?.updated_at || null
    });
  } catch (error) {
    console.error('[Editor] Error:', error);
    res.status(500).json({ error: 'An internal server error occurred' });
  }
});

router.post('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const pageKey = String(req.body.pageKey || 'index');
    const content = String(req.body.content || '');

    const { data, error } = await supabase
      .from('editor_content')
      .upsert({
        page_key: pageKey,
        content,
        updated_by: req.user.userId,
        updated_at: new Date().toISOString()
      }, { onConflict: 'page_key' })
      .select('page_key, updated_at')
      .single();

    if (error) {
      if (isMissingTableError(error)) {
        const fallback = readFallbackEditorStore();
        fallback[pageKey] = {
          content,
          updatedAt: new Date().toISOString(),
          updatedBy: req.user?.userId || null
        };
        writeFallbackEditorStore(fallback);
        return res.json({ message: 'Page content saved (fallback store)', pageKey, updatedAt: fallback[pageKey].updatedAt, fallback: true });
      }
      throw error;
    }

    res.json({ message: 'Page content saved', pageKey: data.page_key, updatedAt: data.updated_at });
  } catch (error) {
    console.error('[Editor] Error:', error);
    res.status(500).json({ error: 'An internal server error occurred' });
  }
});

// ===== FILE-BASED VISUAL EDITOR ENDPOINTS =====

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const BACKUP_DIR = path.join(ROOT_DIR, 'backups', 'editor');
fs.mkdirSync(BACKUP_DIR, { recursive: true });

const ALLOWED_FILES = [
  'index.html',
  'pages/collection.html',
  'pages/product.html',
  'pages/about.html',
  'pages/commission.html',
  'pages/faq.html'
];

function isAllowedFile(file) {
  const clean = String(file || '').replace(/\\/g, '/').replace(/^\/+/, '');
  return ALLOWED_FILES.includes(clean);
}

function resolveFilePath(file) {
  const clean = String(file || '').replace(/\\/g, '/').replace(/^\/+/, '');
  return path.join(ROOT_DIR, clean);
}

// GET /api/editor/page?file=index.html — read HTML from disk
router.get('/page', authenticate, (req, res) => {
  try {
    const file = String(req.query.file || '');
    if (!isAllowedFile(file)) {
      return res.status(403).json({ error: 'File not allowed' });
    }
    const filePath = resolveFilePath(file);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    const html = fs.readFileSync(filePath, 'utf8');
    res.json({ html, file });
  } catch (error) {
    console.error('[Editor] Read error:', error);
    res.status(500).json({ error: 'Failed to read file' });
  }
});

// POST /api/editor/save — write HTML back to disk with backup
router.post('/save', authenticate, authorize('admin'), (req, res) => {
  try {
    const { file, html } = req.body;
    if (!file || !isAllowedFile(file)) {
      return res.status(403).json({ error: 'File not allowed' });
    }
    if (!html || typeof html !== 'string' || !html.trim().startsWith('<')) {
      return res.status(400).json({ error: 'Invalid HTML content' });
    }

    const filePath = resolveFilePath(file);

    // Create timestamped backup
    if (fs.existsSync(filePath)) {
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = file.replace(/\//g, '_').replace('.html', '') + `_${ts}.html`;
      fs.writeFileSync(path.join(BACKUP_DIR, backupName), fs.readFileSync(filePath, 'utf8'));
    }

    // Write updated HTML
    fs.writeFileSync(filePath, html, 'utf8');

    res.json({ ok: true, file, savedAt: new Date().toISOString() });
  } catch (error) {
    console.error('[Editor] Save error:', error);
    res.status(500).json({ error: 'Failed to save file' });
  }
});

// GET /api/editor/backups?file=index.html — list backups
router.get('/backups', authenticate, (req, res) => {
  try {
    const file = String(req.query.file || '');
    if (!isAllowedFile(file)) return res.status(403).json({ error: 'File not allowed' });
    const prefix = file.replace(/\//g, '_').replace('.html', '');
    const files = fs.readdirSync(BACKUP_DIR).filter(f => f.startsWith(prefix)).sort().reverse().slice(0, 20);
    res.json({ backups: files });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list backups' });
  }
});

module.exports = router;
