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
      ageGateEnabled: value.ageGateEnabled !== false,
      socialLinks: value.socialLinks && typeof value.socialLinks === 'object' ? value.socialLinks : {}
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

  const SOCIAL_ICON_SVGS = {
    instagram: '<svg viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>',
    youtube: '<svg viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>',
    facebook: '<svg viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>',
    tiktok: '<svg viewBox="0 0 24 24"><path d="M12.53.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>',
    twitter: '<svg viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
    pinterest: '<svg viewBox="0 0 24 24"><path d="M12.017 0C5.396 0 0 5.396 0 12.017c0 5.11 3.222 9.487 7.734 11.15-.106-.949-.203-2.406.043-3.44.219-.937 1.406-5.965 1.406-5.965s-.359-.719-.359-1.781c0-1.667.969-2.911 2.174-2.911 1.026 0 1.522.769 1.522 1.688 0 1.028-.653 2.567-.992 3.992-.283 1.192.598 2.165 1.773 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.868-2.061-4.874-5.004-4.874-3.41 0-5.412 2.559-5.412 5.204 0 1.031.397 2.137.893 2.738.099.12.112.225.083.347-.09.376-.291 1.192-.331 1.359-.052.219-.171.265-.394.16-1.469-.684-2.387-2.831-2.387-4.556 0-3.712 2.698-7.122 7.777-7.122 4.081 0 7.253 2.908 7.253 6.792 0 4.052-2.554 7.312-6.098 7.312-1.191 0-2.312-.619-2.696-1.35l-.733 2.797c-.266 1.023-.984 2.304-1.465 3.086 1.104.341 2.273.526 3.487.526 6.621 0 12.017-5.396 12.017-12.017C24.034 5.396 18.638 0 12.017 0z"/></svg>',
    linkedin: '<svg viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>'
  };

  const SOCIAL_URL_BUILDERS = {
    instagram: (u) => `https://www.instagram.com/${u}/`,
    tiktok: (u) => `https://www.tiktok.com/@${u}`,
    youtube: (u) => `https://www.youtube.com/@${u}`,
    facebook: (u) => `https://www.facebook.com/${u}`,
    twitter: (u) => `https://x.com/${u}`,
    pinterest: (u) => `https://www.pinterest.com/${u}/`,
    linkedin: (u) => `https://www.linkedin.com/company/${u}`
  };

  function renderSocialLinks(socialLinks) {
    const containers = document.querySelectorAll('.fsoc');
    if (!containers.length) return;
    const entries = Object.keys(SOCIAL_URL_BUILDERS)
      .map((key) => {
        const cfg = (socialLinks && socialLinks[key]) || {};
        return { key, enabled: !!cfg.enabled, username: String(cfg.username || '').trim() };
      })
      .filter((entry) => entry.enabled && entry.username);
    const html = entries.map((entry) => {
      const url = SOCIAL_URL_BUILDERS[entry.key](entry.username);
      const label = entry.key.charAt(0).toUpperCase() + entry.key.slice(1);
      return `<a class="fsl" href="${url}" target="_blank" rel="noopener noreferrer" aria-label="${label}">${SOCIAL_ICON_SVGS[entry.key]}</a>`;
    }).join('');
    containers.forEach((el) => { el.innerHTML = html; });
  }

  function applySettings(rawSettings) {
    const settings = normalizeSettings(rawSettings);
    currentSettings = settings;
    window.BladesmithSiteSettings = settings;
    writeCachedSettings(settings);
    updateTitle(settings.siteName);
    updateAnchorLinks(settings);
    updateCommonBrandNodes(settings.siteName);
    renderSocialLinks(settings.socialLinks);
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


