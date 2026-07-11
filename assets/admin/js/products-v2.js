    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", async () => {
        await AuthService.logout();
        window.location.href = "/admin/login.html";
      });
    }

// admin/products-v2.js
// Externalized script for admin/products-v2.html
// Depends on /admin/api-service.js (TokenManager, ProductsService, UploadsService, requireAuth)

(function(){
  try { requireAuth(); } catch(e) { console.warn('Auth required'); }

  const statusEl = document.getElementById('status');
  const featuredList = document.getElementById('featured-list');
  const allList = document.getElementById('all-list');
  const panelFeatured = document.getElementById('panel-featured');
  const panelAll = document.getElementById('panel-all');
  const tabs = Array.from(document.querySelectorAll('.tab'));
  const addModal = document.getElementById('add-modal');
  const addForm = document.getElementById('add-form');
  const previewEl = document.getElementById('preview');
  const modalTitle = document.getElementById('modal-title');
  const submitBtn = document.getElementById('btn-submit');
  const featuredSaveBtn = document.getElementById('featured-save-btn');
  const featuredResetBtn = document.getElementById('featured-reset-btn');
  const categoryFilter = document.getElementById('category-filter');

  const CATEGORY_OPTIONS = ['Hunters', 'Camp & Trail', 'Skinning Knives', 'Folding Knives'];

  let editingId = null;
  let stagedFiles = []; // File objects selected for upload
  let stagedImagesMeta = []; // {url, sort_order, is_thumbnail, alt_text}
  let catalogProducts = [];
  let catalogLoaded = false;
  let catalogLoadPromise = null;
  let featuredDraft = new Map();
  let featuredBaseline = new Map();
  let allProductsFilter = 'all';

  function setStatus(text, isError){
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.style.color = isError ? '#a00' : '#333';
    if (typeof Toast !== 'undefined' && text && text !== 'Ready' && !text.startsWith('Loading')) {
      if (isError) Toast.error(text);
      else if (text.startsWith('Saved') || text.startsWith('Deleted') || text.includes('saved')) Toast.success(text);
      else if (text.includes('pending') || text.includes('failed')) Toast.warning(text);
    }
  }

  function setFieldValue(id, value) {
    const field = document.getElementById(id);
    if (!field) return;
    field.value = value ?? '';
  }

  function stringifyJsonField(value) {
    if (value === undefined || value === null || value === '') return '';
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return '';
      return trimmed;
    }
    try {
      return JSON.stringify(value, null, 2);
    } catch (_error) {
      return '';
    }
  }

  function parseJsonField(rawValue) {
    const text = String(rawValue ?? '').trim();
    if (!text) return undefined;
    try {
      return JSON.parse(text);
    } catch (_error) {
      return text;
    }
  }

  async function loadFeatured(){
    return loadCatalog();
  }

  async function loadAll(){
    return loadCatalog();
  }

  function normalizeProductsResponse(response) {
    if (Array.isArray(response?.data)) return response.data;
    if (Array.isArray(response?.items)) return response.items;
    if (Array.isArray(response)) return response;
    return [];
  }

  async function loadCatalog(forceRefresh = false) {
    if (catalogLoadPromise && !forceRefresh) return catalogLoadPromise;
    if (catalogLoaded && !forceRefresh) {
      renderFeatured(catalogProducts);
      renderAll(catalogProducts);
      return catalogProducts;
    }

    catalogLoadPromise = (async () => {
      setStatus('Loading products...');
      try {
        const res = await ProductsService.getAll(1, 1000);
        catalogProducts = normalizeProductsResponse(res);
        catalogLoaded = true;
        featuredBaseline = new Map(catalogProducts.map((product) => [String(product.id), !!product.featured]));
        if (!featuredDraft.size || forceRefresh) {
          featuredDraft = new Map(featuredBaseline);
        }
        rebuildCategoryFilter();
        renderFeatured(catalogProducts);
        renderAll(catalogProducts);
        setStatus(`Products loaded (${catalogProducts.length})`);
        return catalogProducts;
      } catch (err) {
        catalogLoaded = false;
        setStatus('Error loading products: ' + (err.message || err), true);
        featuredList.textContent = 'Error loading featured.';
        allList.textContent = 'Error loading products.';
        return [];
      } finally {
        catalogLoadPromise = null;
      }
    })();

    return catalogLoadPromise;
  }

  function renderFeatured(products){
    const items = (products || []).slice().sort((a, b) => Number(!!b.featured) - Number(!!a.featured) || String(a.name || '').localeCompare(String(b.name || '')));
    if (!items.length) { featuredList.innerHTML = '<div class="empty-state">No products found.</div>'; return; }
    const html = items.map(p => {
      const img = (p.thumbnail_url || (p.images && p.images[0] && p.images[0].image_url)) || '/assets/images/placeholder.png';
      const draftFeatured = featuredDraft.has(String(p.id)) ? featuredDraft.get(String(p.id)) : !!p.featured;
      return `<div class="featured-product-card"><img src="${img}" alt="" class="featured-product-thumb"/><div class="featured-product-content"><div class="featured-product-header"><div class="featured-product-info"><strong class="featured-product-name">${escapeHtml(p.name || p.title || 'Untitled')}</strong><div class="featured-product-meta">${escapeHtml(p.category || '')}${p.sku ? ' • ' + escapeHtml(p.sku) : ''}${p.price !== undefined && p.price !== null ? ' • $' + Number(p.price).toFixed(2) : ''}</div></div><label class="featured-toggle"><input type="checkbox" data-id="${p.id}" data-action="featured-draft" ${draftFeatured ? 'checked' : ''}/> Featured</label></div><div class="featured-product-description">${escapeHtml(String(p.description || '').slice(0, 110))}${String(p.description || '').length > 110 ? '…' : ''}</div></div></div>`;
    }).join('\n');
    featuredList.innerHTML = html;
    featuredList.querySelectorAll('input[data-action="featured-draft"]').forEach(cb => cb.addEventListener('change', onFeaturedDraftToggle));
  }

  function renderAll(products){
    const visible = (products || []).filter((product) => allProductsFilter === 'all' || (allProductsFilter === '__uncategorized__' ? !product.category : String(product.category || '') === String(allProductsFilter)));
    if (!visible.length) { allList.innerHTML = '<div class="small">No products found.</div>'; return; }
    const rows = visible.map(p => {
      const img = (p.thumbnail_url || (p.images && p.images[0] && p.images[0].image_url)) || '/assets/images/placeholder.png';
      const isFeatured = featuredDraft.has(String(p.id)) ? featuredDraft.get(String(p.id)) : !!p.featured;
      return `<div class="product-row"><img src="${img}" class="product-row-thumb" alt="${escapeHtml(p.name || p.title || '')}"/><div class="product-row-info"><div class="product-row-name">${escapeHtml(p.name || p.title || '')}</div><div class="product-row-meta">${escapeHtml(p.category || '')}${p.sku ? ' • ' + escapeHtml(p.sku) : ''}${p.price !== undefined && p.price !== null ? ' • $' + Number(p.price).toFixed(2) : ''}</div></div><div class="product-row-controls"><label class="featured-toggle" style="font-size:0.8rem;"><input type="checkbox" data-id="${p.id}" data-action="featured-draft" ${isFeatured ? 'checked' : ''}/> Featured</label><button class="btn btn-secondary" data-id="${p.id}" data-action="edit">Edit</button><button class="btn btn-danger" data-id="${p.id}" data-action="delete">Delete</button></div></div>`;
    }).join('');
    allList.innerHTML = rows;

    // Attach event handlers
    allList.querySelectorAll('button[data-action="edit"]').forEach(btn => btn.addEventListener('click', onEditClick));
    allList.querySelectorAll('button[data-action="delete"]').forEach(btn => btn.addEventListener('click', onDeleteClick));
    allList.querySelectorAll('input[data-action="featured-draft"]').forEach(cb => cb.addEventListener('change', onFeaturedDraftToggle));
  }

  function escapeHtml(str){ return String(str || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"})[c]); }

  // Sort Order panel elements
  const panelSortOrder = document.getElementById('panel-sort-order');
  const sortCategoryFilter = document.getElementById('sort-category-filter');
  const sortOrderList = document.getElementById('sort-order-list');
  const sortSaveBtn = document.getElementById('sort-save-btn');
  const sortResetBtn = document.getElementById('sort-reset-btn');
  let sortOrderDraft = [];
  let sortOrderBaseline = [];
  let sortActiveCategory = 'Hunters';

  // Tab switching
  const allPanels = [panelFeatured, panelAll, panelSortOrder].filter(Boolean);
  tabs.forEach(t => t.addEventListener('click', () => {
    tabs.forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    const tab = t.getAttribute('data-tab');
    allPanels.forEach(p => p.classList.remove('active'));
    if (tab === 'featured') panelFeatured.classList.add('active');
    else if (tab === 'all') panelAll.classList.add('active');
    else if (tab === 'sort-order') {
      if (panelSortOrder) panelSortOrder.classList.add('active');
      loadSortOrderPanel();
    }
  }));

  document.getElementById('btn-add').addEventListener('click', () => openAddModal());
  const closeBtn = document.getElementById('btn-close-modal');
  if (closeBtn) closeBtn.addEventListener('click', () => closeAddModal());
  const cancelBtn = document.getElementById('btn-cancel');
  if (cancelBtn) cancelBtn.addEventListener('click', () => closeAddModal());
  if (featuredSaveBtn) featuredSaveBtn.addEventListener('click', onSaveFeatured);
  if (featuredResetBtn) featuredResetBtn.addEventListener('click', onResetFeatured);
  function rebuildCategoryFilter() {
    if (!categoryFilter) return;
    const existing = categoryFilter.value || 'all';
    categoryFilter.innerHTML = '<option value="all">All Categories</option>';
    const seen = new Set();
    CATEGORY_OPTIONS.forEach((c) => seen.add(c));
    catalogProducts.forEach((p) => { if (p.category && !seen.has(p.category)) seen.add(p.category); });
    Array.from(seen).sort().forEach((c) => {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      categoryFilter.appendChild(opt);
    });
    const hasUncategorized = catalogProducts.some((p) => !p.category);
    if (hasUncategorized) {
      const opt = document.createElement('option');
      opt.value = '__uncategorized__';
      opt.textContent = '(Uncategorized)';
      categoryFilter.appendChild(opt);
    }
    categoryFilter.value = existing;
  }

  if (categoryFilter) {
    rebuildCategoryFilter();
    categoryFilter.addEventListener('change', () => {
      allProductsFilter = categoryFilter.value || 'all';
      renderAll(catalogProducts);
    });
  }

  async function loadCategoryOptions(selected) {
    const select = document.getElementById('category');
    if (!select) return;
    select.innerHTML = '<option value="">-- Select category --</option>';
    CATEGORY_OPTIONS.forEach((c) => {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      select.appendChild(opt);
    });
    if (selected) select.value = selected;
  }

  async function openAddModal(product = null){
    editingId = product ? product.id : null;
    if (modalTitle) modalTitle.textContent = editingId ? 'Edit Product' : 'Add New Product';
    if (submitBtn) submitBtn.textContent = editingId ? 'Update Product' : 'Create Product';
    setFieldValue('title', product?.name || product?.title || '');
    setFieldValue('sku', product?.sku || '');
    setFieldValue('price', product?.price ?? '');
    setFieldValue('compare_price', product?.compare_price ?? '');
    setFieldValue('stock', product?.stock ?? '');
    // populate category select then set value
    await loadCategoryOptions(product?.category || '');
    setFieldValue('description', product?.description || '');
    setFieldValue('craft_story', product?.craft_story || '');
    setFieldValue('recommended_use', product?.recommended_use || '');
    setFieldValue('blade', product?.blade || '');
    setFieldValue('overall', product?.overall || '');
    setFieldValue('handle', product?.handle || '');
    setFieldValue('weight', product?.weight || '');
    setFieldValue('grind', product?.grind || '');
    setFieldValue('tang', product?.tang || '');
    setFieldValue('comparison_rows', stringifyJsonField(product?.comparison_rows));
    setFieldValue('trust_badges', stringifyJsonField(product?.trust_badges));
    setFieldValue('features', stringifyJsonField(product?.features));
    setFieldValue('specifications', stringifyJsonField(product?.specifications));
    setFieldValue('descriptions', stringifyJsonField(product?.descriptions));
    setFieldValue('variants', stringifyJsonField(product?.variants));
    setFieldValue('display_options', stringifyJsonField(product?.display_options));
    document.getElementById('featured').checked = !!product?.featured;
    stagedFiles = [];
    stagedImagesMeta = (product?.images || []).map(img => ({ url: img.image_url || img.url || img.path || img.imageUrl || '', sort_order: img.sort_order || 0, is_thumbnail: !!img.is_thumbnail, alt_text: img.alt_text || null }));
    stagedImagesMeta = normalizeThumbnailSelection(stagedImagesMeta);
    renderStagedImages();
    addModal.classList.add('active');
    addModal.setAttribute('aria-hidden', 'false');
  }

  function closeAddModal(){
    editingId = null;
    if (modalTitle) modalTitle.textContent = 'Add New Product';
    if (submitBtn) submitBtn.textContent = 'Create Product';
    addModal.classList.remove('active');
    addModal.setAttribute('aria-hidden', 'true');
    addForm.reset();
    stagedFiles = [];
    stagedImagesMeta = [];
    renderStagedImages();
  }

  // Handle file selection (allow multiple)
  addForm.image.addEventListener('change', (ev) => {
    const files = Array.from(ev.target.files || []);
    if (!files.length) return;
    // Append to stagedFiles and show previews
    stagedFiles = stagedFiles.concat(files);
    // create temporary preview entries for files (url only)
    for (const f of files) {
      const url = URL.createObjectURL(f);
      stagedImagesMeta.push({ url, is_thumbnail: stagedImagesMeta.length === 0, sort_order: stagedImagesMeta.length, alt_text: null, __file: true });
    }
    renderStagedImages();
  });

  function renderStagedImages(){
    if (!previewEl) return;
    previewEl.innerHTML = '';
    if (!stagedImagesMeta.length) { previewEl.innerHTML = '<div style="grid-column:1/-1;color:var(--text-tertiary);">No images staged</div>'; return; }

    stagedImagesMeta.forEach((img, idx) => {
      const item = document.createElement('div');
      item.className = 'image-item';

      const imageEl = document.createElement('img');
      imageEl.src = img.url;
      imageEl.alt = img.alt_text || `Image ${idx+1}`;
      item.appendChild(imageEl);

      const toolbar = document.createElement('div');
      toolbar.className = 'image-item-toolbar';

      const upBtn = document.createElement('button'); upBtn.className = 'image-item-btn'; upBtn.textContent = '↑'; upBtn.title = 'Move up';
      const downBtn = document.createElement('button'); downBtn.className = 'image-item-btn'; downBtn.textContent = '↓'; downBtn.title = 'Move down';
      const thumbBtn = document.createElement('button'); thumbBtn.className = 'image-item-btn'; thumbBtn.textContent = img.is_thumbnail ? '★' : '☆'; thumbBtn.title = 'Set as thumbnail';
      const removeBtn = document.createElement('button'); removeBtn.className = 'image-item-btn'; removeBtn.textContent = '✕'; removeBtn.title = 'Remove image'; removeBtn.style.background = 'rgba(200,30,30,0.95)';

      toolbar.appendChild(upBtn);
      toolbar.appendChild(downBtn);
      toolbar.appendChild(thumbBtn);
      toolbar.appendChild(removeBtn);
      item.appendChild(toolbar);

      // button handlers
      upBtn.addEventListener('click', () => {
        if (idx <= 0) return;
        const a = stagedImagesMeta.splice(idx,1)[0]; stagedImagesMeta.splice(idx-1,0,a);
        stagedImagesMeta = stagedImagesMeta.map((m,i)=>({ ...m, sort_order: i }));
        renderStagedImages();
      });

      downBtn.addEventListener('click', () => {
        if (idx >= stagedImagesMeta.length-1) return;
        const a = stagedImagesMeta.splice(idx,1)[0]; stagedImagesMeta.splice(idx+1,0,a);
        stagedImagesMeta = stagedImagesMeta.map((m,i)=>({ ...m, sort_order: i }));
        stagedImagesMeta = normalizeThumbnailSelection(stagedImagesMeta);
        renderStagedImages();
      });

      thumbBtn.addEventListener('click', () => {
        stagedImagesMeta = stagedImagesMeta.map((m,i)=>({ ...m, is_thumbnail: i===idx }));
        renderStagedImages();
      });

      removeBtn.addEventListener('click', () => {
        stagedImagesMeta.splice(idx,1);
        stagedImagesMeta = stagedImagesMeta.map((m,i)=>({ ...m, sort_order: i }));
        stagedImagesMeta = normalizeThumbnailSelection(stagedImagesMeta);
        renderStagedImages();
      });

      previewEl.appendChild(item);
    });
  }

  function normalizeThumbnailSelection(images) {
    if (!Array.isArray(images) || !images.length) return [];
    const selectedIndex = images.findIndex((img) => img && img.is_thumbnail);
    const activeIndex = selectedIndex >= 0 ? selectedIndex : 0;
    return images.map((img, index) => ({ ...img, is_thumbnail: index === activeIndex }));
  }

  function markFeaturedDraftState(id, value) {
    featuredDraft.set(String(id), !!value);
  }

  function currentFeaturedState(id) {
    const key = String(id);
    return featuredDraft.has(key) ? featuredDraft.get(key) : !!featuredBaseline.get(key);
  }

  function hasFeaturedDraftChanges() {
    const keys = new Set([...featuredDraft.keys(), ...featuredBaseline.keys()]);
    for (const key of keys) {
      if (!!featuredDraft.get(key) !== !!featuredBaseline.get(key)) return true;
    }
    return false;
  }

  async function onFeaturedDraftToggle(ev) {
    const cb = ev.currentTarget;
    const id = cb.getAttribute('data-id');
    if (!id) return;
    markFeaturedDraftState(id, cb.checked);
    setStatus(hasFeaturedDraftChanges() ? 'Featured changes pending' : 'Featured list synced');
  }

  async function onSaveFeatured() {
    const changes = [];
    for (const [id, originalValue] of featuredBaseline.entries()) {
      const draftValue = currentFeaturedState(id);
      if (draftValue !== originalValue) changes.push({ id, featured: draftValue });
    }

    if (!changes.length) {
      setStatus('No featured changes to save');
      return;
    }

    try {
      setStatus(`Saving ${changes.length} featured changes...`);
      for (const change of changes) {
        await ProductsService.update(change.id, { featured: change.featured });
      }
      featuredBaseline = new Map([...featuredDraft.entries()]);
      catalogProducts = catalogProducts.map((product) => {
        const key = String(product.id);
        return Object.prototype.hasOwnProperty.call(Object.fromEntries(featuredDraft.entries()), key)
          ? { ...product, featured: featuredDraft.get(key) }
          : product;
      });
      renderFeatured(catalogProducts);
      renderAll(catalogProducts);
      setStatus('Featured products saved');
    } catch (err) {
      setStatus('Failed to save featured changes: ' + (err.message || err), true);
    }
  }

  async function onResetFeatured() {
    featuredDraft = new Map(featuredBaseline);
    renderFeatured(catalogProducts);
    setStatus('Featured changes reset');
  }

  async function uploadStagedFiles(){
    stagedImagesMeta = normalizeThumbnailSelection(stagedImagesMeta);
    if (!stagedFiles.length) return stagedImagesMeta.filter(i=>!i.__file).map(i=>({ image_url: i.url, sort_order: i.sort_order, is_thumbnail: i.is_thumbnail, alt_text: i.alt_text }));
    const uploaded = await Promise.all(stagedFiles.map((file, index) => {
      setStatus(`Uploading image ${index + 1}/${stagedFiles.length}...`);
      return UploadsService.uploadImage(file).then((res) => res?.url || res?.data?.url || res?.path || res?.data?.path || (res?.data && res.data[0] && res.data[0].url) || null);
    }));

    let uploadIndex = 0;
    const final = stagedImagesMeta.map(meta => {
      if (meta.__file) {
        const url = uploaded[uploadIndex++];
        return { image_url: url, sort_order: meta.sort_order, is_thumbnail: !!meta.is_thumbnail, alt_text: meta.alt_text || null };
      }
      return { image_url: meta.url, sort_order: meta.sort_order, is_thumbnail: !!meta.is_thumbnail, alt_text: meta.alt_text || null };
    });
    return final;
  }

  let isSaving = false;
  addForm.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (isSaving) return;
    isSaving = true;
    if (submitBtn) submitBtn.disabled = true;
    const fd = new FormData(addForm);
    // Only send fields that are known to exist in the products table to avoid schema errors.
    // Allowed list mirrors safe listing in backend models: name, sku, price, compare_price, stock,
    // category, description, featured, craft_story, blade, overall, handle, weight, grind, tang
    const raw = {
      name: fd.get('title') || '',
      sku: fd.get('sku') || '',
      price: fd.get('price') ? Number(fd.get('price')) : null,
      compare_price: fd.get('compare_price') ? Number(fd.get('compare_price')) : null,
      stock: fd.get('stock') ? Number(fd.get('stock')) : 0,
      category: fd.get('category') || '',
      description: fd.get('description') || '',
      featured: addForm.featured.checked,
      craft_story: fd.get('craft_story') || '',
      blade: fd.get('blade') || '',
      overall: fd.get('overall') || '',
      handle: fd.get('handle') || '',
      weight: fd.get('weight') || '',
      grind: fd.get('grind') || '',
      tang: fd.get('tang') || '',
      recommended_use: fd.get('recommended_use') || '',
      comparison_rows: parseJsonField(fd.get('comparison_rows')) || null,
      trust_badges: parseJsonField(fd.get('trust_badges')) || null,
      features: parseJsonField(fd.get('features')) || null,
      specifications: parseJsonField(fd.get('specifications')) || null,
      descriptions: parseJsonField(fd.get('descriptions')) || null,
      variants: parseJsonField(fd.get('variants')) || null,
      display_options: parseJsonField(fd.get('display_options')) || null
    };

    if (raw.price && raw.price > 99999999) {
      setStatus('Price is too large (max 99,999,999.99)', true);
      isSaving = false;
      if (submitBtn) submitBtn.disabled = false;
      return;
    }
    if (raw.compare_price && raw.compare_price > 99999999) {
      setStatus('Compare price is too large (max 99,999,999.99)', true);
      isSaving = false;
      if (submitBtn) submitBtn.disabled = false;
      return;
    }

    const payload = {
      name: raw.name || null,
      sku: raw.sku || null,
      price: raw.price,
      compare_price: raw.compare_price,
      stock: raw.stock,
      category: raw.category || null,
      description: raw.description || null,
      featured: raw.featured,
      craft_story: raw.craft_story || null,
      blade: raw.blade || null,
      overall: raw.overall || null,
      handle: raw.handle || null,
      weight: raw.weight || null,
      grind: raw.grind || null,
      tang: raw.tang || null,
      recommended_use: raw.recommended_use || null,
      comparison_rows: raw.comparison_rows,
      trust_badges: raw.trust_badges,
      features: raw.features,
      specifications: raw.specifications,
      descriptions: raw.descriptions,
      variants: raw.variants,
      display_options: raw.display_options
    };
    payload.images = [];

    try {
      setStatus('Preparing images...');
      const finalImages = await uploadStagedFiles();
      payload.images = (finalImages || []).map((img, idx) => ({ image_url: img.image_url || img.url || img.path || img.imageUrl || '', sort_order: idx, is_thumbnail: !!img.is_thumbnail, alt_text: img.alt_text || null }));

      setStatus(editingId ? 'Updating product...' : 'Creating product...');
      if (editingId) {
        await ProductsService.update(editingId, payload);
      } else {
        await ProductsService.create(payload);
      }

      setStatus('Saved. Refreshing...');
      closeAddModal();
      try { await loadCatalog(true); } catch (_e) { setStatus('Product saved but list refresh failed. Reload the page.'); }
    } catch (err) {
      setStatus('Error saving product: ' + (err.message || err), true);
    } finally {
      isSaving = false;
      if (submitBtn) submitBtn.disabled = false;
    }
  });

  async function onEditClick(ev){
    const id = ev.currentTarget.getAttribute('data-id');
    if (!id) return;
    setStatus('Loading product...');
    try {
      const res = await ProductsService.getById(id);
      const p = res?.data || res || {};
      openAddModal(p);
      setStatus('Loaded product');
    } catch (err) {
      setStatus('Error loading product: ' + (err.message || err), true);
    }
  }

  async function onDeleteClick(ev){
    const id = ev.currentTarget.getAttribute('data-id');
    if (!id) return;
    if (!confirm('Delete product? This cannot be undone.')) return;
    try {
      await ProductsService.delete(id);
      setStatus('Deleted. Refreshing...');
      await loadCatalog(true);
    } catch (err) {
      setStatus('Delete failed: ' + (err.message || err), true);
    }
  }


  window.openAddModal = openAddModal;
  window.closeAddModal = closeAddModal;

  // ===== SORT ORDER PANEL =====
  function loadSortOrderPanel() {
    if (!sortOrderList) return;
    const category = sortCategoryFilter ? sortCategoryFilter.value : 'Hunters';
    sortActiveCategory = category;
    const filtered = catalogProducts
      .filter(p => p.category === category)
      .sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0));
    sortOrderBaseline = filtered.map(p => String(p.id));
    sortOrderDraft = [...sortOrderBaseline];
    renderSortCards(filtered);
  }

  function renderSortCards(items) {
    if (!sortOrderList) return;
    if (!items.length) {
      sortOrderList.innerHTML = '<div class="empty-state">No products in this category.</div>';
      return;
    }
    sortOrderList.innerHTML = items.map((p, idx) => {
      const img = (p.thumbnail_url || (p.images && p.images[0] && p.images[0].image_url)) || '/assets/images/placeholder.png';
      return `<div class="sort-card" data-id="${p.id}" draggable="true"><span class="sort-card-order">${idx + 1}</span><img src="${img}" class="sort-card-thumb" alt=""/><div class="sort-card-info"><div class="sort-card-name">${escapeHtml(p.name || '')}</div><div class="sort-card-meta">${p.price != null ? '$' + Number(p.price).toFixed(2) : ''}</div></div><span class="sort-card-handle">⠿</span></div>`;
    }).join('');
    attachSortDrag();
  }

  // Drag-and-drop (desktop + touch)
  let _dragCard = null, _dragId = null, _touchClone = null, _touchOver = null;

  function attachSortDrag() {
    sortOrderList.querySelectorAll('.sort-card').forEach(card => {
      card.addEventListener('dragstart', sdStart);
      card.addEventListener('dragend', sdEnd);
      card.addEventListener('dragover', sdOver);
      card.addEventListener('dragenter', sdEnter);
      card.addEventListener('dragleave', sdLeave);
      card.addEventListener('drop', sdDrop);
      card.addEventListener('touchstart', stStart, { passive: false });
      card.addEventListener('touchmove', stMove, { passive: false });
      card.addEventListener('touchend', stEnd);
    });
  }

  function sdStart(e) {
    _dragCard = e.currentTarget;
    _dragId = _dragCard.dataset.id;
    _dragCard.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', _dragId);
  }
  function sdEnd() {
    if (_dragCard) _dragCard.classList.remove('dragging');
    sortOrderList.querySelectorAll('.drag-over').forEach(c => c.classList.remove('drag-over'));
    _dragCard = null; _dragId = null;
  }
  function sdOver(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }
  function sdEnter(e) { e.preventDefault(); if (e.currentTarget !== _dragCard) e.currentTarget.classList.add('drag-over'); }
  function sdLeave(e) { e.currentTarget.classList.remove('drag-over'); }
  function sdDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    if (!_dragId || e.currentTarget === _dragCard) return;
    reorderDraft(_dragId, e.currentTarget.dataset.id);
  }

  function stStart(e) {
    const card = e.currentTarget;
    _dragCard = card; _dragId = card.dataset.id;
    _touchClone = card.cloneNode(true);
    _touchClone.style.cssText = 'position:fixed;z-index:9999;pointer-events:none;opacity:0.85;width:' + card.offsetWidth + 'px;transform:scale(1.03);box-shadow:0 0.5rem 2rem rgba(212,80,10,0.3);';
    const r = card.getBoundingClientRect();
    _touchClone.style.left = r.left + 'px';
    _touchClone.style.top = r.top + 'px';
    document.body.appendChild(_touchClone);
    card.classList.add('dragging');
    e.preventDefault();
  }
  function stMove(e) {
    if (!_touchClone) return;
    e.preventDefault();
    const t = e.touches[0];
    const r = _dragCard.getBoundingClientRect();
    _touchClone.style.top = (t.clientY - r.height / 2) + 'px';
    _touchClone.style.display = 'none';
    const el = document.elementFromPoint(t.clientX, t.clientY);
    _touchClone.style.display = '';
    const target = el ? el.closest('.sort-card') : null;
    if (_touchOver && _touchOver !== target) _touchOver.classList.remove('drag-over');
    if (target && target !== _dragCard) { target.classList.add('drag-over'); _touchOver = target; }
  }
  function stEnd() {
    if (_touchClone) { document.body.removeChild(_touchClone); _touchClone = null; }
    if (_dragCard) _dragCard.classList.remove('dragging');
    if (_touchOver && _touchOver !== _dragCard) {
      reorderDraft(_dragId, _touchOver.dataset.id);
      _touchOver.classList.remove('drag-over');
    }
    _dragCard = null; _dragId = null; _touchOver = null;
  }

  function reorderDraft(fromId, toId) {
    const from = sortOrderDraft.indexOf(String(fromId));
    const to = sortOrderDraft.indexOf(String(toId));
    if (from === -1 || to === -1) return;
    sortOrderDraft.splice(from, 1);
    sortOrderDraft.splice(to, 0, String(fromId));
    const reordered = sortOrderDraft.map(id => catalogProducts.find(p => String(p.id) === id)).filter(Boolean);
    renderSortCards(reordered);
  }

  if (sortCategoryFilter) sortCategoryFilter.addEventListener('change', loadSortOrderPanel);

  if (sortSaveBtn) sortSaveBtn.addEventListener('click', async () => {
    if (!sortOrderDraft.length) return;
    try {
      setStatus('Saving sort order...');
      const ids = sortOrderDraft.map(id => parseInt(id, 10) || id);
      await ProductsService.updateSortOrder(sortActiveCategory, ids);
      sortOrderDraft.forEach((id, idx) => {
        const p = catalogProducts.find(x => String(x.id) === id);
        if (p) p.sort_order = idx + 1;
      });
      sortOrderBaseline = [...sortOrderDraft];
      setStatus('Sort order saved');
    } catch (err) {
      setStatus('Failed to save: ' + (err.message || err), true);
    }
  });

  if (sortResetBtn) sortResetBtn.addEventListener('click', () => {
    sortOrderDraft = [...sortOrderBaseline];
    const reordered = sortOrderDraft.map(id => catalogProducts.find(p => String(p.id) === id)).filter(Boolean);
    renderSortCards(reordered);
    setStatus('Sort order reset');
  });

  (function init(){
    if (featuredSaveBtn) featuredSaveBtn.disabled = false;
    if (featuredResetBtn) featuredResetBtn.disabled = false;
    loadCatalog().then(() => setStatus('Ready'));
  })();

})();


