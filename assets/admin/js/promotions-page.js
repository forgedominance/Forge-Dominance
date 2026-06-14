/* promotions-page.js — Admin promotions management */
    const promotionsSummary = document.getElementById('promotionsSummary');
    let campaignCouponCatalog = [];
    const defaultReviewSection = {
      enabled: true,
      title: "Hunters Don't Lie",
      subtitle: 'From the Field',
      layout: 'stacked',
      reviews: [
        {
          name: 'Marcus W.',
          role: 'Wilderness Guide · Fairbanks, Alaska · Verified Buyer',
          quote: "I've been a hunting guide in Alaska for 22 years. I've carried every blade that matters — Bark River, Busse, White River. The Forge Dominance Hunter Pro sits next to all of them. The edge geometry is unlike anything I've held. After three seasons of hard use, it still shaves hair off my arm without touching a strop.",
          avatar: 'assets/uploads/reviews/avatar-marcus.png',
          rating: 5
        },
        {
          name: 'Jason T.',
          role: 'Outfitter · Bozeman, Montana',
          quote: 'Three elk hunts, two deer, one bear. Same knife. Never sharpened. Still terrifyingly sharp. I\'ve recommended Forge Dominance to every guide I know and I\'ll keep recommending it.',
          avatar: 'assets/uploads/reviews/avatar-jason.png',
          rating: 5
        },
        {
          name: 'Dale R.',
          role: 'Ranch Owner · Amarillo, Texas',
          quote: 'Bought the Heritage Elite for my son\'s first hunt. He cried. The certificate, the sheath, the blade finish — this is an heirloom, not a knife. Worth every penny and more.',
          avatar: 'assets/uploads/reviews/avatar-dale.png',
          rating: 5
        }
      ]
    };
    let reviewSectionState = null;

    function normalizeReviewSection(section) {
      const input = section && typeof section === 'object' ? section : {};
      const reviews = Array.isArray(input.reviews) ? input.reviews : defaultReviewSection.reviews;
      const normalizeReviewImagePath = (value) => {
        const raw = String(value || '').trim();
        if (!raw) return '';
        const normalized = raw.replace(/^\/?assets\/images\//i, '/assets/uploads/reviews/').replace(/^\/?assets\/reviews\//i, '/assets/uploads/reviews/').replace(/^\/?uploads\/reviews\//i, '/assets/uploads/reviews/');
        return normalized.startsWith('/') ? normalized : `/${normalized}`;
      };
      return {
        enabled: input.enabled !== undefined ? !!input.enabled : defaultReviewSection.enabled,
        title: String(input.title || defaultReviewSection.title).trim(),
        subtitle: String(input.subtitle || defaultReviewSection.subtitle).trim(),
        layout: ['stacked', 'grid'].includes(String(input.layout || '').toLowerCase()) ? String(input.layout).toLowerCase() : defaultReviewSection.layout,
        reviews: reviews.map((review) => ({
          name: String(review?.name || '').trim(),
          role: String(review?.role || '').trim(),
          quote: String(review?.quote || '').trim(),
          avatar: normalizeReviewImagePath(review?.avatar || ''),
          rating: Math.max(1, Math.min(5, Number(review?.rating || 5) || 5))
        })).filter((review) => review.name || review.quote)
      };
    }

    function normalizeReviewImageUrl(value) {
      const raw = String(value || '').trim();
      if (!raw) return '';
      if (raw.startsWith('data:') || raw.startsWith('blob:') || raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('//')) {
        return raw;
      }
      const normalized = raw.startsWith('/') ? raw.slice(1) : raw;
      const converted = normalized.replace(/^assets\/images\//i, 'assets/uploads/reviews/').replace(/^assets\/reviews\//i, 'assets/uploads/reviews/').replace(/^uploads\/reviews\//i, 'assets/uploads/reviews/');
      return `/${converted.replace(/^\/+/, '')}`;
    }

    function renderReviewCard(review, index, large = false) {
      const stars = new Array(Math.max(1, Math.min(5, Number(review.rating || 5) || 5))).fill('<span>★</span>').join('');
      const avatar = normalizeReviewImageUrl(review.avatar || '');
      return `
        <div class="review-card-shell">
          <div class="tc${large ? ' lg' : ''}" style="margin:0;padding:0;border:0;background:transparent;box-shadow:none">
            <div class="ts">${stars}</div>
            <p class="tq">"${escapeHtml(review.quote || '')}"</p>
            <div class="ta">
              <img class="tav" src="${escapeHtml(avatar || '/assets/uploads/reviews/avatar-marcus.png')}" alt="${escapeHtml(review.name || 'Review')}">
              <div>
                <div class="tn">${escapeHtml(review.name || '')}</div>
                <div class="tl">${escapeHtml(review.role || '')}</div>
              </div>
            </div>
          </div>
          <div class="review-card-actions">
            <button class="btn btn-secondary" type="button" onclick="openReviewEditor(${index})">Edit</button>
            <button class="btn btn-danger" type="button" onclick="deleteReview(${index})">Delete</button>
          </div>
        </div>`;
    }

    function setReviewToggle(enabled) {
      const toggle = document.getElementById('reviews-enabled-toggle');
      if (!toggle) return;
      const isOn = !!enabled;
      toggle.dataset.state = isOn ? 'on' : 'off';
      toggle.classList.toggle('is-on', isOn);
      toggle.textContent = isOn ? 'Review Section: On' : 'Review Section: Off';
    }

    function getReviewToggleState() {
      const toggle = document.getElementById('reviews-enabled-toggle');
      if (!toggle) return defaultReviewSection.enabled;
      return toggle.dataset.state !== 'off';
    }

    function populateReviewForm(section) {
      const title = document.getElementById('reviews-title');
      const subtitle = document.getElementById('reviews-subtitle');
      const layout = document.getElementById('reviews-layout');
      setReviewToggle(section.enabled !== false);
      if (title) title.value = section.title || '';
      if (subtitle) subtitle.value = section.subtitle || '';
      if (layout) layout.value = section.layout || 'stacked';
    }

    function renderReviewPreview(section) {
      const preview = document.getElementById('reviews-preview');
      if (!preview) return;
      if (section.enabled === false) {
        preview.innerHTML = '<div class="empty-state">Review section disabled.</div>';
        return;
      }

      const reviews = Array.isArray(section.reviews) ? section.reviews : [];
      if (!reviews.length) {
        preview.innerHTML = '<div class="empty-state">No reviews configured.</div>';
        return;
      }

      if (String(section.layout || 'stacked').toLowerCase() === 'grid') {
        preview.style.display = 'grid';
        preview.style.gridTemplateColumns = 'repeat(auto-fit, minmax(18rem, 1fr))';
        preview.style.gap = '1rem';
        preview.innerHTML = reviews.map((review, index) => renderReviewCard(review, index, false)).join('');
        return;
      }

      preview.style.display = 'grid';
      preview.style.gridTemplateColumns = 'minmax(0, 1.1fr) minmax(0, 0.9fr)';
      preview.style.gap = '1rem';
      const leading = reviews[0];
      const trailing = reviews.slice(1, 3);
      preview.innerHTML = `${renderReviewCard(leading, 0, true)}<div style="display:flex;flex-direction:column;gap:1rem">${trailing.map((review, offset) => renderReviewCard(review, offset + 1, false)).join('')}</div>`;
    }

    async function loadReviews() {
      const preview = document.getElementById('reviews-preview');
      if (preview) preview.innerHTML = '<div class="empty-state">Loading reviews...</div>';
      try {
        const res = await SettingsService.getAll();
        const settings = res?.data || res || {};
        reviewSectionState = normalizeReviewSection(settings.reviewSection || defaultReviewSection);
        populateReviewForm(reviewSectionState);
        renderReviewPreview(reviewSectionState);
        promotionsSummary.textContent = `${reviewSectionState.reviews.length} reviews`;
      } catch (e) {
        console.error('Load reviews error:', e);
        reviewSectionState = normalizeReviewSection(defaultReviewSection);
        populateReviewForm(reviewSectionState);
        renderReviewPreview(reviewSectionState);
        if (preview) preview.innerHTML = `<div style="padding:1rem;color:var(--error-400)">${escapeHtml(e.message || 'Load failed')}</div>`;
      }
    }

    async function saveReviews() {
      const enabled = getReviewToggleState();
      const title = document.getElementById('reviews-title')?.value.trim() || defaultReviewSection.title;
      const subtitle = document.getElementById('reviews-subtitle')?.value.trim() || defaultReviewSection.subtitle;
      const layout = document.getElementById('reviews-layout')?.value || defaultReviewSection.layout;
      const reviews = Array.isArray(reviewSectionState?.reviews) ? reviewSectionState.reviews : [];

      const payload = {
        reviewSection: normalizeReviewSection({ enabled, title, subtitle, layout, reviews })
      };

      const btn = document.getElementById('reviews-save');
      btn.disabled = true;
      btn.textContent = 'Saving...';
      try {
        await SettingsService.update(payload);
        Toast.success('Reviews saved');
        reviewSectionState = payload.reviewSection;
        renderReviewPreview(reviewSectionState);
        promotionsSummary.textContent = `${reviewSectionState.reviews.length} reviews`;
      } catch (error) {
        console.error('Save reviews error:', error);
        Toast.error('Save failed: ' + (error.message || 'Unknown error'));
      } finally {
        btn.disabled = false;
        btn.textContent = 'Save Reviews';
      }
    }

    function resetReviews() {
      reviewSectionState = normalizeReviewSection(defaultReviewSection);
      populateReviewForm(reviewSectionState);
      renderReviewPreview(reviewSectionState);
    }

    function openReviewEditor(index) {
      const modal = document.getElementById('review-modal');
      if (!modal) return;
      const reviews = reviewSectionState?.reviews || [];
      const review = reviews[index] || { name: '', role: '', quote: '', avatar: '', rating: 5 };
      modal.dataset.index = String(index);
      document.getElementById('edit-name').value = review.name || '';
      document.getElementById('edit-role').value = review.role || '';
      document.getElementById('edit-quote').value = review.quote || '';
      const avatar = (review.avatar || '').replace(/^\/?assets\/images\//i, 'assets/uploads/reviews/').replace(/^\/?assets\/reviews\//i, 'assets/uploads/reviews/');
      document.getElementById('edit-avatar').value = avatar;
      document.getElementById('edit-rating').value = String(review.rating || 5);
      const preview = document.getElementById('edit-avatar-preview');
      if (preview) {
        preview.innerHTML = avatar ? `<img src="${escapeHtml(avatar)}" alt="Review avatar" style="width:100%;height:100%;object-fit:cover;display:block" />` : '';
      }
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
      document.getElementById('edit-name')?.focus();
    }

    function closeReviewEditor() {
      const modal = document.getElementById('review-modal');
      if (!modal) return;
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
      modal.dataset.index = '';
    }

    async function uploadReviewAvatar(file) {
      if (!file) return;
      const uploadButton = document.getElementById('edit-avatar-upload-btn');
      const preview = document.getElementById('edit-avatar-preview');
      if (uploadButton) {
        uploadButton.disabled = true;
        uploadButton.textContent = 'Uploading...';
      }
      try {
        const result = await UploadsService.uploadReviewImage(file);
        const imageUrl = result?.data?.url || result?.url || '';
        if (!imageUrl) throw new Error('No image URL returned');
        document.getElementById('edit-avatar').value = imageUrl.replace(/^\//, '');
        if (preview) {
          preview.innerHTML = `<img src="${escapeHtml(imageUrl)}" alt="Review avatar" style="width:100%;height:100%;object-fit:cover;display:block" />`;
        }
        Toast.success('Avatar uploaded');
      } catch (error) {
        Toast.error('Upload failed: ' + (error.message || 'Unknown error'));
      } finally {
        if (uploadButton) {
          uploadButton.disabled = false;
          uploadButton.textContent = 'Upload Image';
        }
      }
    }

    function applyReviewEdit() {
      const modal = document.getElementById('review-modal');
      if (!modal) return;
      const idx = Number(modal.dataset.index);
      const name = document.getElementById('edit-name').value.trim();
      const role = document.getElementById('edit-role').value.trim();
      const quote = document.getElementById('edit-quote').value.trim();
      const avatar = document.getElementById('edit-avatar').value.trim();
      const rating = Math.max(1, Math.min(5, parseInt(document.getElementById('edit-rating').value || '5', 10)));
      reviewSectionState = reviewSectionState || { reviews: [] };
      reviewSectionState.reviews = reviewSectionState.reviews || [];
      if (Number.isFinite(idx) && idx >= 0 && idx < reviewSectionState.reviews.length) {
        reviewSectionState.reviews[idx] = { name, role, quote, avatar, rating };
      } else {
        reviewSectionState.reviews.push({ name, role, quote, avatar, rating });
      }
      renderReviewPreview(reviewSectionState);
      closeReviewEditor();
    }

    function addNewReview() {
      reviewSectionState = reviewSectionState || { reviews: [] };
      reviewSectionState.reviews = reviewSectionState.reviews || [];
      const idx = reviewSectionState.reviews.length;
      openReviewEditor(idx);
    }

    function deleteReview(index) {
      if (!confirm('Delete this review?')) return;
      reviewSectionState = reviewSectionState || { reviews: [] };
      reviewSectionState.reviews = reviewSectionState.reviews || [];
      if (index >= 0 && index < reviewSectionState.reviews.length) {
        reviewSectionState.reviews.splice(index, 1);
      }
      renderReviewPreview(reviewSectionState);
      promotionsSummary.textContent = `${reviewSectionState.reviews.length} reviews`;
    }

    document.addEventListener('click', function (e) {
      if (e.target && e.target.id === 'reviews-enabled-toggle') {
        const nextState = !getReviewToggleState();
        setReviewToggle(nextState);
        reviewSectionState = reviewSectionState || normalizeReviewSection(defaultReviewSection);
        reviewSectionState.enabled = nextState;
        renderReviewPreview(reviewSectionState);
        saveReviews();
      }
      if (e.target && e.target.id === 'review-save') applyReviewEdit();
      if (e.target && (e.target.id === 'review-cancel' || e.target.id === 'review-cancel-cta')) closeReviewEditor();
      if (e.target && e.target.id === 'review-add-btn') addNewReview();
      if (e.target && e.target.id === 'edit-avatar-upload-btn') {
        document.getElementById('edit-avatar-file')?.click();
      }
      if (e.target && e.target.id === 'review-modal') closeReviewEditor();
    });

    document.addEventListener('change', function (e) {
      if (e.target && e.target.id === 'edit-avatar-file') {
        const file = e.target.files && e.target.files[0];
        if (file) uploadReviewAvatar(file);
        e.target.value = '';
      }
      if (e.target && e.target.id === 'campaign-coupon') {
        const preview = document.getElementById('campaign-coupon-preview');
        const coupon = campaignCouponCatalog.find((item) => String(item.id) === String(e.target.value) || String(item.code) === String(e.target.value));
        if (preview) {
          preview.innerHTML = coupon
            ? `<span>Will attach <strong>${escapeHtml(coupon.code || '')}</strong> to this campaign.</span>`
            : '<span>No coupon attached.</span>';
        }
      }
    });

    document.addEventListener('input', function (e) {
      if (e.target && e.target.id === 'edit-avatar') {
        const preview = document.getElementById('edit-avatar-preview');
        const value = String(e.target.value || '').trim();
        if (preview) {
          preview.innerHTML = value ? `<img src="${escapeHtml(value)}" alt="Review avatar" style="width:100%;height:100%;object-fit:cover;display:block" />` : '';
        }
      }
      if (e.target && e.target.id === 'campaign-coupon') {
        const preview = document.getElementById('campaign-coupon-preview');
        const coupon = campaignCouponCatalog.find((item) => String(item.id) === String(e.target.value) || String(item.code) === String(e.target.value));
        if (preview) {
          preview.innerHTML = coupon
            ? `<span>Will attach <strong>${escapeHtml(coupon.code || '')}</strong> to this campaign.</span>`
            : '<span>No coupon attached.</span>';
        }
      }
    });
    
    // Pre-define all functions before init
    function switchTab(name){
      document.querySelectorAll('.tab-content').forEach(t=>t.classList.remove('active'));
      document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
      const t=document.getElementById(name+'-tab'); if(t) t.classList.add('active');
      const b=document.querySelector('.tab-btn[data-tab="'+name+'"]'); if(b) b.classList.add('active');
      // load content
      if(name==='ads'){ loadAds(); loadAdProductOptions(); }
      if(name==='coupons'){ loadCoupons(); }
      if(name==='reviews'){ loadReviews(); }
      if(name==='campaigns'){ loadRecipients(); loadCoupons(); }
    }

    // --- Ads ---
    let adImageFile = null;
    document.getElementById('ad-image-drop').addEventListener('click', ()=>document.getElementById('ad-image-input').click());
    document.getElementById('ad-image-input').addEventListener('change', (e)=>{ const f=e.target.files[0]; if(!f) return; adImageFile=f; const reader=new FileReader(); reader.onload=(ev)=>{ document.getElementById('ad-image-preview').innerHTML=`<img src="${ev.target.result}" style="max-width:100%;height:auto"/>`; }; reader.readAsDataURL(f); });

    // Product selector for ad — loads products and auto-fills fields
    let adProductCatalog = [];
    async function loadAdProductOptions() {
      const select = document.getElementById('ad-product');
      if (!select) return;
      try {
        const res = await ProductsService.getAll(1, 200);
        const products = Array.isArray(res?.data) ? res.data : (Array.isArray(res?.products) ? res.products : []);
        adProductCatalog = products;
        select.innerHTML = '<option value="">None — use custom image</option>' +
          products.map(p => `<option value="${p.id}">${escapeHtml(p.name || 'Untitled')} — $${Number(p.price||0).toFixed(2)}</option>`).join('');
      } catch (e) {
        console.error('Failed to load products for ad selector:', e);
      }
    }
    document.getElementById('ad-product').addEventListener('change', (e) => {
      const productId = e.target.value;
      if (!productId) return;
      const product = adProductCatalog.find(p => String(p.id) === String(productId));
      if (!product) return;
      const titleInput = document.getElementById('ad-title');
      const priceInput = document.getElementById('ad-price');
      const comparePriceInput = document.getElementById('ad-compare-price');
      const preview = document.getElementById('ad-image-preview');
      if (titleInput && !titleInput.value.trim()) titleInput.value = product.name || '';
      if (priceInput && !priceInput.value) priceInput.value = product.price || '';
      if (comparePriceInput && !comparePriceInput.value && product.compare_price) comparePriceInput.value = product.compare_price;
      const thumb = product.thumbnail_url || product.thumbnail || (product.images && product.images[0] && (product.images[0].image_url || product.images[0])) || '';
      if (thumb && preview) {
        const imgUrl = thumb.startsWith('/') ? thumb : '/' + thumb;
        preview.innerHTML = `<img src="${escapeHtml(imgUrl)}" style="max-width:100%;height:auto;border-radius:0.5rem"/>`;
        adImageFile = '__product_thumbnail__';
        preview.dataset.productImage = imgUrl;
      }
    });
    document.getElementById('ad-reset').addEventListener('click', ()=>{
      document.getElementById('ad-title').value='';
      document.getElementById('ad-description').value='';
      document.getElementById('ad-badge').value='';
      document.getElementById('ad-kicker').value='';
      document.getElementById('ad-cta-label').value='';
      document.getElementById('ad-price').value='';
      document.getElementById('ad-compare-price').value='';
      document.getElementById('ad-perk-1').value='';
      document.getElementById('ad-perk-2').value='';
      document.getElementById('ad-perk-3').value='';
      document.getElementById('ad-url').value='';
      document.getElementById('ad-image-preview').innerHTML='';
      document.getElementById('ad-product').value='';
      adImageFile=null;
    });

    async function loadAds(){
      const tbody=document.getElementById('ads-list'); tbody.innerHTML='<tr><td colspan="6" style="padding:1rem;color:var(--text-tertiary)">Loading...</td></tr>';
      try{
        const res = await PromotionsService.getAds();
        const ads = (Array.isArray(res?.data)?res.data:(Array.isArray(res)?res:[]));
        promotionsSummary.textContent = `${ads.length} ads`;
        if(!ads.length){ tbody.innerHTML='<tr><td colspan="6" style="padding:1rem;color:var(--text-tertiary)">No ads</td></tr>'; return }
        const normalizeImageUrl = (value) => {
          const raw = String(value || '').trim();
          if (!raw) return '';
          if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('data:') || raw.startsWith('/')) return raw;
          return `/${raw.replace(/^\/+/, '')}`;
        };
        tbody.innerHTML = ads.map(a=>{
          const src = normalizeImageUrl(a.image_url || a.image_path);
          const img = src ? `<img src="${escapeHtml(src)}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'120\' height=\'60\'%3E%3Crect width=\'120\' height=\'60\' fill=\'%23111111\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' dominant-baseline=\'middle\' text-anchor=\'middle\' fill=\'%23d4500a\' font-size=\'10\' font-family=\'Arial\'%3ENo Preview</text%3E%3C/svg%3E'" style="width:5rem;height:2.5rem;object-fit:cover"/>` : '—';
          const previewUrl = a.image_url || a.image_path || '—';
          const description = String(a.description || a.notes || '').trim();
          const badge = String(a.badge || '').trim();
          const kicker = String(a.kicker || '').trim();
          const ctaLabel = String(a.cta_label || a.ctaLabel || '').trim();
          const priceVal = Number(a.price || 0);
          const compareVal = Number(a.compare_price || a.comparePrice || 0);
          const price = Number.isFinite(priceVal) && priceVal > 0 ? priceVal.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '';
          const compare = Number.isFinite(compareVal) && compareVal > 0 ? compareVal.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '';
          const perks = [a.perk_1, a.perk_2, a.perk_3].map(v => String(v || '').trim()).filter(Boolean);
          const offerBits = [];
          if (badge) offerBits.push(`<div style="font-size:0.68rem;text-transform:uppercase;letter-spacing:0.12em;color:#f2b35b">${escapeHtml(badge)}</div>`);
          if (kicker) offerBits.push(`<div style="font-size:0.78rem;color:var(--text-secondary)">${escapeHtml(kicker)}</div>`);
          if (description) offerBits.push(`<div style="font-size:0.85rem;line-height:1.5;color:var(--text-primary)">${escapeHtml(description)}</div>`);
          if (price || compare) offerBits.push(`<div style="font-size:0.85rem;color:var(--text-secondary)"><strong>$${escapeHtml(price || '—')}</strong>${compare ? ` <span style=\"text-decoration:line-through;color:var(--text-tertiary)\">$${escapeHtml(compare)}</span>` : ''}</div>`);
          if (ctaLabel) offerBits.push(`<div style="font-size:0.75rem;color:var(--text-tertiary)">CTA: ${escapeHtml(ctaLabel)}</div>`);
          if (perks.length) offerBits.push(`<div style="font-size:0.75rem;color:var(--text-tertiary)">Perks: ${escapeHtml(perks.join(' • '))}</div>`);
          const offerHtml = offerBits.length ? offerBits.join('') : '<div style="color:var(--text-tertiary)">—</div>';
          return `<tr><td>${img}<div style="font-size:0.6875rem;color:var(--text-tertiary);margin-top:0.25rem;word-break:break-all">${escapeHtml(String(previewUrl))}</div></td><td>${escapeHtml(a.title||'-')}</td><td style="max-width:18rem;white-space:normal;line-height:1.4">${offerHtml}</td><td>${escapeHtml(a.click_url||'-')}</td><td>${escapeHtml(a.status||'active')}</td><td><button class="btn btn-secondary" data-id="${a.id}" onclick="deleteAd('${a.id}')">Delete</button></td></tr>`;
        }).join('');
      }catch(e){ console.error('Load ads error:', e); tbody.innerHTML=`<tr><td colspan="6" style="padding:1rem;color:var(--error-400);">${escapeHtml(e.message||'Load failed')}</td></tr>` }
    }

    async function deleteAd(id){ if(!confirm('Delete ad?')) return; try{ await PromotionsService.deleteAd(id); Toast.success('Deleted'); loadAds(); }catch(e){ console.error('Delete ad error:', e); Toast.error('Delete failed: ' + e.message); } }

    document.getElementById('ad-save').addEventListener('click', async ()=>{
      const title=document.getElementById('ad-title').value.trim();
      const description=document.getElementById('ad-description').value.trim();
      const badge=document.getElementById('ad-badge').value.trim();
      const kicker=document.getElementById('ad-kicker').value.trim();
      const ctaLabel=document.getElementById('ad-cta-label').value.trim();
      const priceValue=parseFloat(document.getElementById('ad-price').value);
      const compareValue=parseFloat(document.getElementById('ad-compare-price').value);
      const perk1=document.getElementById('ad-perk-1').value.trim();
      const perk2=document.getElementById('ad-perk-2').value.trim();
      const perk3=document.getElementById('ad-perk-3').value.trim();
      const url=document.getElementById('ad-url').value.trim();
      if(!adImageFile){ Toast.error('Select an image or link a product'); return }
      const btn=document.getElementById('ad-save'); btn.disabled=true; btn.textContent='Saving...';
      try{
        let imageUrl = '';
        let imagePath = null;
        if (adImageFile === '__product_thumbnail__') {
          imageUrl = document.getElementById('ad-image-preview')?.dataset?.productImage || '';
          if (!imageUrl) { throw new Error('No product thumbnail available'); }
          imagePath = imageUrl.startsWith('/') ? imageUrl.slice(1) : imageUrl;
        } else {
          const up = await UploadsService.uploadAdImage(adImageFile);
          imageUrl = up?.data?.url || up?.url || up?.image_url || (up?.result?.url) || '';
          imagePath = up?.data?.path || up?.path || null;
          if(!imageUrl){ throw new Error('No image URL returned from upload'); }
        }
        const payload = {
          title,
          description,
          notes: description,
          click_url: url,
          image_url: imageUrl,
          image_path: imagePath,
          status: 'active',
          badge: badge || null,
          kicker: kicker || null,
          cta_label: ctaLabel || null,
          price: Number.isFinite(priceValue) && priceValue > 0 ? priceValue : null,
          compare_price: Number.isFinite(compareValue) && compareValue > 0 ? compareValue : null,
          perk_1: perk1 || null,
          perk_2: perk2 || null,
          perk_3: perk3 || null
        };
        const res = await PromotionsService.createAd(payload);
        Toast.success('Ad created'); document.getElementById('ad-reset').click(); loadAds();
      }catch(e){ console.error('Create ad error:', e); Toast.error('Create failed: ' + e.message); }
      finally{ btn.disabled=false; btn.textContent='Save Ad'; }
    });

    // --- Coupons ---
    async function loadCoupons(){ 
      const tbody=document.getElementById('coupons-list'); 
      tbody.innerHTML='<tr><td colspan="5" style="padding:1rem;color:var(--text-tertiary)">Loading...</td></tr>'; 
      try{ 
        const res=await PromotionsService.getCoupons();
        const coupons = (Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : [])); 
        campaignCouponCatalog = coupons;
        renderCampaignCouponOptions(coupons);
        promotionsSummary.textContent=`${coupons.length} coupons`; 
        if(!coupons.length){ tbody.innerHTML='<tr><td colspan="5" style="padding:1rem;color:var(--text-tertiary)">No coupons</td></tr>'; return } 
        tbody.innerHTML = coupons.map(c=>`<tr><td>${escapeHtml(c.code||'-')}</td><td>${escapeHtml(c.coupon_type||'-')}</td><td>${escapeHtml(String(c.amount||'-'))}</td><td>${formatDate(c.expires_at||c.updated_at||c.created_at)}</td><td><button class="btn btn-danger" onclick="deleteCoupon('${c.id}')">Delete</button></td></tr>`).join(''); 
      }catch(e){ 
        console.error('Load coupons error:', e);
        campaignCouponCatalog = [];
        renderCampaignCouponOptions([]);
        tbody.innerHTML=`<tr><td colspan="5" style="padding:1rem;color:var(--error-400);">${escapeHtml(e.message||'Load failed')}</td></tr>` 
      } 
    }

    function renderCampaignCouponOptions(coupons) {
      const select = document.getElementById('campaign-coupon');
      const preview = document.getElementById('campaign-coupon-preview');
      if (!select) return;

      const activeCoupons = (Array.isArray(coupons) ? coupons : []).filter((coupon) => coupon && coupon.is_active !== false);
      if (!activeCoupons.length) {
        select.innerHTML = '<option value="">No active coupons available</option>';
        select.disabled = true;
        if (preview) preview.innerHTML = '<span>No active coupons available yet.</span>';
        return;
      }

      select.disabled = false;
      select.innerHTML = [
        '<option value="">No coupon attached</option>',
        ...activeCoupons.map((coupon) => {
          const code = String(coupon.code || '').trim();
          const amount = coupon.coupon_type === 'fixed'
            ? `$${Number(coupon.amount || 0).toFixed(2)}`
            : `${Number(coupon.amount || 0)}%`;
          const expires = coupon.expires_at ? ` · Expires ${formatDate(coupon.expires_at)}` : '';
          return `<option value="${escapeHtml(String(coupon.id || code))}">${escapeHtml(code)} · ${escapeHtml(amount)}${escapeHtml(expires)}</option>`;
        })
      ].join('');

      if (preview) {
        preview.innerHTML = '<span>Select a coupon to attach it to the campaign email.</span>';
      }
    }

    function buildCampaignCouponHtml(coupon) {
      if (!coupon) return '';
      const amount = coupon.coupon_type === 'fixed'
        ? `$${Number(coupon.amount || 0).toFixed(2)}`
        : `${Number(coupon.amount || 0)}%`;
      const expiresText = coupon.expires_at ? `Expires: ${formatDate(coupon.expires_at)}` : '';
      const notesText = coupon.notes ? String(coupon.notes).trim() : '';

      // Simple, email-client friendly table with clear coupon code and CTA
      // Compact dark inline coupon block with zero top/bottom margins and minimal paddings
      return `
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0;padding:0;border-collapse:collapse;">
          <tr>
            <td align="center" style="padding:0;margin:0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:520px;width:100%;border-collapse:collapse;background:transparent;margin:0;padding:0;">
                <tr>
                  <td style="padding:0;margin:0;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#0b0b0b;border-radius:6px;border:1px solid rgba(255,255,255,0.04);overflow:hidden;margin:0;padding:0;">
                      <tr>
                        <td style="padding:3px 5px 1px 5px;text-align:left;color:#fff;font-family:Arial,Helvetica,sans-serif;margin:0;">
                          <div style="font-size:9px;color:#C8A96E;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;margin:0;padding:0">Special Offer</div>
                          <div style="font-size:14px;color:#ffffff;font-weight:800;margin:2px 0 0 0;line-height:1.02;word-break:break-word">${escapeHtml(coupon.code || '')}</div>
                          <div style="font-size:10px;color:#D6D6D6;margin:1px 0 0 0;line-height:1.05">${escapeHtml(amount)}${expiresText ? ' · ' + escapeHtml(expiresText) : ''}</div>
                          <div style="margin:2px 0 0 0;font-size:11px;color:#D6D6D6;line-height:1.1">${escapeHtml(notesText || 'Use this code at checkout to claim your discount.')}</div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:2px 5px 4px 5px;text-align:center;background:transparent;margin:0;">
                          <a href="https://forgeddominance.com/?coupon=${encodeURIComponent(String(coupon.code || ''))}" style="display:inline-block;background:#F06020;color:#050505;padding:5px 9px;text-decoration:none;border-radius:999px;font-weight:800;font-size:12px;line-height:1;text-align:center;">Apply Coupon</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>`;
    }
    
    async function deleteCoupon(id){ 
      if(!confirm('Delete coupon?')) return; 
      try{ 
        await PromotionsService.deleteCoupon(id); 
        Toast.success('Deleted'); 
        loadCoupons(); 
      }catch(e){ 
        console.error('Delete coupon error:', e);
        Toast.error('Delete failed: ' + e.message); 
      } 
    }
    
    document.getElementById('coupon-save').addEventListener('click', async ()=>{ 
      const code=document.getElementById('coupon-code').value.trim(); 
      const type=document.getElementById('coupon-type').value; 
      const amount=parseFloat(document.getElementById('coupon-amount').value)||0; 
      const expires=document.getElementById('coupon-expires').value||null; 
      const limit=parseInt(document.getElementById('coupon-limit').value)||null; 
      if(!code){ Toast.error('Enter code'); return } 
      const btn=document.getElementById('coupon-save'); 
      btn.disabled=true; 
      btn.textContent='Creating...'; 
      try{ 
        const payload = { code, coupon_type: type, amount, usage_limit: limit, expires_at: expires, is_active: true };
        const res = await PromotionsService.createCoupon(payload);
        Toast.success('Coupon created'); 
        document.getElementById('coupon-reset').click(); 
        loadCoupons(); 
      }catch(e){ 
        console.error('Create coupon error:', e); 
        Toast.error('Create failed: ' + e.message); 
      } finally{ 
        btn.disabled=false; 
        btn.textContent='Create Coupon'; 
      } 
    });

    // --- Campaigns / Recipients ---
    let recipients = new Map();
    let orderEmails = [];
    let commissionEmails = [];
    let currentCampaignRows = [];
    
    async function loadRecipients(){
      const el=document.getElementById('recipients-list'); 
      el.innerHTML='<div style="padding:1rem;color:var(--text-tertiary)">Loading recipients...</div>'; 
      try{
        // Load both orders and commissions
        const [ordersRes, commRes] = await Promise.all([
          OrdersService.getAll(1,1000).catch(()=>({})), 
          CommissionService.getAll(1,1000).catch(()=>({}))
        ]);
        
        // Extract emails
        orderEmails = [];
        if(ordersRes?.data || ordersRes?.orders){
          const rows = Array.isArray(ordersRes?.data)?ordersRes.data:(ordersRes?.orders||[]);
          orderEmails = Array.from(new Set(rows.map(o=>o.email||o.customer_email).filter(Boolean)));
        }
        
        commissionEmails = [];
        if(commRes?.data || commRes?.commissions){
          const rows = Array.isArray(commRes?.data)?commRes.data:(commRes?.commissions||[]);
          commissionEmails = Array.from(new Set(rows.map(c=>c.email).filter(Boolean)));
        }
        
        renderRecipients();
        updateRecipientCount();
      }catch(e){ 
        console.error('Load recipients error:', e);
        el.innerHTML='<div style="padding:1rem;color:var(--error-400)">Failed to load recipients</div>'; 
      }
    }

    function renderRecipients(){
      const el = document.getElementById('recipients-list');
      let html = '';
      
      // Orders section
      if(orderEmails.length > 0){
        html += `<div style="border-bottom:0.0625rem solid var(--border-color);padding:0">
          <div style="padding:0.75rem;background:rgba(212,80,10,0.08);font-weight:600;display:flex;justify-content:space-between;align-items:center">
            <span>📋 Orders (${orderEmails.length})</span>
            <button class="btn btn-secondary" style="padding:0.3rem 0.6rem;font-size:0.75rem" id="select-all-orders">Select All</button>
          </div>
          <div style="padding:0.5rem">`;
        orderEmails.forEach(email => {
          const isSelected = recipients.has(email);
          html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:0.375rem;border-bottom:0.0625rem solid rgba(255,255,255,0.03)">
            <div style="font-size:0.8125rem">${escapeHtml(email)}</div>
            <input type="checkbox" class="recipient-checkbox" data-email="${escapeHtml(email)}" data-source="orders" ${isSelected?'checked':''} />
          </div>`;
        });
        html += '</div></div>';
      }
      
      // Commissions section
      if(commissionEmails.length > 0){
        html += `<div style="border-bottom:0.0625rem solid var(--border-color);padding:0">
          <div style="padding:0.75rem;background:rgba(212,80,10,0.08);font-weight:600;display:flex;justify-content:space-between;align-items:center">
            <span>🎨 Commissions (${commissionEmails.length})</span>
            <button class="btn btn-secondary" style="padding:0.3rem 0.6rem;font-size:0.75rem" id="select-all-commissions">Select All</button>
          </div>
          <div style="padding:0.5rem">`;
        commissionEmails.forEach(email => {
          const isSelected = recipients.has(email);
          html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:0.375rem;border-bottom:0.0625rem solid rgba(255,255,255,0.03)">
            <div style="font-size:0.8125rem">${escapeHtml(email)}</div>
            <input type="checkbox" class="recipient-checkbox" data-email="${escapeHtml(email)}" data-source="commissions" ${isSelected?'checked':''} />
          </div>`;
        });
        html += '</div></div>';
      }
      
      if(orderEmails.length === 0 && commissionEmails.length === 0){
        html = '<div style="padding:1rem;color:var(--text-tertiary)">No recipients available.</div>';
      }
      
      el.innerHTML = html;
      
      // Attach checkbox handlers
      document.querySelectorAll('.recipient-checkbox').forEach(cb => {
        cb.addEventListener('change', (e) => {
          const email = e.target.dataset.email;
          if(!email) return;
          if(e.target.checked) recipients.set(email, true);
          else recipients.delete(email);
          updateRecipientCount();
        });
      });
      
      // Attach select-all handlers
      const selectAllOrders = document.getElementById('select-all-orders');
      if(selectAllOrders){
        selectAllOrders.addEventListener('click', () => {
          orderEmails.forEach(email => recipients.set(email, true));
          renderRecipients();
          updateRecipientCount();
        });
      }
      
      const selectAllCommissions = document.getElementById('select-all-commissions');
      if(selectAllCommissions){
        selectAllCommissions.addEventListener('click', () => {
          commissionEmails.forEach(email => recipients.set(email, true));
          renderRecipients();
          updateRecipientCount();
        });
      }
    }
    
    function updateRecipientCount(){
      const countEl = document.getElementById('recipients-count');
      if(countEl) countEl.textContent = `${recipients.size} selected`;
    }

    function setCampaignStatus(type, message) {
      const statusEl = document.getElementById('campaign-status');
      if (!statusEl) return;
      if (!message) {
        statusEl.style.display = 'none';
        statusEl.textContent = '';
        statusEl.style.background = '';
        statusEl.style.color = '';
        statusEl.style.border = '';
        return;
      }

      const palette = {
        success: { bg: 'rgba(46, 204, 113, 0.14)', color: 'var(--success-400)', border: '0.0625rem solid rgba(46, 204, 113, 0.35)' },
        error: { bg: 'rgba(231, 76, 60, 0.14)', color: 'var(--error-400)', border: '0.0625rem solid rgba(231, 76, 60, 0.35)' },
        info: { bg: 'rgba(212, 80, 10, 0.14)', color: 'var(--primary-400)', border: '0.0625rem solid rgba(212, 80, 10, 0.35)' }
      };
      const style = palette[type] || palette.info;
      statusEl.style.display = 'block';
      statusEl.style.background = style.bg;
      statusEl.style.color = style.color;
      statusEl.style.border = style.border;
      statusEl.textContent = message;
    }

    function formatCampaignStatusRow(row) {
      const status = String(row?.status || '').toLowerCase();
      const palette = {
        sent: { label: 'Sent', color: 'var(--success-400)', bg: 'rgba(46, 204, 113, 0.12)' },
        failed: { label: 'Failed', color: 'var(--error-400)', bg: 'rgba(231, 76, 60, 0.12)' },
        queued: { label: 'Queued', color: 'var(--primary-400)', bg: 'rgba(212, 80, 10, 0.12)' }
      };
      const style = palette[status] || palette.queued;
      return `<div style="padding:0.75rem 0.9rem;border:0.0625rem solid var(--border-color);border-radius:0.875rem;background:${style.bg};display:flex;justify-content:space-between;gap:0.75rem;align-items:flex-start">
        <div style="min-width:0">
          <div style="font-weight:700;color:var(--text-primary);word-break:break-all">${escapeHtml(row?.email || 'unknown')}</div>
          <div style="font-size:0.75rem;color:var(--text-tertiary);margin-top:0.1875rem">${escapeHtml(row?.subject || '')}</div>
          ${row?.error_message ? `<div style="font-size:0.75rem;color:var(--error-400);margin-top:0.25rem">${escapeHtml(row.error_message)}</div>` : ''}
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:0.4rem;flex:0 0 auto">
          <span style="padding:0.3rem 0.6rem;border-radius:62.4375rem;font-size:0.75rem;font-weight:700;color:${style.color};border:0.0625rem solid currentColor">${style.label}</span>
          <button class="btn btn-danger" style="padding:0.25rem 0.5rem;font-size:0.6875rem" onclick="deleteCampaignEntry('${escapeHtml(String(row?.id || ''))}')">Delete</button>
        </div>
      </div>`;
    }

    async function loadCampaignDeliveryStatus(){
      const summaryEl = document.getElementById('campaign-delivery-summary');
      const listEl = document.getElementById('campaign-delivery-list');
      if (summaryEl) summaryEl.textContent = 'Loading...';
      if (listEl) listEl.innerHTML = '<div style="color:var(--text-tertiary)">Loading campaign status...</div>';
      try{
        const res = await PromotionsService.getCampaignQueue();
        const rows = Array.isArray(res?.data) ? res.data : [];
        currentCampaignRows = rows;
        const sent = rows.filter((row) => String(row?.status).toLowerCase() === 'sent').length;
        const queued = rows.filter((row) => String(row?.status).toLowerCase() === 'queued').length;
        const failed = rows.filter((row) => String(row?.status).toLowerCase() === 'failed').length;
        if (summaryEl) summaryEl.textContent = `${sent} sent • ${queued} queued • ${failed} failed`;
        if (listEl) {
          if (!rows.length) {
            listEl.innerHTML = '<div style="color:var(--text-tertiary)">No campaign deliveries yet.</div>';
          } else {
            listEl.innerHTML = rows.slice(0, 20).map(formatCampaignStatusRow).join('');
          }
        }
      }catch(e){
        if (summaryEl) summaryEl.textContent = 'Status unavailable';
        if (listEl) listEl.innerHTML = `<div style="color:var(--error-400)">${escapeHtml(e.message || 'Failed to load campaign status')}</div>`;
      }
    }

    async function deleteCampaignEntry(id) {
      if (!id) return;
      if (!confirm('Delete this campaign status record?')) return;
      try {
        await PromotionsService.deleteCampaignQueueEntry(id);
        Toast.success('Campaign status deleted');
        loadCampaignDeliveryStatus();
      } catch (e) {
        Toast.error('Delete failed: ' + (e.message || 'Unknown error'));
      }
    }

    document.getElementById('campaign-status-toggle').addEventListener('click', () => {
      const panel = document.getElementById('campaign-status-panel');
      const btn = document.getElementById('campaign-status-toggle');
      if (!panel || !btn) return;
      const open = panel.style.display !== 'none';
      panel.style.display = open ? 'none' : 'block';
      btn.textContent = open ? 'Show Status' : 'Hide Status';
      if (!open) {
        loadCampaignDeliveryStatus();
      }
    });

    document.getElementById('campaign-status-refresh').addEventListener('click', () => {
      loadCampaignDeliveryStatus();
    });

    document.getElementById('campaign-status-delete-failed').addEventListener('click', async () => {
      const failedRows = currentCampaignRows.filter((row) => String(row?.status || '').toLowerCase() === 'failed');
      if (!failedRows.length) {
        Toast.error('No failed records to delete');
        return;
      }
      if (!confirm(`Delete ${failedRows.length} failed campaign record(s)?`)) return;
      try {
        await Promise.all(failedRows.map((row) => PromotionsService.deleteCampaignQueueEntry(row.id)));
        Toast.success(`Deleted ${failedRows.length} failed record(s)`);
        loadCampaignDeliveryStatus();
      } catch (e) {
        Toast.error('Bulk delete failed: ' + (e.message || 'Unknown error'));
      }
    });

    document.getElementById('campaign-send').addEventListener('click', async ()=>{
      const subject=document.getElementById('campaign-subject').value.trim(); 
      const body=document.getElementById('campaign-body').value.trim(); 
      if(!subject||!body){ Toast.error('Subject and body required'); return }
      const list = Array.from(recipients.keys()); 
      if(!list.length){ Toast.error('No recipients selected'); return }
      const couponValue = String(document.getElementById('campaign-coupon')?.value || '').trim();
      const selectedCoupon = couponValue ? campaignCouponCatalog.find((coupon) => String(coupon.id) === couponValue || String(coupon.code) === couponValue) : null;
      if (couponValue && !selectedCoupon) {
        Toast.error('Selected coupon is no longer available');
        return;
      }
      const btn=document.getElementById('campaign-send'); 
      btn.disabled=true; 
      btn.textContent='Sending...';
      setCampaignStatus('info', `Sending campaign to ${list.length} recipient${list.length === 1 ? '' : 's'}...`);
      try{
        const couponBlock = selectedCoupon ? buildCampaignCouponHtml(selectedCoupon) : '';
        // Build a plain-text fallback for email clients
        function stripHtml(html){ const tmp=document.createElement('div'); tmp.innerHTML = String(html || ''); return (tmp.textContent || tmp.innerText || '').trim(); }
        const bodyPlain = stripHtml(body);
        const couponPlain = selectedCoupon ? `Coupon code: ${selectedCoupon.code} — ${selectedCoupon.coupon_type === 'fixed' ? '$' + Number(selectedCoupon.amount).toFixed(2) : selectedCoupon.amount + '%'}${selectedCoupon.expires_at ? ' · Expires ' + formatDate(selectedCoupon.expires_at) : ''}${selectedCoupon.notes ? ' · ' + selectedCoupon.notes : ''}` : '';
        const payload = { subject, content: `${body}${couponBlock}`, plain_text: couponPlain ? (`${bodyPlain}\n\n${couponPlain}`) : bodyPlain, recipients: list.map(email => ({ email })) };
        const res = await PromotionsService.sendCampaign(payload);
        const queued = Number(res?.queued || list.length);
        const sent = Number(res?.sent || 0);
        const failed = Number(res?.failed || 0);
        const message = sent > 0
          ? `Campaign sent to ${sent} recipient${sent === 1 ? '' : 's'}${failed ? `, ${failed} failed` : ''}.`
          : `Campaign queued for ${queued} recipient${queued === 1 ? '' : 's'}.`;
        setCampaignStatus('success', message);
        Toast.success(message);
        const couponPreview = document.getElementById('campaign-coupon-preview');
        if (couponPreview) {
          couponPreview.innerHTML = selectedCoupon
            ? `<span>Attached coupon: <strong>${escapeHtml(selectedCoupon.code || '')}</strong></span>`
            : '<span>No coupon attached.</span>';
        }
        loadRecipients();
        loadCampaignDeliveryStatus();
      }catch(e){ 
        console.error('Send campaign error:', e); 
        setCampaignStatus('error', `Send failed: ${e.message}`);
        Toast.error('Send failed: ' + e.message); 
      }
      finally{
        btn.disabled=false;
        btn.textContent='Send Campaign';
      }
    });

    function initPromotionsPage() {
      if (typeof AuthService === 'undefined') {
        setTimeout(initPromotionsPage, 50);
        return;
      }

      // Redirect if no token
      const authToken = localStorage.getItem('auth_token');
      if (!authToken) {
        window.location.href = '/admin/login.html';
        return;
      }

      // Update sidebar
      const user = AuthService.getCurrentUser();
      if (typeof initializeUserDisplay === 'function') initializeUserDisplay();

      // Attach logout handler
      const logoutBtn = document.getElementById('logoutBtn');
      if (logoutBtn) {
        logoutBtn.removeEventListener && logoutBtn.removeEventListener('click', () => {});
        logoutBtn.addEventListener('click', async () => {
          await AuthService.logout();
          window.location.href = '/admin/login.html';
        });
      }

      // Attach tab click handlers
      document.querySelectorAll('.tab-btn').forEach(b=>b.addEventListener('click', ()=>switchTab(b.dataset.tab)));

      const reviewsSave = document.getElementById('reviews-save');
      if (reviewsSave) reviewsSave.addEventListener('click', saveReviews);
      const reviewsReset = document.getElementById('reviews-reset');
      if (reviewsReset) reviewsReset.addEventListener('click', resetReviews);

      // Initialize UI - open default tab and load data
      promotionsSummary.textContent = 'Loading...';
      switchTab('ads');
    }
    
    window.deleteCoupon = deleteCoupon;
    window.deleteAd = deleteAd;
    window.openReviewEditor = openReviewEditor;
    window.deleteReview = deleteReview;
    window.deleteCampaignEntry = deleteCampaignEntry;

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initPromotionsPage);
    } else {
      initPromotionsPage();
    }
