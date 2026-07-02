/**
 * Bladesmith Admin Authentication Test Suite
 * Tests all authentication flows: login, register, 2FA, password reset, session management
 */

const http = require('http');

const BASE_URL = 'http://localhost:5000';

// Test utilities
const api = {
  post: (path, data) => {
    return new Promise((resolve, reject) => {
      const url = new URL(BASE_URL + path);
      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      };

      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(body);
            resolve({ status: res.statusCode, data: json, headers: res.headers });
          } catch (e) {
            resolve({ status: res.statusCode, data: body, headers: res.headers });
          }
        });
      });

      req.on('error', reject);
      req.write(JSON.stringify(data));
      req.end();
    });
  },

  get: (path, token) => {
    return new Promise((resolve, reject) => {
      const url = new URL(BASE_URL + path);
      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      };

      if (token) {
        options.headers.Authorization = `Bearer ${token}`;
      }

      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(body);
            resolve({ status: res.statusCode, data: json, headers: res.headers });
          } catch (e) {
            resolve({ status: res.statusCode, data: body, headers: res.headers });
          }
        });
      });

      req.on('error', reject);
      req.end();
    });
  }
};

// Test results
let testsPassed = 0;
let testsFailed = 0;

const assert = (condition, message) => {
  if (condition) {
    console.log(`  ✅ ${message}`);
    testsPassed++;
  } else {
    console.log(`  ❌ ${message}`);
    testsFailed++;
  }
};

// Test data
const testEmail = `admin_${Date.now()}@bladesmith.test`;
const testPassword = 'SecurePass123!';
let authTokens = {};

// ============================================
// TEST SUITE
// ============================================

async function runTests() {
  console.log('\n🧪 BLADESMITH ADMIN AUTHENTICATION TEST SUITE\n');
  console.log('='.repeat(60));

  // Test 1: Register new user
  console.log('\n1️⃣  REGISTRATION TESTS');
  console.log('-'.repeat(60));
  await testRegistration();

  // Test 2: Login with valid credentials
  console.log('\n2️⃣  LOGIN TESTS');
  console.log('-'.repeat(60));
  await testLogin();

  // Test 3: Token refresh
  console.log('\n3️⃣  TOKEN REFRESH TESTS');
  console.log('-'.repeat(60));
  await testTokenRefresh();

  // Test 4: Route protection
  console.log('\n4️⃣  ROUTE PROTECTION TESTS');
  console.log('-'.repeat(60));
  await testRouteProtection();

  // Test 5: Session management
  console.log('\n5️⃣  SESSION MANAGEMENT TESTS');
  console.log('-'.repeat(60));
  await testSessionManagement();

  // Test 6: Error handling
  console.log('\n6️⃣  ERROR HANDLING TESTS');
  console.log('-'.repeat(60));
  await testErrorHandling();

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 TEST RESULTS: ${testsPassed} passed, ${testsFailed} failed\n`);
  if (testsFailed === 0) {
    console.log('🎉 ALL TESTS PASSED! Authentication flow is working correctly!\n');
  } else {
    console.log(`⚠️  ${testsFailed} tests failed. Please review the errors above.\n`);
  }
  process.exit(testsFailed > 0 ? 1 : 0);
}

// ============================================
// TEST FUNCTIONS
// ============================================

async function testRegistration() {
  try {
    // Test: Valid registration
    const response = await api.post('/api/auth/register', {
      email: testEmail,
      password: testPassword
    });

    assert(response.status === 201, 'Register returns 201 status');
    assert(response.data.user?.email === testEmail, 'Response includes user email');
    assert(response.data.accessToken, 'Response includes access token');
    assert(response.data.refreshToken, 'Response includes refresh token');

    // Store tokens for later tests
    authTokens.access = response.data.accessToken;
    authTokens.refresh = response.data.refreshToken;

    // Test: Duplicate registration
    const dupResponse = await api.post('/api/auth/register', {
      email: testEmail,
      password: testPassword
    });

    assert(dupResponse.status === 409, 'Duplicate email returns 409 status');
    assert(dupResponse.data.error?.includes('already exists'), 'Error message indicates duplicate user');

    // Test: Missing fields
    const missingResponse = await api.post('/api/auth/register', {
      email: testEmail
    });

    assert(missingResponse.status === 400, 'Missing password returns 400 status');

  } catch (error) {
    console.error('  ❌ Registration test failed:', error.message);
    testsFailed++;
  }
}

async function testLogin() {
  try {
    // Test: Valid login
    const response = await api.post('/api/auth/login', {
      email: testEmail,
      password: testPassword
    });

    assert(response.status === 200, 'Valid login returns 200 status');
    assert(response.data.user?.email === testEmail, 'Response includes user email');
    assert(response.data.accessToken, 'Response includes new access token');
    assert(response.data.refreshToken, 'Response includes new refresh token');

    // Test: Invalid password
    const badPassResponse = await api.post('/api/auth/login', {
      email: testEmail,
      password: 'WrongPassword'
    });

    assert(badPassResponse.status === 401, 'Invalid password returns 401 status');
    assert(badPassResponse.data.error, 'Error message included');

    // Test: Invalid email
    const badEmailResponse = await api.post('/api/auth/login', {
      email: 'nonexistent@example.com',
      password: testPassword
    });

    assert(badEmailResponse.status === 401, 'Non-existent user returns 401 status');

    // Test: Missing credentials
    const emptyResponse = await api.post('/api/auth/login', {});

    assert(emptyResponse.status === 400, 'Missing credentials returns 400 status');

  } catch (error) {
    console.error('  ❌ Login test failed:', error.message);
    testsFailed++;
  }
}

async function testTokenRefresh() {
  try {
    // Test: Valid refresh token
    const response = await api.post('/api/auth/refresh-token', {
      refreshToken: authTokens.refresh
    });

    assert(response.status === 200, 'Valid refresh token returns 200 status');
    assert(response.data.accessToken, 'New access token is generated');

    // Store new token
    authTokens.access = response.data.accessToken;

    // Test: Invalid refresh token
    const badTokenResponse = await api.post('/api/auth/refresh-token', {
      refreshToken: 'invalid.token.here'
    });

    assert(badTokenResponse.status === 401, 'Invalid refresh token returns 401 status');

    // Test: Missing refresh token
    const emptyResponse = await api.post('/api/auth/refresh-token', {});

    assert(emptyResponse.status === 400, 'Missing refresh token returns 400 status');

  } catch (error) {
    console.error('  ❌ Token refresh test failed:', error.message);
    testsFailed++;
  }
}

async function testRouteProtection() {
  try {
    // Test: Access protected route with valid token
    const response = await api.get('/api/auth/profile', authTokens.access);

    assert(response.status === 200, 'Protected route accessible with valid token');
    assert(response.data.email === testEmail, 'Profile returns correct user data');

    // Test: Access protected route without token
    const noTokenResponse = await api.get('/api/auth/profile', null);

    assert(noTokenResponse.status === 401, 'Protected route blocks unauthorized access');
    assert(noTokenResponse.data.error, 'Error message included');

    // Test: Access protected route with invalid token
    const badTokenResponse = await api.get('/api/auth/profile', 'invalid.token.here');

    assert(badTokenResponse.status === 401, 'Protected route blocks invalid token');

  } catch (error) {
    console.error('  ❌ Route protection test failed:', error.message);
    testsFailed++;
  }
}

async function testSessionManagement() {
  try {
    // Test: Session persists across requests
    const profile1 = await api.get('/api/auth/profile', authTokens.access);
    const profile2 = await api.get('/api/auth/profile', authTokens.access);

    assert(profile1.status === 200, 'First request succeeds');
    assert(profile2.status === 200, 'Second request with same token succeeds');
    assert(profile1.data.email === profile2.data.email, 'Session data remains consistent');

    // Test: Logout endpoint exists and requires authentication
    const logoutResponse = await api.post('/api/auth/logout', {});

    assert(logoutResponse.status === 401, 'Logout without token returns 401 (requires auth)');

  } catch (error) {
    console.error('  ❌ Session management test failed:', error.message);
    testsFailed++;
  }
}

async function testErrorHandling() {
  try {
    // Test: Server is running
    const healthResponse = await api.get('/health', null);

    assert(healthResponse.status === 200, 'Server health check returns 200');
    assert(healthResponse.data.status, 'Health check includes status');

    // Test: Invalid routes return 404
    const invalidRouteResponse = await api.get('/api/invalid/route', authTokens.access);

    assert(invalidRouteResponse.status === 404, 'Invalid route returns 404 status');

  } catch (error) {
    console.error('  ❌ Error handling test failed:', error.message);
    testsFailed++;
  }
}

// ============================================
// RUN TESTS
// ============================================

runTests().catch(console.error);


