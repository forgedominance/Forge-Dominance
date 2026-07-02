/* chat-page.js — Admin live chat management */
    let activeConversationId = null;
    let messagesPollInterval = null;
    let currentStatus = 'open';
    let currentFilter = 'all';
    let allConversations = [];
    const lastUnreadMap = {};
    const lastCustomerCount = {};
    let adminInitialLoad = true;
    let lastAdminSoundTime = 0;

    function playAdminNotificationSound() {
      try {
        const now = Date.now();
        if (now - lastAdminSoundTime < 600) return;
        lastAdminSoundTime = now;
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        const ctx = new Ctx();
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(880, ctx.currentTime);
        o.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.15);
        o.connect(g);
        g.connect(ctx.destination);
        g.gain.setValueAtTime(0.0001, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
        o.start();
        setTimeout(() => { try { o.stop(); ctx.close(); } catch {} }, 400);
      } catch (e) {}
    }

    function filterConversations(query) {
      const q = (query || '').toLowerCase();
      const items = document.querySelectorAll('.chat-list-item');
      items.forEach(el => {
        const name = (el.dataset.conversationName || '').toLowerCase();
        el.style.display = !q || name.includes(q) ? '' : 'none';
      });
    }

    async function loadConversations(status, filter) {
      currentStatus = status || 'open';
      currentFilter = filter || 'all';
      const tabs = document.querySelectorAll('.chat-sidebar-tabs button');
      tabs.forEach((t) => t.classList.toggle('active', t.textContent.trim().toLowerCase() === (currentFilter === 'unread' ? 'unread' : currentStatus)));

      try {
        const res = await apiCall('/chat/conversations?status=' + currentStatus);
        let conversations = res?.conversations || [];
        if (currentFilter === 'unread') conversations = conversations.filter((c) => (c.unread_count || 0) > 0);
        allConversations = conversations;

        if (!adminInitialLoad) {
          const increased = conversations.some((c) => (c.unread_count || 0) > (lastUnreadMap[c.id] || 0));
          if (increased) playAdminNotificationSound();
        }

        renderConversationList(conversations);
        conversations.forEach((c) => { lastUnreadMap[c.id] = c.unread_count || 0; });
        adminInitialLoad = false;

        document.getElementById('chatOnlineCount').textContent = conversations.filter(c => c.unread_count > 0).length;
        document.getElementById('chatTotalCount').textContent = conversations.length + ' conversations';
      } catch (err) {
        console.error('Failed to load conversations:', err);
        const message = err?.message ? escapeHtml(String(err.message)) : 'Failed to load';
        document.getElementById('chatList').innerHTML = '<div class="chat-empty"><p>' + message + '</p></div>';
      }
    }

    function renderConversationList(conversations) {
      const list = document.getElementById('chatList');
      if (!conversations.length) {
        list.innerHTML = '<div class="chat-empty"><span class="chat-empty-icon">&#128172;</span><p>No ' + currentStatus + ' conversations</p></div>';
        document.getElementById('chatMainHeader').style.display = 'none';
        document.getElementById('chatInputArea').style.display = 'none';
        document.getElementById('chatMessages').innerHTML = '<div class="chat-empty"><span class="chat-empty-icon">&#128172;</span><p>No conversations to display</p></div>';
        stopMessagePolling();
        return;
      }

      list.innerHTML = conversations.map((c) => {
        const initial = (c.visitor_name || c.visitor_id || '?')[0].toUpperCase();
        const name = c.visitor_name || c.visitor_id.slice(0, 12);
        const time = formatTimeAgo(c.last_message_at);
        const badge = c.unread_count > 0 ? '<div class="chat-list-badge">' + c.unread_count + '</div>' : '';
        const needsReply = (c.unread_count || 0) > 0 ? ' needs-reply' : '';
        const activeClass = c.id === activeConversationId ? ' active' : '';
        return '<div class="chat-list-item' + activeClass + needsReply + '" data-conversation-id="' + c.id + '" data-conversation-name="' + escapeHtml(name) + '" onclick="openConversation(\'' + c.id + '\')">' +
          '<div class="chat-list-avatar">' + initial + '</div>' +
          '<div class="chat-list-info"><h4>' + escapeHtml(name) + '</h4><p>' + time + '</p></div>' +
          '<div class="chat-list-meta">' + badge + '</div>' +
          '</div>';
      }).join('');

      if (!activeConversationId) {
        openConversation(conversations[0].id);
      } else {
        syncActiveConversationInList();
      }
    }

    function syncActiveConversationInList() {
      document.querySelectorAll('.chat-list-item').forEach((el) => {
        el.classList.toggle('active', el.dataset.conversationId === activeConversationId);
      });
    }

    async function openConversation(id) {
      activeConversationId = id;
      document.getElementById('chatMainHeader').style.display = 'flex';
      const activeItem = Array.from(document.querySelectorAll('.chat-list-item')).find((el) => el.dataset.conversationId === id);
      const name = activeItem?.dataset.conversationName || 'Customer';
      const initial = name[0].toUpperCase();
      document.getElementById('chatConvoTitle').textContent = name;
      document.getElementById('chatConvoMeta').textContent = currentStatus === 'open' ? 'Active conversation' : 'Closed';
      document.getElementById('chatHeaderAvatar').textContent = initial;
      document.getElementById('chatInputArea').style.display = currentStatus === 'open' ? 'block' : 'none';
      document.getElementById('closeConvoBtn').style.display = currentStatus === 'open' ? '' : 'none';

      syncActiveConversationInList();
      await loadMessages(id);
      startMessagePolling();
    }

    async function loadMessages(conversationId) {
      try {
        const res = await apiCall('/chat/conversations/' + conversationId + '/messages');
        const messages = res?.messages || [];
        renderMessages(messages);
      } catch (err) {
        console.error('Failed to load messages:', err);
      }
    }

    function renderMessages(messages) {
      const container = document.getElementById('chatMessages');
      if (!messages.length) {
        container.innerHTML = '<div class="chat-empty"><span class="chat-empty-icon">&#128172;</span><p>No messages yet</p></div>';
        return;
      }

      let html = '';
      let lastDate = '';
      messages.forEach((m) => {
        const msgDate = new Date(m.created_at).toLocaleDateString();
        if (msgDate !== lastDate) {
          lastDate = msgDate;
          html += '<div class="chat-date-divider"><span>' + msgDate + '</span></div>';
        }
        const cls = m.sender === 'admin' ? 'admin' : 'customer';
        const time = new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        html += '<div class="chat-msg-group ' + cls + '">' +
          '<div class="chat-msg ' + cls + '">' + escapeHtml(m.message) + '</div>' +
          '<div class="chat-msg-time">' + time + '</div>' +
          '</div>';
      });

      container.innerHTML = html;
      container.scrollTop = container.scrollHeight;

      try {
        const custCount = messages.filter((m) => m.sender !== 'admin').length;
        const prev = lastCustomerCount[activeConversationId] || 0;
        if (!adminInitialLoad && custCount > prev) {
          playAdminNotificationSound();
        }
        lastCustomerCount[activeConversationId] = custCount;
      } catch (e) {}
    }

    async function sendAdminReply() {
      if (!activeConversationId) return;
      const input = document.getElementById('adminChatInput');
      const msg = input.value.trim();
      if (!msg) return;

      const btn = document.getElementById('adminSendBtn');
      input.disabled = true;
      btn.disabled = true;

      try {
        await apiCall('/chat/conversations/' + activeConversationId + '/reply', {
          method: 'POST',
          body: JSON.stringify({ message: msg })
        });
        input.value = '';
        await loadMessages(activeConversationId);
      } catch (err) {
        console.error('Failed to send reply:', err);
      } finally {
        input.disabled = false;
        btn.disabled = false;
        input.focus();
      }
    }

    async function closeConversation() {
      if (!activeConversationId) return;
      if (!confirm('Resolve and close this conversation?')) return;

      try {
        await apiCall('/chat/conversations/' + activeConversationId + '/close', { method: 'PATCH' });
        activeConversationId = null;
        document.getElementById('chatMainHeader').style.display = 'none';
        document.getElementById('chatInputArea').style.display = 'none';
        document.getElementById('chatMessages').innerHTML = '<div class="chat-empty"><span class="chat-empty-icon">&#10004;</span><p>Conversation resolved</p></div>';
        stopMessagePolling();
        loadConversations(currentStatus);
      } catch (err) {
        console.error('Failed to close conversation:', err);
      }
    }

    async function deleteConversation() {
      if (!activeConversationId) return;
      if (!confirm('Permanently delete this conversation and all its messages?')) return;
      try {
        await apiCall('/chat/conversations/' + activeConversationId, { method: 'DELETE' });
        activeConversationId = null;
        document.getElementById('chatMainHeader').style.display = 'none';
        document.getElementById('chatInputArea').style.display = 'none';
        document.getElementById('chatMessages').innerHTML = '<div class="chat-empty"><span class="chat-empty-icon">&#128465;</span><p>Conversation deleted</p></div>';
        stopMessagePolling();
        loadConversations(currentStatus, currentFilter);
      } catch (err) {
        console.error('Failed to delete conversation:', err);
      }
    }

    function startMessagePolling() {
      stopMessagePolling();
      messagesPollInterval = setInterval(() => {
        if (activeConversationId) loadMessages(activeConversationId);
      }, 4000);
    }

    function stopMessagePolling() {
      if (messagesPollInterval) {
        clearInterval(messagesPollInterval);
        messagesPollInterval = null;
      }
    }

    function formatTimeAgo(dateStr) {
      if (!dateStr) return '';
      const diff = Date.now() - new Date(dateStr).getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return 'Just now';
      if (mins < 60) return mins + 'm ago';
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return hrs + 'h ago';
      const days = Math.floor(hrs / 24);
      return days + 'd ago';
    }

    function escapeHtml(str) {
      const d = document.createElement('div');
      d.textContent = str;
      return d.innerHTML;
    }

    setInterval(() => loadConversations(currentStatus), 10000);
    loadConversations('open');

    // ===== TAB SWITCHING =====
    function switchMainTab(tab) {
      const chatsPanel = document.getElementById('chatsPanel');
      const faqPanel = document.getElementById('faqPanel');
      const tabChatsBtn = document.getElementById('tabChatsBtn');
      const tabFaqBtn = document.getElementById('tabFaqBtn');

      if (tab === 'faq') {
        chatsPanel.style.display = 'none';
        faqPanel.classList.add('active');
        tabChatsBtn.style.background = '';
        tabChatsBtn.style.color = '';
        tabFaqBtn.style.background = 'var(--primary)';
        tabFaqBtn.style.color = '#fff';
        loadFaqItems();
      } else {
        chatsPanel.style.display = '';
        faqPanel.classList.remove('active');
        tabFaqBtn.style.background = '';
        tabFaqBtn.style.color = '';
        tabChatsBtn.style.background = 'var(--primary)';
        tabChatsBtn.style.color = '#fff';
      }
    }

    // ===== FAQ MANAGEMENT =====
    let faqItems = [];
    let editingFaqId = null;

    async function loadFaqItems() {
      try {
        const data = await apiCall('/faq');
        faqItems = Array.isArray(data) ? data : [];
        renderFaqItems();
      } catch (err) {
        document.getElementById('faqItems').innerHTML = '<div class="faq-empty">' + escapeHtml(err.message || 'Failed to load FAQ') + '</div>';
      }
    }

    function renderFaqItems() {
      const container = document.getElementById('faqItems');
      if (!faqItems.length) {
        container.innerHTML = '<div class="faq-empty">No FAQ questions yet. Click "+ Add Question" to create one.</div>';
        return;
      }

      container.innerHTML = faqItems.map((item, idx) => '\
        <div class="faq-card" data-id="' + escapeHtml(item.id) + '">\
          <div class="faq-card-header">\
            <div class="faq-card-q">' + escapeHtml(item.question) + '</div>\
            <div class="faq-card-actions">\
              ' + (idx > 0 ? '<button onclick="moveFaqItem(\'' + item.id + '\',\'up\')" title="Move up">&#9650;</button>' : '') + '\
              ' + (idx < faqItems.length - 1 ? '<button onclick="moveFaqItem(\'' + item.id + '\',\'down\')" title="Move down">&#9660;</button>' : '') + '\
              <button onclick="editFaqItem(\'' + item.id + '\')">Edit</button>\
              <button class="delete" onclick="deleteFaqItem(\'' + item.id + '\')">Delete</button>\
            </div>\
          </div>\
          <div class="faq-card-a">' + escapeHtml(item.answer) + '</div>\
          <div class="faq-card-order">#' + (idx + 1) + '</div>\
        </div>\
      ').join('');
    }

    function openFaqModal(id) {
      editingFaqId = id || null;
      const modal = document.getElementById('faqModalOverlay');
      const title = document.getElementById('faqModalTitle');
      const qInput = document.getElementById('faqQuestionInput');
      const aInput = document.getElementById('faqAnswerInput');

      if (id) {
        const item = faqItems.find(i => i.id === id);
        title.textContent = 'Edit FAQ Question';
        qInput.value = item?.question || '';
        aInput.value = item?.answer || '';
      } else {
        title.textContent = 'Add FAQ Question';
        qInput.value = '';
        aInput.value = '';
      }

      modal.classList.add('active');
      qInput.focus();
    }

    function closeFaqModal() {
      document.getElementById('faqModalOverlay').classList.remove('active');
      editingFaqId = null;
    }

    function editFaqItem(id) { openFaqModal(id); }

    async function saveFaqItem() {
      const question = document.getElementById('faqQuestionInput').value.trim();
      const answer = document.getElementById('faqAnswerInput').value.trim();
      if (!question || !answer) return;

      try {
        if (editingFaqId) {
          await apiCall('/faq/' + editingFaqId, { method: 'PUT', body: JSON.stringify({ question, answer }) });
        } else {
          await apiCall('/faq', { method: 'POST', body: JSON.stringify({ question, answer }) });
        }
        closeFaqModal();
        await loadFaqItems();
      } catch (err) {
        alert(err.message || 'Failed to save FAQ item');
      }
    }

    async function deleteFaqItem(id) {
      if (!confirm('Delete this FAQ question?')) return;
      try {
        await apiCall('/faq/' + id, { method: 'DELETE' });
        await loadFaqItems();
      } catch (err) {
        alert(err.message || 'Failed to delete FAQ item');
      }
    }

    async function moveFaqItem(id, direction) {
      const idx = faqItems.findIndex(i => i.id === id);
      if (idx === -1) return;
      const newIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= faqItems.length) return;
      const temp = faqItems[idx];
      faqItems[idx] = faqItems[newIdx];
      faqItems[newIdx] = temp;
      try {
        await apiCall('/faq', { method: 'PUT', body: JSON.stringify(faqItems) });
        renderFaqItems();
      } catch (err) {
        await loadFaqItems();
      }
    }

    window.switchMainTab = switchMainTab;
    window.loadConversations = loadConversations;
    window.openConversation = openConversation;
    window.closeConversation = closeConversation;
    window.deleteConversation = deleteConversation;
    window.sendAdminReply = sendAdminReply;
    window.openFaqModal = openFaqModal;
    window.closeFaqModal = closeFaqModal;
    window.saveFaqItem = saveFaqItem;
    window.editFaqItem = editFaqItem;
    window.deleteFaqItem = deleteFaqItem;
    window.moveFaqItem = moveFaqItem;
    window.filterConversations = filterConversations;


