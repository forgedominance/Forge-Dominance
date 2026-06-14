/* collection.js — Product listing page (PLP) logic
 * Handles: catalog fetching, product grid, modal, cart, chat, cursor, tilt, parallax
 */

/* === CUSTOM CURSOR === */
const cur = document.getElementById('cur'), ring = document.getElementById('cur-ring');
const finePointer = window.matchMedia('(pointer:fine)').matches;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const allowCursorFx = finePointer && !reducedMotion;

if (!allowCursorFx) {
  if (cur) cur.style.display = 'none';
  if (ring) ring.style.display = 'none';
} else {
  document.body.classList.add('cursor-ready');
  let mx = window.innerWidth / 2, my = window.innerHeight / 2, rx = mx, ry = my;
  let mouseQueued = false;
  let cursorRunning = false;
  let cursorRaf = 0;

  document.addEventListener('mousemove', e => {
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
}

/* === CONFIGURATION === */
const products = {};
let categoryOrder = [];
let activeCategory = '';
const categoryDescriptions = {};

/* === PRODUCT FETCHING === */
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function categoryKey(label) {
  return String(label || 'uncategorized')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'uncategorized';
}

const categoryAliases = {
  'hunters': 'hunters',
  'field-dressing': 'hunters',
  'field-dressing-knives': 'hunters',
  'field dressing knives': 'hunters',
  'survival': 'hunters',
  'survival-knives': 'hunters',
  'survival knives': 'hunters',
  'camp-and-trail': 'camp-and-trail',
  'camp-trail': 'camp-and-trail',
  'camp & trail': 'camp-and-trail',
  'fixed-blade-hunting-knives': 'camp-and-trail',
  'fixed blade hunting knives': 'camp-and-trail',
  'collector': 'camp-and-trail',
  'collectors-pieces': 'camp-and-trail',
  'collector-pieces': 'camp-and-trail',
  'collectors pieces': 'camp-and-trail',
  'collector pieces': 'camp-and-trail',
  'skinning': 'skinning-knives',
  'skinning-knives': 'skinning-knives',
  'skinning knives': 'skinning-knives',
  'folding': 'folding-knives',
  'folding-knives': 'folding-knives',
  'folding knives': 'folding-knives'
};

function resolveCategoryKey(value) {
  const slug = categoryKey(value);
  return categoryAliases[String(value || '').toLowerCase().trim()] || categoryAliases[slug] || slug;
}

function readInitialCategory() {
  const fromUrl = new URL(window.location.href).searchParams.get('category');
  if (!fromUrl) return '';
  const normalized = resolveCategoryKey(fromUrl);
  if (!normalized || normalized === 'uncategorized') return '';
  return normalized;
}

function categoryLabelFromKey(key) {
  const found = categoryOrder.find((entry) => entry.key === key);
  return found ? found.label : key.replace(/-/g, ' ');
}

function syncCategoryButtons() {
  document.querySelectorAll('.cat-btn').forEach((button) => {
    button.classList.toggle('active', button.dataset.category === activeCategory);
  });
}

function renderCategoryButtons() {
  const bar = document.getElementById('catBar');
  if (!bar) return;
  if (!categoryOrder.length) {
    bar.innerHTML = '<button class="cat-btn active" type="button">No categories found</button>';
    return;
  }
  bar.innerHTML = categoryOrder.map((entry, index) => `
    <button class="cat-btn${index === 0 && !activeCategory ? ' active' : ''}" type="button" data-category="${entry.key}" onclick="switchCategory('${entry.key}', this)">${escapeHtml(entry.label)}</button>
  `).join('');
}

/* === CART INTEGRATION === */
function addBladeToOrder(name, steel, price, img) {
  if (!name) return;
  const resolvedPrice = Number(price) || 0;
  const existing = loadCartState();
  const item = existing.find((entry) => entry.name === name);
  if (item) item.qty = (item.qty || 1) + 1;
  else existing.push({ name, steel: steel || '', price: resolvedPrice, img: img || '', qty: 1 });
  saveCartState(existing);
  updateCartUI();
  openCart();
}
window.addBladeToOrder = addBladeToOrder;

function loadCartState() {
  try {
    const raw = localStorage.getItem('bs_order_cart');
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCartState(items) {
  try {
    localStorage.setItem('bs_order_cart', JSON.stringify(items));
  } catch {}
}

function syncCartBadge() {
  updateCartUI();
}

function updateCartUI() {
  const items = loadCartState();
  const badge = document.getElementById('navCartBadge');
  const cartCount = document.getElementById('cartCount');
  const cartBody = document.getElementById('cartBody');
  const cartEmpty = document.getElementById('cartEmpty');
  const cartFoot = document.getElementById('cartFoot');
  const subtotalEl = document.getElementById('cartSubtotal');
  const totalEl = document.getElementById('cartTotal');
  const total = items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 1), 0);
  const count = items.reduce((sum, item) => sum + Number(item.qty || 1), 0);

  if (badge) {
    badge.textContent = String(count);
    badge.classList.toggle('show', count > 0);
  }
  if (cartCount) cartCount.textContent = String(count);
  if (!cartBody || !cartEmpty || !cartFoot || !subtotalEl || !totalEl) return;

  if (!items.length) {
    cartEmpty.style.display = 'flex';
    cartFoot.style.display = 'none';
    Array.from(cartBody.querySelectorAll('.cart-item')).forEach((el) => el.remove());
    subtotalEl.textContent = '$0';
    totalEl.textContent = '$0';
    return;
  }

  cartEmpty.style.display = 'none';
  cartFoot.style.display = 'block';
  Array.from(cartBody.querySelectorAll('.cart-item')).forEach((el) => el.remove());

  items.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'cart-item';
    const safeName = String(item.name || '').replace(/'/g, "\\'");
    row.innerHTML = `
      <div class="ci-img"><img src="${item.img || ''}" alt="${item.name || 'Blade'}"/></div>
      <div class="ci-info">
        <div class="ci-steel">${item.steel || ''}</div>
        <div class="ci-name">${item.name || ''}</div>
        <div class="ci-row">
          <div class="ci-price">$${(Number(item.price || 0) * Number(item.qty || 1)).toLocaleString()}</div>
          <button class="ci-remove ci-remove-x" onclick="removeFromCart('${safeName}')" aria-label="Remove">x</button>
        </div>
        <div class="ci-qty-slider-wrap">
          <input class="ci-qty-slider" type="range" min="1" max="10" value="${Number(item.qty || 1)}" oninput="setQtyBySlider('${safeName}', this.value)" />
          <span class="ci-qval">Qty ${Number(item.qty || 1)}</span>
        </div>
      </div>
    `;
    cartBody.appendChild(row);
  });

  subtotalEl.textContent = '$' + total.toLocaleString();
  totalEl.textContent = '$' + total.toLocaleString();
}

function removeFromCart(name) {
  const next = loadCartState().filter((item) => item.name !== name);
  saveCartState(next);
  updateCartUI();
}

function setQtyBySlider(name, qty) {
  const items = loadCartState();
  const item = items.find((entry) => entry.name === name);
  if (!item) return;
  item.qty = Math.max(1, Math.min(10, Number(qty) || 1));
  saveCartState(items);
  updateCartUI();
}

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
  window.location.href = 'order.html';
}

/* === PRODUCT RENDERING === */
function normalizeComparisonRows(rows) {
  if (Array.isArray(rows)) {
    return rows.map((row) => [row.label, row.value || '', row.other_value || '']);
  }
  return [
    ['Edge Retention', '8-10 hrs heavy use', '2-3 hrs heavy use'],
    ['Corrosion Resistance', 'Excellent', 'Poor'],
    ['Handle (Wet)', 'G10 — no slip', 'Wood — slippery'],
    ['Warranty', 'Lifetime unconditional', '1-2 years limited']
  ];
}

const __toLocalImageCache = {};

function toLocalImage(path) {
  const value = String(path || '').trim();
  if (!value) return '/assets/images/workshop-detail.png';
  if (__toLocalImageCache[value]) return __toLocalImageCache[value];

  let result;
  if (
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('data:') ||
    value.startsWith('blob:') ||
    value.startsWith('//')
  ) result = value;
  if (value.startsWith('../assets/images/')) return value.replace(/\.svg(\?|$)/i, '.png$1');
  if (value.startsWith('/assets/images/')) return value.replace(/\.svg(\?|$)/i, '.png$1');
  if (value.startsWith('/assets/products/')) return value;
  if (value.startsWith('assets/products/')) return `/${value}`;
  if (value.includes('/assets/uploads/')) {
    const fixed = value.replace('/assets/uploads/', '/assets/products/');
    return fixed.startsWith('/') ? fixed : `/${fixed.replace(/^\.\//, '')}`;
  }
  if (
    !value.startsWith('http://') &&
    !value.startsWith('https://') &&
    !value.startsWith('data:') &&
    !value.startsWith('blob:') &&
    !value.startsWith('//') &&
    !value.startsWith('..') &&
    !value.startsWith('/')
  ) {
    result = value.includes('/assets/') ? `/assets/products/${value.split('/').pop()}` : `/${value}`;
  } else {
    result = value;
  }
  __toLocalImageCache[value] = result;
  return result;
}

function imagePathFromRecord(image) {
  if (!image) return '';
  if (typeof image === 'string') return image;
  return image.image_url || image.url || image.path || image.src || '';
}

function isTrueFlag(value) {
  return value === true || value === 'true';
}

function normalizeProduct(product) {
  const images = Array.isArray(product.images) ? product.images : [];
  const primaryImageFromServer = product.thumbnail_url || product.thumbnailUrl || null;
  const primaryImageRecord = images.find((image) => image && (isTrueFlag(image.is_thumbnail) || isTrueFlag(image.isThumbnail) || isTrueFlag(image.is_primary) || isTrueFlag(image.isPrimary))) || images[0];
  const primaryImagePath = primaryImageFromServer || imagePathFromRecord(primaryImageRecord);
  const primaryImage = toLocalImage(primaryImagePath) || '/assets/images/workshop-detail.png';
  const specs = {
    blade: product.blade || '-',
    overall: product.overall || '-',
    handle: product.handle || '-',
    weight: product.weight || '-',
    grind: product.grind || '-',
    tang: product.tang || '-'
  };
  return {
    id: String(product.id),
    name: product.name || 'Unnamed',
    hook: product.description || '',
    steel: product.craft_story || product.category || '',
    price: Number(product.price || 0),
    origPrice: product.compare_price ? Number(product.compare_price) : null,
    tag: product.category || '',
    tagClass: product.featured ? 'ghost' : '',
    img: primaryImage,
    specs,
    __rawProduct: product,
    __images: images
  };
}

async function loadCatalog() {
  renderSkeletons();
  try {
    const categories = ['Hunters', 'Camp & Trail', 'Skinning Knives', 'Folding Knives'];
    const results = await Promise.all(categories.map(cat =>
      fetch(`/api/products/category/${encodeURIComponent(cat)}`).then(r => r.ok ? r.json() : [])
    ));
    categoryOrder = [];
    Object.keys(products).forEach((key) => delete products[key]);
    results.forEach((payload, i) => {
      const items = Array.isArray(payload) ? payload : (Array.isArray(payload?.data) ? payload.data : []);
      const label = categories[i];
      const key = resolveCategoryKey(label);
      if (!items.length) return;
      products[key] = items.map(normalizeProduct);
      categoryOrder.push({ key, label, description: `Browse all products in ${label}.` });
    });
    if (!activeCategory) activeCategory = categoryOrder[0]?.key || '';
    categoryOrder.forEach((entry) => {
      categoryDescriptions[entry.key] = entry.description;
    });
    document.getElementById('catDesc').textContent = categoryDescriptions[activeCategory] || `Browse all products in ${categoryLabelFromKey(activeCategory)}.`;
  } catch (error) {
    console.error('[API Error] Catalog load:', error);
    document.getElementById('catDesc').textContent = 'Products loading... Please refresh if it takes too long.';
    throw error;
  }
}

function scrollToCollectionCategories() {
  const target = document.querySelector('.cat-sec');
  if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderSkeletons() {
  const grid = document.getElementById('prodGrid');
  if (!grid) return;
  const skeleton = new Array(9).fill(0).map(() => `
      <div class="pc" aria-hidden="true">
        <div class="pc-img" style="background:linear-gradient(90deg,#0b0b0b,#111,#0b0b0b);height:18rem"></div>
      <div class="pc-body">
        <div class="pc-cat" style="height:0.6rem;width:34%;background:rgba(255,255,255,0.04);margin-bottom:0.4rem;border-radius:0.25rem"></div>
        <div class="pc-name" style="height:1.5rem;width:70%;background:rgba(255,255,255,0.04);margin-bottom:0.5rem;border-radius:0.25rem"></div>
        <div style="height:0.9rem;width:62%;background:rgba(255,255,255,0.02);margin-bottom:1rem;border-radius:0.25rem"></div>
      </div>
    </div>
  `).join('');
  grid.innerHTML = skeleton;
}

function renderGrid(category) {
  const grid = document.getElementById('prodGrid');
  const items = category ? (products[category] || []) : categoryOrder.flatMap((entry) => products[entry.key] || []);
  grid.classList.add('switching');
  const fragment = document.createDocumentFragment();
  if (items.length) {
    items.forEach(p => {
      const card = document.createElement('div');
      card.className = `pc${String(p.tag || '').toLowerCase().includes('collector') ? ' gold-card' : ''}`;
      card.innerHTML = `
        <div class="pc-img">
          <img src="${p.img}" alt="${p.name}" loading="lazy"/>
          <div class="pc-fade"></div>
          <div class="pc-tier">${p.tag}</div>
        </div>
        <div class="pc-body">
          <div class="pc-cat">${p.tag || 'Featured'}</div>
          <h3 class="pc-name">${p.name}</h3>
          <div class="pc-foot">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:0.625rem;width:100%;">
              <div>
                ${p.origPrice ? `<span class="p-orig">Regular $${p.origPrice.toLocaleString()}</span>` : ''}
                <span class="pc-price">$${p.price.toLocaleString()}</span>
              </div>
              <div style="display:flex;gap:0.5rem;flex-wrap:wrap;justify-content:flex-end;">
                <button class="pc-btn js-add-order" type="button" data-name="${escapeHtml(p.name)}" data-steel="${escapeHtml(p.steel)}" data-price="${p.price}" data-img="${escapeHtml(p.img)}">Add to Order</button>
                <a class="pc-btn" style="background:transparent;border:1px solid var(--faint);color:var(--plat);" href="product.html?id=${encodeURIComponent(p.id)}">Details</a>
              </div>
            </div>
          </div>
        </div>
      `;
      fragment.appendChild(card);
    });
  } else {
    const empty = document.createElement('p');
    empty.style.cssText = 'color:var(--silver);padding:2.5rem;text-align:center;grid-column:1/-1;';
    empty.textContent = 'No products available in this category.';
    fragment.appendChild(empty);
  }
  requestAnimationFrame(() => {
    grid.innerHTML = '';
    grid.appendChild(fragment);
    grid.classList.remove('switching');
    grid.classList.add('in');
    attachTilt();
  });
}

/* === CATEGORY TABS === */
function switchCategory(cat, btn) {
  const resolved = resolveCategoryKey(cat);
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  activeCategory = resolved;
  const descEl = document.getElementById('catDesc');
  if (descEl) {
    descEl.style.opacity = '0';
    requestAnimationFrame(() => {
      descEl.textContent = categoryDescriptions[resolved] || `Browse all products in ${categoryLabelFromKey(resolved)}.`;
      descEl.style.opacity = '1';
    });
  }
  renderGrid(resolved);
}

/* === PRODUCT MODAL === */
function openModal(category, id) {
  const p = products[category].find(x => x.id === id);
  if (!p) return;

  if (p.__rawProduct && !p.gallery) {
    const raw = p.__rawProduct;
    const images = p.__images || [];
    const gallery = images
      .map((image) => imagePathFromRecord(image))
      .map((imagePath) => toLocalImage(imagePath))
      .filter(Boolean);
    p.gallery = gallery.length ? gallery : [p.img];
    p.story = raw.craft_story || raw.description || '';
    p.useCase = raw.recommended_use || '';
    p.compare = normalizeComparisonRows(raw.comparison_rows);
    p.trustBadges = Array.isArray(raw.trust_badges) ? raw.trust_badges : ['Hand-Forged', 'Lifetime Warranty', 'Individually Tested', 'Made in USA'];
  }

  const modal = document.getElementById('p-modal');
  const content = document.getElementById('modalContent');

  content.innerHTML = `
    <div class="p-modal-grid">
      <div class="p-gallery">
        <div class="p-main-img">
          <img id="mainImg" src="${p.gallery[0]}" alt="${p.name}"/>
        </div>
        <div class="p-thumbs">
          ${p.gallery.map((g,i) => `<div class="p-thumb ${i===0?'active':''}" onclick="setMainImg('${escapeHtml(g)}',this)"><img src="${escapeHtml(g)}" alt=""/></div>`).join('')}
        </div>
      </div>
      <div class="p-info">
        <span class="tlabel">${p.tag} · ${p.steel.split('·')[0].trim()}</span>
        <h2>${p.name}<em>.</em></h2>
        <div class="p-steel-row">
          <span class="p-price">$${p.price.toLocaleString()}${p.origPrice ? `<span class="p-orig">$${p.origPrice.toLocaleString()}</span>` : ''}</span>
        </div>
        <p class="p-lead">${p.hook}</p>

        <div class="p-story">
          <h4>The Craftsmanship Story</h4>
          <p>${p.story}</p>
        </div>

        <div class="p-spec-grid">
          ${Object.entries(p.specs).map(([k,v]) => `
            <div class="p-spec-cell">
              <div class="sk">${k.charAt(0).toUpperCase()+k.slice(1)}</div>
              <div class="sv">${v}</div>
            </div>
          `).join('')}
        </div>

        <div class="p-story">
          <h4>Recommended Use Case</h4>
          <p>${p.useCase}</p>
        </div>

        <div class="p-comp">
          <h4>Forge Dominance vs. Mass-Produced</h4>
          <table class="p-comp-table">
            ${p.compare.map(row => `<tr><td>${row[0]}</td><td>${row[1]}</td><td>${row[2]}</td></tr>`).join('')}
          </table>
        </div>

        <div class="p-trust">
          ${p.trustBadges.map((badge) => `<span>${badge}</span>`).join('')}
        </div>

        <div class="p-cta-row">
          <a href="https://wa.me/${(window.BladesmithSiteSettings||{}).whatsappNumber||'923298399619'}?text=${encodeURIComponent((window.BladesmithSiteSettings||{}).whatsappMessage||'Hi Forge Dominance, I\'m interested in commissioning the '+ p.name +'.')}" target="_blank" rel="noopener" class="btn-wa">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.008-.57-.008-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            Chat on WhatsApp
          </a>
          <a href="mailto:${(window.BladesmithSiteSettings||{}).contactEmail||'orders@forgedominance.com'}?subject=Commission%20Inquiry%3A%20${encodeURIComponent(p.name)}" class="btn-email"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-10 7L2 7"/></svg>Email Inquiry</a>
        </div>
        <p class="p-note">Every blade is commissioned, not purchased. We will contact you within 2 hours to discuss specifications, timeline, and 50% deposit. No payment is taken until your build is confirmed.</p>
      </div>
    </div>
  `;
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function setMainImg(src, thumb) {
  document.getElementById('mainImg').style.opacity = '0.5';
  setTimeout(() => {
    document.getElementById('mainImg').src = src;
    document.getElementById('mainImg').style.opacity = '1';
  }, 150);
  document.querySelectorAll('.p-thumb').forEach(t => t.classList.remove('active'));
  thumb.classList.add('active');
}

function closeModal() {
  document.getElementById('p-modal').classList.remove('open');
  document.body.style.overflow = '';
}

/* === PRELOADER === */
(function(){
  const preloadEl = document.getElementById('preloader');
  const pctEl = document.getElementById('plp');
  if (!preloadEl || !pctEl) return;

  let p = 0;
  let done = false;

  const finish = () => {
    if (done) return;
    done = true;
    p = 100;
    pctEl.textContent = '100%';
    preloadEl.classList.add('out');
  };

  const iv = setInterval(() => {
    if (done) return;
    p = Math.min(95, p + Math.floor(Math.random() * 7) + 2);
    pctEl.textContent = p + '%';
  }, 90);

  const onReady = () => {
    if (done) return;
    clearInterval(iv);
    const completeTimer = setInterval(() => {
      p = Math.min(100, p + 5);
      pctEl.textContent = p + '%';
      if (p >= 100) {
        clearInterval(completeTimer);
        setTimeout(finish, 180);
      }
    }, 45);
  };

  if (document.readyState === 'complete') {
    onReady();
  } else {
    window.addEventListener('load', onReady, { once: true });
  }

  setTimeout(() => {
    clearInterval(iv);
    finish();
  }, 6000);
})();

/* === CHAT WIDGET === */
const CHAT_ENDPOINT = '/api/chat';
const CHAT_STORAGE_KEY = 'bs_chat_history';
const CHAT_POLL_MS = 12000;
let chatPollInterval = null;
let chatSending = false;

function getChatVisitorId() {
  let id = localStorage.getItem('bs_visitor_id');
  if (!id) { id = 'v-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10); localStorage.setItem('bs_visitor_id', id); }
  return id;
}
function readChatHistory() { try { return JSON.parse(localStorage.getItem(CHAT_STORAGE_KEY)) || []; } catch(e) { return []; } }
function saveChatHistory(h) { localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(h.slice(-20))); }

function appendChatBubble(role, text) {
  const body = document.getElementById('chatBody');
  if (!body) return;
  const div = document.createElement('div');
  div.className = 'chat-bubble ' + (role === 'user' ? 'me' : 'them');
  div.textContent = text;
  body.appendChild(div);
  body.scrollTop = body.scrollHeight;
}

function toggleChat() {
  const widget = document.getElementById('chat-widget');
  if (!widget) return;
  const opening = !widget.classList.contains('open');
  widget.classList.toggle('open', opening);
  const sc = document.getElementById('sticky-contact');
  if (sc) sc.classList.toggle('chat-open', opening);
  if (opening) startChatPolling();
}

async function sendChat() {
  if (chatSending) return;
  const input = document.getElementById('chatInput');
  if (!input) return;
  const txt = input.value.trim();
  if (!txt) return;
  chatSending = true;
  const history = readChatHistory();
  const next = [...history, { role: 'user', text: txt }].slice(-20);
  appendChatBubble('user', txt);
  saveChatHistory(next);
  input.value = '';
  try {
    const resp = await fetch(CHAT_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: txt, visitorId: getChatVisitorId(), history: next, page: window.location.pathname }) });
    const data = await resp.json().catch(() => ({}));
    const reply = String(data?.reply || '').trim();
    if (reply) { appendChatBubble('assistant', reply); saveChatHistory([...next, { role: 'assistant', text: reply }]); }
  } catch(e) {
    const fallback = 'Thanks for reaching out. We will reply shortly.';
    appendChatBubble('assistant', fallback);
    saveChatHistory([...next, { role: 'assistant', text: fallback }]);
  }
  chatSending = false;
}

async function pollChatReplies() {
  try {
    const resp = await fetch(`${CHAT_ENDPOINT}/poll/${encodeURIComponent(getChatVisitorId())}`);
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) return;
    const msgs = Array.isArray(data?.messages) ? data.messages : [];
    if (!msgs.length) return;
    const history = readChatHistory();
    msgs.forEach(m => { const t = String(m?.message || '').trim(); if (t) { appendChatBubble('assistant', t); history.push({ role: 'assistant', text: t }); } });
    saveChatHistory(history);
    const badge = document.querySelector('.chat-badge');
    if (badge) { badge.textContent = msgs.length; badge.style.display = 'flex'; }
  } catch(e) {}
}

function startChatPolling() {
  if (chatPollInterval) clearInterval(chatPollInterval);
  pollChatReplies();
  chatPollInterval = setInterval(pollChatReplies, CHAT_POLL_MS);
}

function renderChatHistory() {
  const body = document.getElementById('chatBody');
  if (!body) return;
  const history = readChatHistory();
  if (history.length) { body.innerHTML = ''; history.forEach(h => appendChatBubble(h.role, h.text)); }
}
renderChatHistory();
startChatPolling();
document.addEventListener('click', function(e) {
  const widget = document.getElementById('chat-widget');
  if (!widget || !widget.classList.contains('open')) return;
  if (widget.contains(e.target) || e.target.closest('.sc-fab.chat')) return;
  widget.classList.remove('open');
});

/* === ANIMATIONS & EFFECTS === */
document.addEventListener('click', function(e) {
  if (window.innerWidth > 768) return;
  const img = e.target.closest('.pc-img');
  if (!img) return;
  const card = img.closest('.pc');
  if (!card) return;
  const link = card.querySelector('a[href*="product.html"]');
  if (link) window.location.href = link.href;
});

document.addEventListener('click', function(e) {
  const btn = e.target.closest('.js-add-order');
  if (!btn) return;
  e.preventDefault();
  addBladeToOrder(btn.dataset.name, btn.dataset.steel, btn.dataset.price, btn.dataset.img);
});

let navOpen = false;
function toggleMobNav() {
  navOpen = !navOpen;
  const mobNav = document.getElementById('mob-nav');
  const navHam = document.querySelector('.nav-ham');
  if (mobNav) mobNav.classList.toggle('open', navOpen);
  if (navHam) navHam.classList.toggle('open', navOpen);
  document.body.classList.toggle('nav-open', navOpen);
  document.body.style.overflow = navOpen ? 'hidden' : '';
}

document.querySelectorAll('#mob-nav .mob-link').forEach(link => {
  link.addEventListener('click', () => {
    if (navOpen) toggleMobNav();
  });
});

const obs = new IntersectionObserver(es => {
  es.forEach(e => { if(e.isIntersecting){ e.target.classList.add('in'); obs.unobserve(e.target); } });
}, { threshold: 0.09 });
document.querySelectorAll('.rv,.rv-s').forEach(el => obs.observe(el));

window.addEventListener('scroll', () => {
  document.getElementById('nav').classList.toggle('solid', scrollY > 60);
  const bg = document.getElementById('plpHeroBg');
  if (bg) bg.style.transform = `translateY(${scrollY * 0.28}px) scale(1.05)`;
}, { passive: true });

let __tiltDelegationActive = false;

function attachTilt() {
  if (__tiltDelegationActive) return;
  __tiltDelegationActive = true;

  const grid = document.getElementById('prodGrid');
  if (!grid) return;

  grid.addEventListener('mousemove', e => {
    const card = e.target.closest('.pcard');
    if (!card) return;
    const r = card.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - .5;
    const y = (e.clientY - r.top) / r.height - .5;
    card.style.transform = `perspective(56.25rem) rotateY(${x*5}deg) rotateX(${-y*5}deg) translateY(-0.25rem)`;
  });

  grid.addEventListener('mouseleave', e => {
    const card = e.target.closest('.pcard');
    if (!card) return;
    card.style.transition = 'transform .5s ease';
    card.style.transform = '';
    setTimeout(() => card.style.transition = '', 500);
  }, true);
}

/* === INITIALIZATION === */
loadCatalog()
  .then(() => {
    const fromUrl = readInitialCategory();
    activeCategory = fromUrl || categoryOrder[0]?.key || '';
    syncCategoryButtons();
    document.getElementById('catDesc').textContent = categoryDescriptions[activeCategory] || `Browse all products in ${categoryLabelFromKey(activeCategory)}.`;
    renderGrid(activeCategory);
    updateCartUI();
    if (fromUrl) {
      requestAnimationFrame(() => scrollToCollectionCategories());
    }
  })
  .catch((error) => {
    console.error('[API Error] Failed to load products:', error);
    document.getElementById('prodGrid').innerHTML = '<p style="color:var(--silver);padding:2.5rem;text-align:center;grid-column:1/-1;">Products are temporarily unavailable. Please try again.</p>';
  });

try {
  if (window.bsTracker && typeof window.bsTracker.trackEvent === 'function') {
    window.bsTracker.trackEvent('pageview', { page: 'plp' });
  } else {
    const visitorId = (() => {
      const key = 'bs_visitor_id';
      let id = localStorage.getItem(key);
      if (!id) {
        id = 'v-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
        localStorage.setItem(key, id);
      }
      return id;
    })();
    const pageStart = Date.now();
    fetch('/api/visitors/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitorId, path: window.location.pathname + window.location.search, action: 'pageview', meta: { page: 'plp' } }),
      keepalive: true
    }).catch(() => {});
    window.addEventListener('beforeunload', () => {
      fetch('/api/visitors/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorId, path: window.location.pathname + window.location.search, action: 'leave', meta: { durationMs: Date.now() - pageStart } }),
        keepalive: true
      }).catch(() => {});
    });
  }
} catch (e) { console.debug('Tracker init error', e); }
