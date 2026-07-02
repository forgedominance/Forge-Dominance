/* homepage-content.js — Review section + dynamic homepage content loader */

function escapeText(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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

function renderReviewCard(review, large) {
  large = large || false;
  const stars = new Array(Math.max(1, Math.min(5, Number(review.rating || 5) || 5))).fill('<span>★</span>').join('');
  const avatar = normalizeReviewImageUrl(review.avatar || review.image || review.image_url || '');
  return '<div class="tc' + (large ? ' lg' : '') + '">'
    + '<div class="ts">' + stars + '</div>'
    + '<p class="tq">"' + escapeText(review.quote || '') + '"</p>'
    + '<div class="ta">'
    + '<img class="tav" src="' + escapeText(avatar || '/assets/uploads/reviews/avatar-marcus.png') + '" alt="' + escapeText(review.name || 'Review') + '">'
    + '<div>'
    + '<div class="tn">' + escapeText(review.name || '') + '</div>'
    + '<div class="tl">' + escapeText(review.role || '') + '</div>'
    + '</div></div></div>';
}

(async function loadReviewSection() {
  const section = document.getElementById('testimonials');
  const root = document.getElementById('reviewsRoot');
  const heading = section && section.querySelector('.sec-eye .tlabel');
  const title = section && section.querySelector('.sec-h');
  if (!section || !root) return;

  try {
    const response = await fetch('/api/settings/public/reviews');
    if (!response.ok) return;
    const payload = await response.json();
    const reviewSection = payload && payload.data || payload || {};

    if (reviewSection.enabled === false) {
      section.style.display = 'none';
      return;
    }

    if (heading && reviewSection.subtitle) heading.textContent = reviewSection.subtitle;
    if (title && reviewSection.title) title.innerHTML = escapeText(reviewSection.title) + ' <em>•</em>';

    const reviews = Array.isArray(reviewSection.reviews) ? reviewSection.reviews.filter(Boolean) : [];
    if (!reviews.length) {
      root.innerHTML = '<div class="tc lg">No reviews configured yet.</div>';
      return;
    }

    var layout = String(reviewSection.layout || 'stacked').toLowerCase();
    root.dataset.layout = layout;

    if (layout === 'grid') {
      root.style.display = 'grid';
      root.style.gridTemplateColumns = 'repeat(auto-fit, minmax(18rem, 1fr))';
      root.style.gap = '1.375rem';
      root.innerHTML = reviews.slice(0, 6).map(function(review) { return renderReviewCard(review, false); }).join('');
      return;
    }

    root.style.display = 'grid';
    root.style.gridTemplateColumns = 'minmax(0, 1.1fr) minmax(0, 0.9fr)';
    root.style.gap = '1.375rem';
    var leading = reviews[0];
    var trailing = reviews.slice(1, 3);
    root.innerHTML = renderReviewCard(leading, true) + '<div style="display:flex;flex-direction:column;gap:1.375rem">' + trailing.map(function(review) { return renderReviewCard(review, false); }).join('') + '</div>';
  } catch (error) {}
})();

(async function() {
  try {
    var res = await fetch('/api/homepage-content');
    if (!res.ok) return;
    var data = await res.json();
    if (data.hero) {
      var h = data.hero;
      if (h.headline && Array.isArray(h.headline)) {
        var h1 = document.querySelector('.hero-h1');
        if (h1) {
          var newHtml = h.headline.map(function(w) { return '<span class="ln"><span>' + escapeText(w) + '</span></span>'; }).join('');
          var currentText = h1.textContent.replace(/\s+/g, '').toUpperCase();
          var newText = h.headline.join('').replace(/\s+/g, '').toUpperCase();
          if (currentText !== newText) {
            h1.innerHTML = newHtml;
          }
        }
      }
      if (h.subtext) {
        var sub = document.querySelector('.hero-sub');
        if (sub) sub.textContent = h.subtext;
      }
      if (h.eyebrow) {
        var ey = document.querySelector('.hero-ey .tlabel');
        if (ey) ey.textContent = h.eyebrow;
      }
      if (h.floats && Array.isArray(h.floats)) {
        var floatsEl = document.querySelector('.hero-floats');
        if (floatsEl) floatsEl.innerHTML = h.floats.map(function(f) { return '<div class="hf"><div class="hf-n">' + escapeText(f.value) + '</div><div class="hf-l">' + escapeText(f.label) + '</div></div>'; }).join('');
      }
    }
    if (data.statsBar && Array.isArray(data.statsBar)) {
      var statEls = document.querySelectorAll('.sb2');
      data.statsBar.forEach(function(s, i) {
        if (!statEls[i]) return;
        var sn = statEls[i].querySelector('.sn');
        var sl = statEls[i].querySelector('.sl');
        var ss = statEls[i].querySelector('.ss');
        if (sn) { sn.setAttribute('data-count', s.value); sn.innerHTML = '0<span class="su">' + escapeText(s.suffix || '') + '</span>'; }
        if (sl) sl.textContent = s.label;
        if (ss) ss.textContent = s.desc || '';
      });
    }
  } catch (e) {}
})();


