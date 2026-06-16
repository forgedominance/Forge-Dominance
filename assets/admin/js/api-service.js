/**
 * API Service Layer
 * Handles all backend communication with JWT authentication
 */

// API base URL - always use relative path so requests go through nginx/same-origin
const API_BASE_URL = '/api';

const pendingRequests = new Map();

function safeParseJSON(value, fallback = null) {
  if (!value) {
    return fallback;
  }

  if (typeof value === 'object') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
}

function normalizeAuthResponse(data) {
  const payload = data?.data || data?.result || data?.payload || data || {};
  const normalizedToken = payload?.accessToken || payload?.token || payload?.access_token || null;
  const normalizedRefreshToken = payload?.refreshToken || payload?.refresh_token || null;
  const normalizedUser = payload?.user || payload?.admin || null;

  return {
    ...payload,
    accessToken: normalizedToken,
    refreshToken: normalizedRefreshToken,
    user: normalizedUser
  };
}

function readResponsePayload(response, fallback = {}) {
  const jsonResponse = response.clone();
  const textResponse = response.clone();

  return jsonResponse.json().catch(async () => {
    const text = await textResponse.text().catch(() => '');
    if (!text) {
      return fallback;
    }

    return { ...fallback, message: text };
  });
}

function redirectToLogin() {
  const sid = TokenManager.sessionId;
  if (sid) {
    try {
      navigator.sendBeacon(
        `${API_BASE_URL}/tracking/admin/session-expired`,
        new Blob([JSON.stringify({ sessionId: sid })], { type: 'application/json' })
      );
    } catch (_) {}
  }
  TokenManager.clearTokens();
  window.location.href = '/admin/login.html';
}

// ===== TOKEN MANAGEMENT =====
const TokenManager = {
  accessToken: localStorage.getItem('auth_token'),
  refreshToken: localStorage.getItem('refresh_token'),
  user: safeParseJSON(localStorage.getItem('auth_user')),
  sessionId: localStorage.getItem('session_id'),

  setTokens(accessToken, refreshToken, user, sessionId) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    // Ensure user object has all required fields
    this.user = {
      id: user?.id || 'admin-1',
      email: user?.email || 'admin@forgedominance.local',
      role: user?.role || 'admin',
      name: user?.name || 'Admin User',
      permissions: user?.permissions || [],
      ...user
    };
    this.sessionId = sessionId || null;
    localStorage.setItem('auth_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
    localStorage.setItem('auth_user', JSON.stringify(this.user));
    if (this.sessionId) localStorage.setItem('session_id', this.sessionId);
  },

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    this.user = null;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('auth_user');
    this.sessionId = null;
    localStorage.removeItem('session_id');
  },

  getAuthHeader() {
    return this.accessToken ? { Authorization: `Bearer ${this.accessToken}` } : {};
  },

  isAuthenticated() {
    return !!this.accessToken && !!this.user;
  },

  // Ensure user is fully populated even if partially stored
  ensureUserObject() {
    if (!this.user) return null;
    this.user = {
      id: this.user.id || 'admin-1',
      email: this.user.email || 'admin@forgedominance.local',
      role: this.user.role || 'admin',
      name: this.user.name || 'Admin User',
      permissions: Array.isArray(this.user.permissions) ? this.user.permissions : [
        'view_dashboard', 'manage_products', 'manage_orders', 
        'view_customers', 'manage_promotions', 'manage_settings', 'view_logs'
      ],
      ...this.user
    };
    return this.user;
  }
};

// ===== FETCH WRAPPER WITH JWT =====
async function apiCall(endpoint, options = {}) {
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const method = String(options.method || 'GET').toUpperCase();
  const bodyStr = isFormData ? null : (options.body || '');
  const dedupeKey = `${method}:${endpoint}:${bodyStr || ''}`;

  if (!isFormData && pendingRequests.has(dedupeKey)) {
    return pendingRequests.get(dedupeKey);
  }

  const requestPromise = apiCallInner(endpoint, options);

  if (!isFormData) {
    pendingRequests.set(dedupeKey, requestPromise);
    requestPromise.finally(() => pendingRequests.delete(dedupeKey));
  }

  return requestPromise;
}

async function apiCallInner(endpoint, options = {}) {
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...TokenManager.getAuthHeader(),
    ...options.headers
  };

  let lastError;
  const maxRetries = options.retries ?? 1;
  const timeoutMs = options.timeout || 30000;
  const timeoutMessage = `Request timed out after ${Math.ceil(timeoutMs / 1000)}s`;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
        ...(controller ? { signal: controller.signal } : {})
      });

      if (response.status === 401) {
        if (options.skipUnauthorizedRedirect) {
          const error = await readResponsePayload(response, { error: 'Unauthorized' });
          throw new Error(error.error || error.message || 'Unauthorized');
        }
        redirectToLogin();
        throw new Error('Unauthorized - redirecting to login');
      }

      if (!response.ok) {
        const error = await readResponsePayload(response, { error: 'Unknown error' });
        throw new Error(error.error || `API Error: ${response.status}`);
      }

      return await readResponsePayload(response, {});
    } catch (error) {
      lastError = error;
      if (error?.name === 'AbortError') {
        lastError = new Error(timeoutMessage);
      }
      
      // Log error for debugging
      console.warn(`API call attempt ${attempt + 1}/${maxRetries + 1} failed:`, {
        endpoint,
        error: lastError.message,
        isNetworkError: error instanceof TypeError
      });
      
      // Don't retry on auth errors or if all retries exhausted
      if (attempt === maxRetries || lastError.message.includes('Unauthorized') || lastError.message.includes('redirecting') || error.name === 'AbortError') {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        break;
      }
      
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }
  
  // Provide helpful error message for network failures
  if (lastError instanceof TypeError) {
    console.error('Network error - cannot reach API server at:', API_BASE_URL);
    throw new Error(`Cannot connect to API server (${API_BASE_URL}). Is the backend running?`);
  }
  
  throw lastError;
}

// ===== AUTHENTICATION SERVICE =====
const AuthService = {
  async login(email, password) {
    try {
      const response = await apiCall('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
        skipUnauthorizedRedirect: true
      });

      const normalizedData = normalizeAuthResponse(response);

      if (normalizedData.accessToken && normalizedData.user) {
        TokenManager.setTokens(normalizedData.accessToken, normalizedData.refreshToken, normalizedData.user, normalizedData.sessionId || normalizedData.session_id);
      }

      return normalizedData;
    } catch (error) {
      return { error: error.message || 'Login failed' };
    }
  },

  async requestPasswordReset(email) {
    return apiCall('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  },

  async resendResetCode(resetToken) {
    return apiCall('/auth/resend-reset-code', {
      method: 'POST',
      body: JSON.stringify({ resetToken })
    });
  },

  async verifyResetCode(email, code) {
    return apiCall('/auth/verify-reset-code', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
      skipUnauthorizedRedirect: true
    });
  },

  async verifySMSOtp(tempToken, code) {
    return apiCall('/auth/verify-2fa', {
      method: 'POST',
      body: JSON.stringify({ tempToken, code }),
      skipUnauthorizedRedirect: true
    }).then(data => {
      const normalizedData = normalizeAuthResponse(data);
      const token = normalizedData.accessToken;
      const user = normalizedData.user;
      if (token && user) {
        TokenManager.setTokens(token, normalizedData.refreshToken, user, normalizedData.sessionId || normalizedData.session_id);
      }
      return normalizedData;
    });
  },

  async resendTwoFactorCode(tempToken) {
    return apiCall('/auth/resend-2fa', {
      method: 'POST',
      body: JSON.stringify({ tempToken })
    });
  },

  async resetPassword(email, code, newPassword) {
    return apiCall('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, code, newPassword })
    }).then(data => {
      TokenManager.clearTokens();
      return data;
    });
  },

  async logout() {
    try {
      const sid = TokenManager.sessionId;
      if (sid) {
        // best-effort notify backend about logout
        await apiCall('/tracking/admin/logout', { method: 'POST', body: JSON.stringify({ sessionId: sid }) });
      }
    } catch (e) {
      console.warn('Failed to notify logout tracking:', e?.message || e);
    } finally {
      TokenManager.clearTokens();
    }
  },

  isLoggedIn() {
    return TokenManager.isAuthenticated();
  },

  getCurrentUser() {
    return TokenManager.ensureUserObject();
  }
};

// ===== AUTH CHECK =====
function requireAuth() {
  if (!TokenManager.isAuthenticated()) {
    window.location.href = '/admin/login.html';
    throw new Error('Not authenticated');
  }
}

// ===== DASHBOARD SERVICE =====
const DashboardService = {
  async getKPIs() {
    return apiCall('/dashboard/kpis');
  },

  async getRevenueChart(period = '30d') {
    return apiCall(`/dashboard/revenue-chart?period=${period}`);
  },

  async getOrderStatusChart() {
    return apiCall('/dashboard/order-status-chart');
  },

  async getRecentOrders(limit = 10) {
    return apiCall(`/dashboard/recent-orders?limit=${limit}`);
  },

  async getAnalytics() {
    return apiCall('/dashboard/analytics');
  }
};

// ===== PRODUCTS SERVICE =====
const ProductsService = {
  async getAll(page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    return apiCall(`/products?offset=${offset}&limit=${limit}`, { timeout: 60000 });
  },

  async getFeatured() {
    return apiCall('/products/featured');
  },

  async getById(id) {
    return apiCall(`/products/${id}`);
  },

  async create(productData) {
    return apiCall('/products', {
      method: 'POST',
      body: JSON.stringify(productData),
      timeout: 60000
    });
  },

  async update(id, productData) {
    return apiCall(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(productData),
      timeout: 60000
    });
  },

  async delete(id) {
    return apiCall(`/products/${id}`, {
      method: 'DELETE'
    });
  },

  async updateSortOrder(category, orderedIds) {
    return apiCall('/products/sort-order', {
      method: 'PUT',
      body: JSON.stringify({ category, orderedIds })
    });
  }
};

// ===== ORDERS SERVICE =====
const OrdersService = {
  async getAll(page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    return apiCall(`/orders?offset=${offset}&limit=${limit}`);
  },

  async getByStatus(status, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    return apiCall(`/orders/status/${status}?offset=${offset}&limit=${limit}`);
  },

  async getById(id) {
    return apiCall(`/orders/${id}`);
  },

  async create(orderData) {
    return apiCall('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData)
    });
  },

  async update(id, orderData) {
    return apiCall(`/orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(orderData)
    });
  },

  async updateStatus(id, status) {
    return apiCall(`/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  },

  async delete(id) {
    return apiCall(`/orders/${id}`, {
      method: 'DELETE'
    });
  }
};

// ===== COMMISSIONS SERVICE =====
const CommissionService = {
  async getAll(page = 1, limit = 100) {
    const offset = (page - 1) * limit;
    return apiCall(`/commissions?offset=${offset}&limit=${limit}`);
  },

  async update(id, commissionData) {
    return apiCall(`/commissions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(commissionData)
    });
  },

  async delete(id) {
    return apiCall(`/commissions/${id}`, {
      method: 'DELETE'
    });
  },

  async deleteAll() {
    return apiCall(`/commissions/all`, {
      method: 'DELETE'
    });
  }
};

// ===== CUSTOMERS SERVICE =====
const CustomersService = {
  async getAll(page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    return apiCall(`/customers?offset=${offset}&limit=${limit}`);
  },

  async getById(id) {
    return apiCall(`/customers/${id}`);
  },

  async create(customerData) {
    return apiCall('/customers', {
      method: 'POST',
      body: JSON.stringify(customerData)
    });
  },

  async update(id, customerData) {
    return apiCall(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(customerData)
    });
  },

  async delete(id) {
    return apiCall(`/customers/${id}`, {
      method: 'DELETE'
    });
  },

  async addNote(id, note) {
    return apiCall(`/customers/${id}/notes`, {
      method: 'POST',
      body: JSON.stringify({ note })
    });
  }
};

// ===== PROMOTIONS SERVICE =====
const PromotionsService = {
  async getAds() {
    return apiCall('/promotions/ads');
  },

  async createAd(payload) {
    return apiCall('/promotions/ads', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async deleteAd(id) {
    return apiCall(`/promotions/ads/${id}`, {
      method: 'DELETE'
    });
  },

  async getCoupons() {
    return apiCall('/promotions/coupons');
  },

  async createCoupon(payload) {
    return apiCall('/promotions/coupons', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async deleteCoupon(id) {
    return apiCall(`/promotions/coupons/${id}`, {
      method: 'DELETE'
    });
  },

  async getAll(page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    return apiCall(`/promotions?offset=${offset}&limit=${limit}`);
  },

  async getById(id) {
    return apiCall(`/promotions/${id}`);
  },

  async create(promotionData) {
    return apiCall('/promotions', {
      method: 'POST',
      body: JSON.stringify(promotionData)
    });
  },

  async update(id, promotionData) {
    return apiCall(`/promotions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(promotionData)
    });
  },

  async delete(id) {
    return apiCall(`/promotions/${id}`, {
      method: 'DELETE'
    });
  },

  async getCampaignRecipients() {
    return apiCall('/promotions/campaign-recipients');
  },

  async getCampaignQueue() {
    return apiCall('/promotions/campaigns/queue');
  },

  async deleteCampaignQueueEntry(id) {
    return apiCall(`/promotions/campaigns/queue/${id}`, {
      method: 'DELETE'
    });
  },

  async sendCampaign(payload) {
    return apiCall('/promotions/campaigns/send', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }
};

// ===== UPLOADS SERVICE =====
const UploadsService = {
  async uploadImage(file) {
    const formData = new FormData();
    formData.append('image', file);
    return apiCall('/uploads/upload-image', {
      method: 'POST',
      body: formData,
      timeout: 120000
    });
  },

  async uploadAdImage(file) {
    const formData = new FormData();
    formData.append('image', file);
    return apiCall('/uploads/upload-ad-image', {
      method: 'POST',
      body: formData,
      timeout: 120000
    });
  },

  async uploadReviewImage(file) {
    const formData = new FormData();
    formData.append('image', file);
    return apiCall('/uploads/upload-review-image', {
      method: 'POST',
      body: formData,
      timeout: 120000
    });
  }
};

// ===== SETTINGS SERVICE =====
const SettingsService = {
  async getAll() {
    return apiCall('/settings');
  },

  async update(settingsData) {
    return apiCall('/settings', {
      method: 'PUT',
      body: JSON.stringify(settingsData)
    });
  },

  async save(settingsData) {
    return this.update(settingsData);
  },

  async testEmailConnection(payload) {
    return apiCall('/settings/test-email', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }
};

// ===== USERS SERVICE =====
const UsersService = {
  async getAll() {
    return apiCall('/users');
  },

  async create(payload) {
    return apiCall('/users', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async updateRole(id, payload) {
    return apiCall(`/users/${id}/role`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  },

  async updatePassword(id, payload) {
    return apiCall(`/users/${id}/password`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  },

  async delete(id) {
    return apiCall(`/users/${id}`, {
      method: 'DELETE'
    });
  }
};

// ===== ROLES & ACCESS LEVELS SERVICE =====
const RolesService = {
  async getAll() {
    return apiCall('/settings/roles');
  },

  async create(payload) {
    return apiCall('/settings/roles', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async update(id, payload) {
    return apiCall(`/settings/roles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  async delete(id) {
    return apiCall(`/settings/roles/${id}`, {
      method: 'DELETE'
    });
  }
};

// ===== THEMES SERVICE =====
const ThemesService = {
  async getAll() {
    return apiCall('/themes');
  },

  async getById(id) {
    return apiCall(`/themes/${id}`);
  },

  async create(themeData) {
    return apiCall('/themes', {
      method: 'POST',
      body: JSON.stringify(themeData)
    });
  },

  async update(id, themeData) {
    return apiCall(`/themes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(themeData)
    });
  },

  async delete(id) {
    return apiCall(`/themes/${id}`, {
      method: 'DELETE'
    });
  }
};

// ===== EXPORT =====
const adminExports = {
  apiCall,
  API_BASE_URL,
  TokenManager,
  AuthService,
  DashboardService,
  ProductsService,
  OrdersService,
  CommissionService,
  CustomersService,
  PromotionsService,
  UploadsService,
  SettingsService,
  UsersService,
  RolesService,
  ThemesService,
  requireAuth
};

if (typeof window !== 'undefined') {
  Object.assign(window, adminExports);
  
  // Initialize user display when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (typeof initializeUserDisplay === 'function') {
        initializeUserDisplay();
      }
    });
  } else {
    if (typeof initializeUserDisplay === 'function') {
      initializeUserDisplay();
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = adminExports;
}
