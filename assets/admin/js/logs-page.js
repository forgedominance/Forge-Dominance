/* logs-page.js — Admin activity/session logs */
    var authToken = TokenManager.accessToken;
    const logoutBtn = document.getElementById('logoutBtn');
    const logsBody = document.getElementById('logsBody');
    const logsSummary = document.getElementById('logsSummary');
    const logsContainer = document.getElementById('logsContainer');
    const unauthorizedContainer = document.getElementById('unauthorizedContainer');
    const logsEmpty = document.getElementById('logsEmpty');
    const deleteAllBtn = document.getElementById('deleteAllBtn');
    let selectedDayOffset = null;
    const dayFiltersContainer = document.getElementById('dayFilters');

    function formatDayLabel(offset) {
      if (offset === 0) return 'Today';
      if (offset === 1) return 'Yesterday';
      const d = new Date();
      d.setDate(d.getDate() - offset);
      return d.toLocaleDateString(undefined, { weekday: 'short' });
    }

    function renderDayFilters() {
      if (!dayFiltersContainer) return;
      dayFiltersContainer.innerHTML = '';
      for (let i = 0; i < 7; i++) {
        const btn = document.createElement('button');
        btn.className = 'btn btn-ghost';
        btn.textContent = formatDayLabel(i);
        btn.dataset.offset = String(i);
        btn.style.padding = '6px 8px';
        btn.style.fontSize = '0.85rem';
        btn.addEventListener('click', () => {
          selectedDayOffset = selectedDayOffset === i ? null : i;
          updateDayFilterUI();
          loadLogs(selectedDayOffset);
        });
        dayFiltersContainer.appendChild(btn);
      }
    }

    function updateDayFilterUI() {
      const buttons = dayFiltersContainer.querySelectorAll('button');
      buttons.forEach((b) => {
        if (Number(b.dataset.offset) === selectedDayOffset) {
          b.classList.add('active');
          b.style.background = 'var(--primary-500)';
          b.style.color = '#fff';
        } else {
          b.classList.remove('active');
          b.style.background = '';
          b.style.color = '';
        }
      });
      if (selectedDayOffset === null) {
        deleteAllBtn.textContent = 'Delete All History';
      } else {
        deleteAllBtn.textContent = `Delete: ${formatDayLabel(selectedDayOffset)}`;
      }
    }

    if (!authToken) {
      window.location.href = '/admin/login.html';
    }

    logoutBtn.addEventListener('click', async () => {
      await AuthService.logout();
      window.location.href = '/admin/login.html';
    });


    // Format date and time
    function formatDateTime(dateStr) {
      if (!dateStr) return '-';
      try {
        let ts = dateStr;
        // Handle numeric timestamps in seconds
        if (typeof ts === 'number' || (/^\d+$/.test(String(ts)))) {
          const n = Number(ts);
          ts = n < 1e12 ? n * 1000 : n; // seconds -> ms
        }
        const date = new Date(ts);
        if (isNaN(date.getTime())) return '-';
        const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const dateOnly = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        return `${dateOnly} ${time}`;
      } catch {
        return '-';
      }
    }

    function escapeHtml(value) {
      return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    // Delete a single log entry
    async function deleteLogEntry(logId) {
      if (!confirm('Delete this session log?')) return;
      try {
        await apiCall(`/tracking/admin/history/${logId}`, { method: 'DELETE' });
        Toast.success('Log entry deleted');
        loadLogs();
      } catch (error) {
        Toast.error(error.message || 'Failed to delete log entry');
      }
    }

    // Delete all log entries
    async function deleteAllLogs() {
      const targetLabel = selectedDayOffset === null ? 'all login history' : `logs for ${formatDayLabel(selectedDayOffset)}`;
      if (!confirm(`Delete ${targetLabel}? This action cannot be undone.`)) return;
      const btn = deleteAllBtn;
      try {
        btn.disabled = true;
        const headers = { 'Content-Type': 'application/json', ...TokenManager.getAuthHeader() };
        const url = selectedDayOffset === null ? '/api/tracking/admin/history' : `/api/tracking/admin/history?dayOffset=${selectedDayOffset}`;
        const resp = await fetch(url, { method: 'DELETE', headers });
        const text = await resp.text().catch(() => '');
        let body = text;
        try { body = JSON.parse(text); } catch (_) {}

        if (!resp.ok) {
          console.error('Delete all logs failed', { status: resp.status, body });
          Toast.error((body && body.error) ? body.error : `Failed to delete login history (${resp.status})`);
          return;
        }

        Toast.success('Deleted');
        // reload the filtered view
        loadLogs(selectedDayOffset);
      } catch (error) {
        console.error('Delete all logs error', error);
        Toast.error(error.message || 'Failed to delete login history');
      } finally {
        deleteAllBtn.disabled = false;
      }
    }

    // Load logs (optional dayOffset: 0=today .. 6)
    async function loadLogs(dayOffset = null) {
      try {
        const endpoint = dayOffset === null ? '/tracking/admin/history' : `/tracking/admin/history?dayOffset=${dayOffset}`;
        const data = await apiCall(endpoint);
        const rows = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
        
        // Update stats
        const activeSessions = rows.filter(r => !r.logout_time && r.status !== 'inactive').length;
        const uniqueAdmins = new Set(rows.map(r => r.email || r.admin_email)).size;
        document.getElementById('totalSessionsStat').textContent = rows.length.toString();
        document.getElementById('activeSessionsStat').textContent = activeSessions.toString();
        document.getElementById('uniqueAdminsStat').textContent = uniqueAdmins.toString();

        logsSummary.textContent = `${rows.length} sessions`;

        if (!rows.length) {
          logsBody.style.display = 'none';
          logsEmpty.style.display = 'block';
          return;
        }

        logsBody.style.display = 'table-body';
        logsEmpty.style.display = 'none';

        logsBody.innerHTML = rows.map((entry) => {
          const adminEmail = escapeHtml(entry.email || entry.admin_email || 'Unknown');
          const status = entry.logout_time || entry.status === 'inactive' ? 'inactive' : 'active';
          const loginTime = formatDateTime(entry.login_time || entry.created_at);
          const logoutTime = formatDateTime(entry.logout_time || '');
          const ipAddress = escapeHtml(entry.ip_address || entry.ip || 'Unknown');
          const sessionId = escapeHtml(entry.id || entry.session_id || '');
          const userAgent = escapeHtml(entry.user_agent || '');
          const sessionDuration = Number(entry.session_duration || 0);
          const durationLabel = sessionDuration > 0
            ? `${Math.floor(sessionDuration / 60)}m ${String(sessionDuration % 60).padStart(2, '0')}s`
            : '-';
          
          return `
            <tr>
              <td class="admin-email">${adminEmail}</td>
              <td>
                <span class="session-status ${status === 'active' ? 'active' : 'inactive'}">
                  ${status === 'active' ? 'Active' : 'Logged out'}
                </span>
              </td>
              <td class="timestamp-cell">${loginTime}</td>
              <td class="timestamp-cell">${logoutTime}</td>
              <td><span class="ip-address">${ipAddress}</span></td>
              <td>
                <div class="session-details">
                  <strong>Session:</strong> ${sessionId.substring(0, 12)}...<br/>
                  <strong>Duration:</strong> ${durationLabel}<br/>
                  <strong>Agent:</strong> ${userAgent.substring(0, 50)}${userAgent.length > 50 ? '...' : ''}
                </div>
              </td>
              <td>
                <button class="action-button delete" onclick="deleteLogEntry('${escapeHtml(entry.id || entry.session_id || '')}')" title="Delete this log">Delete</button>
              </td>
            </tr>
          `;
        }).join('');
      } catch (error) {
        logsSummary.textContent = 'Load failed';
        logsBody.innerHTML = `<tr><td colspan="7" style="padding:1rem;text-align:center;color:var(--error-400);">${escapeHtml(error.message || 'Could not load logs')}</td></tr>`;
      }
    }

    // Check if user is super admin
    async function checkSuperAdminAccess() {
      try {
        if (typeof AuthService === 'undefined') {
          setTimeout(checkSuperAdminAccess, 50);
          return;
        }

        const user = AuthService.getCurrentUser();
        const isSuperAdmin = user?.role === 'superadmin' || user?.role === 'super_admin' || user?.role === 'Super Admin';

        if (!isSuperAdmin) {
          unauthorizedContainer.style.display = 'block';
          logsContainer.style.display = 'none';
          return;
        }

        logsContainer.style.display = 'grid';
        unauthorizedContainer.style.display = 'none';

        if (typeof initializeUserDisplay === 'function') initializeUserDisplay();

        // Initialize day filters and load logs
        try { renderDayFilters(); updateDayFilterUI(); } catch (e) {}
        loadLogs();

        // Set up delete all button
        deleteAllBtn.addEventListener('click', deleteAllLogs);

        // Refresh logs every 10 seconds for near-real-time updates
        setInterval(() => loadLogs(selectedDayOffset), 10000);
      } catch (error) {
        console.error('Error checking access:', error);
      }
    }


    window.deleteLogEntry = deleteLogEntry;

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        try { initTheme(); } catch (e) {}
        try { checkSuperAdminAccess(); } catch (e) {}
      });
    } else {
      try { initTheme(); } catch (e) {}
      try { checkSuperAdminAccess(); } catch (e) {}
    }


