/**
 * api-tester.js — Validates all 49 API endpoints are reachable
 * Run: node api-tester.js
 * Requires: backend server running on localhost:5000
 */

const http = require('http');

const BASE = 'http://localhost:5000';
const RESULTS = { passed: 0, failed: 0, errors: [] };

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve) => {
    const url = new URL(path, BASE);
    const opts = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: { 'Content-Type': 'application/json', ...headers },
      timeout: 5000
    };

    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch {}
        resolve({ status: res.statusCode, body: json, raw: data });
      });
    });

    req.on('error', (err) => resolve({ status: 0, body: null, error: err.message }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, body: null, error: 'timeout' }); });

    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function test(name, fn) {
  return { name, fn };
}

function expect(res, condition, detail = '') {
  if (!condition) {
    throw new Error(`${detail || 'Assertion failed'} (status=${res.status})`);
  }
}

const tests = [
  // === HEALTH ===
  test('GET /health returns 200', async () => {
    const res = await request('GET', '/health');
    expect(res, res.status === 200, 'Health check failed');
    expect(res, res.body && res.body.status === 'ok', 'Missing status:ok');
    expect(res, res.body && res.body.memory, 'Missing memory info');
    expect(res, res.body && res.body.pid, 'Missing pid');
  }),

  // === AUTH (5 endpoints) ===
  test('POST /api/auth/login returns 400 or 401 without body', async () => {
    const res = await request('POST', '/api/auth/login', {});
    expect(res, [400, 401, 422].includes(res.status), 'Expected 4xx');
  }),
  test('POST /api/auth/register returns 400 without body', async () => {
    const res = await request('POST', '/api/auth/register', {});
    expect(res, [400, 409, 422].includes(res.status), 'Expected 4xx');
  }),
  test('POST /api/auth/forgot-password returns 400 without email', async () => {
    const res = await request('POST', '/api/auth/forgot-password', {});
    expect(res, [400, 404, 422].includes(res.status), 'Expected 4xx');
  }),
  test('POST /api/auth/verify-2fa returns 400/401 without token', async () => {
    const res = await request('POST', '/api/auth/verify-2fa', {});
    expect(res, [400, 401, 422].includes(res.status), 'Expected 4xx');
  }),
  test('GET /api/auth/verify returns 401 without token', async () => {
    const res = await request('GET', '/api/auth/verify');
    expect(res, [401, 403].includes(res.status), 'Expected 401/403');
  }),

  // === PRODUCTS (5 endpoints) ===
  test('GET /api/products returns 200', async () => {
    const res = await request('GET', '/api/products');
    expect(res, res.status === 200, 'Products list failed');
  }),
  test('GET /api/products/featured returns 200', async () => {
    const res = await request('GET', '/api/products/featured');
    expect(res, res.status === 200, 'Featured products failed');
  }),
  test('GET /api/products/category/Hunters returns 200', async () => {
    const res = await request('GET', '/api/products/category/Hunters');
    expect(res, res.status === 200, 'Category fetch failed');
  }),
  test('GET /api/products/999999 returns 200 or 404', async () => {
    const res = await request('GET', '/api/products/999999');
    expect(res, [200, 404].includes(res.status), 'Expected 200 or 404');
  }),
  test('POST /api/products returns 401 without auth', async () => {
    const res = await request('POST', '/api/products', { name: 'Test' });
    expect(res, [401, 403].includes(res.status), 'Expected 401/403');
  }),

  // === ORDERS (4 endpoints) ===
  test('GET /api/orders returns 401 without auth', async () => {
    const res = await request('GET', '/api/orders');
    expect(res, [401, 403].includes(res.status), 'Expected 401');
  }),
  test('POST /api/orders/public returns 400 with empty body', async () => {
    const res = await request('POST', '/api/orders/public', {});
    expect(res, [400, 422].includes(res.status), 'Expected 400');
  }),
  test('GET /api/orders/status/pending returns 401', async () => {
    const res = await request('GET', '/api/orders/status/pending');
    expect(res, [401, 403].includes(res.status), 'Expected 401');
  }),
  test('GET /api/orders/999999 returns 401', async () => {
    const res = await request('GET', '/api/orders/999999');
    expect(res, [401, 403].includes(res.status), 'Expected 401');
  }),

  // === COMMISSIONS (3 endpoints) ===
  test('GET /api/commissions returns 401 without auth', async () => {
    const res = await request('GET', '/api/commissions');
    expect(res, [401, 403].includes(res.status), 'Expected 401');
  }),
  test('POST /api/commissions/public returns 400 with empty body', async () => {
    const res = await request('POST', '/api/commissions/public', {});
    expect(res, [400, 422].includes(res.status), 'Expected 400');
  }),
  test('DELETE /api/commissions/999 returns 401', async () => {
    const res = await request('DELETE', '/api/commissions/999');
    expect(res, [401, 403].includes(res.status), 'Expected 401');
  }),

  // === CUSTOMERS (3 endpoints) ===
  test('GET /api/customers returns 401 without auth', async () => {
    const res = await request('GET', '/api/customers');
    expect(res, [401, 403].includes(res.status), 'Expected 401');
  }),
  test('GET /api/customers/999 returns 401', async () => {
    const res = await request('GET', '/api/customers/999');
    expect(res, [401, 403].includes(res.status), 'Expected 401');
  }),
  test('POST /api/customers returns 401 without auth', async () => {
    const res = await request('POST', '/api/customers', { name: 'Test' });
    expect(res, [401, 403].includes(res.status), 'Expected 401');
  }),

  // === DASHBOARD (5 endpoints) ===
  test('GET /api/dashboard/kpis returns 401', async () => {
    const res = await request('GET', '/api/dashboard/kpis');
    expect(res, [401, 403].includes(res.status), 'Expected 401');
  }),
  test('GET /api/dashboard/revenue-chart returns 401', async () => {
    const res = await request('GET', '/api/dashboard/revenue-chart');
    expect(res, [401, 403].includes(res.status), 'Expected 401');
  }),
  test('GET /api/dashboard/order-status-chart returns 401', async () => {
    const res = await request('GET', '/api/dashboard/order-status-chart');
    expect(res, [401, 403].includes(res.status), 'Expected 401');
  }),
  test('GET /api/dashboard/recent-orders returns 401', async () => {
    const res = await request('GET', '/api/dashboard/recent-orders');
    expect(res, [401, 403].includes(res.status), 'Expected 401');
  }),
  test('GET /api/dashboard/analytics returns 401', async () => {
    const res = await request('GET', '/api/dashboard/analytics');
    expect(res, [401, 403].includes(res.status), 'Expected 401');
  }),

  // === SETTINGS (4 endpoints) ===
  test('GET /api/settings returns 401 without auth', async () => {
    const res = await request('GET', '/api/settings');
    expect(res, [401, 403].includes(res.status), 'Expected 401');
  }),
  test('GET /api/settings/public returns 200', async () => {
    const res = await request('GET', '/api/settings/public');
    expect(res, res.status === 200, 'Public settings failed');
  }),
  test('GET /api/settings/public/reviews returns 200', async () => {
    const res = await request('GET', '/api/settings/public/reviews');
    expect(res, res.status === 200, 'Public reviews failed');
  }),
  test('PUT /api/settings returns 401 without auth', async () => {
    const res = await request('PUT', '/api/settings', { siteName: 'Test' });
    expect(res, [401, 403].includes(res.status), 'Expected 401');
  }),

  // === PROMOTIONS (4 endpoints) ===
  test('GET /api/promotions/ads/public returns 200', async () => {
    const res = await request('GET', '/api/promotions/ads/public');
    expect(res, res.status === 200, 'Public ads failed');
  }),
  test('GET /api/promotions/ads returns 401', async () => {
    const res = await request('GET', '/api/promotions/ads');
    expect(res, [401, 403].includes(res.status), 'Expected 401');
  }),
  test('GET /api/promotions/coupons returns 401', async () => {
    const res = await request('GET', '/api/promotions/coupons');
    expect(res, [401, 403].includes(res.status), 'Expected 401');
  }),
  test('POST /api/promotions/campaigns/send returns 401', async () => {
    const res = await request('POST', '/api/promotions/campaigns/send', {});
    expect(res, [401, 403].includes(res.status), 'Expected 401');
  }),

  // === CHAT (4 endpoints) ===
  test('POST /api/chat returns 400 without message', async () => {
    const res = await request('POST', '/api/chat', {});
    expect(res, [400, 422].includes(res.status), 'Expected 400');
  }),
  test('GET /api/chat/poll/test-visitor returns 200', async () => {
    const res = await request('GET', '/api/chat/poll/test-visitor');
    expect(res, res.status === 200, 'Chat poll failed');
  }),
  test('GET /api/chat/conversations returns 401', async () => {
    const res = await request('GET', '/api/chat/conversations');
    expect(res, [401, 403].includes(res.status), 'Expected 401');
  }),
  test('POST /api/chat/conversations/1/reply returns 401', async () => {
    const res = await request('POST', '/api/chat/conversations/1/reply', { message: 'hi' });
    expect(res, [401, 403].includes(res.status), 'Expected 401');
  }),

  // === VISITORS (2 endpoints) ===
  test('POST /api/visitors/track returns 200 or 201', async () => {
    const res = await request('POST', '/api/visitors/track', {
      visitorId: 'test-v-' + Date.now(),
      path: '/test',
      action: 'pageview'
    });
    expect(res, [200, 201].includes(res.status), 'Visitor tracking failed');
  }),
  test('GET /api/visitors/summary returns 401', async () => {
    const res = await request('GET', '/api/visitors/summary');
    expect(res, [401, 403].includes(res.status), 'Expected 401');
  }),

  // === STRIPE (3 endpoints) ===
  test('GET /api/stripe/config/public returns 200', async () => {
    const res = await request('GET', '/api/stripe/config/public');
    expect(res, res.status === 200, 'Stripe config failed');
  }),
  test('POST /api/stripe/checkout/create-session returns 400', async () => {
    const res = await request('POST', '/api/stripe/checkout/create-session', {});
    expect(res, [400, 500].includes(res.status), 'Expected 400 (no items)');
  }),
  test('GET /api/stripe/checkout/session/invalid returns 400 or 500', async () => {
    const res = await request('GET', '/api/stripe/checkout/session/invalid_id');
    expect(res, [400, 500].includes(res.status), 'Expected error for invalid session');
  }),

  // === HOMEPAGE CONTENT (2 endpoints) ===
  test('GET /api/homepage-content returns 200', async () => {
    const res = await request('GET', '/api/homepage-content');
    expect(res, res.status === 200, 'Homepage content failed');
  }),
  test('PUT /api/homepage-content returns 401 without auth', async () => {
    const res = await request('PUT', '/api/homepage-content', { hero: {} });
    expect(res, [401, 403].includes(res.status), 'Expected 401');
  }),

  // === FAQ (2 endpoints) ===
  test('GET /api/faq returns 200', async () => {
    const res = await request('GET', '/api/faq');
    expect(res, res.status === 200, 'FAQ fetch failed');
  }),
  test('POST /api/faq returns 401 without auth', async () => {
    const res = await request('POST', '/api/faq', { question: 'Q', answer: 'A' });
    expect(res, [401, 403].includes(res.status), 'Expected 401');
  }),

  // === USERS (2 endpoints) ===
  test('GET /api/users returns 401 without auth', async () => {
    const res = await request('GET', '/api/users');
    expect(res, [401, 403].includes(res.status), 'Expected 401');
  }),
  test('POST /api/users returns 401 without auth', async () => {
    const res = await request('POST', '/api/users', { email: 'x@x.com' });
    expect(res, [401, 403].includes(res.status), 'Expected 401');
  }),

  // === THEMES (1 endpoint) ===
  test('GET /api/themes returns 401 without auth', async () => {
    const res = await request('GET', '/api/themes');
    expect(res, [401, 403].includes(res.status), 'Expected 401');
  }),
];

async function run() {
  console.log(`\n  Bladesmith API Test Suite — ${tests.length} tests\n`);
  console.log(`  Target: ${BASE}`);
  console.log(`  ${'─'.repeat(50)}\n`);

  // Quick connectivity check
  const health = await request('GET', '/health');
  if (health.status === 0) {
    console.log(`  ✗ Cannot connect to ${BASE}`);
    console.log(`    Error: ${health.error}`);
    console.log(`\n  Make sure the server is running: cd backend && node server.js\n`);
    process.exit(1);
  }

  for (const t of tests) {
    try {
      await t.fn();
      RESULTS.passed++;
      console.log(`  ✓ ${t.name}`);
    } catch (err) {
      RESULTS.failed++;
      RESULTS.errors.push({ name: t.name, error: err.message });
      console.log(`  ✗ ${t.name}`);
      console.log(`    → ${err.message}`);
    }
  }

  console.log(`\n  ${'─'.repeat(50)}`);
  console.log(`  Results: ${RESULTS.passed}/${tests.length} passed, ${RESULTS.failed} failed`);

  if (RESULTS.failed === 0) {
    console.log(`\n  ✓ ALL ${tests.length} TESTS PASSED\n`);
  } else {
    console.log(`\n  ✗ ${RESULTS.failed} TESTS FAILED:\n`);
    RESULTS.errors.forEach((e) => console.log(`    - ${e.name}: ${e.error}`));
    console.log('');
  }

  process.exit(RESULTS.failed > 0 ? 1 : 0);
}

run();
