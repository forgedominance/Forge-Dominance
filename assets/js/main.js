/* ─── GLOBAL ERROR BOUNDARY ─── */
window.addEventListener('unhandledrejection', (event) => {
  console.error('[Unhandled Promise Rejection]', event.reason);
  event.preventDefault();
});

/* ─── GUARDS & HELPERS ─── */
let listenersInitialized = false;

function withLoading(btn, asyncFn) {
  if (!btn || btn.disabled) return;
  const original = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Please wait...';
  return asyncFn().finally(() => {
    btn.disabled = false;
    btn.textContent = original;
  });
}

/* ─── PAGE SYSTEM ─── */
function showPage(id, anchorId) {
  const routes = { home: '/index.html', about: '/pages/about.html', order: '/pages/order.html' };
  const target = routes[id] || routes.home;
  const path = (window.location.pathname || '').toLowerCase().replace(/\\/g, '/');
  const current = path.endsWith('/' + target.toLowerCase()) || path.endsWith(target.toLowerCase()) || (target === 'index.html' && (path.endsWith('/') || path === ''));

  if (!anchorId && typeof event !== 'undefined' && event && event.currentTarget) {
    const href = event.currentTarget.getAttribute('href');
    if (href && href.startsWith('#') && href.length > 1) anchorId = href.slice(1);
  }

  if (!current) {
    const hash = anchorId ? '#' + anchorId : '';
    window.location.href = target + hash;
    return;
  }

  const pageEl = document.getElementById('page-' + id);
  if (pageEl) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    pageEl.classList.add('active');
  }

  if (anchorId) {
    const targetEl = document.getElementById(anchorId);
    if (targetEl) targetEl.scrollIntoView({ behavior: 'smooth' });
    else window.location.hash = anchorId;
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  document.dispatchEvent(new Event('bs:pagechange'));
  if (typeof obs !== 'undefined') {
    document.querySelectorAll('.rv,.rv-l,.rv-r,.rv-s').forEach(el => {
      if (!el.classList.contains('in')) obs.observe(el);
    });
  }
  if (id === 'home') {
    requestAnimationFrame(() => {
      syncHS();
      calcHS();
    });
  }
}

/* ─── HOME SECTION ORDER ─── */
(function placeHuntSection(){
  const home = document.getElementById('page-home');
  const hero = home ? home.querySelector('.hero') : null;
  const hunt = document.getElementById('hunt-collection');
  if (!hero || !hunt) return;
  if (hero.nextElementSibling !== hunt) {
    hero.insertAdjacentElement('afterend', hunt);
  }
})();

/* ─── CART STATE ─── */
const CART_STORAGE_KEY = 'bs_order_cart';
let cart = [];

function loadCartState() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCartState() {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  } catch {
    // best effort
  }
}

cart = loadCartState();

function syncCartState() {
  cart = loadCartState();
  return cart;
}

function normalizeCartImage(path) {
  const value = String(path || '').trim();
  if (!value) return '';
  try {
    return new URL(value, window.location.href).href;
  } catch {
    return value;
  }
}

function addToCart(name, steel, price, img, productUrl) {
  const existing = cart.find(i => i.name === name);
  const resolvedImg = normalizeCartImage(img);
  const resolvedUrl = String(productUrl || window.location.href || '').trim();
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ name, steel, price, img: resolvedImg, url: resolvedUrl, qty: 1 });
  }
  trackAddToCart({ id: name, name, category: steel, price }, existing ? existing.qty : 1);
  saveCartState();
  updateCartUI();
  openCart();
  // badge bounce
  const badge = document.getElementById('navCartBadge');
  if (badge) {
    badge.style.animation = 'none';
    setTimeout(() => { badge.style.animation = 'cartBounce .4s ease'; }, 10);
  }
}

function removeFromCart(name) {
  cart = cart.filter(i => i.name !== name);
  saveCartState();
  updateCartUI();
}

function changeQty(name, delta) {
  const item = cart.find(i => i.name === name);
  if (!item) return;
  item.qty = Math.max(0, item.qty + delta);
  if (item.qty === 0) removeFromCart(name);
  else {
    saveCartState();
    updateCartUI();
  }
}

function setQtyBySlider(name, qty) {
  const item = cart.find(i => i.name === name);
  if (!item) return;
  const next = Math.max(1, Math.min(10, Number(qty) || 1));
  item.qty = next;
  saveCartState();
  updateCartUI();
}

function updateCartUI() {
  syncCartState();
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const count = cart.reduce((s, i) => s + i.qty, 0);

  const cartCount = document.getElementById('cartCount');
  const navCartBadge = document.getElementById('navCartBadge');
  if (cartCount) cartCount.textContent = count;
  if (navCartBadge) {
    navCartBadge.textContent = count;
    navCartBadge.classList.toggle('show', count > 0);
  }

  const body = document.getElementById('cartBody');
  const foot = document.getElementById('cartFoot');
  const empty = document.getElementById('cartEmpty');
  if (!body || !foot || !empty) return;

  if (cart.length === 0) {
    empty.style.display = 'flex';
    foot.style.display = 'none';
    // clear items except empty
    Array.from(body.children).forEach(c => { if (c.id !== 'cartEmpty') c.remove(); });
    return;
  }

  empty.style.display = 'none';
  foot.style.display = 'block';

  // Clear existing items
  Array.from(body.children).forEach(c => { if (c.id !== 'cartEmpty') c.remove(); });

  cart.forEach(item => {
    const resolvedImg = normalizeCartImage(item.img);
    const el = document.createElement('div');
    el.className = 'cart-item';
    el.innerHTML = `
      <div class="ci-img"><img src="${resolvedImg}" alt="${item.name}"/></div>
      <div class="ci-info">
        <div class="ci-steel">${item.steel}</div>
        <div class="ci-name">${item.name}</div>
        <div class="ci-row">
          <div class="ci-price">$${(item.price * item.qty).toLocaleString()}</div>
          <button class="ci-remove ci-remove-x" onclick="removeFromCart('${item.name.replace(/'/g, "\\'")}')" aria-label="Remove">x</button>
        </div>
        <div class="ci-qty-slider-wrap">
          <input class="ci-qty-slider" type="range" min="1" max="10" value="${item.qty}" oninput="setQtyBySlider('${item.name.replace(/'/g, "\\'")}', this.value)" />
          <span class="ci-qval">Qty ${item.qty}</span>
        </div>
      </div>
    `;
    body.appendChild(el);
  });

  document.getElementById('cartSubtotal').textContent = '$' + total.toLocaleString();
  document.getElementById('cartTotal').textContent = '$' + total.toLocaleString();
  renderSelectedProductsSummary();
  saveCartState();
}

function refreshCartAcrossPages() {
  syncCartState();
  if (document.getElementById('cartBody')) {
    updateCartUI();
  }
}

window.addEventListener('storage', (event) => {
  if (event.key === CART_STORAGE_KEY) refreshCartAcrossPages();
});

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) refreshCartAcrossPages();
});

function openCart() {
  const panel = document.getElementById('cart-panel');
  const overlay = document.getElementById('cart-overlay');
  if (!panel || !overlay) return;
  panel.classList.add('open');
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeCart() {
  const panel = document.getElementById('cart-panel');
  const overlay = document.getElementById('cart-overlay');
  if (!panel || !overlay) return;
  panel.classList.remove('open');
  overlay.classList.remove('open');
  document.body.style.overflow = '';
}

function goToOrder() {
  closeCart();
  showPage('order');
}

if (document.getElementById('cartBody')) {
  updateCartUI();
}

/* ─── ORDER FORM STATE ─── */
const DEFAULT_REFERENCE_IMAGE = 'https://images.unsplash.com/photo-1463320898484-cdee8141c787?auto=format&fit=crop&w=900&q=80';

let commissionState = {
  budgetMin: 300,
  budgetMax: 5000,
  budget: 1800,
  referenceName: 'No reference image selected'
};

function formatBudget(value) {
  return '$' + Number(value).toLocaleString();
}

function setBudget(value) {
  const parsed = parseInt(value, 10);
  const safe = Number.isFinite(parsed) ? parsed : commissionState.budgetMin;
  const clamped = Math.max(commissionState.budgetMin, Math.min(commissionState.budgetMax, safe));
  commissionState.budget = clamped;

  const budgetValue = document.getElementById('budgetValue');
  const sumBudget = document.getElementById('sumBudget');
  const meter = document.getElementById('budgetMeterFill');
  const range = document.getElementById('budgetRange');

  if (budgetValue) budgetValue.textContent = formatBudget(clamped);
  if (sumBudget) sumBudget.textContent = formatBudget(clamped);
  if (range) range.value = clamped;
  if (meter) {
    const pct = ((clamped - commissionState.budgetMin) / (commissionState.budgetMax - commissionState.budgetMin)) * 100;
    meter.style.width = pct.toFixed(2) + '%';
  }
}

function updateCommissionSummary() {
  const fname = document.getElementById('fname');
  const lname = document.getElementById('lname');
  const email = document.getElementById('email');
  const fullName = [(fname ? fname.value.trim() : ''), (lname ? lname.value.trim() : '')].join(' ').trim();

  const sumName = document.getElementById('sumName');
  const sumEmail = document.getElementById('sumEmail');

  if (sumName) sumName.textContent = fullName || 'Not provided';
  if (sumEmail) sumEmail.textContent = email && email.value.trim() ? email.value.trim() : 'Not provided';
}

const PHONE_FORMATS = {
  US: { code: '+1', pattern: /^\d{10}$/, placeholder: '(555) 000-0000', length: 10 },
  CA: { code: '+1', pattern: /^\d{10}$/, placeholder: '(555) 000-0000', length: 10 },
  GB: { code: '+44', pattern: /^\d{10,11}$/, placeholder: '7700 900000', length: '10-11' },
  AU: { code: '+61', pattern: /^\d{9}$/, placeholder: '2 1234 5678', length: 9 },
  DE: { code: '+49', pattern: /^\d{9,11}$/, placeholder: '30 12345678', length: '9-11' },
  FR: { code: '+33', pattern: /^\d{9}$/, placeholder: '1 42 34 56 78', length: 9 },
  IN: { code: '+91', pattern: /^\d{10}$/, placeholder: '98765 43210', length: 10 },
  ZA: { code: '+27', pattern: /^\d{9}$/, placeholder: '21 123 4567', length: 9 },
  CN: { code: '+86', pattern: /^\d{11}$/, placeholder: '10 1234 5678', length: 11 },
  JP: { code: '+81', pattern: /^\d{9,10}$/, placeholder: '90 1234 5678', length: '9-10' },
  IT: { code: '+39', pattern: /^\d{10}$/, placeholder: '06 1234 5678', length: 10 },
  ES: { code: '+34', pattern: /^\d{9}$/, placeholder: '91 123 4567', length: 9 }
};

function getPhoneMaxLength(lengthSpec) {
  if (typeof lengthSpec === 'number') return lengthSpec;
  const parts = String(lengthSpec)
    .split('-')
    .map((part) => parseInt(part, 10))
    .filter((value) => Number.isFinite(value));
  return parts.length ? Math.max(...parts) : null;
}

function updatePhonePlaceholder() {
  const select = document.getElementById('phoneCountry');
  const input = document.getElementById('phoneNumber');
  if (!select || !input) return;
  const countryCodeParts = select.value.split('|');
  const countryCode = countryCodeParts[1] || 'US';
  const format = PHONE_FORMATS[countryCode] || PHONE_FORMATS.US;
  input.placeholder = format.placeholder;
  input.dataset.country = countryCode;
  input.inputMode = 'numeric';
  input.autocomplete = 'tel';
  input.pattern = format.pattern.source;
  input.title = `Enter ${format.length} digits for ${countryCode}`;
  const maxLen = getPhoneMaxLength(format.length);
  if (maxLen) {
    input.dataset.maxLength = String(maxLen);
    input.maxLength = maxLen;
  } else {
    delete input.dataset.maxLength;
    input.removeAttribute('maxlength');
  }
  validatePhoneInput(input);
}

function validatePhoneInput(input) {
  const country = input.dataset.country || 'US';
  const format = PHONE_FORMATS[country] || PHONE_FORMATS.US;
  const validationMsg = document.getElementById('phoneValidation');
  const maxLen = getPhoneMaxLength(format.length);
  let cleanedValue = input.value.replace(/\D/g, '');
  if (maxLen && cleanedValue.length > maxLen) {
    cleanedValue = cleanedValue.slice(0, maxLen);
  }
  if (input.value !== cleanedValue) input.value = cleanedValue;
  
  if (!cleanedValue) {
    if (validationMsg) validationMsg.textContent = '';
    input.style.borderColor = '';
    return;
  }
  
  const isValid = format.pattern.test(cleanedValue);
  if (validationMsg) {
    if (isValid) {
      validationMsg.textContent = '✓ Valid';
      validationMsg.style.color = '#4ade80';
    } else {
      validationMsg.textContent = `Expected ${format.length} digits for ${country}`;
      validationMsg.style.color = '#fca5a5';
    }
  }
  if (typeof input.setCustomValidity === 'function') {
    input.setCustomValidity(isValid || !cleanedValue ? '' : `Expected ${format.length} digits for ${country}`);
  }
  input.style.borderColor = isValid ? '' : '#dc2626';
}

function initPhoneInputs() {
  const select = document.getElementById('phoneCountry');
  const input = document.getElementById('phoneNumber');
  if (!select || !input) return;
  updatePhonePlaceholder();
}

initPhoneInputs();

function handleReferenceUpload(input) {
  const nameLine = document.getElementById('refImageName');
  const tag = document.getElementById('refImageTag');
  const preview = document.getElementById('refPreview');
  const file = input && input.files && input.files[0] ? input.files[0] : null;

  if (!file) {
    commissionState.referenceName = 'No reference image selected';
    if (nameLine) nameLine.textContent = commissionState.referenceName;
    if (tag) tag.textContent = commissionState.referenceName;
    if (preview) preview.src = DEFAULT_REFERENCE_IMAGE;
    return;
  }

  if (!file.type || !file.type.startsWith('image/')) {
    alert('Please upload an image file.');
    input.value = '';
    commissionState.referenceName = 'No reference image selected';
    if (nameLine) nameLine.textContent = commissionState.referenceName;
    if (tag) tag.textContent = commissionState.referenceName;
    if (preview) preview.src = DEFAULT_REFERENCE_IMAGE;
    return;
  }

  commissionState.referenceName = file.name;
  if (nameLine) nameLine.textContent = commissionState.referenceName;
  if (tag) tag.textContent = commissionState.referenceName;

  const reader = new FileReader();
  reader.onload = event => {
    if (preview && event && event.target && event.target.result) {
      preview.src = event.target.result;
    }
  };
  reader.readAsDataURL(file);
}

function submitOrder() {
  const fname = document.getElementById('fname').value.trim();
  const lname = document.getElementById('lname').value.trim();
  const email = document.getElementById('email').value.trim();
  const country = document.getElementById('country').value.trim();
  const phoneCountrySelect = document.getElementById('phoneCountry');
  const phoneNumber = document.getElementById('phoneNumber').value.trim();
  const countryCodeParts = phoneCountrySelect?.value.split('|') || ['+1', 'US'];
  const countryCode = countryCodeParts[0];
  const brief = document.getElementById('projectBrief').value.trim();
  const refInput = document.getElementById('refImage');

  if (!fname || !lname || !email || !country || !brief) {
    alert('Please complete all required fields before submitting.');
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    alert('Please enter a valid email address.');
    return;
  }
  if (!refInput || !refInput.files || !refInput.files[0]) {
    alert('Please upload at least one reference image.');
    return;
  }

  updateCommissionSummary();

  const formData = new FormData();
  formData.append('firstName', fname);
  formData.append('lastName', lname);
  formData.append('email', email);
  formData.append('phone', countryCode + phoneNumber);
  formData.append('country', country);
  formData.append('countryCode', countryCode);
  formData.append('brief', brief);
  formData.append('budget', String(commissionState.budget));
  if (refInput && refInput.files && refInput.files[0]) {
    formData.append('reference_image', refInput.files[0]);
  }

  // Disable submit button and show loading state
  const submitBtn = document.querySelector('.order-submit');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';
  }

  fetch('/api/commissions/public', {
    method: 'POST',
    body: formData
  })
  .then(res => {
    if (!res.ok) {
      return res.json().then(data => {
        throw new Error(data?.error || `HTTP ${res.status}`);
      });
    }
    return res.json();
  })
  .then(data => {
    trackCommissionSubmit();

    // Show success and trigger WhatsApp share
    shareOrderWhatsApp();
    
    const wrap = document.getElementById('order-form-wrap');
    const success = document.getElementById('order-success');
    const successMeta = document.getElementById('orderSuccessMeta');
    if (successMeta) {
      successMeta.textContent = 'Client: ' + fname + ' ' + lname + ' | Budget: ' + formatBudget(commissionState.budget);
    }

    wrap.classList.add('fade');
    setTimeout(() => {
      wrap.style.display = 'none';
      success.classList.add('show');
    }, 300);
  })
  .catch(error => {
    console.error('Commission submission failed:', error);
    alert('Failed to submit commission: ' + error.message + '. Please try again or contact support.');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Commission Request';
    }
  });
}

function getOrderFormData() {
  const fname = document.getElementById('fname')?.value.trim() || '';
  const lname = document.getElementById('lname')?.value.trim() || '';
  const email = document.getElementById('email')?.value.trim() || '';
  const country = document.getElementById('country')?.value.trim() || '';
  const addressLine1 = document.getElementById('addressLine1')?.value.trim() || '';
  const addressLine2 = document.getElementById('addressLine2')?.value.trim() || '';
  const city = document.getElementById('city')?.value.trim() || '';
  const state = document.getElementById('state')?.value.trim() || '';
  const postalCode = document.getElementById('postalCode')?.value.trim() || '';
  const phoneCountrySelect = document.getElementById('phoneCountry');
  const phoneNumber = document.getElementById('phoneNumber')?.value.trim() || '';
  const countryCodeParts = phoneCountrySelect?.value.split('|') || ['+1', 'US'];
  const countryCode = countryCodeParts[0];
  const brief = document.getElementById('projectBrief')?.value.trim() || '';

  return {
    firstName: fname,
    lastName: lname,
    email,
    phone: phoneNumber ? `${countryCode}${phoneNumber}` : '',
    country,
    addressLine1,
    addressLine2,
    city,
    state,
    postalCode,
    brief,
    countryCode
  };
}

function validateOrderForm(data) {
  if (!data.firstName || !data.lastName || !data.email) {
    return { ok: false, message: 'Please enter your name and email.' };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    return { ok: false, message: 'Please enter a valid email address.' };
  }
  if (!data.addressLine1 || !data.city || !data.state || !data.postalCode || !data.country) {
    return { ok: false, message: 'Please complete your full shipping location details.' };
  }
  return { ok: true };
}

let lastOrderId = null;

async function submitOrderLead() {
  const data = getOrderFormData();
  const validation = validateOrderForm(data);
  if (!validation.ok) {
    alert(validation.message);
    return false;
  }

  const items = loadCartState();
  const payload = {
    ...data,
    items
  };

  try {
    const res = await fetch('/api/orders/public', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error || `HTTP ${res.status}`);
    }
    const result = await res.json();
    lastOrderId = result.orderId || result.id || null;
    const orderTotal = items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 1), 0);
    trackOrderPlace(lastOrderId || ('order-' + Date.now()), orderTotal);
    return true;
  } catch (error) {
    console.error('Order lead submission failed:', error);
    alert('Could not save your order details. Please try again or contact support.');
    return false;
  }
}

function buildOrderWhatsAppMessage() {
  const data = getOrderFormData();
  const items = loadCartState();
  const site = window.getBladesmithSiteSettings ? window.getBladesmithSiteSettings() : {};
  const siteName = site.siteName || 'Forge Dominance';

  let shareUrl;
  const firstItemWithUrl = items.find(item => item.url);
  if (firstItemWithUrl) {
    const itemUrl = firstItemWithUrl.url;
    shareUrl = itemUrl.startsWith('http') ? itemUrl : window.location.origin + (itemUrl.startsWith('/') ? itemUrl : '/' + itemUrl);
  } else {
    shareUrl = window.location.origin;
  }

  const name = (data.firstName + ' ' + data.lastName).trim() || 'Not provided';
  const phone = data.phone || 'Not provided';
  const address = [data.addressLine1, data.city, data.state, data.postalCode, data.country].filter(Boolean).join(', ') || 'Not provided';

  const itemLines = items.length
    ? items.map(item => {
      const qty = Number(item.qty || 1);
      const price = Number(item.price || 0);
      return `• ${item.name || 'Unnamed'} x${qty} — $${price.toLocaleString()}`;
    }).join('\n')
    : '• No products selected';

  const lines = [
    `--- NEW ORDER ---`,
    ``,
    `👤 Name: ${name}`,
    `📞 Phone: ${phone}`,
    `📍 Address: ${address}`,
    ``,
    `🛒 Order:`,
    itemLines,
    ``,
    `💬 Please confirm this order. Thank you!`,
    ``,
    `🔗 ${shareUrl}`
  ];
  return lines.join('\n');
}

function buildOrderEmailBody() {
  const data = getOrderFormData();
  const items = loadCartState();
  const total = items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 1), 0);
  const site = window.getBladesmithSiteSettings ? window.getBladesmithSiteSettings() : {};
  const siteName = site.siteName || 'Forge Dominance';
  const orderUrl = window.location.href;
  const name = (data.firstName + ' ' + data.lastName).trim();

  const itemLines = items.map((item, i) => {
    const qty = Number(item.qty || 1);
    const price = Number(item.price || 0);
    return `${item.name || 'Unnamed'}  |  ${item.steel || 'Custom'}  |  $${price.toLocaleString()}${qty > 1 ? '  x' + qty : ''}`;
  }).join('\n');

  return [
    `Hi ${siteName},`,
    ``,
    `I would like to order the following:`,
    ``,
    ``,
    itemLines || 'No items selected',
    ``,
    `Total: ${formatBudget(total)}`,
    lastOrderId ? `Order #${lastOrderId}` : '',
    ``,
    ``,
    `${orderUrl}`,
    ``,
    ``,
    `---`,
    ``,
    `Name: ${name || '[your name]'}`,
    `Email: ${data.email || '[your email]'}`,
    `Phone: ${data.phone || '[your phone]'}`,
    `Address: ${[data.addressLine1, data.city, data.state, data.postalCode, data.country].filter(Boolean).join(', ') || '[your address]'}`,
    data.brief ? `\nNote: ${data.brief}` : '',
    ``,
    ``,
    `${name || '[your name]'}`
  ].filter(l => l !== false && l !== undefined).join('\n');
}

async function shareOrderWhatsApp() {
  const btn = document.querySelector('[onclick*="shareOrderWhatsApp"]') || document.querySelector('.order-wa-btn');
  const action = async () => {
    if (document.getElementById('orderContactForm')) {
      const saved = await submitOrderLead();
      if (!saved) return;
    }
    const site = window.getBladesmithSiteSettings ? window.getBladesmithSiteSettings() : {};
    const waNumber = String(site.whatsappNumber || '923298399619').replace(/[^\d]/g, '');
    const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(buildOrderWhatsAppMessage())}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };
  if (btn) return withLoading(btn, action);
  return action();
}

async function shareOrderEmail() {
  const btn = document.querySelector('[onclick*="shareOrderEmail"]') || document.querySelector('.order-email-btn');
  const action = async () => {
    if (document.getElementById('orderContactForm')) {
      const saved = await submitOrderLead();
      if (!saved) return;
    }
    const site = window.getBladesmithSiteSettings ? window.getBladesmithSiteSettings() : {};
    const siteName = site.siteName || 'Forge Dominance';
    const items = loadCartState();
    const total = items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 1), 0);
    const data = getOrderFormData();
    const subject = lastOrderId
      ? `Order #${lastOrderId} — ${items.length} Blade${items.length !== 1 ? 's' : ''} | ${siteName}`
      : `Order Inquiry — ${items.length} Blade${items.length !== 1 ? 's' : ''} | ${siteName}`;
    const body = buildOrderEmailBody();
    window.location.href = `mailto:${site.contactEmail || 'orders@forgedominance.com'}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };
  if (btn) return withLoading(btn, action);
  return action();
}

function resetOrder() {
  const wrap = document.getElementById('order-form-wrap');
  const success = document.getElementById('order-success');
  const form = document.getElementById('commissionForm');
  const preview = document.getElementById('refPreview');
  const tag = document.getElementById('refImageTag');
  const nameLine = document.getElementById('refImageName');

  success.classList.remove('show');
  wrap.style.display = '';
  wrap.classList.remove('fade');

  if (form) form.reset();

  commissionState.referenceName = 'No reference image selected';
  if (preview) preview.src = DEFAULT_REFERENCE_IMAGE;
  if (tag) tag.textContent = commissionState.referenceName;
  if (nameLine) nameLine.textContent = commissionState.referenceName;

  setBudget(1800);
  updateCommissionSummary();
}

let commissionPageInitialized = false;
function initCommissionPage() {
  const form = document.getElementById('commissionForm');
  if (!form) return;

  const range = document.getElementById('budgetRange');
  if (range) setBudget(range.value);

  if (!commissionPageInitialized) {
    form.addEventListener('input', updateCommissionSummary);
    form.addEventListener('change', updateCommissionSummary);
    commissionPageInitialized = true;
  }

  updateCommissionSummary();
  renderSelectedProductsSummary();
}

function renderSelectedProductsSummary() {
  const list = document.getElementById('order-selected-products');
  const totalEl = document.getElementById('order-selected-total');
  const countEl = document.getElementById('order-selected-count');
  const pluralEl = document.getElementById('order-plural');
  if (!list || !totalEl || !countEl) return;

  const items = loadCartState();
  const total = items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 1), 0);
  const count = items.reduce((sum, item) => sum + Number(item.qty || 1), 0);

  countEl.textContent = String(count);
  totalEl.textContent = '$' + total.toLocaleString();

  if (pluralEl) {
    pluralEl.textContent = count === 1 ? '' : 's';
  }

  // Update og:image and og:title for WhatsApp preview
  const ogImage = document.getElementById('og-image') || document.querySelector('meta[property="og:image"]');
  const ogTitle = document.getElementById('og-title') || document.querySelector('meta[property="og:title"]');
  if (ogImage) {
    if (items.length === 1 && items[0].img) {
      const img = items[0].img;
      const absUrl = img.startsWith('http') ? img : window.location.origin + (img.startsWith('/') ? img : '/' + img);
      ogImage.setAttribute('content', absUrl);
    } else {
      ogImage.setAttribute('content', window.location.origin + '/assets/images/logo.jpg');
    }
  }
  if (ogTitle) {
    if (items.length === 1) {
      ogTitle.setAttribute('content', 'Forge Dominance — ' + (items[0].name || 'Your Order'));
    } else if (items.length > 1) {
      ogTitle.setAttribute('content', 'Forge Dominance — ' + items.length + ' Blades Order');
    }
  }

  if (!items.length) {
    list.innerHTML = '<li style="border:1px dashed var(--faint);padding:24px;text-align:center;background:var(--white-02);color:var(--ash);">'
      + 'No products selected yet.<br/>Use "Add to Order" on the collection page to get started.'
      + '</li>';
    return;
  }

  list.innerHTML = items.map((item) => {
    const name = String(item.name || 'Unnamed');
    const steel = String(item.steel || 'Custom Build');
    const qty = Number(item.qty || 1);
    const price = Number(item.price || 0);
    const img = normalizeCartImage(item.img);
    const itemTotal = price * qty;
    return '<li>'
      + (img ? '<div class="order-item-img"><img src="' + img + '" alt="' + name + '"/></div>' : '')
      + '<div class="order-item-details">'
      + '<div class="order-item-name">' + name + '</div>'
      + '<div class="order-item-specs">' + steel + '</div>'
      + '<div class="order-item-meta">Qty: ' + qty + '</div>'
      + '</div>'
      + '<div class="order-item-price">$' + itemTotal.toLocaleString() + '</div>'
      + '</li>';
  }).join('');
}

function ensurePreloaderMarkup() {
  if (document.getElementById('preloader')) return;
  document.body.insertAdjacentHTML('afterbegin', `
    <div id="preloader">
      <div class="pl-logo">BLADE<span>SMITH</span></div>
      <div class="pl-bar-wrap"><div class="pl-bar"></div></div>
      <div class="pl-pct" id="plp">0%</div>
    </div>
  `);
}


function ensureStickyContactMarkup() {
  if (document.getElementById('sticky-contact')) return;
  const site = window.getBladesmithSiteSettings ? window.getBladesmithSiteSettings() : {};
  const supportName = site.supportName || 'James';
  document.body.insertAdjacentHTML('beforeend', `
    <div id="chat-widget">
      <div class="chat-head">
        <div class="chat-av"><img src="/assets/images/favicon.svg" alt="FD" style="width:100%;height:100%;object-fit:contain;border-radius:50%;"></div>
        <div class="chat-info">
          <h5>Forge Dominance</h5>
          <span>Typically replies in 15 min</span>
        </div>
        <button class="chat-close" onclick="toggleChat()" aria-label="Close chat">&times;</button>
      </div>
      <div class="chat-body" id="chatBody">
        <div class="chat-bubble them">Hi, ${supportName} here. Interested in commissioning a blade? Tell me what you hunt and I'll recommend the right steel.</div>
      </div>
      <div class="chat-foot">
        <input type="text" id="chatInput" placeholder="Type your message..." onkeypress="if(event.key==='Enter')sendChat()"/>
        <button onclick="sendChat()">SEND</button>
      </div>
    </div>

    <div id="sticky-contact">
      <button class="sc-fab chat" onclick="toggleChat()">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
        <span class="sc-tip">Live Chat</span>
      </button>

      <a href="mailto:${(window.getBladesmithSiteSettings ? window.getBladesmithSiteSettings().contactEmail : 'orders@forgedominance.com') || 'orders@forgedominance.com'}" class="sc-fab mail">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 5l10 7 10-7"/></svg>
        <span class="sc-tip">Email Us</span>
      </a>

      <a href="https://wa.me/${String((window.getBladesmithSiteSettings ? window.getBladesmithSiteSettings().whatsappNumber : '923298399619') || '923298399619').replace(/[^\d]/g, '')}?text=${encodeURIComponent((window.getBladesmithSiteSettings ? window.getBladesmithSiteSettings().whatsappMessage : "Hi Forge Dominance, I'm interested in a knife.") || "Hi Forge Dominance, I'm interested in a knife.")}" target="_blank" rel="noopener" class="sc-fab wa">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.008-.57-.008-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
        <span class="sc-tip">WhatsApp</span>
      </a>
    </div>
  `);
}

ensurePreloaderMarkup();
ensureStickyContactMarkup();

const CHAT_STORAGE_KEY = 'bs_chat_history';
const CHAT_ENDPOINT = '/api/chat';
const CHAT_GREETING = (() => {
  const site = window.getBladesmithSiteSettings ? window.getBladesmithSiteSettings() : {};
  const supportName = site.supportName || 'James';
  return `Hi, ${supportName} here. Interested in commissioning a blade? Tell me what you hunt and I'll recommend the right steel.`;
})();
const CHAT_FALLBACK = (() => {
  const site = window.getBladesmithSiteSettings ? window.getBladesmithSiteSettings() : {};
  const siteName = site.siteName || 'Forge Dominance';
  return `Thanks for reaching out. ${site.supportName || 'James'} will personally review your message and reply shortly. In the meantime, feel free to browse the collection or reach us on WhatsApp for faster response.`;
})();
const CHAT_POLL_INTERVAL_MS = 12000;
const CHAT_BASE_TITLE = document.title;
let chatUnreadCount = 0;
let chatNotificationRequested = false;
let chatPollInterval = null;

function readChatHistory() {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry) => ({
        role: entry?.role === 'assistant' ? 'assistant' : 'user',
        text: String(entry?.text || '').trim()
      }))
      .filter((entry) => entry.text);
  } catch {
    return [];
  }
}

function saveChatHistory(history) {
  try {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(history.slice(-20)));
  } catch {
    // best effort only
  }
}

function seedChatHistory() {
  const history = readChatHistory();
  if (history.length) return history;
  const seeded = [{ role: 'assistant', text: CHAT_GREETING }];
  saveChatHistory(seeded);
  return seeded;
}

function appendChatBubble(role, text) {
  const body = document.getElementById('chatBody');
  if (!body) return;
  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${role === 'assistant' ? 'them' : 'me'}`;
  bubble.textContent = text;
  body.appendChild(bubble);
  body.scrollTop = body.scrollHeight;
}

function getChatVisitorId() {
  const key = 'bs_visitor_id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = 'v-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
    localStorage.setItem(key, id);
  }
  return id;
}

function getChatButton() {
  return document.querySelector('#sticky-contact .sc-fab.chat') || document.querySelector('.sc-fab.chat');
}

function ensureChatBadge() {
  const button = getChatButton();
  if (!button) return null;
  let badge = button.querySelector('.sc-badge');
  if (!badge) {
    badge = document.createElement('span');
    badge.className = 'sc-badge';
    badge.style.display = 'none';
    button.appendChild(badge);
  }
  return badge;
}

function playChatSound() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = 880;
    o.connect(g);
    g.connect(ctx.destination);
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
    setTimeout(() => { try { o.stop(); ctx.close(); } catch {} }, 300);
  } catch (e) {
    // ignore audio errors
  }
}

function ensureToastContainer() {
  let c = document.getElementById('bs-chat-toast');
  if (c) return c;
  c = document.createElement('div');
  c.id = 'bs-chat-toast';
  c.style.position = 'fixed';
  c.style.right = '1rem';
  c.style.bottom = '4.5rem';
  c.style.zIndex = '9999';
  c.style.display = 'flex';
  c.style.flexDirection = 'column';
  c.style.gap = '0.5rem';
  document.body.appendChild(c);
  return c;
}

function showChatToast(text) {
  try {
    const c = ensureToastContainer();
    const t = document.createElement('div');
    t.className = 'bs-chat-toast-item';
    t.textContent = text;
    t.style.background = 'rgba(0,0,0,0.85)';
    t.style.color = '#fff';
    t.style.padding = '0.6rem 0.9rem';
    t.style.borderRadius = '0.6rem';
    t.style.boxShadow = '0 6px 18px rgba(0,0,0,0.35)';
    t.style.maxWidth = '20rem';
    t.style.fontSize = '0.95rem';
    t.style.opacity = '0';
    t.style.transform = 'translateY(6px)';
    t.style.transition = 'opacity .18s ease, transform .18s ease';
    c.appendChild(t);
    requestAnimationFrame(() => {
      t.style.opacity = '1';
      t.style.transform = 'translateY(0)';
    });
    setTimeout(() => {
      t.style.opacity = '0';
      t.style.transform = 'translateY(6px)';
      setTimeout(() => t.remove(), 220);
    }, 4500);
  } catch (e) {
    // ignore
  }
}

function setChatUnreadCount(count) {
  chatUnreadCount = Math.max(0, count);
  const badge = ensureChatBadge();
  if (badge) {
    if (chatUnreadCount > 0) {
      badge.textContent = chatUnreadCount > 9 ? '9+' : String(chatUnreadCount);
      badge.style.display = 'flex';
    } else {
      badge.textContent = '';
      badge.style.display = 'none';
    }
  }
  if (CHAT_BASE_TITLE) {
    document.title = chatUnreadCount > 0
      ? `(${chatUnreadCount}) ${CHAT_BASE_TITLE}`
      : CHAT_BASE_TITLE;
  }
}

function clearChatUnread() {
  setChatUnreadCount(0);
}

function isChatOpen() {
  const widget = document.getElementById('chat-widget');
  return !!(widget && widget.classList.contains('open'));
}

function maybeRequestChatNotificationPermission() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted' || Notification.permission === 'denied') return;
  if (chatNotificationRequested) return;
  chatNotificationRequested = true;
  Notification.requestPermission().catch(() => {});
}

function notifyChatReplies(messages) {
  if (!messages.length) return;
  const shouldNotify = document.hidden || !isChatOpen();
  if (shouldNotify) {
    setChatUnreadCount(chatUnreadCount + messages.length);
    // always play sound for frontend when admin replies arrive
    playChatSound();
  }
  // show in-page toast + sound (no browser Notification)
  if (shouldNotify) {
    const preview = messages.length === 1 ? messages[0].message : `${messages.length} new messages`;
    const body = preview.length > 140 ? `${preview.slice(0, 137)}...` : preview;
    showChatToast(body);
  }

  // sound already played via playChatSound(); avoid duplicate playback
}

async function pollChatReplies() {
  if (!document.getElementById('chat-widget')) return;
  try {
    const visitorId = getChatVisitorId();
    const response = await fetch(`${CHAT_ENDPOINT}/poll/${encodeURIComponent(visitorId)}`);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return;
    const incoming = Array.isArray(data?.messages) ? data.messages : [];
    if (!incoming.length) return;

    const history = readChatHistory();
    const nextHistory = [...history];
    const appended = [];

    incoming.forEach((entry) => {
      const text = String(entry?.message || '').trim();
      if (!text) return;
      appendChatBubble('assistant', text);
      nextHistory.push({ role: 'assistant', text });
      appended.push({ message: text });
    });

    if (appended.length) {
      saveChatHistory(nextHistory);
      notifyChatReplies(appended);
    }
  } catch (error) {
    console.warn('Live chat poll failed:', error?.message || error);
  }
}

function stopChatPolling() {
  if (chatPollInterval) {
    clearInterval(chatPollInterval);
    chatPollInterval = null;
  }
}

function startChatPolling() {
  if (!document.getElementById('chat-widget')) return;
  stopChatPolling();
  pollChatReplies();
  chatPollInterval = setInterval(pollChatReplies, CHAT_POLL_INTERVAL_MS);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && isChatOpen()) {
      clearChatUnread();
    }
  }, { once: true });
}

function renderChatHistory() {
  const body = document.getElementById('chatBody');
  if (!body) return;
  body.innerHTML = '';
  seedChatHistory().forEach((entry) => appendChatBubble(entry.role, entry.text));
}

function bindChatDismiss() {
  document.addEventListener('click', (event) => {
    const widget = document.getElementById('chat-widget');
    if (!widget || !widget.classList.contains('open')) return;
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    if (widget.contains(target) || target.closest('.sc-fab.chat')) return;
    widget.classList.remove('open');
  });
}

function initChatWidget() {
  if (!document.getElementById('chat-widget')) return;
  renderChatHistory();
  bindChatDismiss();
}

initChatWidget();
startChatPolling();

function toggleChat() {
  const widget = document.getElementById('chat-widget');
  if (!widget) return;
  const nextOpen = !widget.classList.contains('open');
  widget.classList.toggle('open', nextOpen);
  const stickyContact = document.getElementById('sticky-contact');
  if (stickyContact) stickyContact.classList.toggle('chat-open', nextOpen);
  if (nextOpen) {
    clearChatUnread();
    maybeRequestChatNotificationPermission();
    startChatPolling();
  }
}

let chatSending = false;
async function sendChat() {
  if (chatSending) return;
  const input = document.getElementById('chatInput');
  const body = document.getElementById('chatBody');
  if (!input || !body) return;
  const txt = input.value.trim();
  if (!txt) return;
  chatSending = true;
  maybeRequestChatNotificationPermission();
  const sendButton = document.querySelector('#chat-widget .chat-foot button');
  const currentHistory = readChatHistory();
  const nextHistory = [...currentHistory, { role: 'user', text: txt }].slice(-20);
  appendChatBubble('user', txt);
  saveChatHistory(nextHistory);
  input.value = '';
  input.disabled = true;
  if (sendButton) sendButton.disabled = true;

  try {
    const response = await fetch(CHAT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: txt,
        visitorId: getChatVisitorId(),
        history: nextHistory,
        page: window.location.pathname
      })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.error || `HTTP ${response.status}`);
    }

    const reply = String(data?.reply || '').trim();
    if (reply) {
      appendChatBubble('assistant', reply);
      saveChatHistory([...nextHistory, { role: 'assistant', text: reply }]);
    }
  } catch (error) {
    console.error('Live chat failed:', error);
    appendChatBubble('assistant', CHAT_FALLBACK);
    saveChatHistory([...nextHistory, { role: 'assistant', text: CHAT_FALLBACK }]);
  } finally {
    input.disabled = false;
    if (sendButton) sendButton.disabled = false;
    chatSending = false;
  }
}


/* ─── MOBILE CARD THUMBNAIL TAP ─── */
document.addEventListener('click', function(e) {
  if (window.innerWidth > 768) return;
  const img = e.target.closest('.pc-img');
  if (!img) return;
  const card = img.closest('.pc');
  if (!card) return;
  const link = card.querySelector('a[href*="product.html"]');
  if (link) window.location.href = link.href;
});

/* ─── PRELOADER ─── */
(function(){
  const preloadEl = document.getElementById('preloader');
  const pctEl = document.getElementById('plp');
  const barEl = document.querySelector('.pl-bar');
  if (!preloadEl || !pctEl || !barEl) return;

  let p = 0;
  let done = false;

  const updateBar = () => {
    barEl.style.width = p + '%';
    pctEl.textContent = p + '%';
  };

  const finish = () => {
    if (done) return;
    done = true;
    p = 100;
    barEl.style.width = '100%';
    pctEl.textContent = '100%';
    preloadEl.classList.add('out');
  };

  const iv = setInterval(() => {
    if (done) return;
    p = Math.min(95, p + Math.floor(Math.random() * 3) + 1);
    updateBar();
  }, 150);

  const onReady = () => {
    if (done) return;
    clearInterval(iv);
    const completeTimer = setInterval(() => {
      p = Math.min(100, p + 2);
      updateBar();
      if (p >= 100) {
        clearInterval(completeTimer);
        setTimeout(finish, 180);
      }
    }, 60);
  };

  if (document.readyState === 'complete') {
    onReady();
  } else {
    window.addEventListener('load', onReady, { once: true });
  }

  // Absolute fail-safe so preloader never blocks the page.
  setTimeout(() => {
    clearInterval(iv);
    finish();
  }, 6000);
})();


/* ─── MOBILE NAV ─── */
let navOpen = false;
function toggleNav() {
  navOpen = !navOpen;
  const mobNav = document.getElementById('mob-nav');
  const navHam = document.getElementById('navHam');
  if (mobNav) mobNav.classList.toggle('open', navOpen);
  if (navHam) navHam.classList.toggle('open', navOpen);
  document.body.classList.toggle('nav-open', navOpen);
  document.body.style.overflow = navOpen ? 'hidden' : '';
}

document.querySelectorAll('#mob-nav .mob-link, #mob-nav .mob-cta').forEach(el => {
  el.addEventListener('click', () => {
    if (navOpen) toggleNav();
  });
});

/* ─── CUSTOM CURSOR ─── */
(() => {
  const cur = document.getElementById('cur');
  const ring = document.getElementById('cur-ring');
  const finePointer = window.matchMedia('(pointer:fine)').matches;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const allowCursorFx = finePointer && !reducedMotion;
  window.allowCursorFx = allowCursorFx;

  if (!allowCursorFx) {
    if (cur) cur.style.display = 'none';
    if (ring) ring.style.display = 'none';
    return;
  }

  document.body.classList.add('cursor-ready');

  let mx = window.innerWidth / 2;
  let my = window.innerHeight / 2;
  let rx = mx;
  let ry = my;
  let mouseQueued = false;
  let cursorRunning = false;
  let cursorRaf = 0;

  document.addEventListener('mousemove', (e) => {
    mx = e.clientX;
    my = e.clientY;
    if (mouseQueued) return;
    mouseQueued = true;
    requestAnimationFrame(() => {
      mouseQueued = false;
      if (cur) {
        cur.style.left = mx + 'px';
        cur.style.top = my + 'px';
      }
    });
  }, { passive: true });

  function renderCursorRing() {
    if (!cursorRunning || !ring) return;
    rx += (mx - rx) * 0.14;
    ry += (my - ry) * 0.14;
    ring.style.left = rx + 'px';
    ring.style.top = ry + 'px';
    cursorRaf = requestAnimationFrame(renderCursorRing);
  }

  function syncCursorLoop() {
    if (document.hidden) {
      if (cursorRunning) {
        cursorRunning = false;
        cancelAnimationFrame(cursorRaf);
      }
      return;
    }
    if (!cursorRunning) {
      cursorRunning = true;
      renderCursorRing();
    }
  }

  document.addEventListener('visibilitychange', syncCursorLoop);
  document.addEventListener('bs:pagechange', syncCursorLoop);
  syncCursorLoop();

  document.addEventListener('mouseover', (e) => {
    if (e.target.closest('a,button,.hcard,.pc,.oc-card,.oc-panel,.cat-btn,.pcard')) {
      document.body.classList.add('cx');
    }
  }, { passive: true });
  document.addEventListener('mouseout', (e) => {
    if (e.target.closest('a,button,.hcard,.pc,.oc-card,.oc-panel,.cat-btn,.pcard')) {
      document.body.classList.remove('cx');
    }
  }, { passive: true });
})();

/* ─── NAV + PARALLAX + SCROLL WORK ─── */
const navEl = document.getElementById('nav');
const heroBg = document.getElementById('heroBg');
let scrollTicking = false;

function runScrollWork() {
  scrollTicking = false;
  if (navEl) navEl.classList.toggle('solid', scrollY > 60);
  if (heroBg) heroBg.style.transform = 'translateY(' + (scrollY * 0.34) + 'px) scale(' + (1 + Math.min(scrollY, 1200) * 0.00003) + ')';
  calcHS();
  syncHSLoop();
}

function requestScrollWork() {
  if (scrollTicking) return;
  scrollTicking = true;
  requestAnimationFrame(runScrollWork);
}

window.addEventListener('scroll', requestScrollWork, { passive: true });

/* ─── CANVAS EMBERS ─── */
(function initCanvas(){
  const cv = document.getElementById('hcv');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  if (!ctx) return;

  const themeColor = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const glowStart = themeColor('--ember-soft-16') || 'rgba(212,80,10,0.16)';
  const glowMid = themeColor('--ember-soft-07') || 'rgba(212,80,10,0.07)';
  const glowEnd = themeColor('--ember-transparent') || 'rgba(212,80,10,0)';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const homePage = document.getElementById('page-home');
  const hero = document.querySelector('.hero');
  let embers = [];
  let sparks = [];
  let t = 0;
  let heroInView = true;
  let running = false;
  let rafId = 0;

  if (reduceMotion) {
    resizeCanvas();
    drawBaseGlow();
    return;
  }

  if (hero) {
    const heroObserver = new IntersectionObserver(entries => {
      heroInView = entries[0] ? entries[0].isIntersecting : true;
      syncCanvasLoop();
    }, { threshold: 0.02 });
    heroObserver.observe(hero);
  }

  function makeEmber() {
    const p = {};
    resetEmber(p);
    return p;
  }

  function makeSpark() {
    const p = {};
    resetSpark(p);
    return p;
  }

  function resetEmber(p) {
    p.x = Math.random() * cv.width;
    p.y = cv.height + Math.random() * cv.height * 0.35;
    p.r = Math.random() * 2.4 + 0.7;
    p.vx = (Math.random() - 0.5) * 0.9;
    p.vy = -(Math.random() * 1.55 + 0.42);
    p.a = Math.random() * 0.55 + 0.35;
    p.fade = Math.random() * 0.0022 + 0.0014;
    p.h = 15 + Math.random() * 26;
    p.wobble = Math.random() * 1.05 + 0.35;
  }

  function resetSpark(p) {
    p.x = Math.random() * cv.width;
    p.y = cv.height + Math.random() * cv.height * 0.15;
    p.r = Math.random() * 1.3 + 0.4;
    p.vx = (Math.random() - 0.5) * 1.5;
    p.vy = -(Math.random() * 2.3 + 1.1);
    p.a = Math.random() * 0.45 + 0.25;
    p.fade = Math.random() * 0.006 + 0.003;
    p.h = 20 + Math.random() * 22;
  }

  function getCounts() {
    if (reduceMotion) return { embers: 6, sparks: 1 };
    if (window.innerWidth <= 768) return { embers: 18, sparks: 4 };
    return { embers: 28, sparks: 6 };
  }

  function resizeCanvas() {
    cv.width = window.innerWidth;
    cv.height = window.innerHeight;
    const counts = getCounts();
    embers = Array.from({ length: counts.embers }, makeEmber);
    sparks = Array.from({ length: counts.sparks }, makeSpark);
  }

  function drawBaseGlow() {
    const glow = ctx.createRadialGradient(
      cv.width * 0.52,
      cv.height * 0.95,
      0,
      cv.width * 0.52,
      cv.height * 0.95,
      Math.max(cv.width, cv.height) * 0.6
    );
    glow.addColorStop(0, glowStart);
    glow.addColorStop(0.35, glowMid);
    glow.addColorStop(0.5, 'rgba(212,80,10,0.03)');
    glow.addColorStop(1, glowEnd);
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, cv.width, cv.height);
  }

  function canRunCanvas() {
    return !document.hidden && heroInView && homePage && homePage.classList.contains('active');
  }

  function syncCanvasLoop() {
    const shouldRun = canRunCanvas();
    if (shouldRun && !running) {
      running = true;
      rafId = requestAnimationFrame(tick);
    } else if (!shouldRun && running) {
      running = false;
      cancelAnimationFrame(rafId);
    }
  }

  function tick() {
    if (!running) return;
    t += 1;
    if (t % 2 !== 0) { rafId = requestAnimationFrame(tick); return; }
    ctx.clearRect(0, 0, cv.width, cv.height);
    drawBaseGlow();
    ctx.globalCompositeOperation = 'lighter';

    embers.forEach(p => {
      p.x += p.vx + Math.sin((t + p.x) * 0.01) * p.wobble * 0.04;
      p.y += p.vy;
      p.a -= p.fade;
      p.vx *= 0.995;

      if (p.a <= 0 || p.y < -20 || p.x < -30 || p.x > cv.width + 30) {
        resetEmber(p);
      }

      ctx.shadowBlur = p.r * 2;
      ctx.shadowColor = `hsla(${p.h},100%,58%,${Math.min(1, p.a * 0.6)})`;
      ctx.fillStyle = `hsla(${p.h},96%,62%,${p.a})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });

    sparks.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.a -= p.fade;

      if (p.a <= 0 || p.y < -10 || p.x < -20 || p.x > cv.width + 20) {
        resetSpark(p);
      }

      ctx.shadowBlur = p.r * 2.5;
      ctx.shadowColor = `hsla(${p.h},100%,66%,${Math.min(1, p.a * 0.7)})`;
      ctx.fillStyle = `hsla(${p.h},100%,70%,${p.a})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.shadowBlur = 0;
    ctx.globalCompositeOperation = 'source-over';
    rafId = requestAnimationFrame(tick);
  }

  resizeCanvas();
  window.addEventListener('resize', () => { resizeCanvas(); syncCanvasLoop(); }, { passive: true });
  document.addEventListener('visibilitychange', syncCanvasLoop);
  document.addEventListener('bs:pagechange', syncCanvasLoop);
  syncCanvasLoop();
})();

/* ─── HORIZONTAL COLLECTION ─── */
const hsWrap = document.getElementById('collection');
const hsSt = document.getElementById('hsSt');
const hsIn = document.getElementById('hsIn');
const hsSpacer = document.querySelector('.hs-spacer');
const hsPrev = document.getElementById('hsPrev');
const hsNext = document.getElementById('hsNext');

function esc(text) {
  return String(text ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function featuredTier(product) {
  const category = String(product.category || '').toLowerCase();
  if (category.includes('collector')) return "Collector's";
  if (category.includes('survival')) return 'Field Edition';
  if (category.includes('skinning')) return 'Skinning Edition';
  return 'Featured';
}

function featuredSteel(product) {
  return [product.blade, product.grind, product.tang].filter(Boolean).join(' · ') || String(product.craft_story || product.category || 'Featured Blade');
}

function imagePathFromRecord(record) {
  if (!record) return '';
  if (typeof record === 'string') return record;
  return record.image_url || record.url || record.path || record.src || '';
}

function resolveApiPath(path) {
  const suffix = String(path || '').startsWith('/') ? String(path || '') : `/${String(path || '')}`;
  return suffix;
}

function normalizeFeaturedImageUrl(path) {
  const value = String(path || '').trim();
  if (!value) return '/assets/products/placeholder.svg';
  if (
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('data:') ||
    value.startsWith('blob:') ||
    value.startsWith('//')
  ) {
    return value;
  }
  if (value.startsWith('/assets/products/')) {
    return `assets/products/${value.slice('/assets/products/'.length)}`;
  }
  if (value.startsWith('/assets/')) {
    return value.slice(1);
  }
  if (value.startsWith('assets/')) {
    return value;
  }
  if (value.startsWith('uploads/')) {
    return `assets/${value}`;
  }
  // Normalize any legacy capitalized Products path to lowercase
  if (value.includes('/assets/uploads/')) {
    const fixed = value.replace('/assets/uploads/', '/assets/products/');
    return fixed.startsWith('/') ? fixed.slice(1) : fixed;
  }
  return value.startsWith('/') ? value.slice(1) : value;
}

function featuredImage(product) {
  const images = Array.isArray(product.images) ? product.images : [];
  const selectedFromApi = product.thumbnail_url || product.thumbnailUrl || '';
  const selectedRecord = images.find((image) => image && (image.is_thumbnail === true || image.is_thumbnail === 'true' || image.isThumbnail === true || image.isThumbnail === 'true' || image.is_primary === true || image.isPrimary === true));
  const selectedFromImages = imagePathFromRecord(selectedRecord || images[0]);
  return normalizeFeaturedImageUrl(selectedFromImages || selectedFromApi);
}

function renderFeaturedCards(products) {
  if (!hsIn) return;
  if (!products.length) {
    hsIn.innerHTML = '<div class="pc"><div class="pc-body"><div class="pc-steel">Featured</div><h3 class="pc-name">No Featured Products Yet</h3><p class="pc-tag">Mark products as featured in admin to show them here.</p></div></div>';
    return;
  }

  hsIn.innerHTML = products.map((product) => {
    const image = featuredImage(product);
    const price = Number(product.price || 0);
    const compare = Number(product.compare_price || 0);
    return `
      <div class="pc${String(product.category || '').toLowerCase().includes('collector') ? ' gold-card' : ''}">
        <div class="pc-img">
          <img src="${esc(image)}" alt="${esc(product.name || 'Featured blade')}" loading="lazy"/>
          <div class="pc-fade"></div>
          <div class="pc-tier">${esc(product.category || 'Featured')}</div>
        </div>
        <div class="pc-body">
          <div class="pc-cat">${esc(product.category || 'Featured')}</div>
          <h3 class="pc-name">${esc(product.name || 'Unnamed')}</h3>
          <div class="pc-foot">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:0.625rem;width:100%;">
              <div>
                ${compare > 0 ? `<span class="pc-orig">Regular $${compare.toLocaleString()}</span>` : ''}
                <span class="pc-price">$${price.toLocaleString()}</span>
              </div>
              <div style="display:flex;gap:0.5rem;flex-wrap:wrap;justify-content:flex-end;">
                <button class="pc-btn js-add-order" type="button" data-name="${esc(product.name || 'Unnamed')}" data-steel="${esc(featuredSteel(product))}" data-price="${price}" data-img="${esc(image)}" data-url="${esc('pages/product.html?id=' + encodeURIComponent(String(product.id || '')))}">Add to Order</button>
                <a class="pc-btn" style="background:transparent;border:1px solid var(--faint);color:var(--plat);" href="pages/product.html?id=${encodeURIComponent(String(product.id || ''))}">Details</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

async function loadFeaturedProducts() {
  if (!hsIn) return;
  try {
    const res = await fetch(resolveApiPath('/api/products/featured'));
    if (!res.ok) throw new Error('Failed to load featured products');
    const products = await res.json();
    renderFeaturedCards(Array.isArray(products) ? products : []);
  } catch (error) {
    hsIn.innerHTML = '<div class="pc"><div class="pc-body"><div class="pc-steel">Unavailable</div><h3 class="pc-name">Featured Feed Offline</h3><p class="pc-tag">Please try again in a moment.</p></div></div>';
  }
}

document.addEventListener('click', function(e) {
  const btn = e.target.closest('.js-add-order');
  if (!btn) return;
  e.preventDefault();
  addToCart(btn.dataset.name, btn.dataset.steel, Number(btn.dataset.price || 0), btn.dataset.img, btn.dataset.url);
});

function syncHS(){
  if(!hsWrap||!hsSt||!hsIn) return;
  if (hsSpacer) {
    hsSpacer.style.display = 'none';
    hsSpacer.style.height = '0px';
  }
  hsSt.style.position = 'static';
  hsSt.style.top = 'auto';
  hsSt.style.height = 'auto';
  hsSt.style.overflow = 'visible';
  hsIn.style.transform = 'translate3d(0,0,0)';
  hsIn.style.willChange = 'auto';
}

function calcHS(){
  if (hsIn) hsIn.style.transform = 'translate3d(0,0,0)';
}

function syncHSLoop() {
  if (hsIn) hsIn.style.transform = 'translate3d(0,0,0)';
}

syncHS();
calcHS();
syncHSLoop();
loadFeaturedProducts();

function ensureVisitorId() {
  const key = 'bs_visitor_id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = 'v-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
    localStorage.setItem(key, id);
  }
  return id;
}

const visitorSession = {
  id: ensureVisitorId(),
  pageStart: Date.now(),
  actions: 0
};

function trackVisitor(action, meta = {}) {
  const payload = {
    visitorId: visitorSession.id,
    path: window.location.pathname + window.location.search,
    action,
    meta
  };
  fetch('/api/visitors/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true
  }).catch(() => {});
}

trackVisitor('pageview', { title: document.title });
document.addEventListener('click', (event) => {
  const target = event.target.closest('a,button,input,select,textarea');
  if (!target) return;
  visitorSession.actions += 1;
  trackVisitor('interaction', {
    tag: target.tagName,
    id: target.id || null,
    classes: target.className || null,
    text: String(target.textContent || '').trim().slice(0, 80)
  });
}, { passive: true });

window.addEventListener('beforeunload', () => {
  trackVisitor('leave', {
    durationMs: Date.now() - visitorSession.pageStart,
    actions: visitorSession.actions
  });
});

function getCardScrollAmount() {
  if (!hsIn) return 420;
  const card = hsIn.querySelector('.pc');
  if (!card) return 420;
  const cardWidth = card.offsetWidth;
  const gap = parseInt(window.getComputedStyle(hsIn).gap) || 12;
  return cardWidth + gap;
}

if (hsPrev && hsIn) {
  hsPrev.addEventListener('click', () => {
    const amount = getCardScrollAmount();
    hsIn.scrollBy({ left: -amount, behavior: 'smooth' });
  });
}

if (hsNext && hsIn) {
  hsNext.addEventListener('click', () => {
    const amount = getCardScrollAmount();
    hsIn.scrollBy({ left: amount, behavior: 'smooth' });
  });
}

window.addEventListener('resize', () => { syncHS(); calcHS(); syncHSLoop(); });
window.addEventListener('load', () => { syncHS(); calcHS(); syncHSLoop(); requestScrollWork(); });
document.addEventListener('visibilitychange', syncHSLoop);
document.addEventListener('bs:pagechange', syncHSLoop);

/* ─── INTERSECTION REVEALS ─── */
const obs = new IntersectionObserver(es => {
  es.forEach(e => { if(e.isIntersecting){ e.target.classList.add('in'); obs.unobserve(e.target); } });
}, { threshold: 0.09 });
document.querySelectorAll('.rv,.rv-l,.rv-r,.rv-s').forEach(el => obs.observe(el));

/* ─── COUNTER ANIMATION ─── */
const cObs = new IntersectionObserver(es => {
  es.forEach(e => {
    if(!e.isIntersecting) return;
    const el=e.target, t=parseInt(el.dataset.count), u=el.querySelector('.su');
    if(!t) return;
    const uH=u?u.outerHTML:'';
    let v=0; const step=t/55;
    const ti=setInterval(()=>{ v=Math.min(t,v+step); el.innerHTML=Math.floor(v).toLocaleString()+uH; if(v>=t)clearInterval(ti); },25);
    cObs.unobserve(el);
  });
}, { threshold:.5 });
document.querySelectorAll('[data-count]').forEach(el => cObs.observe(el));

/* ─── MAGNETIC BUTTONS ─── */
if (window.allowCursorFx) {
  document.querySelectorAll('.btn-p,.btn-o,.btn-gold,.nav-cta').forEach(btn => {
    let raf = 0;
    let px = 0;
    let py = 0;
    btn.addEventListener('mousemove', e => {
      px = e.clientX;
      py = e.clientY;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        const r = btn.getBoundingClientRect();
        btn.style.transform = `translate(${(px-r.left-r.width/2)*.08}px,${(py-r.top-r.height/2)*.09}px)`;
        raf = 0;
      });
    }, { passive: true });
    btn.addEventListener('mouseleave', ()=>{ btn.style.transform=''; });
  });
}

/* ─── 3D TILT CARDS ─── */
if (window.allowCursorFx) {
  document.querySelectorAll('.pc,.tc').forEach(card => {
    let raf = 0;
    let px = 0;
    let py = 0;
    card.addEventListener('mousemove', e => {
      px = e.clientX;
      py = e.clientY;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        const r=card.getBoundingClientRect();
        const x=(px-r.left)/r.width-.5;
        const y=(py-r.top)/r.height-.5;
        card.style.transform=`perspective(800px) rotateY(${x*2.4}deg) rotateX(${-y*2.4}deg) translateZ(3px)`;
        raf = 0;
      });
    }, { passive: true });
    card.addEventListener('mouseleave', ()=>{
      card.style.transition='transform .3s ease';
      card.style.transform='';
      setTimeout(()=>card.style.transition='',300);
    });
  });
}

/* ─── SMOOTH SCROLL ANCHORS ─── */
if (!listenersInitialized) {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const t=document.querySelector(a.getAttribute('href'));
      if(t){ e.preventDefault(); t.scrollIntoView({behavior:'smooth'}); }
    });
  });
  listenersInitialized = true;
}

// Initialize commission page on load
initCommissionPage();
updatePhonePlaceholder();

/* ─── GA4 EVENT TRACKING ─── */
function trackAddToCart(product, quantity) {
  if (typeof gtag === 'undefined') return;
  gtag('event', 'add_to_cart', {
    currency: 'USD',
    value: product.price * quantity,
    items: [{ item_id: product.id, item_name: product.name, item_category: product.category, price: product.price, quantity }]
  });
}

function trackCommissionSubmit() {
  if (typeof gtag === 'undefined') return;
  gtag('event', 'generate_lead', { event_category: 'commission', event_label: 'commission_form_submit' });
}

function trackOrderPlace(orderId, total) {
  if (typeof gtag === 'undefined') return;
  gtag('event', 'purchase', { transaction_id: orderId, value: total, currency: 'USD' });
}

/* ─── CUSTOM SELECT DROPDOWNS ─── */
(function initCustomSelects() {

  function upgrade(select) {
    if (select.dataset.upgraded) return;
    select.dataset.upgraded = '1';

    const isPhone = select.classList.contains('phone-country-select');
    const parent = select.parentNode;

    if (isPhone) {
      select.style.position = 'absolute';
      select.style.opacity = '0';
      select.style.pointerEvents = 'none';
      select.style.width = '1px';
      select.style.height = '1px';

      var flagMap = {'US':'/assets/images/flags/us.svg','CA':'/assets/images/flags/ca.svg','GB':'/assets/images/flags/gb.svg','AU':'/assets/images/flags/au.svg','DE':'/assets/images/flags/de.svg','FR':'/assets/images/flags/fr.svg','IN':'/assets/images/flags/in.svg','ZA':'/assets/images/flags/za.svg','CN':'/assets/images/flags/cn.svg','JP':'/assets/images/flags/jp.svg','IT':'/assets/images/flags/it.svg','ES':'/assets/images/flags/es.svg'};

      function getCountryCode(opt) {
        var val = opt.value || '';
        var parts = val.split('|');
        return parts[1] || '';
      }

      function getDialCode(opt) {
        var val = opt.value || '';
        return val.split('|')[0] || '';
      }

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'oc-sel-btn phone-sel-btn';
      parent.insertBefore(btn, select);

      const list = document.createElement('div');
      list.className = 'oc-sel-list phone-sel-list';
      list.style.cssText = 'position:fixed;min-width:16rem;background:var(--l1);border:0.0625rem solid var(--faint);border-radius:0.5rem;max-height:16rem;overflow-y:auto;z-index:9999;opacity:0;visibility:hidden;transform:translateY(-0.25rem);transition:opacity .2s,transform .2s,visibility .2s;box-shadow:0 1rem 2.5rem rgba(0,0,0,.55)';
      document.body.appendChild(list);

      let isOpen = false;
      function syncLabel() {
        const opt = select.options[select.selectedIndex];
        var cc = getCountryCode(opt);
        var dial = getDialCode(opt);
        var flagSrc = flagMap[cc] || '';
        btn.innerHTML = (flagSrc ? '<img class="phone-sel-flag" src="' + flagSrc + '" alt="' + cc + '"/>' : '') + '<span class="phone-sel-code">' + dial + '</span>';
      }
      function positionList() {
        var rect = btn.getBoundingClientRect();
        list.style.left = rect.left + 'px';
        list.style.top = (rect.bottom + 4) + 'px';
      }
      function render() {
        list.innerHTML = '';
        Array.from(select.options).forEach(function (opt) {
          var cc = getCountryCode(opt);
          var dial = getDialCode(opt);
          var flagSrc = flagMap[cc] || '';
          const item = document.createElement('button');
          item.type = 'button';
          item.className = 'oc-sel-option phone-sel-option';
          item.innerHTML = (flagSrc ? '<img class="phone-sel-flag" src="' + flagSrc + '" alt="' + cc + '"/>' : '') + '<span class="phone-sel-code">' + dial + '</span><span class="phone-sel-country">' + cc + '</span>';
          if (opt.selected) item.setAttribute('aria-selected', 'true');
          item.addEventListener('click', function () {
            select.value = opt.value;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            syncLabel();
            close();
          });
          list.appendChild(item);
        });
      }
      function open() { isOpen = true; positionList(); list.style.opacity = '1'; list.style.visibility = 'visible'; list.style.transform = 'translateY(0)'; render(); }
      function close() { isOpen = false; list.style.opacity = '0'; list.style.visibility = 'hidden'; list.style.transform = 'translateY(-0.25rem)'; }
      btn.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); isOpen ? close() : open(); });
      document.addEventListener('click', function (e) { if (!btn.contains(e.target) && !list.contains(e.target)) close(); });
      window.addEventListener('scroll', function (e) { if (isOpen && !list.contains(e.target)) close(); }, true);
      syncLabel();
      return;
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'oc-custom-select';
    parent.insertBefore(wrapper, select);
    select.classList.add('oc-native-hidden');
    wrapper.appendChild(select);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'oc-sel-btn';
    wrapper.insertBefore(btn, select);

    const list = document.createElement('div');
    list.className = 'oc-sel-list';
    list.setAttribute('role', 'listbox');
    list.style.cssText = 'position:fixed;min-width:14rem;background:var(--l1);border:0.0625rem solid var(--faint);border-radius:0.5rem;max-height:15rem;overflow-y:auto;z-index:9999;opacity:0;visibility:hidden;transform:translateY(-0.25rem);transition:opacity .2s,transform .2s,visibility .2s;box-shadow:0 1rem 2.5rem rgba(0,0,0,.55);-webkit-overflow-scrolling:touch';
    document.body.appendChild(list);

    function renderOptions() {
      list.innerHTML = '';
      Array.from(select.options).forEach(function (opt, i) {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'oc-sel-option';
        item.textContent = opt.textContent;
        item.dataset.value = opt.value;
        if (!opt.value && i === 0) item.classList.add('is-placeholder');
        if (opt.selected) item.setAttribute('aria-selected', 'true');
        item.addEventListener('click', function () {
          select.value = opt.value;
          select.dispatchEvent(new Event('change', { bubbles: true }));
          syncLabel();
          close();
        });
        list.appendChild(item);
      });
    }

    function syncLabel() {
      const selected = select.options[select.selectedIndex];
      if (!selected || (!selected.value && select.selectedIndex === 0)) {
        btn.innerHTML = '<span class="oc-sel-placeholder">' + (selected ? selected.textContent : 'Select') + '</span>';
      } else {
        btn.textContent = selected.textContent;
      }
      list.querySelectorAll('.oc-sel-option').forEach(function (el) {
        el.setAttribute('aria-selected', el.dataset.value === select.value ? 'true' : 'false');
      });
    }

    function positionList() {
      var rect = btn.getBoundingClientRect();
      list.style.left = rect.left + 'px';
      list.style.top = (rect.bottom + 6) + 'px';
      list.style.width = rect.width + 'px';
    }

    function open() { wrapper.classList.add('open'); positionList(); renderOptions(); list.style.opacity = '1'; list.style.visibility = 'visible'; list.style.transform = 'translateY(0)'; }
    function close() { wrapper.classList.remove('open'); list.style.opacity = '0'; list.style.visibility = 'hidden'; list.style.transform = 'translateY(-0.25rem)'; }

    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      wrapper.classList.contains('open') ? close() : open();
    });

    document.addEventListener('click', function (e) { if (!wrapper.contains(e.target) && !list.contains(e.target)) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    window.addEventListener('scroll', function (e) { if (wrapper.classList.contains('open') && !list.contains(e.target)) close(); }, true);

    renderOptions();
    syncLabel();

    var observer = new MutationObserver(function () { renderOptions(); syncLabel(); });
    observer.observe(select, { childList: true, attributes: true, subtree: true });
  }

  function upgradeAll() {
    document.querySelectorAll('.oc-field select, .order-contact-form select, .phone-country-select').forEach(upgrade);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', upgradeAll);
  } else {
    upgradeAll();
  }
})();



