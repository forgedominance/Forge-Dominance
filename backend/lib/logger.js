const fs = require('fs');
const path = require('path');

const LOG_LEVEL = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');
const LOG_TO_FILE = process.env.NODE_ENV === 'production';
const LOG_DIR = path.join(__dirname, '../../logs');

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };

function formatLog(level, message, meta = {}) {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta
  });
}

function writeLog(level, message, meta) {
  if (LEVELS[level] < LEVELS[LOG_LEVEL]) return;
  const line = formatLog(level, message, meta);
  if (LOG_TO_FILE) {
    const date = new Date().toISOString().split('T')[0];
    const logFile = path.join(LOG_DIR, `app-${date}.log`);
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
    fs.appendFileSync(logFile, line + '\n');
  }
  const consoleFn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  consoleFn(line);
}

function writeSecurityLog(event, meta) {
  const line = JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'warn',
    category: 'security',
    event,
    ...meta
  });
  if (LOG_TO_FILE) {
    const date = new Date().toISOString().split('T')[0];
    const secFile = path.join(LOG_DIR, `security-${date}.log`);
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
    fs.appendFileSync(secFile, line + '\n');
  }
  console.warn(line);
}

const logger = {
  debug: (msg, meta) => writeLog('debug', msg, meta),
  info:  (msg, meta) => writeLog('info',  msg, meta),
  warn:  (msg, meta) => writeLog('warn',  msg, meta),
  error: (msg, meta) => writeLog('error', msg, meta),
  security: (event, meta) => writeSecurityLog(event, meta),
};

module.exports = logger;


