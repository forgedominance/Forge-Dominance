const express = require('express');
const fs = require('fs');
const path = require('path');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const DATA_FILE = path.resolve(__dirname, '..', '..', 'assets', 'data', 'homepage.json');

function readContent() {
  try {
    if (!fs.existsSync(DATA_FILE)) return {};
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) || {};
  } catch {
    return {};
  }
}

function writeContent(data) {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// Public: get homepage content
router.get('/', (req, res) => {
  res.json(readContent());
});

// Admin: update homepage content
router.put('/', authenticate, (req, res) => {
  const body = req.body;
  if (!body || typeof body !== 'object') return res.status(400).json({ error: 'Invalid content' });
  const existing = readContent();
  const merged = { ...existing, ...body };
  writeContent(merged);
  res.json({ ok: true, data: merged });
});

module.exports = router;
