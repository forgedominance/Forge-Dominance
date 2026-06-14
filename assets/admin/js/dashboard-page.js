/* dashboard-page.js — Admin dashboard charts and metrics */
    let revenueChartInstance = null;
    let orderStatusChartInstance = null;
    let liveDashboardTimer = null;

    function formatMoney(value) {
      return `$${Number(value || 0).toFixed(2)}`;
    }

    function formatDate(value) {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return '--';
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }

    function getBadgeLabel(status) {
      return String(status || 'pending').toLowerCase();
    }

    function drawRevenueTrendCanvas(rows) {
      const canvas = document.getElementById('revenueChart');
      if (!canvas) return;

      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth || 640;
      const height = canvas.clientHeight || 320;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const padding = { top: 18, right: 18, bottom: 34, left: 46 };
      const plotWidth = Math.max(1, width - padding.left - padding.right);
      const plotHeight = Math.max(1, height - padding.top - padding.bottom);

      const data = Array.isArray(rows) ? rows : [];
      const labels = data.map((row) => formatDate(row.day));
      const values = data.map((row) => Number(row.revenue || 0));
      const maxValue = Math.max(...values, 0);
      const yMax = maxValue > 0 ? maxValue * 1.15 : 1;
      const ySteps = 4;

      ctx.fillStyle = '#0b0b0b';
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      for (let step = 0; step <= ySteps; step += 1) {
        const y = padding.top + (plotHeight / ySteps) * step;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();
      }

      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.beginPath();
      ctx.moveTo(padding.left, padding.top);
      ctx.lineTo(padding.left, height - padding.bottom);
      ctx.lineTo(width - padding.right, height - padding.bottom);
      ctx.stroke();

      if (!values.length) {
        ctx.fillStyle = '#a0a0a0';
        ctx.font = '600 14px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('No completed revenue data yet.', width / 2, height / 2);
        return;
      }

      const points = values.map((value, index) => {
        const x = padding.left + (values.length === 1 ? plotWidth / 2 : (plotWidth * index) / (values.length - 1));
        const y = padding.top + plotHeight - ((value / yMax) * plotHeight);
        return { x, y, value, label: labels[index] };
      });

      const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
      gradient.addColorStop(0, 'rgba(212, 80, 10, 0.34)');
      gradient.addColorStop(0.7, 'rgba(212, 80, 10, 0.08)');
      gradient.addColorStop(1, 'rgba(212, 80, 10, 0)');

      ctx.beginPath();
      ctx.moveTo(points[0].x, height - padding.bottom);
      points.forEach((point) => ctx.lineTo(point.x, point.y));
      ctx.lineTo(points[points.length - 1].x, height - padding.bottom);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.beginPath();
      points.forEach((point, index) => {
        if (index === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
      ctx.strokeStyle = '#d4500a';
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.stroke();

      points.forEach((point) => {
        ctx.beginPath();
        ctx.fillStyle = '#d4500a';
        ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.fillStyle = '#1a1a1a';
        ctx.arc(point.x, point.y, 2, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.fillStyle = '#6b7280';
      ctx.font = '11px Outfit, sans-serif';
      ctx.textAlign = 'center';
      points.forEach((point) => {
        ctx.fillText(point.label, point.x, height - 12);
      });

      ctx.textAlign = 'right';
      ctx.fillStyle = '#6b7280';
      for (let step = 0; step <= ySteps; step += 1) {
        const value = (yMax / ySteps) * (ySteps - step);
        const y = padding.top + (plotHeight / ySteps) * step;
        ctx.fillText(formatMoney(value).replace('.00', ''), padding.left - 8, y + 4);
      }
    }

    function renderRevenueChart(rows) {
      if (revenueChartInstance && typeof revenueChartInstance.destroy === 'function') {
        revenueChartInstance.destroy();
        revenueChartInstance = null;
      }

      drawRevenueTrendCanvas(Array.isArray(rows) ? rows : []);
    }

    function renderOrderStatusChart(rows) {
      const labels = rows.map((row) => (row.status || 'unknown').charAt(0).toUpperCase() + (row.status || 'unknown').slice(1));
      const values = rows.map((row) => Number(row.count || 0));

      const ctx = document.getElementById('orderStatusChart');
      if (!ctx || typeof Chart === 'undefined') return;

      if (orderStatusChartInstance) orderStatusChartInstance.destroy();

      const statusColors = {
        'Pending': '#f59e0b',
        'Processing': '#3b82f6',
        'Completed': '#10b981',
        'Shipped': '#8b5cf6',
        'Cancelled': '#ef4444'
      };
      const colors = labels.map((label) => statusColors[label] || '#64748b');

      orderStatusChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels,
          datasets: [{
            data: values,
            backgroundColor: colors,
            borderColor: 'rgba(10, 10, 10, 0.8)',
            borderWidth: 3,
            hoverOffset: 12,
            hoverBorderColor: '#fff',
            hoverBorderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                usePointStyle: true,
                pointStyle: 'circle',
                color: '#a0a0a0',
                padding: 16,
                font: { size: 12, weight: '600' }
              }
            },
            tooltip: {
              backgroundColor: 'rgba(10, 10, 10, 0.95)',
              borderColor: 'rgba(200, 169, 110, 0.3)',
              borderWidth: 1,
              titleColor: '#c8a96e',
              bodyColor: '#e8e8e8',
              padding: 12,
              cornerRadius: 8,
              callbacks: {
                label: (context) => ` ${context.label}: ${context.parsed} orders`
              }
            }
          },
          cutout: '68%',
          animation: {
            animateRotate: true,
            animateScale: true
          }
        }
      });
    }


    function updateKPIs(kpis = {}) {
      document.getElementById('totalRevenue').textContent = formatMoney(kpis.totalRevenue || 0);
      document.getElementById('totalOrders').textContent = String(kpis.totalOrders || 0);
      document.getElementById('totalProducts').textContent = String(kpis.totalProducts || 0);

      document.getElementById('heroRevenueBadge').textContent = `Revenue: ${formatMoney(kpis.totalRevenue || 0)}`;
      document.getElementById('heroOrdersBadge').textContent = `Orders: ${kpis.totalOrders || 0}`;
      document.getElementById('heroProductsBadge').textContent = `Products: ${kpis.totalProducts || 0}`;
    }

    async function loadDashboardData() {
      const [kpis, revenueChartRows, orderStatusRows] = await Promise.all([
        DashboardService.getKPIs(),
        DashboardService.getRevenueChart(document.getElementById('revenueRange').value),
        DashboardService.getOrderStatusChart()
      ]);

      updateKPIs(kpis || {});
      renderRevenueChart(revenueChartRows || []);
      renderOrderStatusChart(orderStatusRows || []);

      const updatedAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      document.getElementById('lastUpdatedPill').textContent = `Last updated: ${updatedAt}`;
      document.getElementById('liveStatusLabel').textContent = 'Live sync active';
    }

    async function refreshDashboard() {
      const button = document.getElementById('refreshDashboardBtn');
      const originalText = button.textContent;
      button.textContent = 'Refreshing...';
      button.disabled = true;

      try {
        await loadDashboardData();
      } catch (error) {
        if (error && error.name === 'AbortError') {
          console.warn('Dashboard refresh aborted');
          return;
        }
        console.error('Failed to load dashboard data:', error);
        Toast.error(error.message || 'Failed to load dashboard data');
      } finally {
        button.textContent = originalText;
        button.disabled = false;
      }
    }

    async function initDashboard() {
      if (typeof AuthService === 'undefined' || typeof DashboardService === 'undefined') {
        setTimeout(initDashboard, 50);
        return;
      }

      if (typeof initializeUserDisplay === 'function') {
        initializeUserDisplay();
      }

      // Dashboard-only theme toggle wiring (robust: falls back if helpers unavailable)
      (function() {
        const themeBtn = document.getElementById('themeToggle');
        if (!themeBtn) return;
        const dot = themeBtn.querySelector('.theme-toggle-dot');
        const setIcon = (t) => { if (dot) dot.textContent = (t === 'light' ? '☀' : '☾'); themeBtn.classList.toggle('light', t === 'light'); };

        const readCurrent = () => {
          try {
            if (localStorage.getItem('admin_theme')) return localStorage.getItem('admin_theme');
            if (document.documentElement.getAttribute('data-theme') === 'light') return 'light';
          } catch (e) {}
          return 'dark';
        };

        const current = readCurrent();
        setIcon(current);

        themeBtn.addEventListener('click', async () => {
          const now = (document.documentElement.getAttribute('data-theme') === 'light') ? 'dark' : 'light';
          try {
            if (typeof applyTheme === 'function') applyTheme(now === 'light' ? 'light' : 'dark');
            else {
              if (now === 'light') document.documentElement.setAttribute('data-theme', 'light');
              else document.documentElement.removeAttribute('data-theme');
              localStorage.setItem('admin_theme', now);
            }
            setIcon(now);
            if (typeof saveThemePreference === 'function') await saveThemePreference(now).catch(() => {});
            else localStorage.setItem('admin_theme', now);
            try { Toast.success('Theme updated'); } catch (e) {}
          } catch (err) {
            console.warn('theme toggle error', err?.message || err);
          }
        });
      })();

      await refreshDashboard();

      document.getElementById('refreshDashboardBtn').addEventListener('click', refreshDashboard);
      document.getElementById('revenueRange').addEventListener('change', refreshDashboard);

      if (liveDashboardTimer) {
        clearInterval(liveDashboardTimer);
      }

      liveDashboardTimer = setInterval(() => {
        loadDashboardData().catch((error) => console.error('Dashboard auto-refresh failed:', error));
      }, 30000);
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initDashboard);
    } else {
      initDashboard();
    }
