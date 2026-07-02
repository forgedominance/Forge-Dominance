const redis = require('redis');

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = process.env.REDIS_PORT || 6379;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || null;
const DISABLE_REDIS = String(process.env.DISABLE_REDIS || 'false').toLowerCase() === 'true';

let client = null;
let isConnected = false;
let isRedisAvailable = false;
let hasLoggedConnectionError = false;

// ─── Request coalescing: prevents thundering herd under concurrent load ───
const inFlight = new Map();

// ─── In-memory cache (always active as L2 fallback) ───
const memStore = new Map();
const memExpiry = new Map();
const MEM_MAX_KEYS = 2000;

function memGet(key) {
  const expiry = memExpiry.get(key);
  if (expiry && Date.now() > expiry) {
    memStore.delete(key);
    memExpiry.delete(key);
    return undefined;
  }
  return memStore.get(key);
}

function memSet(key, value, ttlSeconds) {
  if (memStore.size >= MEM_MAX_KEYS) {
    const firstKey = memStore.keys().next().value;
    memStore.delete(firstKey);
    memExpiry.delete(firstKey);
  }
  memStore.set(key, value);
  memExpiry.set(key, Date.now() + (ttlSeconds * 1000));
}

function memDel(key) {
  memStore.delete(key);
  memExpiry.delete(key);
}

function memFlush() {
  memStore.clear();
  memExpiry.clear();
}

// Periodic cleanup of expired keys
setInterval(() => {
  const now = Date.now();
  for (const [key, expiry] of memExpiry) {
    if (now > expiry) {
      memStore.delete(key);
      memExpiry.delete(key);
    }
  }
}, 30000).unref();

// ─── Redis connection ───
async function initRedis() {
  if (DISABLE_REDIS) {
    console.warn('[Redis] Disabled by DISABLE_REDIS=true. Running in fallback mode (in-memory cache)');
    isConnected = false;
    isRedisAvailable = false;
    return null;
  }

  try {
    const options = {
      socket: {
        host: REDIS_HOST,
        port: Number(REDIS_PORT),
        connectTimeout: 2000,
        reconnectStrategy: (retries) => {
          if (retries > 2) {
            isConnected = false;
            isRedisAvailable = false;
            return new Error('Redis unavailable — using in-memory cache');
          }
          return 500;
        }
      }
    };

    if (REDIS_PASSWORD) {
      options.password = REDIS_PASSWORD;
    }

    client = redis.createClient(options);

    client.on('error', (err) => {
      if (!hasLoggedConnectionError) {
        const detail = err?.message || err?.code || String(err) || 'Unknown Redis error';
        console.error(`[Redis] Connection error (${REDIS_HOST}:${REDIS_PORT}):`, detail);
        hasLoggedConnectionError = true;
      }
      isConnected = false;
      isRedisAvailable = false;
    });

    client.on('connect', () => {
      console.log(`[Redis] Connected (${REDIS_HOST}:${REDIS_PORT}) ✓`);
      isConnected = true;
      isRedisAvailable = true;
      hasLoggedConnectionError = false;
    });

    client.on('reconnecting', () => {
      console.warn('[Redis] Reconnecting...');
      isRedisAvailable = false;
    });

    client.on('ready', () => {
      console.log('[Redis] Ready ✓');
      isConnected = true;
      isRedisAvailable = true;
      hasLoggedConnectionError = false;
    });

    const connectPromise = client.connect();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Redis connect timeout (3s)')), 3000)
    );
    await Promise.race([connectPromise, timeoutPromise]);
    isConnected = true;
    isRedisAvailable = true;
    console.log('[Redis] Connected and ready');
    return client;
  } catch (err) {
    const detail = err?.message || err?.code || String(err) || 'Unknown Redis error';
    console.warn('[Redis] FAILED to connect:', detail, '— using in-memory cache');
    isConnected = false;
    isRedisAvailable = false;
    client = null;
    return null;
  }
}

function withTimeout(promise, ms = 3000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Redis operation timeout')), ms))
  ]);
}

async function get(key) {
  // Try Redis first
  if (isRedisAvailable && isConnected && client) {
    try {
      const data = await withTimeout(client.get(key));
      if (data) {
        const parsed = JSON.parse(data);
        memSet(key, parsed, 60);
        return parsed;
      }
    } catch (err) {
      if (err?.message !== 'Redis operation timeout') {
        // silent — fall through to memory
      }
    }
  }
  // Fall through to in-memory cache
  const memResult = memGet(key);
  return memResult !== undefined ? memResult : null;
}

async function getOrFetch(key, ttlSeconds, fetchFn) {
  const cached = await get(key);
  if (cached !== null) return cached;
  if (inFlight.has(key)) return inFlight.get(key);
  const promise = fetchFn().then((data) => {
    inFlight.delete(key);
    if (data !== null && data !== undefined) {
      set(key, data, ttlSeconds);
    }
    return data;
  }).catch((err) => {
    inFlight.delete(key);
    throw err;
  });
  inFlight.set(key, promise);
  return promise;
}

async function set(key, value, ttlSeconds = 60) {
  // Always set in memory
  memSet(key, value, ttlSeconds);
  // Also set in Redis if available
  if (isRedisAvailable && isConnected && client) {
    try {
      const serialized = JSON.stringify(value);
      await withTimeout(client.setEx(key, ttlSeconds, serialized));
      return true;
    } catch (err) {
      // silent — in-memory is sufficient
    }
  }
  return true;
}

async function del(key) {
  memDel(key);
  if (isRedisAvailable && isConnected && client) {
    try {
      await withTimeout(client.del(key));
    } catch (err) {
      // silent
    }
  }
  return true;
}

async function flush() {
  memFlush();
  if (isRedisAvailable && isConnected && client) {
    try {
      await client.flushDb();
    } catch (err) {
      // silent
    }
  }
  return true;
}

function isReady() {
  // Cache layer is always ready (in-memory fallback)
  return true;
}

function getStatus() {
  if (isRedisAvailable && isConnected && client) return 'connected';
  if (DISABLE_REDIS) return 'disabled';
  return 'disconnected (in-memory fallback active)';
}

async function disconnect() {
  if (client) {
    await client.quit();
    isConnected = false;
    isRedisAvailable = false;
    client = null;
  }
}

module.exports = {
  initRedis,
  get,
  set,
  del,
  flush,
  getOrFetch,
  isReady,
  isRedisConnected: () => isRedisAvailable && isConnected && client !== null,
  getStatus,
  disconnect,
  memFlush,
  memGet,
  memSet,
  memDel,
  get isRedisAvailable() { return isRedisAvailable; }
};


