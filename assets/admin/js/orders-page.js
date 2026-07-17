/* orders-page.js — Admin orders and commission management */
    const logoutBtn = document.getElementById('logoutBtn');

    // Logout functionality
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('auth_token');
        window.location.href = '/admin/login.html';
      });
    }

    let allProducts = [];
    let selectedProducts = [];
    let productsLoaded = false;

    function normalizeOrderItems(rawItems) {
      let value = rawItems;

      for (let i = 0; i < 3; i += 1) {
        if (typeof value !== 'string') break;
        const trimmed = value.trim();
        try {
          value = JSON.parse(trimmed);
        } catch (_error) {
          break;
        }
      }

      if (Array.isArray(value)) {
        return value;
      }

      if (value && typeof value === 'object') {
        if (Array.isArray(value.items)) {
          return value.items;
        }
        return [value];
      }

      return [];
    }

    function formatCurrency(value) {
      return Number(value || 0).toFixed(2);
    }

    function formatDateTime(value) {
      if (!value) return '-';
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString();
    }

    function parseOrderItemsForEdit(rawItems) {
      return JSON.stringify(normalizeOrderItems(rawItems), null, 2);
    }

    function syncOrderItemsField() {
      const payload = {
        source: 'admin-panel',
        items: selectedProducts.map((product) => ({
          product_id: product.id,
          product_name: product.name,
          thumbnail_url: product.thumbnail_url || null,
          price: Number(product.price || 0),
          qty: Number(product.qty || 1),
          subtotal: Number(product.price || 0) * Number(product.qty || 1)
        }))
      };

      document.getElementById('orderItems').value = JSON.stringify(payload);
    }

    function recalculateOrderTotal() {
      const total = selectedProducts.reduce((sum, product) => sum + (Number(product.price || 0) * Number(product.qty || 1)), 0);
      document.getElementById('orderTotal').value = total ? total.toFixed(2) : '';
      syncOrderItemsField();
    }

    function renderSelectedProducts() {
      const container = document.getElementById('selectedProductsList');

      if (!selectedProducts.length) {
        container.innerHTML = '<div style="padding:1rem;border:0.0625rem dashed var(--border-light);border-radius:0.9rem;color:var(--text-tertiary);text-align:center;">No products selected yet.</div>';
        recalculateOrderTotal();
        return;
      }

      container.innerHTML = selectedProducts.map((product) => `
        <div class="order-selected-item" data-product-id="${product.id}">
          <img class="thumb" src="${escapeHtml(product.thumbnail_url || '')}" alt="${escapeHtml(product.name || 'Product')}" onerror="this.style.display='none'">
          <div class="meta">
            <h4>${escapeHtml(product.name || 'Untitled product')}</h4>
            <p style="color:var(--text-secondary);font-size:0.85rem;">$${formatCurrency(product.price)} each</p>
            <p style="color:var(--text-tertiary);font-size:0.75rem;">Subtotal: $${formatCurrency(Number(product.price || 0) * Number(product.qty || 1))}</p>
          </div>
          <div class="order-selected-actions">
            <input class="order-qty" type="number" min="1" step="1" value="${Number(product.qty || 1)}" data-qty-input="${product.id}">
            <button type="button" class="btn" data-remove-product="${product.id}" style="background:var(--bg-secondary);color:var(--text-primary);">Remove</button>
          </div>
        </div>
      `).join('');

      recalculateOrderTotal();
    }

    function renderProductPicker() {
      const searchValue = document.getElementById('productSearchInput').value.trim().toLowerCase();
      const list = document.getElementById('productPickerList');
      const filtered = allProducts.filter((product) => String(product.name || '').toLowerCase().includes(searchValue));

      if (!filtered.length) {
        list.innerHTML = '<div style="padding:1rem;text-align:center;color:var(--text-tertiary);grid-column:1/-1;">No products found.</div>';
        return;
      }

      list.innerHTML = filtered.map((product) => {
        const alreadySelected = selectedProducts.some((item) => String(item.id) === String(product.id));
        const thumbnail = product.thumbnail_url || product.thumbnailUrl || '';
        return `
          <div class="order-product-card">
            ${thumbnail ? `<img src="${escapeHtml(thumbnail)}" alt="${escapeHtml(product.name || 'Product')}" onerror="this.style.display='none'">` : '<div class="order-product-thumb"></div>'}
            <div style="display:grid;gap:0.35rem;">
              <strong style="font-size:0.95rem;">${escapeHtml(product.name || 'Untitled product')}</strong>
              <span style="color:var(--text-secondary);font-size:0.85rem;">$${formatCurrency(product.price)}</span>
            </div>
            <button type="button" class="btn ${alreadySelected ? '' : 'btn-primary'}" data-add-product="${product.id}" style="${alreadySelected ? 'background:var(--bg-secondary);color:var(--text-primary);' : ''}">${alreadySelected ? 'Add More' : 'Select Product'}</button>
          </div>
        `;
      }).join('');
    }

    function addProductToOrder(productId) {
      const product = allProducts.find((item) => String(item.id) === String(productId));
      if (!product) {
        Toast.error('Product not found');
        return;
      }

      const existing = selectedProducts.find((item) => String(item.id) === String(productId));
      if (existing) {
        existing.qty = Number(existing.qty || 1) + 1;
      } else {
        selectedProducts.push({
          id: product.id,
          name: product.name,
          price: Number(product.price || 0),
          thumbnail_url: product.thumbnail_url || product.thumbnailUrl || '',
          qty: 1
        });
      }

      renderSelectedProducts();
      renderProductPicker();
      Toast.success('Product added to order');
    }

    function removeSelectedProduct(productId) {
      selectedProducts = selectedProducts.filter((item) => String(item.id) !== String(productId));
      renderSelectedProducts();
      renderProductPicker();
    }

    function updateSelectedProductQty(productId, qty) {
      const product = selectedProducts.find((item) => String(item.id) === String(productId));
      if (!product) return;

      const nextQty = Math.max(1, parseInt(qty, 10) || 1);
      product.qty = nextQty;
      renderSelectedProducts();
    }

    function openProductPicker() {
      const modal = document.getElementById('productPickerModal');
      modal.style.display = 'flex';
      modal.setAttribute('aria-hidden', 'false');

      if (!productsLoaded) {
        loadProducts();
      } else {
        renderProductPicker();
      }

      setTimeout(() => document.getElementById('productSearchInput').focus(), 50);
    }

    function closeProductPicker() {
      const modal = document.getElementById('productPickerModal');
      modal.style.display = 'none';
      modal.setAttribute('aria-hidden', 'true');
    }

    var __orderOriginalStatus = '';
    function openOrderDetailModal(order) {
      __orderOriginalStatus = (order.status || 'pending').toLowerCase();
      document.getElementById('detailOrderId').value = order.id || '';
      document.getElementById('detailCustomerId').value = order.customer_id || '';
      document.getElementById('detailStatus').value = __orderOriginalStatus;
      document.getElementById('detailCustomerName').value = order.customer_name || '';
      document.getElementById('detailCustomerEmail').value = order.customer_email || '';
      document.getElementById('detailCustomerPhone').value = order.customer_phone || '';
      document.getElementById('detailOrderTotal').value = Number(order.total || 0).toFixed(2);
      document.getElementById('detailCustomerAddress').value = order.customer_address || '';
      document.getElementById('detailCustomerCity').value = order.customer_city || '';
      document.getElementById('detailCustomerState').value = order.customer_state || '';
      document.getElementById('detailCustomerZip').value = order.customer_zip || '';
      document.getElementById('detailItems').value = parseOrderItemsForEdit(order.items);
      document.getElementById('detailCreatedAt').textContent = formatDateTime(order.created_at);
      document.getElementById('detailUpdatedAt').textContent = formatDateTime(order.updated_at || order.created_at);
      document.getElementById('detailItemCount').textContent = String(normalizeOrderItems(order.items).length);

      const modal = document.getElementById('orderDetailModal');
      modal.style.display = 'flex';
      modal.setAttribute('aria-hidden', 'false');
    }

    function closeOrderDetailModal() {
      const modal = document.getElementById('orderDetailModal');
      modal.style.display = 'none';
      modal.setAttribute('aria-hidden', 'true');
    }

    async function loadProducts() {
      try {
        const response = await ProductsService.getAll(1, 200);
        allProducts = Array.isArray(response?.data) ? response.data : (Array.isArray(response?.products) ? response.products : []);
        productsLoaded = true;
        renderProductPicker();
      } catch (error) {
        console.error('Failed to load products:', error);
        const list = document.getElementById('productPickerList');
        if (list) {
          list.innerHTML = `<div style="padding:1rem;text-align:center;color:red;grid-column:1/-1;">${escapeHtml(error.message || 'Failed to load products')}</div>`;
        }
        Toast.error(error.message || 'Failed to load products');
      }
    }

    // Open add-order modal
    document.getElementById('toggleFormBtn').addEventListener('click', () => {
      const modal = document.getElementById('addOrderModal');
      const form = document.getElementById('addOrderForm');
      if (!modal || !form) return;
      modal.style.display = 'flex';
      modal.style.alignItems = 'center';
      modal.style.justifyContent = 'center';
      modal.setAttribute('aria-hidden', 'false');
      // focus first input for accessibility
      const firstInput = form.querySelector('input,select,textarea,button');
      if (firstInput) firstInput.focus();
    });

    function closeAddOrderModal() {
      const modal = document.getElementById('addOrderModal');
      if (modal) {
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
      }
      const form = document.getElementById('addOrderForm');
      if (form) form.reset();
      selectedProducts = [];
      renderSelectedProducts();
    }

    document.getElementById('cancelFormBtn').addEventListener('click', () => closeAddOrderModal());

    // Close modal when clicking backdrop or pressing Escape
    (function attachModalCloseHandlers() {
      document.addEventListener('click', (e) => {
        const modal = document.getElementById('addOrderModal');
        if (!modal) return;
        if (e.target === modal) {
          closeAddOrderModal();
        }
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeAddOrderModal();
      });
    })();

    document.getElementById('openProductPickerBtn').addEventListener('click', openProductPicker);
    document.getElementById('closeProductPickerBtn').addEventListener('click', closeProductPicker);
    document.getElementById('productPickerModal').addEventListener('click', (event) => {
      if (event.target.id === 'productPickerModal') {
        closeProductPicker();
      }
    });

    document.getElementById('closeOrderDetailBtn').addEventListener('click', closeOrderDetailModal);
    document.getElementById('orderDetailModal').addEventListener('click', (event) => {
      if (event.target.id === 'orderDetailModal') {
        closeOrderDetailModal();
      }
    });

    // Commission Detail Modal handlers
    document.getElementById('closeCommissionDetailBtn').addEventListener('click', closeCommissionDetailModal);
    document.getElementById('closeCommissionBtn').addEventListener('click', closeCommissionDetailModal);
    document.getElementById('commissionDetailModal').addEventListener('click', (event) => {
      if (event.target.id === 'commissionDetailModal') {
        closeCommissionDetailModal();
      }
    });
    document.getElementById('commissionDetailForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      await saveCommissionEdits();
    });


    document.getElementById('productSearchInput').addEventListener('input', renderProductPicker);
    document.getElementById('productPickerList').addEventListener('click', (event) => {
      const addButton = event.target.closest('[data-add-product]');
      if (addButton) {
        addProductToOrder(addButton.getAttribute('data-add-product'));
      }
    });

    document.getElementById('selectedProductsList').addEventListener('input', (event) => {
      const qtyInput = event.target.closest('[data-qty-input]');
      if (qtyInput) {
        updateSelectedProductQty(qtyInput.getAttribute('data-qty-input'), qtyInput.value);
      }
    });

    document.getElementById('selectedProductsList').addEventListener('click', (event) => {
      const removeButton = event.target.closest('[data-remove-product]');
      if (removeButton) {
        removeSelectedProduct(removeButton.getAttribute('data-remove-product'));
      }
    });

    document.getElementById('orderDetailForm').addEventListener('submit', async (event) => {
      event.preventDefault();

      const orderId = document.getElementById('detailOrderId').value;
      const rawItems = document.getElementById('detailItems').value.trim();
      let parsedItems = [];

      if (rawItems) {
        try {
          parsedItems = JSON.parse(rawItems);
        } catch (_error) {
          Toast.error('Order items must be valid JSON');
          return;
        }
      }

      const payload = {
        status: document.getElementById('detailStatus').value,
        total: parseFloat(document.getElementById('detailOrderTotal').value) || 0,
        customer_name: document.getElementById('detailCustomerName').value.trim(),
        customer_email: document.getElementById('detailCustomerEmail').value.trim(),
        customer_phone: document.getElementById('detailCustomerPhone').value.trim(),
        customer_address: document.getElementById('detailCustomerAddress').value.trim(),
        customer_city: document.getElementById('detailCustomerCity').value.trim(),
        customer_state: document.getElementById('detailCustomerState').value.trim(),
        customer_zip: document.getElementById('detailCustomerZip').value.trim(),
        items: parsedItems
      };

      try {
        const newStatus = payload.status;
        const statusTriggersEmail = (newStatus === 'placed' || newStatus === 'confirmed') && newStatus !== __orderOriginalStatus;
        if (statusTriggersEmail) {
          const result = await OrdersService.updateStatus(orderId, newStatus);
          const updatePayload = { ...payload };
          delete updatePayload.status;
          await OrdersService.update(orderId, updatePayload);
          if (result && result.emailSent) {
            Toast.success('Order updated & confirmation email sent');
          } else {
            Toast.success('Order updated (email could not be sent — check SMTP settings)');
          }
        } else {
          await OrdersService.update(orderId, payload);
          Toast.success('Order updated successfully');
        }
        closeOrderDetailModal();
        loadOrders();
      } catch (error) {
        Toast.error(error.message || 'Failed to update order');
      }
    });

    document.getElementById('deleteOrderBtn').addEventListener('click', async () => {
      const orderId = document.getElementById('detailOrderId').value;
      if (!orderId) return;

      const confirmed = confirm('Delete this order permanently?');
      if (!confirmed) return;

      try {
        await OrdersService.delete(orderId);
        Toast.success('Order deleted successfully');
        closeOrderDetailModal();
        loadOrders();
      } catch (error) {
        Toast.error(error.message || 'Failed to delete order');
      }
    });

    // Form submission
    document.getElementById('addOrderForm').addEventListener('submit', async (e) => {
      e.preventDefault();

      // Validate required fields
      const customerName = document.getElementById('customerName').value.trim();
      const customerEmail = document.getElementById('customerEmail').value.trim();
      const orderStatus = document.getElementById('orderStatus').value;
      const orderTotal = parseFloat(document.getElementById('orderTotal').value) || 0;

      if (!customerName || !customerEmail || !orderStatus || orderTotal <= 0) {
        Toast.error('Please fill all required fields (name, email, status, total)');
        return;
      }

      if (!selectedProducts.length) {
        Toast.error('Please add at least one product to the order');
        return;
      }

      const payload = {
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: document.getElementById('customerPhone').value || null,
        customer_address: document.getElementById('customerAddress').value || null,
        customer_city: document.getElementById('customerCity').value || null,
        customer_state: document.getElementById('customerState').value || null,
        customer_zip: document.getElementById('customerZip').value || null,
        status: orderStatus,
        total: orderTotal,
        items: {
          source: 'admin-panel',
          items: selectedProducts.map((product) => ({
            product_id: product.id,
            product_name: product.name,
            thumbnail_url: product.thumbnail_url || null,
            price: Number(product.price || 0),
            qty: Number(product.qty || 1),
            subtotal: Number(product.price || 0) * Number(product.qty || 1)
          }))
        }
      };

      try {
        await OrdersService.create(payload);

        Toast.success('Order created successfully');
        document.getElementById('addOrderForm').reset();
        document.getElementById('addOrderForm').style.display = 'none';
        selectedProducts = [];
        renderSelectedProducts();
        loadOrders();
      } catch (error) {
        Toast.error('Error creating order: ' + error.message);
      }
    });

    // Load and display orders
    async function loadOrders() {
      try {
        const data = await OrdersService.getAll(1, 200);
        allOrders = Array.isArray(data?.data) ? data.data : (Array.isArray(data?.orders) ? data.orders : []);

        // Update summary
        document.getElementById('ordersSummary').textContent = `${allOrders.length} total orders`;

        // Apply filter
        applyStatusFilter();
      } catch (error) {
        console.error('Failed to load orders:', error);
        Toast.error(error.message || 'Failed to load orders');
        document.getElementById('ordersBody').innerHTML = `<tr><td colspan="10" style="padding:2rem;text-align:center;color:red;">${escapeHtml(error.message || 'Failed to load orders')}</td></tr>`;
      }
    }

    // Filter orders by status
    function applyStatusFilter() {
      const selectedStatus = document.getElementById('statusFilter').value.toLowerCase();
      const filteredOrders = selectedStatus 
        ? allOrders.filter(order => (order.status || '').toLowerCase() === selectedStatus)
        : allOrders;

      const ordersBody = document.getElementById('ordersBody');

      if (!filteredOrders.length) {
        ordersBody.innerHTML = '<tr><td colspan="10" style="padding:2rem;text-align:center;color:var(--text-tertiary);">No orders found</td></tr>';
        return;
      }

      ordersBody.innerHTML = filteredOrders.map(order => {
        const statusColor = {
          'pending': '#ff9800',
          'processing': '#2196f3',
          'completed': '#4caf50',
          'cancelled': '#f44336',
          'on hold': '#9c27b0',
          'shipped': '#00bcd4'
        }[order.status?.toLowerCase()] || '#666';
        const orderItems = normalizeOrderItems(order.items);
        const orderTotal = formatCurrency(order.total);
        const currentStatus = (order.status || 'pending').toLowerCase();
        const statusOptions = ['pending', 'placed', 'processing', 'completed', 'cancelled', 'on hold', 'shipped'];

        return `
          <tr style="border-bottom:0.0625rem solid var(--border-light);">
            <td style="padding:1rem;"><strong>#${({hadded:'H',faiq:'F',moiz:'M',ali:'A'}[order.items && order.items.owner_ref] || '')}${escapeHtml(order.id || '')}</strong></td>
            <td style="padding:1rem;">${escapeHtml(order.customer_id || '-')}</td>
            <td style="padding:1rem;">${escapeHtml(order.customer_name || '-')}</td>
            <td style="padding:1rem;">${escapeHtml(order.customer_email || '-')}</td>
            <td style="padding:1rem;">
              <select onchange="inlineStatusChange(${order.id}, this.value, this)" style="padding:0.4rem 0.6rem;background:${statusColor};color:white;border:none;border-radius:0.25rem;font-size:0.875rem;font-weight:500;cursor:pointer;appearance:auto;">
                ${statusOptions.map(s => `<option value="${s}" ${s === currentStatus ? 'selected' : ''} style="background:#fff;color:#333;">${s.charAt(0).toUpperCase() + s.slice(1)}</option>`).join('')}
              </select>
            </td>
            <td style="padding:1rem;text-align:right;font-weight:600;">$${orderTotal}</td>
            <td style="padding:1rem;">${escapeHtml(orderItems.length ? `${orderItems.length} item${orderItems.length === 1 ? '' : 's'}` : 'No items')}</td>
            <td style="padding:1rem;">${escapeHtml(formatDateTime(order.created_at))}</td>
            <td style="padding:1rem;">${escapeHtml(formatDateTime(order.updated_at || order.created_at))}</td>
            <td style="padding:1rem;text-align:center;">
              <button onclick="viewOrderDetails(${order.id})" class="btn order-view-btn">View</button>
            </td>
          </tr>
        `;
      }).join('');
    }

    async function inlineStatusChange(orderId, newStatus, selectEl) {
      const colorMap = {
        'pending': '#ff9800',
        'processing': '#2196f3',
        'completed': '#4caf50',
        'cancelled': '#f44336',
        'on hold': '#9c27b0',
        'shipped': '#00bcd4'
      };
      try {
        const result = await OrdersService.updateStatus(orderId, newStatus);
        selectEl.style.background = colorMap[newStatus] || '#666';
        const order = allOrders.find(o => o.id === orderId);
        if (order) order.status = newStatus;
        if (result && result.emailSent) {
          Toast.success('Status updated & confirmation email sent');
        } else {
          Toast.success('Status updated');
        }
      } catch (error) {
        Toast.error(error.message || 'Failed to update status');
        loadOrders();
      }
    }
    window.inlineStatusChange = inlineStatusChange;

    // ===== Commissions =====
    let allCommissions = [];

    async function loadCommissions() {
      try {
        const data = await CommissionService.getAll(1, 500);
        allCommissions = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
        
        // Debug: log status values to understand the data
        const statusCounts = {};
        allCommissions.forEach(c => {
          const s = (c.status || 'empty').toLowerCase();
          statusCounts[s] = (statusCounts[s] || 0) + 1;
        });
        document.getElementById('commissionsSummary').textContent = `${allCommissions.length} commissions`;
        document.getElementById('commissionsTopSummary').textContent = `${allCommissions.length} / ${allCommissions.length}`;
        renderCommissions();
      } catch (error) {
        console.error('Failed loading commissions', error);
        document.getElementById('commissionsBody').innerHTML = `<tr><td colspan="7" style="padding:2rem;text-align:center;color:red;">${escapeHtml(error.message || 'Failed to load commissions')}</td></tr>`;
        document.getElementById('commissionsSummary').textContent = 'Load failed';
      }
    }

    function renderCommissions() {
      const filterEl = document.getElementById('commissionTopFilter');
      const filter = (filterEl?.value || '').toLowerCase();
      const rows = filter ? allCommissions.filter(c => (c.status || '').toLowerCase() === filter) : allCommissions;
      const body = document.getElementById('commissionsBody');
      
      // Update summary to show filtered count vs total
      const summary = document.getElementById('commissionsTopSummary');
      if (summary) summary.textContent = `${rows.length} / ${allCommissions.length}`;
      
      if (!rows.length) {
        body.innerHTML = '<tr><td colspan="7" style="padding:2rem;text-align:center;color:var(--text-tertiary);">No commissions found</td></tr>';
        return;
      }

      body.innerHTML = rows.map(c => {
        const created = escapeHtml(formatDateTime(c.created_at));
        const status = escapeHtml(c.status || 'not replied');
        return `
          <tr style="border-bottom:0.0625rem solid var(--border-light);">
            <td style="padding:1rem;">${escapeHtml(String(c.id || ''))}</td>
            <td style="padding:1rem;">${escapeHtml(c.full_name || '')}</td>
            <td style="padding:1rem;">${escapeHtml(c.email || '')}</td>
            <td style="padding:1rem;">${escapeHtml(c.phone || '')}</td>
            <td style="padding:1rem;"><select data-commission-id="${escapeHtml(String(c.id || ''))}" class="commission-status-select" style="padding:0.4rem;border-radius:0.375rem;border:0.0625rem solid var(--border-color);">
              <option value="replied" ${status==='replied'?'selected':''}>replied</option>
              <option value="not replied" ${status==='not replied'?'selected':''}>not replied</option>
            </select></td>
            <td style="padding:1rem;">${created}</td>
            <td style="padding:1rem;text-align:center;"><button class="btn" data-view-commission="${escapeHtml(String(c.id || ''))}">View</button></td>
          </tr>
        `;
      }).join('');

      // attach handlers
      document.querySelectorAll('.commission-status-select').forEach(sel => {
        sel.addEventListener('change', async (e) => {
          const id = sel.getAttribute('data-commission-id');
          const newStatus = sel.value;
          try {
            await CommissionService.update(id, { status: newStatus });
            Toast.success('Status updated');
            // update local copy
            const it = allCommissions.find(x => String(x.id) === String(id)); if (it) it.status = newStatus;
            renderCommissions();
          } catch (err) {
            Toast.error(err.message || 'Failed to update status');
          }
        });
      });

      document.querySelectorAll('[data-view-commission]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const id = btn.getAttribute('data-view-commission');
          viewCommissionDetails(id);
        });
      });
    }

    function viewCommissionDetails(id) {
      const c = allCommissions.find(x => String(x.id) === String(id));
      if (!c) return Toast.error('Commission not found');

      document.getElementById('detailCommissionId').value = c.id || '';
      document.getElementById('detailCommissionFullName').value = c.full_name || '';
      document.getElementById('detailCommissionEmail').value = c.email || '';
      document.getElementById('detailCommissionPhone').value = c.phone || '';
      document.getElementById('detailCommissionCountry').value = `${c.country || ''} ${c.country_code || ''}`.trim();
      document.getElementById('detailCommissionBudget').value = c.budget || '';
      document.getElementById('detailCommissionSource').value = c.source || '';
      document.getElementById('detailCommissionStatus').value = c.status || 'not replied';
      document.getElementById('detailCommissionCreated').value = formatDateTime(c.created_at) || '';
      document.getElementById('detailCommissionBrief').value = c.brief || '';
      document.getElementById('detailCommissionNotes').value = c.notes || '';
      
      const imgEl = document.getElementById('detailCommissionImage');
      const imgSrc = c.reference_image_url || c.reference_image_path || '';
      if (imgEl) {
        if (imgSrc) {
          imgEl.src = imgSrc;
          imgEl.style.display = 'block';
          imgEl.onerror = () => { imgEl.style.display = 'none'; };
        } else {
          imgEl.style.display = 'none';
        }
      }

      openCommissionDetailModal();
    }

    function openCommissionDetailModal() {
      const modal = document.getElementById('commissionDetailModal');
      if (modal) {
        modal.style.display = 'flex';
        modal.setAttribute('aria-hidden', 'false');
      }
    }

    function closeCommissionDetailModal() {
      const modal = document.getElementById('commissionDetailModal');
      if (modal) {
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
      }
    }

    async function saveCommissionEdits() {
      const idEl = document.getElementById('detailCommissionId');
      const statusEl = document.getElementById('detailCommissionStatus');
      const notesEl = document.getElementById('detailCommissionNotes');
      if (!idEl || !statusEl || !notesEl) return Toast.error('Form not available');

      const id = idEl.value;
      const payload = { notes: notesEl.value, status: statusEl.value };

      try {
        await CommissionService.update(id, payload);
        Toast.success('Commission updated');
        const it = allCommissions.find(x => String(x.id) === String(id)); 
        if (it) { it.notes = payload.notes; it.status = payload.status; }
        renderCommissions();
        closeCommissionDetailModal();
      } catch (err) {
        Toast.error(err.message || 'Failed to save commission');
      }
    }

    // Function removed - viewCommissionDetails was defined twice

    // Commission filter
    document.addEventListener('change', (e) => {
      if (e.target && e.target.id === 'commissionTopFilter') {
        renderCommissions();
      }
    });

    // Delete all orders
    document.getElementById('deleteAllOrdersBtn').addEventListener('click', async () => {
      if (!allOrders.length) return Toast.info('No orders to delete');
      if (!confirm(`Are you sure you want to delete all ${allOrders.length} orders? This cannot be undone.`)) return;
      try {
        await OrdersService.deleteAll();
        allOrders = [];
        applyStatusFilter();
        document.getElementById('ordersSummary').textContent = '0 total orders';
        Toast.success('All orders deleted');
      } catch (err) {
        Toast.error(err.message || 'Failed to delete orders');
      }
    });

    // Delete all commissions
    document.getElementById('deleteAllCommissionsBtn').addEventListener('click', async () => {
      if (!allCommissions.length) return Toast.info('No commissions to delete');
      if (!confirm(`Are you sure you want to delete all ${allCommissions.length} commissions? This cannot be undone.`)) return;
      try {
        await CommissionService.deleteAll();
        allCommissions = [];
        renderCommissions();
        document.getElementById('commissionsSummary').textContent = '0 commissions';
        Toast.success('All commissions deleted');
      } catch (err) {
        Toast.error(err.message || 'Failed to delete commissions');
      }
    });

    // Tab switching
    document.getElementById('tabOrders').addEventListener('click', () => {
      document.getElementById('ordersPanel').style.display = '';
      document.getElementById('commissionsPanel').style.display = 'none';
      document.getElementById('commissionsControls').style.display = 'none';
    });
    document.getElementById('tabCommissions').addEventListener('click', () => {
      document.getElementById('ordersPanel').style.display = 'none';
      document.getElementById('commissionsPanel').style.display = '';
      document.getElementById('commissionsControls').style.display = 'flex';
      loadCommissions();
    });

    // View order details
    function viewOrderDetails(orderId) {
      const order = allOrders.find(o => o.id === orderId);
      if (!order) {
        Toast.error('Order not found');
        return;
      }
      openOrderDetailModal(order);
    }

    // Status filter change event
    document.getElementById('statusFilter').addEventListener('change', applyStatusFilter);

    // Initialize page
    async function initOrdersPage() {
      if (typeof AuthService === 'undefined') {
        setTimeout(initOrdersPage, 50);
        return;
      }

      if (typeof initializeUserDisplay === 'function') initializeUserDisplay();

      // Load orders
      loadOrders();
      loadProducts();
    }

    window.viewOrderDetails = viewOrderDetails;

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initOrdersPage);
    } else {
      initOrdersPage();
    }


