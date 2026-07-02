const express = require('express');
const fs = require('fs');
const path = require('path');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const FAQ_FILE = path.resolve(__dirname, '..', '..', 'assets', 'data', 'faq.json');

function readFaq() {
  try {
    if (!fs.existsSync(FAQ_FILE)) return [];
    return JSON.parse(fs.readFileSync(FAQ_FILE, 'utf8')) || [];
  } catch {
    return [];
  }
}

function writeFaq(data) {
  const dir = path.dirname(FAQ_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(FAQ_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// Public: get all FAQ items
router.get('/', (req, res) => {
  res.json(readFaq());
});

// Admin: replace all FAQ items (full save)
router.put('/', authenticate, (req, res) => {
  const items = req.body;
  if (!Array.isArray(items)) return res.status(400).json({ error: 'Expected array of FAQ items' });
  writeFaq(items);
  res.json({ ok: true, count: items.length });
});

// Admin: add a single FAQ item
router.post('/', authenticate, (req, res) => {
  const { question, answer } = req.body;
  if (!question || !answer) return res.status(400).json({ error: 'Question and answer are required' });
  const items = readFaq();
  const id = String(Date.now());
  items.push({ id, question, answer, open: false });
  writeFaq(items);
  res.json({ ok: true, item: items[items.length - 1] });
});

// Admin: update a single FAQ item
router.put('/:id', authenticate, (req, res) => {
  const { id } = req.params;
  const { question, answer, open } = req.body;
  const items = readFaq();
  const idx = items.findIndex(i => i.id === id);
  if (idx === -1) return res.status(404).json({ error: 'FAQ item not found' });
  if (question !== undefined) items[idx].question = question;
  if (answer !== undefined) items[idx].answer = answer;
  if (open !== undefined) items[idx].open = open;
  writeFaq(items);
  res.json({ ok: true, item: items[idx] });
});

// Admin: delete a single FAQ item
router.delete('/:id', authenticate, (req, res) => {
  const { id } = req.params;
  const items = readFaq();
  const filtered = items.filter(i => i.id !== id);
  if (filtered.length === items.length) return res.status(404).json({ error: 'FAQ item not found' });
  writeFaq(filtered);
  res.json({ ok: true });
});

// Admin: reorder FAQ items
router.post('/reorder', authenticate, (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids)) return res.status(400).json({ error: 'Expected array of ids' });
  const items = readFaq();
  const ordered = [];
  for (const id of ids) {
    const item = items.find(i => i.id === id);
    if (item) ordered.push(item);
  }
  // Append any items not in the ids array at the end
  for (const item of items) {
    if (!ids.includes(item.id)) ordered.push(item);
  }
  writeFaq(ordered);
  res.json({ ok: true });
});

module.exports = router;


