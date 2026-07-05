/* product-detail.js — Product detail page: cursor, gallery, cart, product rendering, tracking */

const cur = document.getElementById('cur');
const ring = document.getElementById('cur-ring');
const finePointer = window.matchMedia('(pointer:fine)').matches;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const allowCursorFx = finePointer && !reducedMotion;

if (!allowCursorFx) {
  if (cur) cur.style.display = 'none';
  if (ring) ring.style.display = 'none';
} else {
  document.body.classList.add('cursor-ready');
  var mx = window.innerWidth / 2, my = window.innerHeight / 2, rx = mx, ry = my;
  var mouseQueued = false;
  var cursorRunning = false;
  var cursorRaf = 0;

  var lastCursorMoveTime = 0;
  var CURSOR_IDLE_MS = 150;

  document.addEventListener('mousemove', function(e) {
    mx = e.clientX;
    my = e.clientY;
    lastCursorMoveTime = performance.now();
    if (!cursorRaf && cursorRunning) {
      cursorRaf = requestAnimationFrame(renderCursorRing);
    }
    if (mouseQueued) return;
    mouseQueued = true;
    requestAnimationFrame(function() {
      mouseQueued = false;
      if (cur) {
        cur.style.left = mx + 'px';
        cur.style.top = my + 'px';
      }
    });
  }, { passive: true });

  function renderCursorRing() {
    if (!cursorRunning || !ring) return;
    var idleFor = performance.now() - lastCursorMoveTime;
    if (idleFor > CURSOR_IDLE_MS) {
      ring.style.left = mx + 'px';
      ring.style.top = my + 'px';
      cursorRaf = 0;
      return;
    }
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

  document.querySelectorAll('a,button,.p-thumb,.p-arrow,.btn-p,.btn-o,.btn-contact,.btn-wa,.btn-email').forEach(function(el) {
    el.addEventListener('mouseenter', function() { document.body.classList.add('cx'); });
    el.addEventListener('mouseleave', function() { document.body.classList.remove('cx'); });
  });
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getProductId() {
  var url = new URL(window.location.href);
  return url.searchParams.get('id') || url.searchParams.get('product');
}

function normalizeComparisonRows(rows) {
  if (Array.isArray(rows) && rows.length) {
    return rows.map(function(row) { return [row.label, row.value || '', row.other_value || '']; });
  }
  return [
    ['Edge Retention', '8-10 hrs heavy use', '2-3 hrs heavy use'],
    ['Corrosion Resistance', 'Excellent', 'Poor'],
    ['Handle (Wet)', 'G10 — no slip', 'Wood — slippery'],
    ['Warranty', 'Lifetime unconditional', '1-2 years limited']
  ];
}

function normalizeProductImageUrl(value) {
  var raw = String(value || '').trim();
  if (!raw) return '';
  if (raw.startsWith('data:') || raw.startsWith('blob:') || raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('//')) {
    return raw;
  }
  var normalized = raw.replace(/\\/g, '/');
  if (normalized.startsWith('/assets/products/')) return normalized;
  if (normalized.startsWith('assets/products/')) return '/' + normalized;
  if (normalized.indexOf('/assets/') !== -1) {
    var tail = normalized.slice(normalized.lastIndexOf('/assets/'));
    if (tail.startsWith('/assets/products/')) return tail;
    if (tail.startsWith('/assets/uploads/')) return tail.replace('/assets/uploads/', '/assets/products/');
  }
  return '/assets/products/' + normalized.split('/').pop();
}

function pickGallery(images, fallback) {
  var gallery = (Array.isArray(images) ? images : [])
    .map(function(image) { return normalizeProductImageUrl(image.image_url || image.url || image.path || image.src); })
    .filter(Boolean);
  return gallery.length ? gallery : [normalizeProductImageUrl(fallback || '../assets/images/workshop-detail.svg')];
}

async function fetchProductRecord(id) {
  var endpoint = '/api/products/' + encodeURIComponent(id);
  var lastError = null;
  try {
    var response = await fetch(endpoint, { credentials: 'include' });
    if (response.ok) return response.json();
    lastError = new Error('Request failed: ' + response.status);
  } catch (error) {
    lastError = error;
  }
  throw lastError || new Error('Product not found');
}

function addToOrderFromDetail(name, steel, price, fallbackImg, productUrl) {
  var key = 'bs_order_cart';
  var items = [];
  try {
    var raw = localStorage.getItem(key);
    var parsed = raw ? JSON.parse(raw) : [];
    items = Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    items = [];
  }

  var mainImgEl = document.getElementById('mainImg');
  var rawImg = String(mainImgEl && mainImgEl.getAttribute('src') || fallbackImg || '').trim();
  var selectedImg = rawImg ? (function() {
    try {
      return new URL(rawImg, window.location.href).href;
    } catch (e) {
      return rawImg;
    }
  })() : '';
  var existing = items.find(function(entry) { return entry.name === name; });
  if (existing) existing.qty = Number(existing.qty || 1) + 1;
  else items.push({ name: name, steel: steel, price: price, img: selectedImg, url: String(productUrl || window.location.href || '').trim(), qty: 1 });

  try { localStorage.setItem(key, JSON.stringify(items)); } catch (e) {}
  updateCartUI();
  openCart();
  syncCartBadge();
}

function renderProduct(product) {
  __currentProduct = product;
  var images = pickGallery(product.images, '');
  var productUrl = window.location.href;
  var site = window.BladesmithSiteSettings || window.getBladesmithSiteSettings && window.getBladesmithSiteSettings() || {};
  var siteName = site.siteName || 'Forge Dominance';
  var waNumber = String(site.whatsappNumber || '923298399619').replace(/[^\d]/g, '');
  var detailsText = [
    'Hey! I want to order from ' + siteName + ':',
    '',
    '🛍️ Product: ' + (product.name || 'Custom Blade'),
    '💰 Price: $' + Number(product.price || 0).toLocaleString(),
    '',
    'Please confirm availability. Thank you!',
    '',
    '🔗 ' + productUrl
  ].join('\n');
  var whatsappShareUrl = 'https://wa.me/' + waNumber + '?text=' + encodeURIComponent(detailsText);
  var trustBadges = Array.isArray(product.trust_badges) && product.trust_badges.length
    ? product.trust_badges
    : ['Hand-Forged', 'Lifetime Warranty', 'Individually Tested', 'Made in USA'];
  var hasComparison = Array.isArray(product.comparison_rows) && product.comparison_rows.length > 0;
  var comparisonRows = hasComparison ? normalizeComparisonRows(product.comparison_rows) : [];
  var specEntries = Object.entries({
    blade: product.blade || '',
    overall: product.overall || '',
    handle: product.handle || '',
    weight: product.weight || '',
    grind: product.grind || '',
    tang: product.tang || ''
  }).filter(function(pair) { return pair[1].trim(); });

  var detailRoot = document.getElementById('detailRoot');
  detailRoot.className = '';
  detailRoot.innerHTML = '<section class="p-detail-shell"><div class="p-detail-grid">'
    + '<div class="p-gallery"><div class="p-main-img">'
    + '<img id="mainImg" src="' + escapeHtml(images[0] || '') + '" alt="' + escapeHtml(product.name || 'Product image') + '" fetchpriority="high" />'
    + '<button class="p-arrow left" onclick="prevImage()" aria-label="Previous image"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg></button>'
    + '<button class="p-arrow right" onclick="nextImage()" aria-label="Next image"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/></svg></button>'
    + '</div><div class="p-thumbs">'
    + images.map(function(src, index) { return '<div class="p-thumb ' + (index === 0 ? 'active' : '') + '" onclick="setMainImgByIndex(' + index + ', this)"><img src="' + escapeHtml(src) + '" alt="" /></div>'; }).join('')
    + '</div></div>'
    + '<div class="p-info">'
    + '<span class="tlabel">' + escapeHtml(product.category || 'Product') + '</span>'
    + '<h1>' + escapeHtml(product.name || 'Unnamed') + '<em>.</em></h1>'
    + '<div class="p-steel-row"><span class="p-price">$' + Number(product.price || 0).toLocaleString() + (product.compare_price ? '<span class="p-orig">$' + Number(product.compare_price).toLocaleString() + '</span>' : '') + '</span></div>'
    + ((product.description || '').trim() ? '<p class="p-lead">' + escapeHtml(product.description) + '</p>' : '')
    + ((product.craft_story || '').trim() ? '<div class="p-story"><h4>The Craftsmanship Story</h4><p>' + escapeHtml(product.craft_story) + '</p></div>' : '')
    + (specEntries.length ? '<div class="p-spec-grid">' + specEntries.map(function(pair) { return '<div class="p-spec-cell"><div class="sk">' + pair[0].charAt(0).toUpperCase() + pair[0].slice(1) + '</div><div class="sv">' + escapeHtml(pair[1]) + '</div></div>'; }).join('') + '</div>' : '')
    + ((product.recommended_use || '').trim() ? '<div class="p-story"><h4>Recommended Use Case</h4><p>' + escapeHtml(product.recommended_use) + '</p></div>' : '')
    + (comparisonRows.length ? '<div class="p-comp"><h4>Forge Dominance vs. Mass-Produced</h4><table class="p-comp-table">' + comparisonRows.map(function(row) { return '<tr><td>' + escapeHtml(row[0]) + '</td><td>' + escapeHtml(row[1]) + '</td><td>' + escapeHtml(row[2]) + '</td></tr>'; }).join('') + '</table></div>' : '')
    + '<div class="p-trust">' + trustBadges.map(function(badge) { return '<span>' + escapeHtml(badge) + '</span>'; }).join('') + '</div>'
    + '<div class="p-cta-row"><button class="btn-p js-add-detail" type="button">Add to Order</button>'
    + '<a href="' + whatsappShareUrl + '" target="_blank" rel="noopener noreferrer" class="btn-wa"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.008-.57-.008-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>Chat on WhatsApp</a>'
    + '<button type="button" class="btn-email" onclick="shareProductEmail()"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>Email Inquiry</button>'
    + '</div>'
    + '<p class="p-note">Every blade is commissioned, not purchased. We will contact you within 2 hours to discuss specifications, timeline, and a 50% deposit. No payment is taken until your build is confirmed.</p>'
    + '</div></div></section>'
    + '<section class="p-why"><div class="p-why-grid">'
    + '<div class="p-why-img"><img src="../assets/images/workshop-forge.png" alt="Forge craftsmanship" loading="lazy" /></div>'
    + '<div class="p-why-copy"><h4>Why We Don’t Offer Direct Checkout</h4>'
    + '<p>Every Forge Dominance knife is built to order by one of three craftsmen. There is no warehouse. There is no inventory. There is only steel, fire, and the specific needs of the hunter who commissioned it.</p>'
    + '<p>Direct checkout assumes you know exactly what you need without asking where you’re hunting, what you’re dressing, and how you carry. We refuse to make that assumption.</p>'
    + '<p>When you contact us, our team discusses your use case, recommends steel and handle combinations you may not have considered, and ensures that the blade you receive is the blade you actually need.</p>'
    + '<div class="p-why-stats">'
    + '<div class="p-why-stat"><strong>6-10</strong><span>Weeks Build Time</span></div>'
    + '<div class="p-why-stat"><strong>1</strong><span>Craftsman Per Blade</span></div>'
    + '<div class="p-why-stat"><strong>0</strong><span>Mass-Produced</span></div>'
    + '<div class="p-why-stat"><strong>INF</strong><span>Warranty Coverage</span></div>'
    + '</div></div></div></section>';

  syncCartBadge();

  var addBtn = document.querySelector('.js-add-detail');
  if (addBtn) {
    addBtn.addEventListener('click', function() {
      addToOrderFromDetail(product.name || '', product.craft_story || product.category || '', Number(product.price || 0), images[0] || '../assets/images/workshop-detail.svg', productUrl || window.location.href);
    });
  }
}

function syncCartBadge() {
  var badge = document.getElementById('navCartBadge');
  if (!badge) return;
  var count = 0;
  try {
    var items = JSON.parse(localStorage.getItem('bs_order_cart') || '[]');
    if (Array.isArray(items)) count = items.reduce(function(sum, item) { return sum + Number(item.qty || 1); }, 0);
  } catch (e) {}
  badge.textContent = String(count);
  badge.classList.toggle('show', count > 0);
}

var __currentProduct = null;

function shareProductEmail() {
  var product = __currentProduct;
  if (!product) return;
  var site = window.BladesmithSiteSettings || (window.getBladesmithSiteSettings && window.getBladesmithSiteSettings()) || {};
  var siteName = site.siteName || 'Forge Dominance';
  var contactEmail = site.contactEmail || 'orders@forgedominance.com';
  var productUrl = window.location.href;

  var specs = [
    product.blade ? 'Blade: ' + product.blade : '',
    product.overall ? 'Overall: ' + product.overall : '',
    product.handle ? 'Handle: ' + product.handle : '',
    product.weight ? 'Weight: ' + product.weight : '',
    product.grind ? 'Grind: ' + product.grind : '',
    product.tang ? 'Tang: ' + product.tang : ''
  ].filter(function(l) { return l; }).join('\n');

  var body = [
    'Hi ' + siteName + ',',
    '',
    'I\'m interested in this blade:',
    '',
    '',
    (product.name || 'Custom Blade') + '  |  ' + (product.category || 'Custom') + '  |  $' + Number(product.price || 0).toLocaleString(),
    '',
    specs,
    '',
    '',
    productUrl,
    '',
    '',
    '---',
    '',
    'Name: [your name]',
    'Phone: [your phone]',
    'Message: [any questions or special requests]',
    '',
    '',
    '[your name]'
  ].join('\n');

  var subject = (product.name || 'Blade') + ' - Inquiry | ' + siteName;
  window.location.href = 'mailto:' + contactEmail + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
}
window.shareProductEmail = shareProductEmail;

var __galleryImages = [];
var __galleryIndex = 0;

function setMainImgByIndex(index, thumb) {
  var src = __galleryImages[index] || '';
  setMainImg(src, index, thumb);
}

function setMainImg(src, index, thumb) {
  var mainImg = document.getElementById('mainImg');
  if (!mainImg) return;
  __galleryIndex = Number.isInteger(index) ? index : __galleryImages.indexOf(src) || 0;
  mainImg.style.opacity = '0.5';
  setTimeout(function() {
    mainImg.src = src;
    mainImg.style.opacity = '1';
  }, 120);
  document.querySelectorAll('.p-thumb').forEach(function(item) { item.classList.remove('active'); });
  if (thumb && thumb.classList) thumb.classList.add('active');
  else {
    var thumbEl = document.querySelectorAll('.p-thumb')[__galleryIndex];
    if (thumbEl) thumbEl.classList.add('active');
  }
}

function prevImage() {
  if (!__galleryImages.length) return;
  __galleryIndex = (__galleryIndex - 1 + __galleryImages.length) % __galleryImages.length;
  setMainImg(__galleryImages[__galleryIndex], __galleryIndex);
}

function nextImage() {
  if (!__galleryImages.length) return;
  __galleryIndex = (__galleryIndex + 1) % __galleryImages.length;
  setMainImg(__galleryImages[__galleryIndex], __galleryIndex);
}

async function loadDetail() {
  var id = getProductId();
  if (!id) {
    document.getElementById('detailRoot').className = 'product-error';
    document.getElementById('detailRoot').textContent = 'Missing product id.';
    window.dispatchEvent(new Event('productDetailReady'));
    return;
  }

  var product = await fetchProductRecord(id);
  __galleryImages = pickGallery(product.images, '');
  __galleryIndex = 0;
  renderProduct(product);
  window.dispatchEvent(new Event('productDetailReady'));
}

loadDetail().catch(function(error) {
  document.getElementById('detailRoot').className = 'product-error';
  document.getElementById('detailRoot').textContent = error.message || 'Could not load product.';
  window.dispatchEvent(new Event('productDetailReady'));
});

try {
  var id = getProductId();
  if (window.bsTracker && typeof window.bsTracker.trackEvent === 'function') {
    window.bsTracker.trackEvent('pageview', { page: 'product-detail', productId: id });
  } else {
    var visitorId = (function() {
      var key = 'bs_visitor_id';
      var vid = localStorage.getItem(key);
      if (!vid) {
        vid = 'v-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
        localStorage.setItem(key, vid);
      }
      return vid;
    })();
    var pageStart = Date.now();
    fetch('/api/visitors/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitorId: visitorId, path: window.location.pathname + window.location.search, action: 'pageview', meta: { page: 'product-detail', productId: id } }),
      keepalive: true
    }).catch(function() {});
    window.addEventListener('beforeunload', function() {
      fetch('/api/visitors/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorId: visitorId, path: window.location.pathname + window.location.search, action: 'leave', meta: { durationMs: Date.now() - pageStart } }),
        keepalive: true
      }).catch(function() {});
    });
  }
} catch (e) {}

function openCart() {
  var panel = document.getElementById('cart-panel');
  var overlay = document.getElementById('cart-overlay');
  if (!panel || !overlay) return;
  panel.classList.add('open');
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeCart() {
  var panel = document.getElementById('cart-panel');
  var overlay = document.getElementById('cart-overlay');
  if (!panel || !overlay) return;
  panel.classList.remove('open');
  overlay.classList.remove('open');
  document.body.style.overflow = '';
}

function goToOrder() {
  closeCart();
  window.location.href = 'order.html';
}

function loadCartState() {
  try {
    var stored = localStorage.getItem('bs_order_cart');
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    return [];
  }
}

function saveCartState(items) {
  localStorage.setItem('bs_order_cart', JSON.stringify(items));
}

function updateCartUI() {
  var body = document.getElementById('cartBody');
  var foot = document.getElementById('cartFoot');
  var badge = document.getElementById('navCartBadge');
  var count = document.getElementById('cartCount');
  if (!body || !foot || !badge || !count) return;

  var items = loadCartState();
  var total = items.reduce(function(sum, item) { return sum + Number(item.price || 0) * Number(item.qty || 1); }, 0);
  var itemCount = items.reduce(function(sum, item) { return sum + Number(item.qty || 1); }, 0);

  if (itemCount > 0) {
    badge.textContent = itemCount;
    badge.classList.add('show');
  } else {
    badge.classList.remove('show');
  }

  count.textContent = itemCount;

  if (!items.length) {
    body.innerHTML = '<div class="cart-empty" id="cartEmpty">'
      + '<svg width="44" height="44" viewBox="0 0 44 44" fill="none"><rect x="8" y="14" width="28" height="22" rx="2" stroke="currentColor" stroke-width="1.3"/><path d="M16 14V11a6 6 0 0112 0v3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>'
      + '<p>Your order is empty.<br/>Explore the collection to find your blade.</p>'
      + '</div>';
    foot.style.display = 'none';
    return;
  }

  foot.style.display = 'flex';
  foot.style.flexDirection = 'column';
  foot.style.gap = '0.625rem';

  body.innerHTML = items.map(function(item) {
    var name = String(item.name || 'Unnamed');
    var steel = String(item.steel || 'Custom Build');
    var qty = Number(item.qty || 1);
    var price = Number(item.price || 0);
    var img = String(item.img || '');
    var itemTotal = price * qty;
    return '<div class="cart-item">'
      + (img ? '<div class="ci-img"><img src="' + img + '" alt="' + name + '"/></div>' : '')
      + '<div class="ci-info">'
      + '<div class="ci-steel">' + steel + '</div>'
      + '<div class="ci-name">' + name + '</div>'
      + '<div class="ci-row">'
      + '<div class="ci-price">$' + itemTotal.toLocaleString() + '</div>'
      + '<button class="ci-remove ci-remove-x" onclick="removeFromCart(\'' + name.replace(/'/g, "\\'") + '\')" aria-label="Remove">x</button>'
      + '</div>'
      + '<div class="ci-qty-slider-wrap">'
      + '<input class="ci-qty-slider" type="range" min="1" max="10" value="' + qty + '" onchange="updateItemQty(\'' + name.replace(/'/g, "\\'") + '\', this.value)"/>'
      + '<span class="ci-qval">Qty ' + qty + '</span>'
      + '</div></div></div>';
  }).join('');

  document.getElementById('cartSubtotal').textContent = '$' + total.toLocaleString();
  document.getElementById('cartTotal').textContent = '$' + total.toLocaleString();
}

function refreshCartAcrossPages() {
  updateCartUI();
}

function removeFromCart(name) {
  var items = loadCartState();
  items = items.filter(function(item) { return item.name !== name; });
  saveCartState(items);
  updateCartUI();
}

function updateItemQty(name, newQty) {
  var items = loadCartState();
  var item = items.find(function(i) { return i.name === name; });
  if (item) {
    item.qty = Math.max(1, Math.min(10, Number(newQty)));
    saveCartState(items);
    updateCartUI();
  }
}

document.addEventListener('DOMContentLoaded', function() {
  var cartBtn = document.getElementById('productCartBtn');
  if (cartBtn) {
    cartBtn.addEventListener('click', openCart);
  }
  var topbar = document.querySelector('.product-topbar');
  if (topbar) {
    var onScroll = function() { topbar.classList.toggle('solid', window.scrollY > 60); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }
  window.addEventListener('storage', function(event) {
    if (event.key === 'bs_order_cart') refreshCartAcrossPages();
  });
  document.addEventListener('visibilitychange', function() {
    if (!document.hidden) refreshCartAcrossPages();
  });
  updateCartUI();
});


