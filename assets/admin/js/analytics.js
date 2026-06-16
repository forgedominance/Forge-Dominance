/* analytics.js — Admin analytics/visitor dashboard */
    var authToken = TokenManager.accessToken;
    const logoutBtn = document.getElementById('logoutBtn');
    const customersBody = document.getElementById('customersBody');
    const customersSummary = document.getElementById('customersSummary');

    if (!authToken) {
      window.location.href = '/admin/login.html';
    }

    logoutBtn.addEventListener('click', async () => {
      await AuthService.logout();
      window.location.href = '/admin/login.html';
    });

    let currentSince = '24h';

    function updateAnalyticsDashboard(rows) {
      const totalVisitors = rows.length;
      let totalPageViews = 0;
      let totalActions = 0;
      const pageCounts = {};
      let singlePageVisitors = 0;

      rows.forEach(v => {
        const pv = Number(v.pageViews || 0);
        const ac = Number(v.actions || 0);
        totalPageViews += pv;
        totalActions += ac;
        const paths = v.paths || [];
        if (paths.length <= 1) singlePageVisitors++;
        paths.forEach(p => {
          pageCounts[p] = (pageCounts[p] || 0) + 1;
        });
      });

      const bounceRate = totalVisitors > 0 ? Math.round((singlePageVisitors / totalVisitors) * 100) : 0;
      const avgPages = totalVisitors > 0 ? (totalPageViews / totalVisitors).toFixed(1) : '0';
      const topPage = Object.entries(pageCounts).sort((a, b) => b[1] - a[1])[0];

      document.getElementById('statTotalVisitors').textContent = totalVisitors;
      document.getElementById('statPageViews').textContent = totalPageViews;
      document.getElementById('statActions').textContent = totalActions;
      document.getElementById('statAvgSession').textContent = avgPages + ' pg/visit';
      document.getElementById('statTopPage').textContent = topPage ? topPage[0].replace(/^\//,'').slice(0,18) || '/' : '--';
      document.getElementById('statBounceRate').textContent = bounceRate + '%';
    }

    // Load aggregated visitor summary from backend
    async function loadVisitorsSummary() {
      try {
        const qs = currentSince ? `?since=${encodeURIComponent(currentSince)}` : '';
        const res = await fetch('/api/visitors/summary-by-ip' + qs, { headers: { 'Authorization': 'Bearer ' + authToken } });
        if (!res.ok) throw new Error('Failed to load visitors');
        const json = await res.json();
        const rows = Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];
        customersSummary.textContent = `${rows.length} visitors (${currentSince})`;
        updateAnalyticsDashboard(rows);
        if (!rows.length) {
          customersBody.innerHTML = '<tr><td colspan="7" style="padding:1rem;color:var(--text-tertiary);">No visitors found.</td></tr>';
          return;
        }

        // rows returned are aggregated by IP; show one row per IP (latest visitor)
        customersBody.innerHTML = rows.map((v) => {
          const latestVisitor = Array.isArray(v.visitors) && v.visitors.length ? v.visitors[0].visitor_id : (v.visitor || v.id || '-');
          return `
          <tr>
            <td style="padding:0.9rem;border-bottom:0.0625rem solid var(--border-light);">${escapeHtml(String(latestVisitor))}</td>
            <td style="padding:0.9rem;border-bottom:0.0625rem solid var(--border-light);">${escapeHtml(v.ip || '-')}</td>
            <td style="padding:0.9rem;border-bottom:0.0625rem solid var(--border-light);">${formatDate(v.lastSeen)}</td>
            <td style="padding:0.9rem;border-bottom:0.0625rem solid var(--border-light);">${v.pageViews || 0}</td>
            <td style="padding:0.9rem;border-bottom:0.0625rem solid var(--border-light);">${v.actions || 0}</td>
            <td style="padding:0.9rem;border-bottom:0.0625rem solid var(--border-light);">${escapeHtml((v.paths || []).slice(0,3).join(', '))}</td>
            <td style="padding:0.9rem;border-bottom:0.0625rem solid var(--border-light);"><button class="btn" onclick="viewVisitorDetails('${escapeHtml(String(latestVisitor))}', '${encodeURIComponent(currentSince)}')">Details</button></td>
          </tr>
        `}).join('');
      } catch (error) {
        customersSummary.textContent = 'Load failed';
        customersBody.innerHTML = `<tr><td colspan="7" style="padding:1rem;color:var(--error-400);">${escapeHtml(error.message || 'Could not load visitors')}</td></tr>`;
      }
    }

    function applySinceFilter(since) {
      currentSince = since || 'all';
      loadVisitorsSummary();
    }

    // View details (recent events) for a specific visitor
    async function viewVisitorDetails(visitorId, sinceParam) {
      try {
        customersSummary.textContent = `Loading ${escapeHtml(visitorId)}...`;
        const sinceQuery = sinceParam ? `&since=${sinceParam}` : `&since=${encodeURIComponent(currentSince)}`;
        const res = await fetch('/api/visitors/events?limit=2000' + sinceQuery, { headers: { 'Authorization': 'Bearer ' + authToken } });
        if (!res.ok) throw new Error('Failed to load events');
        const json = await res.json();
        const events = Array.isArray(json.data) ? json.data : json;
        const filteredAll = events.filter(e => String(e.visitor_id) === String(visitorId));

        // Group events into visits (sessionized by gap threshold)
        const gapMs = 30 * 60 * 1000; // 30 minutes
        const sorted = filteredAll.sort((a,b)=> new Date(a.created_at) - new Date(b.created_at));
        const sessions = [];
        let currentSession = null;
        for (const ev of sorted) {
          const t = new Date(ev.created_at).getTime();
          const evScroll = Number(ev.meta?.details?.maxScrollPercent || ev.meta?.maxScrollPercent || 0);
          if (!currentSession) {
            currentSession = { start: t, end: t, events: [ev], pages: new Set([ev.path || ev.page_path || '/']) , maxScroll: evScroll };
            sessions.push(currentSession);
            continue;
          }
          if (t - currentSession.end > gapMs) {
            currentSession = { start: t, end: t, events: [ev], pages: new Set([ev.path || ev.page_path || '/']), maxScroll: evScroll };
            sessions.push(currentSession);
          } else {
            currentSession.events.push(ev);
            currentSession.end = Math.max(currentSession.end, t);
            if (ev.path || ev.page_path) currentSession.pages.add(ev.path || ev.page_path);
            currentSession.maxScroll = Math.max(currentSession.maxScroll || 0, evScroll);
          }
        }

        const filtered = filteredAll.slice(0,200);
        if (!filtered.length) {
          customersBody.innerHTML = `<tr><td colspan="7" style="padding:1rem;color:var(--text-tertiary);">No events for ${escapeHtml(visitorId)}</td></tr>`;
          customersSummary.textContent = `${escapeHtml(visitorId)} · 0 events`;
          return;
        }
        customersSummary.textContent = `${escapeHtml(visitorId)} · ${filtered.length} events · ${sessions.length} visits`;

        // Render sessions — compact summary table (one row per visit)
        let out = `
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr>
                <th style="text-align:left;padding:0.6rem;border-bottom:0.0625rem solid var(--border-light);">Visit</th>
                <th style="text-align:left;padding:0.6rem;border-bottom:0.0625rem solid var(--border-light);">Start</th>
                <th style="text-align:left;padding:0.6rem;border-bottom:0.0625rem solid var(--border-light);">Duration</th>
                <th style="text-align:left;padding:0.6rem;border-bottom:0.0625rem solid var(--border-light);">Pages (sequence)</th>
                <th style="text-align:left;padding:0.6rem;border-bottom:0.0625rem solid var(--border-light);">Max Scroll</th>
                <th style="text-align:left;padding:0.6rem;border-bottom:0.0625rem solid var(--border-light);">Actions</th>
                <th style="text-align:left;padding:0.6rem;border-bottom:0.0625rem solid var(--border-light);">Details</th>
              </tr>
            </thead>
            <tbody>`;

        // Build rows from sessions (most recent first)
        sessions.slice().reverse().forEach((s, idx) => {
          const start = new Date(s.start);
          const end = new Date(s.end);
          const durationMs = s.end - s.start;
          const durationMin = Math.round((durationMs / 60000) * 10) / 10;

          // Sequence of paths in order with titles when available; remove consecutive duplicates
          const seq = [];
          let lastLabel = null;
          s.events.forEach(ev => {
            const path = ev.path || ev.page_path || ev.meta?.path || '/';
            const title = ev.meta?.title || ev.meta?.pageTitle || ev.meta?.pageName || ev.meta?.productName || ev.meta?.name;
            const label = title ? `${path} — ${title}` : path;
            // prefer pageview actions for sequence, but also include navigations
            const isPage = (ev.action === 'pageview' || ev.action === 'navigate' || ev.action === 'pv');
            if (isPage) {
              if (label !== lastLabel) {
                seq.push(label);
                lastLabel = label;
              }
            } else {
              // non-page actions: only include if path changed
              if (label !== lastLabel) {
                seq.push(label);
                lastLabel = label;
              }
            }
          });

          // Actions summary (action names with element/button details)
          const actionsSeq = s.events.map(ev => {
            const m = ev.meta || {};
            const el = m.element_text || m.button_name || m.element_selector || '';
            return el ? `${ev.action} — ${el}` : ev.action || '-';
          }).filter(Boolean);

          // Click/element details summarized (unique, useful labels)
          const clicks = [];
          s.events.forEach(ev => {
            const m = ev.meta || {};
            const parts = [];
            if (m.element_text) parts.push(m.element_text);
            if (m.button_name) parts.push(m.button_name);
            if (m.element_selector) parts.push(m.element_selector);
            if (m.productId) parts.push('product:' + m.productId);
            if (m.productName) parts.push(m.productName);
            const label = parts.join(' | ');
            if (label && !clicks.includes(label)) clicks.push(label);
          });

          // Build per-page stats (views, maxScroll, clicks, seen range)
          const pageStats = {};
          s.events.forEach(ev => {
            const path = ev.path || ev.page_path || ev.meta?.path || '/';
            const title = ev.meta?.title || ev.meta?.pageTitle || ev.meta?.pageName || ev.meta?.productName || ev.meta?.name;
            const label = title ? `${path} — ${title}` : path;
            if (!pageStats[label]) pageStats[label] = { label, count: 0, maxScroll: 0, clicks: new Set(), firstSeen: ev.created_at, lastSeen: ev.created_at };
            const ps = pageStats[label];
            ps.count += 1;
            const mscroll = Number(ev.meta?.details?.maxScrollPercent || ev.meta?.maxScrollPercent || 0);
            if (mscroll > ps.maxScroll) ps.maxScroll = mscroll;
            const m = ev.meta || {};
            const clickParts = [];
            if (m.element_text) clickParts.push(m.element_text);
            if (m.button_name) clickParts.push(m.button_name);
            if (m.element_selector) clickParts.push(m.element_selector);
            if (m.productId) clickParts.push('product:' + m.productId);
            if (m.productName) clickParts.push(m.productName);
            if (clickParts.length) ps.clicks.add(clickParts.join(' | '));
            if (new Date(ev.created_at) < new Date(ps.firstSeen)) ps.firstSeen = ev.created_at;
            if (new Date(ev.created_at) > new Date(ps.lastSeen)) ps.lastSeen = ev.created_at;
          });

          // Build pages HTML
          const pagesArr = Object.values(pageStats);
          let pagesHtml = '';
          if (pagesArr.length) {
            pagesHtml = `<div style="margin-bottom:0.6rem;"><table style="width:100%;border-collapse:collapse;"><thead><tr><th style="text-align:left;padding:0.4rem;border-bottom:0.0625rem solid var(--border-light);">Page</th><th style="text-align:left;padding:0.4rem;border-bottom:0.0625rem solid var(--border-light);">Views</th><th style="text-align:left;padding:0.4rem;border-bottom:0.0625rem solid var(--border-light);">Max Scroll</th><th style="text-align:left;padding:0.4rem;border-bottom:0.0625rem solid var(--border-light);">Clicks</th><th style="text-align:left;padding:0.4rem;border-bottom:0.0625rem solid var(--border-light);">Seen</th></tr></thead><tbody>`;
            pagesArr.forEach(ps => {
              const clicksList = Array.from(ps.clicks || [])
              pagesHtml += `<tr><td style="padding:0.35rem;border-bottom:0.0625rem solid var(--border-light);">${escapeHtml(ps.label)}</td><td style="padding:0.35rem;border-bottom:0.0625rem solid var(--border-light);">${ps.count}</td><td style="padding:0.35rem;border-bottom:0.0625rem solid var(--border-light);">${ps.maxScroll || 0}%</td><td style="padding:0.35rem;border-bottom:0.0625rem solid var(--border-light);">${escapeHtml(clicksList.slice(0,5).join(', ') || '-')}</td><td style="padding:0.35rem;border-bottom:0.0625rem solid var(--border-light);">${formatDate(ps.firstSeen)} → ${formatDate(ps.lastSeen)}</td></tr>`;
            });
            pagesHtml += `</tbody></table></div>`;
          }

          const rowId = 'visit_row_' + idx + '_' + Math.random().toString(36).slice(2,8);
          const detailsId = rowId + '_details';

          out += `<tr id="${rowId}">
              <td style="padding:0.5rem;border-bottom:0.0625rem solid var(--border-light);">#${sessions.length - idx}</td>
              <td style="padding:0.5rem;border-bottom:0.0625rem solid var(--border-light);">${formatDate(start.toISOString())}</td>
              <td style="padding:0.5rem;border-bottom:0.0625rem solid var(--border-light);">${durationMin} min</td>
              <td style="padding:0.5rem;border-bottom:0.0625rem solid var(--border-light);">${escapeHtml(seq.join(' → '))}</td>
              <td style="padding:0.5rem;border-bottom:0.0625rem solid var(--border-light);">${s.maxScroll || 0}%</td>
              <td style="padding:0.5rem;border-bottom:0.0625rem solid var(--border-light);">${escapeHtml(actionsSeq.slice(0,6).join(' • '))}</td>
              <td style="padding:0.5rem;border-bottom:0.0625rem solid var(--border-light);"><button class="btn" onclick="document.getElementById('${detailsId}').style.display = document.getElementById('${detailsId}').style.display === 'none' ? 'table-row' : 'none'">Toggle Timeline</button></td>
            </tr>
            <tr id="${detailsId}" style="display:none;background:var(--card-bg);">
              <td colspan="7" style="padding:0.4rem;">
                ${pagesHtml || `<div style="font-size:0.9rem;margin-bottom:0.4rem;color:var(--text-tertiary);">Clicks: ${escapeHtml(clicks.slice(0,8).join(', ') || '-')}</div>`}
                <table style="width:100%;border-collapse:collapse;">
                  <thead>
                    <tr>
                      <th style="text-align:left;padding:0.4rem;border-bottom:0.0625rem solid var(--border-light);">Time</th>
                      <th style="text-align:left;padding:0.4rem;border-bottom:0.0625rem solid var(--border-light);">Action</th>
                      <th style="text-align:left;padding:0.4rem;border-bottom:0.0625rem solid var(--border-light);">Path</th>
                      <th style="text-align:left;padding:0.4rem;border-bottom:0.0625rem solid var(--border-light);">Meta</th>
                    </tr>
                  </thead>
                  <tbody>`;

          s.events.forEach(ev => {
            out += `<tr>
                      <td style="padding:0.35rem;border-bottom:0.0625rem solid var(--border-light);">${formatDate(ev.created_at)}</td>
                      <td style="padding:0.35rem;border-bottom:0.0625rem solid var(--border-light);">${escapeHtml(ev.action)}</td>
                      <td style="padding:0.35rem;border-bottom:0.0625rem solid var(--border-light);">${escapeHtml(ev.path || ev.page_path || '-')}</td>
                      <td style="padding:0.35rem;border-bottom:0.0625rem solid var(--border-light);"><pre style="margin:0;color:var(--text-muted);max-height:10rem;overflow:auto;">${escapeHtml(JSON.stringify(ev.meta || {}, null, 2))}</pre></td>
                    </tr>`;
          });

          out += `</tbody></table></td></tr>`;
        });

        out += `</tbody></table>`;

        customersBody.innerHTML = `<tr><td colspan="7" style="padding:0.4rem;">${out}</td></tr>` + `<tr><td colspan="7" style="padding:0.6rem;"><button class="btn" onclick="loadVisitorsSummary()">Back to visitors</button></td></tr>`;
      } catch (err) {
        customersBody.innerHTML = `<tr><td colspan="7" style="padding:1rem;color:var(--error-400);">${escapeHtml(err.message || 'Could not load details')}</td></tr>`;
      }
    }

    // Start SSE subscription for live updates
    try {
      const evtSource = new EventSource('/api/visitors/stream');
      evtSource.onmessage = (e) => {
        // live event received - refresh summary
        loadVisitorsSummary();
      };
      evtSource.onerror = () => {
        // reconnect will be handled by browser; we still poll periodically
        setTimeout(loadVisitorsSummary, 60000);
      };
    } catch (e) {
      // fallback: poll every 30s
      setInterval(loadVisitorsSummary, 30000);
    }

    // initial load
    loadVisitorsSummary();

    function initCustomersPage() {
      if (typeof AuthService === 'undefined') {
        setTimeout(initCustomersPage, 50);
        return;
      }

      // Update sidebar
      const user = AuthService.getCurrentUser();
      if (typeof initializeUserDisplay === 'function') initializeUserDisplay();
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initCustomersPage);
    } else {
      initCustomersPage();
    }

    window.applySinceFilter = applySinceFilter;
    window.viewVisitorDetails = viewVisitorDetails;
    window.loadVisitorsSummary = loadVisitorsSummary;
