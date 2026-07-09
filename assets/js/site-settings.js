(function () {
  const DEFAULT_SITE_SETTINGS = {
    siteName: 'Forge Dominance',
    contactEmail: 'forgedominance@gmail.com',
    whatsappNumber: '923298399619',
    whatsappMessage: "Hi Forge Dominance, I'm interested in a knife.",
    supportName: 'James',
    supportLabel: 'Forge Dominance',
    ageGateEnabled: true
  };

  const CACHE_KEY = 'bs_site_settings_cache_v2';
  const CACHE_TTL_MS = 5 * 60 * 1000;
  let currentSettings = { ...DEFAULT_SITE_SETTINGS };

  function normalizeSettings(input) {
    const value = input && typeof input === 'object' ? input : {};
    const whatsappNumber = String(value.whatsappNumber || value.whatsapp || DEFAULT_SITE_SETTINGS.whatsappNumber)
      .replace(/[^\d+]/g, '')
      .replace(/^\+/, '');

    return {
      siteName: String(value.siteName || value.websiteName || DEFAULT_SITE_SETTINGS.siteName).trim() || DEFAULT_SITE_SETTINGS.siteName,
      contactEmail: String(value.contactEmail || value.supportEmail || DEFAULT_SITE_SETTINGS.contactEmail).trim() || DEFAULT_SITE_SETTINGS.contactEmail,
      whatsappNumber: whatsappNumber || DEFAULT_SITE_SETTINGS.whatsappNumber,
      whatsappMessage: String(value.whatsappMessage || DEFAULT_SITE_SETTINGS.whatsappMessage).trim() || DEFAULT_SITE_SETTINGS.whatsappMessage,
      supportName: String(value.supportName || DEFAULT_SITE_SETTINGS.supportName).trim() || DEFAULT_SITE_SETTINGS.supportName,
      supportLabel: String(value.supportLabel || DEFAULT_SITE_SETTINGS.supportLabel).trim() || DEFAULT_SITE_SETTINGS.supportLabel,
      ageGateEnabled: value.ageGateEnabled !== false
    };
  }

  function readCachedSettings() {
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      if (!parsed.at || (Date.now() - Number(parsed.at || 0)) > CACHE_TTL_MS) return null;
      return normalizeSettings(parsed.data);
    } catch {
      return null;
    }
  }

  function writeCachedSettings(settings) {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), data: settings }));
    } catch {
      // best effort only
    }
  }

  function updateTitle(siteName) {
    if (!document.title) return;
    const original = document.title;
    const next = original
      .replace(/Forge Dominance/gi, siteName)
      .replace(/FORGE DOMINANCE/g, siteName.toUpperCase())
      .replace(/Bladesmith/gi, siteName)
      .replace(/BLADESMITH/g, siteName.toUpperCase());
    document.title = next;
  }

  function updateAnchorLinks(settings) {
    const whatsappUrl = `https://wa.me/${settings.whatsappNumber}?text=${encodeURIComponent(settings.whatsappMessage)}`;
    document.querySelectorAll('a[href^="mailto:"]').forEach((anchor) => {
      anchor.href = `mailto:${settings.contactEmail}`;
    });
    document.querySelectorAll('[data-contact-email]').forEach((node) => {
      node.textContent = settings.contactEmail;
    });
    document.querySelectorAll('[data-contact-whatsapp-number]').forEach((node) => {
      node.textContent = settings.whatsappNumber;
    });
    document.querySelectorAll('[data-contact-whatsapp-message]').forEach((node) => {
      node.textContent = settings.whatsappMessage;
    });
    document.querySelectorAll('a[href*="wa.me/"]').forEach((anchor) => {
      anchor.href = whatsappUrl;
      anchor.target = anchor.target || '_blank';
      anchor.rel = anchor.rel || 'noopener noreferrer';
    });
  }

  function splitBrandHtml(siteName) {
    var name = String(siteName || '').trim().toUpperCase();
    var words = name.split(/\s+/);
    if (words.length >= 2) {
      var first = words.slice(0, Math.ceil(words.length / 2)).join('');
      var second = words.slice(Math.ceil(words.length / 2)).join('');
      return first + '<span>' + second + '</span>';
    }
    var mid = Math.ceil(name.length / 2);
    return name.slice(0, mid) + '<span>' + name.slice(mid) + '</span>';
  }

  function updateCommonBrandNodes(siteName) {
    const selectors = [
      '.nav-logo',
      '.ag-brand',
      '.pl-logo',
      '.sidebar-brand-text h3',
      '.chat-info h5',
      '.brand',
      '.fb',
      '.footer-brand',
      '[data-site-name-text]'
    ];

    const brandHtml = splitBrandHtml(siteName);

    selectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((node) => {
        if (!node) return;
        if (node.dataset && node.dataset.siteNameText !== undefined) {
          node.innerHTML = brandHtml;
          return;
        }
        if (node.tagName === 'A' || node.tagName === 'DIV' || node.tagName === 'H3' || node.tagName === 'H5' || node.tagName === 'SPAN') {
          node.innerHTML = brandHtml;
        }
      });
    });

    // Update copyright lines
    document.querySelectorAll('.fbot p, .checkout-footer p, .footer-copy').forEach(function(el) {
      var text = el.textContent || '';
      if (text.indexOf('©') !== -1 || text.indexOf('All rights reserved') !== -1) {
        el.textContent = text.replace(/Forge Dominance|FORGE DOMINANCE|Bladesmith|BLADESMITH/gi, siteName);
      }
    });
  }

  function applySettings(rawSettings) {
    const settings = normalizeSettings(rawSettings);
    currentSettings = settings;
    window.BladesmithSiteSettings = settings;
    writeCachedSettings(settings);
    updateTitle(settings.siteName);
    updateAnchorLinks(settings);
    updateCommonBrandNodes(settings.siteName);
    document.documentElement.dataset.siteName = settings.siteName;
    document.dispatchEvent(new CustomEvent('bs:site-settings', { detail: settings }));
    return settings;
  }

  async function loadSettings() {
    const cached = readCachedSettings();
    if (cached) {
      applySettings(cached);
    } else {
      applySettings(DEFAULT_SITE_SETTINGS);
    }

    try {
      const response = await fetch('/api/settings/public', { cache: 'no-store' });
      if (!response.ok) return currentSettings;
      const payload = await response.json();
      const settings = normalizeSettings(payload?.data || payload || {});
      return applySettings(settings);
    } catch {
      return currentSettings;
    }
  }

  async function refreshSettings() {
    try {
      const response = await fetch('/api/settings/public?refresh=1', { cache: 'no-store' });
      if (!response.ok) return currentSettings;
      const payload = await response.json();
      const settings = normalizeSettings(payload?.data || payload || {});
      return applySettings(settings);
    } catch {
      return currentSettings;
    }
  }

  window.getBladesmithSiteSettings = function () {
    return { ...currentSettings };
  };

  window.refreshBladesmithSiteSettings = refreshSettings;

  window.bladesmithSiteSettingsReady = loadSettings();

  window.addEventListener('storage', (event) => {
    if (event.key === 'bs_site_settings_refresh') {
      refreshSettings();
    }
  });

  window.addEventListener('bs:site-settings-force-refresh', () => {
    refreshSettings();
  });

  function isAdminRoute() {
    const path = String(window.location.pathname || '').toLowerCase();
    return path.includes('/admin');
  }

  function normalizePromoImageUrl(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (raw.startsWith('data:') || raw.startsWith('blob:') || raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('//')) {
      return raw;
    }
    if (raw.startsWith('/')) return raw;
    return `/${raw.replace(/^\/+/, '')}`;
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function buildPromoMarkup(ad) {
    const adTitle = String(ad.title || '').trim();
    const adCopy = String(ad.description || ad.notes || '').trim();
    const badgeText = String(ad.badge || '').trim();
    const kickerText = String(ad.kicker || '').trim();
    const ctaLabel = String(ad.cta_label || ad.ctaLabel || '').trim() || 'Claim Offer';
    const perkList = [ad.perk_1, ad.perk_2, ad.perk_3].map((value) => String(value || '').trim()).filter(Boolean);
    const priceValue = Number(ad.price ?? ad.price_value ?? ad.priceValue ?? NaN);
    const compareValue = Number(ad.compare_price ?? ad.comparePrice ?? NaN);
    const price = Number.isFinite(priceValue) && priceValue > 0 ? priceValue : null;
    const comparePrice = Number.isFinite(compareValue) && compareValue > 0 ? compareValue : null;
    const safeTitle = escapeHtml(adTitle);
    const safeCopy = escapeHtml(adCopy);
    const safeBadge = escapeHtml(badgeText || 'Featured');
    const safeKicker = escapeHtml(kickerText);
    const clickUrl = String(ad.click_url || ad.link || '').trim();
    const imageUrl = normalizePromoImageUrl(ad.image_url || ad.image_path || '');
    const priceLabel = price !== null ? `$${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '';
    const compareLabel = comparePrice !== null ? `$${comparePrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '';
    const perksHtml = perkList.length
      ? `<ul class="promo-ad__perk-list">${perkList.map((perk) => `<li><span class=\"promo-ad__perk-dot\"></span>${escapeHtml(perk)}</li>`).join('')}</ul>`
      : '';
    const priceHtml = priceLabel
      ? `<div class="promo-ad__price-row"><span class="promo-ad__price">${priceLabel}</span>${compareLabel ? `<span class=\"promo-ad__compare\">${compareLabel}</span>` : ''}</div>`
      : '';

    const container = document.createElement('div');
    container.innerHTML = `
      <div id="promo-ad-backdrop" class="promo-ad-backdrop" data-ad-close></div>
      <div id="promo-ad-modal" class="promo-ad" role="dialog" aria-modal="true" aria-label="Featured promotion">
        <div class="promo-ad__card">
          <button class="promo-ad__close" type="button" data-ad-close aria-label="Close promotion">×</button>
          <div class="promo-ad__inner">
            <a class="promo-ad__media-link" data-ad-link href="#" target="_blank" rel="noopener noreferrer" aria-label="Open promotion">
              <div class="promo-ad__media">
                <span class="promo-ad__media-badge">${safeBadge}</span>
                <img src="${imageUrl}" alt="${safeTitle}" />
              </div>
            </a>
            <div class="promo-ad__content">
              <div class="promo-ad__tag">Sponsored</div>
              ${kickerText ? `<div class="promo-ad__kicker">${safeKicker}</div>` : ''}
              <h2 class="promo-ad__title">${safeTitle}</h2>
              <p class="promo-ad__copy" style="${safeCopy ? '' : 'display:none;'}">${safeCopy}</p>
              ${priceHtml}
              ${perksHtml}
              <div class="promo-ad__cta-row">
                <a class="btn-p promo-ad__cta" data-ad-claim href="#" target="_blank" rel="noopener noreferrer">${escapeHtml(ctaLabel)}</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    return { container, clickUrl };
  }

  function showPromoAd(ad) {
    if (!ad) return;
    const adId = String(ad.id || ad.title || 'default');
    const seenKey = `bs_promo_ad_seen_${adId}`;
    // Only show ad on the very first page of the visit, never again in same session
    if (sessionStorage.getItem(seenKey) === '1') return;
    if (sessionStorage.getItem('bs_promo_ad_shown_any') === '1') return;
    if (document.getElementById('promo-ad-modal')) return;
    // Mark that an ad has been shown this session (won't show on other pages)
    sessionStorage.setItem('bs_promo_ad_shown_any', '1');

    const { container, clickUrl } = buildPromoMarkup(ad);
    const prevOverflow = document.body.style.overflow;
    document.body.appendChild(container);

    const modal = document.getElementById('promo-ad-modal');
    const backdrop = document.getElementById('promo-ad-backdrop');
    const closeButtons = document.querySelectorAll('[data-ad-close]');
    const link = document.querySelector('[data-ad-link]');
    const claim = document.querySelector('[data-ad-claim]');

    const applyLink = (el, url) => {
      if (!el) return;
      if (url) {
        el.href = url;
        el.classList.remove('is-disabled');
        el.setAttribute('aria-disabled', 'false');
        el.removeAttribute('tabindex');
        return;
      }
      el.href = '#';
      el.classList.add('is-disabled');
      el.setAttribute('aria-disabled', 'true');
      el.setAttribute('tabindex', '-1');
      el.addEventListener('click', (event) => event.preventDefault());
    };

    const dismiss = () => {
      sessionStorage.setItem(seenKey, '1');
      if (modal) modal.remove();
      if (backdrop) backdrop.remove();
      container.remove();
      document.body.style.overflow = prevOverflow;
    };

    applyLink(link, clickUrl);
    applyLink(claim, clickUrl);

    if (link) link.addEventListener('click', () => sessionStorage.setItem(seenKey, '1'));
    if (claim) claim.addEventListener('click', () => sessionStorage.setItem(seenKey, '1'));
    closeButtons.forEach((btn) => btn.addEventListener('click', (event) => {
      event.preventDefault();
      dismiss();
    }));

    if (modal) modal.addEventListener('click', (event) => {
      if (event.target === modal) dismiss();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') dismiss();
    }, { once: true });

    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => {
      if (modal) modal.classList.add('is-visible');
    });
  }

  async function initPromoAd() {
    if (isAdminRoute()) return;
    try {
      const response = await fetch('/api/promotions/ads/public', { cache: 'no-store' });
      if (!response.ok) return;
      const payload = await response.json();
      const ads = Array.isArray(payload?.data) ? payload.data : [];
      const ad = ads.find((item) => item && (item.image_url || item.image_path) && item.title);
      if (!ad) return;
      showPromoAd(ad);
    } catch {
      // best effort only
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPromoAd, { once: true });
  } else {
    initPromoAd();
  }
})();


