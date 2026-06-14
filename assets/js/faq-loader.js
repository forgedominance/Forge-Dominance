/* faq-loader.js — Fetches FAQ items from API and renders as expandable details */
(function() {
  function escapeHtml(str) {
    var d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
  }

  fetch('/api/faq')
    .then(function(r) { return r.json(); })
    .then(function(items) {
      var container = document.getElementById('faqList');
      if (!Array.isArray(items) || !items.length) {
        container.innerHTML = '<p style="color:var(--silver);">No questions available at this time.</p>';
        return;
      }
      container.innerHTML = items.map(function(item, idx) {
        var openAttr = idx === 0 || item.open ? ' open' : '';
        return '<details class="faq-item"' + openAttr + '><summary>' + escapeHtml(item.question) + '</summary><p>' + escapeHtml(item.answer) + '</p></details>';
      }).join('');
    })
    .catch(function() {
      document.getElementById('faqList').innerHTML = '<p style="color:var(--silver);">Could not load FAQ. Please try again later.</p>';
    });
})();
