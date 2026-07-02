/**
 * Utility Functions & UI Helpers
 */

// ===== TOAST NOTIFICATIONS =====
class Toast {
  static container = null;
  static enabled = localStorage.getItem('notifications_enabled') !== 'false';
  static show(message, type = 'info', duration = 3000) {
    if (!Toast.enabled && type !== 'error') return null;
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icon = { success: '✓', error: '✕', warning: '⚠', info: 'ⓘ' }[type] || 'ⓘ';
    toast.innerHTML = `<div class="toast-icon">${icon}</div><div class="toast-message">${escapeHtml(message)}</div>`;
    this.container.appendChild(toast);
    if (duration > 0) {
      setTimeout(() => toast.remove(), duration);
    }
    return toast;
  }
  static success(message, duration = 3000) { return this.show(message, 'success', duration); }
  static error(message, duration = 4000) { return this.show(message, 'error', duration); }
  static warning(message, duration = 3500) { return this.show(message, 'warning', duration); }
  static info(message, duration = 3000) { return this.show(message, 'info', duration); }
  static toggle() {
    Toast.enabled = !Toast.enabled;
    localStorage.setItem('notifications_enabled', Toast.enabled);
    return Toast.enabled;
  }
}

// ===== MODAL MANAGEMENT =====
class Modal {
  constructor(content, options = {}) {
    this.options = { title: 'Modal', size: 'md', closeable: true, onClose: null, ...options };
    this.overlay = null;
    this.isOpen = false;
    this.render(content);
  }
  render(content) {
    this.overlay = document.createElement('div');
    this.overlay.className = 'modal-overlay';
    const modal = document.createElement('div');
    // use existing CSS class 'modal' so styling (centering, size, background) applies
    modal.className = 'modal';
    if (this.options.size === 'lg') modal.style.width = '50rem';
    else if (this.options.size === 'sm') modal.style.width = '21.875rem';
    let html = '<div class="modal-header">';
    html += `<h2 style="margin: 0; font-size: 1.25rem;">${this.options.title}</h2>`;
    if (this.options.closeable) html += '<button class="modal-close">×</button>';
    html += '</div><div class="modal-body">' + content + '</div>';
    modal.innerHTML = html;
    this.overlay.appendChild(modal);
    if (this.options.closeable) {
      modal.querySelector('.modal-close').addEventListener('click', () => this.close());
    }
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay && this.options.closeable) this.close();
    });
  }
  open() {
    if (this.isOpen) return;
    document.body.appendChild(this.overlay);
    requestAnimationFrame(() => {
      this.overlay.classList.add('active');
      this.isOpen = true;
    });
    return this;
  }
  close() {
    if (!this.isOpen) return;
    this.overlay.classList.remove('active');
    setTimeout(() => {
      this.overlay.remove();
      this.isOpen = false;
      if (this.options.onClose) this.options.onClose();
    }, 150);
    return this;
  }
}

// ===== STRING UTILITIES =====
function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return (text === undefined || text === null ? '' : String(text)).replace(/[&<>"']/g, m => map[m]);
}
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
}
function formatDate(date) {
  return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(date));
}
function formatDateTime(date) {
  if (!date) return '-';
  try {
    let ts = date;
    if (typeof ts === 'number' || (/^\d+$/.test(String(ts)))) {
      const n = Number(ts);
      ts = n < 1e12 ? n * 1000 : n;
    }
    const d = new Date(ts);
    if (isNaN(d.getTime())) return '-';
    return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(d);
  } catch (e) {
    return '-';
  }
}
function formatNumber(num) {
  return new Intl.NumberFormat('en-US').format(num || 0);
}
function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
function validatePassword(pwd) {
  return pwd && pwd.length >= 8;
}

// ===== DOM UTILITIES =====
function $(selector) { return document.querySelector(selector); }
function $$(selector) { return document.querySelectorAll(selector); }
function createEl(tag, className = '', innerHTML = '') {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (innerHTML) el.innerHTML = innerHTML;
  return el;
}
function show(el) { if (el) el.classList.remove('hidden'); return el; }
function hide(el) { if (el) el.classList.add('hidden'); return el; }
function toggle(el) { if (el) el.classList.toggle('hidden'); return el; }

function initSidebarToggle() {
  const sidebar = document.querySelector('.admin-sidebar');
  if (!sidebar || sidebar.querySelector('.sidebar-toggle')) return;
  const target = sidebar.querySelector('.sidebar-brand') || sidebar;
  const button = createEl('button', 'sidebar-toggle', '☰');
  button.type = 'button';
  button.setAttribute('aria-label', 'Toggle sidebar');
  const STORAGE_KEY = 'admin_sidebar_collapsed';
  const applyState = (collapsed) => {
    try {
      if (collapsed) document.body.classList.add('sidebar-collapsed');
      else document.body.classList.remove('sidebar-collapsed');
    } catch (e) { /* ignore */ }
  };

  // initialize from storage
  const stored = localStorage.getItem(STORAGE_KEY);
  applyState(stored === 'true');

  button.addEventListener('click', () => {
    const isCollapsed = document.body.classList.toggle('sidebar-collapsed');
    try { localStorage.setItem(STORAGE_KEY, isCollapsed ? 'true' : 'false'); } catch (e) {}
  });

  if (target && target.insertBefore) target.insertBefore(button, target.firstChild);
}

function ensureLiveChatSidebarLink() {
  const sidebar = document.querySelector('.admin-sidebar');
  if (!sidebar) return;
  const managementSection = Array.from(sidebar.querySelectorAll('.nav-section')).find((section) => {
    const title = section.querySelector('.nav-section-title');
    return title && title.textContent.trim() === 'Management';
  });
  if (!managementSection) return;
  if (managementSection.querySelector('a[href$="/chat.html"], a[href="chat.html"]')) return;

  const link = createEl('a', 'nav-link', '<span class="nav-icon">💬</span><span>Live Chat</span>');
  link.href = '/admin/chat.html';

  const promotionsLink = managementSection.querySelector('a[href$="/promotions.html"], a[href="promotions.html"]');
  if (promotionsLink && promotionsLink.parentNode === managementSection) {
    promotionsLink.insertAdjacentElement('afterend', link);
  } else {
    managementSection.appendChild(link);
  }

  // Add page editor link
  if (!managementSection.querySelector('a[href$="/editor.html"]')) {
    const editorLink = createEl('a', 'nav-link', '<span class="nav-icon">&#9998;</span><span>Page Editor</span>');
    editorLink.href = '/admin/editor.html';
    managementSection.appendChild(editorLink);
  }
}

// ===== THEME HELPERS =====
function applyTheme(theme) {
  try {
    if (!theme) {
      document.documentElement.removeAttribute('data-theme');
      localStorage.removeItem('admin_theme');
      return;
    }
    if (String(theme).toLowerCase() === 'light' || String(theme).toLowerCase() === 'day' || String(theme).toLowerCase() === 'white') {
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('admin_theme', 'light');
      return;
    }
    // default/dark
    document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('admin_theme', 'dark');
  } catch (e) {
    console.warn('applyTheme error', e.message);
  }
}

async function saveThemePreference(theme) {
  // Local-only persistence by design.
  try { localStorage.setItem('admin_theme', theme); } catch (_) {}
}

async function initTheme() {
  try {
    const local = localStorage.getItem('admin_theme');
    applyTheme(local === 'light' ? 'light' : 'dark');
  } catch (e) {
    console.warn('initTheme error', e.message);
  }
}

// ===== BUTTON LOADING STATE =====
function withLoading(btn, asyncFn) {
  if (!btn || btn.disabled) return Promise.resolve();
  const original = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Please wait...';
  return asyncFn().finally(() => {
    btn.disabled = false;
    btn.textContent = original;
  });
}

// ===== FORM UTILITIES =====
function getFormData(form) {
  const data = {};
  new FormData(form).forEach((value, key) => { data[key] = value; });
  return data;
}
function setFormData(form, data) {
  Object.entries(data).forEach(([key, value]) => {
    const field = form.elements[key];
    if (field) field.value = value;
  });
}
function clearForm(form) {
  form.reset();
  $$('.form-error', form).forEach(el => el.textContent = '');
}
function showFormError(form, fieldName, message) {
  const field = form.elements[fieldName];
  if (field) {
    const errorEl = field.parentElement.querySelector('.form-error') || createEl('div', 'form-error');
    errorEl.textContent = message;
    field.parentElement.appendChild(errorEl);
    field.classList.add('error');
  }
}
function clearFormErrors(form) {
  $$('.form-error', form).forEach(el => el.remove());
  $$('[name]', form).forEach(el => el.classList.remove('error'));
}

// ===== AUTHORIZATION =====
const PAGE_PERMISSIONS = {
  'dashboard.html': ['view_dashboard'],
  'products.html': ['manage_products'],
  'products-v2.html': ['manage_products'],
  'editor.html': ['manage_products'],
  'orders.html': ['manage_orders'],
  'customers.html': ['view_customers'],
  'promotions.html': ['manage_promotions'],
  'settings.html': ['manage_settings'],
  'logs.html': ['view_logs'],
  'analytics.html': ['view_dashboard'],
  'chat.html': ['manage_orders']
};

function checkPageAccess(pageName) {
  const user = (typeof TokenManager !== 'undefined' && TokenManager.user) ? TokenManager.user : null;
  const requiredPerms = PAGE_PERMISSIONS[pageName];
  if (!requiredPerms) return true;
  if (!user) return false;
  // Superadmin always has access regardless of missing permissions array
  if (String(user.role || '').toLowerCase() === 'superadmin') return true;
  const userPerms = Array.isArray(user.permissions) ? user.permissions : [];
  return requiredPerms.some(p => userPerms.includes(p));
}

function initializeUserDisplay() {
  try {
    const user = typeof AuthService !== 'undefined' && typeof AuthService.getCurrentUser === 'function'
      ? AuthService.getCurrentUser()
      : null;

    if (user) {
      const nameEl = document.getElementById('userName');
      const roleEl = document.getElementById('userRole');
      const avatarEl = document.getElementById('userAvatar');

      if (nameEl) nameEl.textContent = user.email || user.name || 'Admin User';
      if (roleEl) roleEl.textContent = (user.role || 'admin').replace('_', ' ').toUpperCase();
      if (avatarEl) {
        avatarEl.textContent = ((user.email || user.name || 'A')[0]).toUpperCase();
        const savedAvatar = localStorage.getItem('admin_avatar_url');
        if (savedAvatar) {
          avatarEl.innerHTML = '<img src="' + savedAvatar + '" alt="Avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">';
        } else {
          const token = localStorage.getItem('auth_token');
          if (token) {
            fetch('/api/settings/me', { headers: { 'Authorization': 'Bearer ' + token } })
              .then(r => r.json())
              .then(result => {
                if (result?.data?.avatar_url) {
                  localStorage.setItem('admin_avatar_url', result.data.avatar_url);
                  avatarEl.innerHTML = '<img src="' + result.data.avatar_url + '" alt="Avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">';
                }
              }).catch(() => {});
          }
        }
      }
    }
  } catch (e) {
    console.warn('initializeUserDisplay error:', e.message);
  }
}

// Theme toggle injection removed: toggle should remain only in dashboard

if (typeof window !== 'undefined') {
  Object.assign(window, {
    Toast,
    Modal,
    escapeHtml,
    formatCurrency,
    formatDate,
    formatDateTime,
    formatNumber,
    validateEmail,
    validatePassword,
    $,
    $$,
    createEl,
    show,
    hide,
    toggle,
    initSidebarToggle,
    applyTheme,
    saveThemePreference,
    initTheme,
    getFormData,
    setFormData,
    clearForm,
    showFormError,
    clearFormErrors,
    checkPageAccess,
    initializeUserDisplay,
    withLoading
  });
}

// ===== MOBILE SIDEBAR =====
function initMobileSidebar() {
  const sidebar = document.querySelector('.admin-sidebar');
  if (!sidebar) return;

  // Create hamburger button
  let menuBtn = document.querySelector('.mobile-menu-btn');
  if (!menuBtn) {
    menuBtn = document.createElement('button');
    menuBtn.className = 'mobile-menu-btn';
    menuBtn.innerHTML = '☰';
    menuBtn.setAttribute('aria-label', 'Open menu');
    document.body.appendChild(menuBtn);
  }

  // Create overlay
  let overlay = document.querySelector('.mobile-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'mobile-overlay';
    document.body.appendChild(overlay);
  }

  menuBtn.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay.style.display = sidebar.classList.contains('open') ? 'block' : 'none';
  });

  overlay.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.style.display = 'none';
  });

  // Close on nav link click (mobile)
  sidebar.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 1024) {
        sidebar.classList.remove('open');
        overlay.style.display = 'none';
      }
    });
  });
}

// Notification toggle button injected into admin header
function initNotificationToggle() {
  const header = document.querySelector('.admin-header');
  if (!header) return;
  let actions = header.querySelector('.header-actions');
  if (!actions) {
    actions = document.createElement('div');
    actions.className = 'header-actions';
    header.appendChild(actions);
  }
  const btn = document.createElement('button');
  btn.className = 'notif-toggle';
  btn.title = 'Toggle notifications';
  const update = () => {
    btn.innerHTML = Toast.enabled ? '🔔' : '🔕';
    btn.style.opacity = Toast.enabled ? '1' : '0.5';
  };
  update();
  btn.addEventListener('click', () => { Toast.toggle(); update(); });
  actions.prepend(btn);
}

function enforcePageAccess() {
  var currentPage = window.location.pathname.split('/').pop() || '';
  if (currentPage === 'login.html' || !currentPage) return;
  if (!checkPageAccess(currentPage)) {
    document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:#e74c3c;"><h2>Access Denied — You do not have permission to view this page.</h2></div>';
    return;
  }
  var sidebar = document.querySelector('.admin-sidebar');
  if (!sidebar) return;
  sidebar.querySelectorAll('a.nav-link').forEach(function(link) {
    var href = (link.getAttribute('href') || '').split('/').pop();
    if (href && !checkPageAccess(href)) {
      link.style.display = 'none';
    }
  });
}

// Auto-initialize theme, sidebar and injected controls on every admin page
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    try {
      initTheme().catch(() => {});
      initSidebarToggle();
      initMobileSidebar();
      ensureLiveChatSidebarLink();
      initializeUserDisplay();
      initNotificationToggle();
      enforcePageAccess();
    } catch (e) { console.warn('admin init error', e.message); }
  });
}

// Listen for theme changes from other tabs/windows (dashboard toggle)
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'admin_theme') {
      try { initTheme(); } catch (err) { /* ignore */ }
    }
  });
}


