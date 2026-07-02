const fs = require('fs');
const path = require('path');
const supabase = require('../config/supabase');
const { isMissingTableError } = require('./dbUtils');

const BUFFER_DIR = path.resolve(__dirname, '..', '..', 'data', 'visitor-buffer');

function ensureDir() {
  fs.mkdirSync(BUFFER_DIR, { recursive: true });
}

function getTodayFile() {
  const date = new Date().toISOString().slice(0, 10);
  return path.join(BUFFER_DIR, `visitors-${date}.json`);
}

function appendEvents(events) {
  ensureDir();
  const file = getTodayFile();
  const lines = events.map(e => JSON.stringify(e)).join('\n') + '\n';
  fs.appendFileSync(file, lines, 'utf8');
}

function readBufferFile(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, 'utf8').trim();
  if (!content) return [];
  return content.split('\n').map(line => {
    try { return JSON.parse(line); } catch { return null; }
  }).filter(Boolean);
}

function readTodayEvents() {
  return readBufferFile(getTodayFile());
}

function listPendingFiles() {
  ensureDir();
  const today = new Date().toISOString().slice(0, 10);
  return fs.readdirSync(BUFFER_DIR)
    .filter(f => f.startsWith('visitors-') && f.endsWith('.json') && !f.includes(today))
    .map(f => path.join(BUFFER_DIR, f))
    .sort();
}

async function flushOldFiles() {
  const files = listPendingFiles();
  if (!files.length) return { flushed: 0, errors: [] };

  let flushed = 0;
  const errors = [];

  for (const file of files) {
    const events = readBufferFile(file);
    if (!events.length) {
      fs.unlinkSync(file);
      continue;
    }

    // Insert in batches of 500 to avoid payload size limits
    const BATCH_SIZE = 500;
    let success = true;

    for (let i = 0; i < events.length; i += BATCH_SIZE) {
      const batch = events.slice(i, i + BATCH_SIZE);
      const { error } = await supabase.from('visitor_events').insert(batch);
      if (error && !isMissingTableError(error)) {
        errors.push({ file: path.basename(file), batch: i, error: error.message });
        success = false;
        break;
      }
    }

    if (success) {
      fs.unlinkSync(file);
      flushed += events.length;
    }
  }

  return { flushed, errors };
}

// Schedule flush check every hour (catches files from previous days)
let flushTimer = null;
function startAutoFlush() {
  if (flushTimer) return;
  flushTimer = setInterval(async () => {
    try {
      const result = await flushOldFiles();
      if (result.flushed > 0) {
        console.log(`[VisitorBuffer] Flushed ${result.flushed} events to Supabase`);
      }
      if (result.errors.length > 0) {
        console.error('[VisitorBuffer] Flush errors:', result.errors);
      }
    } catch (e) {
      console.error('[VisitorBuffer] Auto-flush error:', e.message);
    }
  }, 60 * 60 * 1000);
}

module.exports = { appendEvents, readTodayEvents, readBufferFile, listPendingFiles, flushOldFiles, startAutoFlush, BUFFER_DIR };


