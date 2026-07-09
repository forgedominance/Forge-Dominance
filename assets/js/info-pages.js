(function () {
  function ensurePreloaderMarkup() {
    if (document.getElementById('preloader')) return;
    document.body.insertAdjacentHTML('afterbegin', `
      <div id="preloader">
        <div class="pl-logo">BLADE<span>SMITH</span></div>
        <div class="pl-bar-wrap"><div class="pl-bar"></div></div>
        <div class="pl-pct" id="plp">0%</div>
      </div>
    `);
  }

  function ensureAgeGateMarkup() {
    if (document.getElementById('age-gate')) return;
    document.body.insertAdjacentHTML('afterbegin', `
      <div id="age-gate">
        <div class="ag">
          <div class="ag-ico">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <path d="M18 3L33 30H3L18 3Z" stroke="var(--ember)" stroke-width="1.5" stroke-linejoin="round"/>
              <path d="M18 14v7M18 24v2" stroke="var(--ember)" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>
          <div class="ag-brand">BLADE<span>SMITH</span></div>
          <div class="ag-line"></div>
          <p class="ag-h">Age Verification Required</p>
          <p class="ag-p">This site sells precision hunting tools intended for lawful adult use. Confirm your date of birth to continue.</p>
          <div class="ag-sel">
            <select id="agM"><option value="">Month</option></select>
            <select id="agY"><option value="">Year</option></select>
          </div>
          <div class="ag-btns">
            <button class="ag-yes" onclick="checkAge()">Enter Site</button>
            <button class="ag-no" onclick="window.location.href='https://www.google.com'">I'm Under 18</button>
          </div>
          <p class="ag-legal">By entering you confirm you are of legal age in your jurisdiction. Verify local blade laws before purchasing.</p>
        </div>
      </div>
    `);
  }

  function ensureStickyContactMarkup() {
    if (document.getElementById('sticky-contact')) return;
    const site = window.getBladesmithSiteSettings ? window.getBladesmithSiteSettings() : {};
    const siteName = site.siteName || 'Forge Dominance';
    const contactEmail = site.contactEmail || 'forgedominance@gmail.com';
    const whatsappNumber = String(site.whatsappNumber || '923298399619').replace(/[^\d]/g, '');
    const whatsappMessage = site.whatsappMessage || "Hi Forge Dominance, I'm interested in a knife.";
    const supportName = site.supportName || 'James';
    document.body.insertAdjacentHTML('beforeend', `
      <div id="chat-widget">
        <div class="chat-head">
          <div class="chat-av"><img src="/assets/images/favicon.svg" alt="FD" style="width:100%;height:100%;object-fit:contain;border-radius:50%;"></div>
          <div class="chat-info">
            <h5>Forge Dominance</h5>
            <span>Typically replies in 15 min</span>
          </div>
          <button class="chat-close" onclick="toggleChat()" aria-label="Close chat">&times;</button>
        </div>
        <div class="chat-body" id="chatBody">
          <div class="chat-bubble them">Hi, ${supportName} here. Interested in commissioning a blade? Tell me what you hunt and I'll recommend the right steel.</div>
        </div>
        <div class="chat-foot">
          <input type="text" id="chatInput" placeholder="Type your message..." onkeypress="if(event.key==='Enter')sendChat()"/>
          <button onclick="sendChat()">SEND</button>
        </div>
      </div>

      <div id="sticky-contact">
        <button class="sc-fab chat" onclick="toggleChat()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
          <span class="sc-tip">Live Chat</span>
        </button>

        <a href="mailto:${contactEmail}" class="sc-fab mail">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 5l10 7 10-7"/></svg>
          <span class="sc-tip">Email Us</span>
        </a>

        <a href="https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}" target="_blank" rel="noopener" class="sc-fab wa">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.008-.57-.008-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          <span class="sc-tip">WhatsApp</span>
        </a>
      </div>
    `);
  }

  function initPreloader() {
    const preloadEl = document.getElementById('preloader');
    const pctEl = document.getElementById('plp');
    const barEl = document.querySelector('.pl-bar');
    if (!preloadEl || !pctEl || !barEl) return;

    let p = 0;
    let done = false;

    const updateBar = () => {
      barEl.style.width = p + '%';
      pctEl.textContent = p + '%';
    };

    const finish = () => {
      if (done) return;
      done = true;
      p = 100;
      barEl.style.width = '100%';
      pctEl.textContent = '100%';
      preloadEl.classList.add('out');
    };

    const iv = setInterval(() => {
      if (done) return;
      p = Math.min(95, p + Math.floor(Math.random() * 3) + 1);
      updateBar();
    }, 150);

    const onReady = () => {
      if (done) return;
      clearInterval(iv);
      const completeTimer = setInterval(() => {
        p = Math.min(100, p + 2);
        updateBar();
        if (p >= 100) {
          clearInterval(completeTimer);
          setTimeout(finish, 180);
        }
      }, 60);
    };

    if (document.readyState === 'complete') {
      onReady();
    } else {
      window.addEventListener('load', onReady, { once: true });
    }

    setTimeout(() => {
      clearInterval(iv);
      finish();
    }, 6000);
  }

  function initAgeGate() {
    const gate = document.getElementById('age-gate');
    if (!gate) return;

    gate.style.display = 'none';

    function showGate() {
      gate.style.display = '';
      gate.classList.remove('hidden');
      const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
      const mSel = document.getElementById('agM');
      const ySel = document.getElementById('agY');
      if (mSel && !mSel.children.length && ySel) {
        months.forEach((m, i) => {
          const o = document.createElement('option');
          o.value = i + 1;
          o.textContent = m;
          mSel.appendChild(o);
        });
        const yr = new Date().getFullYear();
        for (let y = yr; y >= 1920; y--) {
          const o = document.createElement('option');
          o.value = y;
          o.textContent = y;
          ySel.appendChild(o);
        }
      }
      initAgeGateCustomSelects(gate);
    }

    function hideGate() {
      gate.classList.add('hidden');
      gate.style.display = 'none';
    }

    function decide(settings) {
      if (settings && settings.ageGateEnabled === false) { hideGate(); return; }
      if (sessionStorage.getItem('bs_age_verified') === 'true') { hideGate(); return; }
      showGate();
    }

    var ready = window.bladesmithSiteSettingsReady;
    if (ready && typeof ready.then === 'function') {
      ready.then(decide).catch(function() { decide({}); });
    } else {
      decide(window.getBladesmithSiteSettings ? window.getBladesmithSiteSettings() : {});
    }
  }

  function initAgeGateCustomSelects(gate) {
    if (!gate || gate.dataset.customSelectInit === 'true') return;
    const useCustom = window.matchMedia('(pointer: coarse), (max-width: 48rem)').matches;
    if (!useCustom) return;
    gate.dataset.customSelectInit = 'true';
    gate.classList.add('ag-custom');

    const closeAll = () => {
      gate.querySelectorAll('.ag-select.open').forEach((wrap) => {
        wrap.classList.remove('open');
        const btn = wrap.querySelector('.ag-select-btn');
        if (btn) btn.setAttribute('aria-expanded', 'false');
      });
    };

    gate.querySelectorAll('.ag-sel select').forEach((select) => {
      if (select.dataset.customized === 'true') return;
      select.dataset.customized = 'true';

      const wrap = document.createElement('div');
      wrap.className = 'ag-select';

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ag-select-btn';
      btn.setAttribute('aria-haspopup', 'listbox');
      btn.setAttribute('aria-expanded', 'false');

      const label = document.createElement('span');
      label.className = 'ag-select-label';
      label.textContent = select.options[select.selectedIndex]?.text || select.options[0]?.text || 'Select';
      btn.appendChild(label);
      wrap.appendChild(btn);

      const list = document.createElement('div');
      list.className = 'ag-select-list';
      list.setAttribute('role', 'listbox');

      const buildOptions = () => {
        list.innerHTML = '';
        Array.from(select.options).forEach((opt) => {
          const item = document.createElement('button');
          item.type = 'button';
          item.className = 'ag-select-option';
          item.textContent = opt.textContent;
          item.dataset.value = opt.value;
          item.setAttribute('role', 'option');
          if (opt.value === '' || opt.disabled) {
            item.disabled = true;
            item.classList.add('placeholder');
          }
          if (opt.value === select.value) {
            item.setAttribute('aria-selected', 'true');
          }
          item.addEventListener('click', (event) => {
            event.stopPropagation();
            select.value = opt.value;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            label.textContent = opt.textContent;
            closeAll();
          });
          list.appendChild(item);
        });
      };

      buildOptions();
      wrap.appendChild(list);

      select.classList.add('ag-native');
      select.setAttribute('tabindex', '-1');
      select.setAttribute('aria-hidden', 'true');

      select.parentNode.insertBefore(wrap, select);
      wrap.appendChild(select);

      select.addEventListener('change', () => {
        label.textContent = select.options[select.selectedIndex]?.text || label.textContent;
        Array.from(list.children).forEach((child) => {
          child.setAttribute('aria-selected', child.dataset.value === select.value ? 'true' : 'false');
        });
      });

      btn.addEventListener('click', (event) => {
        event.stopPropagation();
        const isOpen = wrap.classList.contains('open');
        closeAll();
        if (!isOpen) {
          wrap.classList.add('open');
          btn.setAttribute('aria-expanded', 'true');
        }
      });
    });

    document.addEventListener('click', (event) => {
      if (!gate.contains(event.target)) return;
      if (event.target.closest('.ag-select')) return;
      closeAll();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeAll();
    });
  }

  window.checkAge = function () {
    const mNode = document.getElementById('agM');
    const yNode = document.getElementById('agY');
    const gate = document.getElementById('age-gate');
    if (!mNode || !yNode || !gate) return;

    const m = parseInt(mNode.value, 10);
    const y = parseInt(yNode.value, 10);
    if (!m || !y) {
      alert('Please select your birth month and year.');
      return;
    }
    const age = (Date.now() - new Date(y, m - 1, 1)) / (365.25 * 24 * 60 * 60 * 1000);
    if (age < 18) {
      window.location.href = 'https://www.google.com';
      return;
    }

    sessionStorage.setItem('bs_age_verified', 'true');
    gate.classList.add('hidden');
  };

  window.toggleChat = function () {
    const widget = document.getElementById('chat-widget');
    if (!widget) return;
    const nextOpen = !widget.classList.contains('open');
    widget.classList.toggle('open', nextOpen);
    const sc = document.getElementById('sticky-contact');
    if (sc) sc.classList.toggle('chat-open', nextOpen);
    if (nextOpen) maybeRequestChatNotificationPermission();
  };

  // sendChat defined below with proper backend integration

  const CHAT_STORAGE_KEY = 'bs_chat_history';
  const CHAT_ENDPOINT = '/api/chat';
  const CHAT_GREETING = 'Hi, James here. Interested in commissioning a blade? Tell me what you hunt and I\'ll recommend the right steel.';
  const CHAT_FALLBACK = 'Thanks for reaching out. James will personally review your message and reply shortly. In the meantime, feel free to browse the collection or reach us on WhatsApp for faster response.';
  const CHAT_POLL_INTERVAL_MS = 12000;
  let chatPollTimer = null;
  let chatNotificationRequested = false;
  let chatUnreadCount = 0;
  const CHAT_BASE_TITLE = document.title;

  function readChatHistory() {
    try {
      const raw = localStorage.getItem(CHAT_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map((entry) => ({
          role: entry?.role === 'assistant' ? 'assistant' : 'user',
          text: String(entry?.text || '').trim()
        }))
        .filter((entry) => entry.text);
    } catch {
      return [];
    }
  }

  function saveChatHistory(history) {
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(history.slice(-20)));
    } catch {
      // best effort only
    }
  }

  function seedChatHistory() {
    const history = readChatHistory();
    if (history.length) return history;
    const seeded = [{ role: 'assistant', text: CHAT_GREETING }];
    saveChatHistory(seeded);
    return seeded;
  }

  function appendChatBubble(role, text) {
    const body = document.getElementById('chatBody');
    if (!body) return;
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${role === 'assistant' ? 'them' : 'me'}`;
    bubble.textContent = text;
    body.appendChild(bubble);
    body.scrollTop = body.scrollHeight;
  }

  function getChatVisitorId() {
    const key = 'bs_visitor_id';
    let id = localStorage.getItem(key);
    if (!id) {
      id = 'v-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
      localStorage.setItem(key, id);
    }
    return id;
  }

  function maybeRequestChatNotificationPermission() {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted' || Notification.permission === 'denied') return;
    if (chatNotificationRequested) return;
    chatNotificationRequested = true;
    Notification.requestPermission().catch(() => {});
  }

  function notifyChatReplies(messages) {
    if (!messages.length) return;
    const shouldNotify = document.hidden || !document.getElementById('chat-widget')?.classList.contains('open');
    if (shouldNotify) {
      chatUnreadCount = (chatUnreadCount || 0) + messages.length;
      setChatUnreadCount(chatUnreadCount);
      // always play a short sound when admin replies arrive on frontend
      playChatSound();
      const preview = messages.length === 1 ? messages[0].message : `${messages.length} new messages`;
      const body = preview.length > 140 ? `${preview.slice(0, 137)}...` : preview;
      showChatToast(body);
    }
  }

  function setChatUnreadCount(n) {
    chatUnreadCount = n || 0;
    const el = document.getElementById('chatUnreadBadge');
    if (!el) return;
    if (chatUnreadCount > 0) {
      el.style.display = 'flex';
      el.textContent = chatUnreadCount > 99 ? '99+' : String(chatUnreadCount);
      document.title = `(${chatUnreadCount}) ${CHAT_BASE_TITLE}`;
    } else {
      el.style.display = 'none';
      document.title = CHAT_BASE_TITLE;
    }
  }

  function playChatSound() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = 880;
      o.connect(g);
      g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01);
      o.start();
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
      setTimeout(() => { try { o.stop(); ctx.close(); } catch {} }, 300);
    } catch (e) {
      // ignore
    }
  }

  function ensureToastContainer() {
    let c = document.getElementById('bs-chat-toast');
    if (c) return c;
    c = document.createElement('div');
    c.id = 'bs-chat-toast';
    c.style.position = 'fixed';
    c.style.right = '1rem';
    c.style.bottom = '4.5rem';
    c.style.zIndex = '9999';
    c.style.display = 'flex';
    c.style.flexDirection = 'column';
    c.style.gap = '0.5rem';
    document.body.appendChild(c);
    return c;
  }

  function showChatToast(text) {
    try {
      const c = ensureToastContainer();
      const t = document.createElement('div');
      t.className = 'bs-chat-toast-item';
      t.textContent = text;
      t.style.background = 'rgba(0,0,0,0.85)';
      t.style.color = '#fff';
      t.style.padding = '0.6rem 0.9rem';
      t.style.borderRadius = '0.6rem';
      t.style.boxShadow = '0 6px 18px rgba(0,0,0,0.35)';
      t.style.maxWidth = '20rem';
      t.style.fontSize = '0.95rem';
      t.style.opacity = '0';
      t.style.transform = 'translateY(6px)';
      t.style.transition = 'opacity .18s ease, transform .18s ease';
      c.appendChild(t);
      requestAnimationFrame(() => {
        t.style.opacity = '1';
        t.style.transform = 'translateY(0)';
      });
      setTimeout(() => {
        t.style.opacity = '0';
        t.style.transform = 'translateY(6px)';
        setTimeout(() => t.remove(), 220);
      }, 4500);
    } catch (e) {
      // ignore
    }
  }

  async function pollChatReplies() {
    try {
      const visitorId = getChatVisitorId();
      const response = await fetch(`${CHAT_ENDPOINT}/poll/${encodeURIComponent(visitorId)}`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) return;
      const incoming = Array.isArray(data?.messages) ? data.messages : [];
      if (!incoming.length) return;
      const history = readChatHistory();
      const nextHistory = [...history];
      const appended = [];
      incoming.forEach((entry) => {
        const text = String(entry?.message || '').trim();
        if (!text) return;
        appendChatBubble('assistant', text);
        nextHistory.push({ role: 'assistant', text });
        appended.push({ message: text });
      });
      if (appended.length) {
        saveChatHistory(nextHistory);
        notifyChatReplies(appended);
      }
    } catch (err) {
      console.warn('Chat poll failed', err?.message || err);
    }
  }

  function startChatPolling() {
    if (chatPollTimer) return;
    pollChatReplies();
    chatPollTimer = setInterval(pollChatReplies, CHAT_POLL_INTERVAL_MS);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && document.getElementById('chat-widget')?.classList.contains('open')) {
        chatUnreadCount = 0;
      }
    });
  }

  function renderChatHistory() {
    const body = document.getElementById('chatBody');
    if (!body) return;
    body.innerHTML = '';
    seedChatHistory().forEach((entry) => appendChatBubble(entry.role, entry.text));
  }

  function bindChatDismiss() {
    document.addEventListener('click', (event) => {
      const widget = document.getElementById('chat-widget');
      if (!widget || !widget.classList.contains('open')) return;
      const target = event.target instanceof Element ? event.target : null;
      if (!target) return;
      if (widget.contains(target) || target.closest('.sc-fab.chat')) return;
      widget.classList.remove('open');
    });
  }

  function initChatWidget() {
    if (!document.getElementById('chat-widget')) return;
    renderChatHistory();
    bindChatDismiss();
  }

  function ensureCursorMarkup() {
    if (!document.getElementById('cur')) {
      document.body.insertAdjacentHTML('afterbegin', '<div id="cur"></div><div id="cur-ring"></div>');
    }
  }

  function initCursor() {
    ensureCursorMarkup();
    const cur = document.getElementById('cur');
    const ring = document.getElementById('cur-ring');
    const finePointer = window.matchMedia('(pointer:fine)').matches;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const allowCursorFx = finePointer && !reducedMotion;

    if (!allowCursorFx) {
      if (cur) cur.style.display = 'none';
      if (ring) ring.style.display = 'none';
      document.body.style.cursor = 'auto';
      return;
    }

    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let rx = mx;
    let ry = my;
    let mouseQueued = false;
    let cursorRunning = false;
    let cursorRaf = 0;

    let lastCursorMoveTime = 0;
    const CURSOR_IDLE_MS = 150;

    document.addEventListener('mousemove', (e) => {
      mx = e.clientX;
      my = e.clientY;
      lastCursorMoveTime = performance.now();
      if (!cursorRaf && cursorRunning) {
        cursorRaf = requestAnimationFrame(renderCursorRing);
      }
      if (mouseQueued) return;
      mouseQueued = true;
      requestAnimationFrame(() => {
        mouseQueued = false;
        if (cur) {
          cur.style.left = mx + 'px';
          cur.style.top = my + 'px';
        }
      });
    }, { passive: true });

    function renderCursorRing() {
      if (!cursorRunning || !ring) return;
      const idleFor = performance.now() - lastCursorMoveTime;
      if (idleFor > CURSOR_IDLE_MS) {
        ring.style.left = mx + 'px';
        ring.style.top = my + 'px';
        cursorRaf = 0;
        return;
      }
      rx += (mx - rx) * 0.14;
      ry += (my - ry) * 0.14;
      ring.style.left = rx + 'px';
      ring.style.top = ry + 'px';
      cursorRaf = requestAnimationFrame(renderCursorRing);
    }

    function syncCursorLoop() {
      if (document.hidden) {
        if (cursorRunning) {
          cursorRunning = false;
          cancelAnimationFrame(cursorRaf);
        }
        return;
      }
      if (!cursorRunning) {
        cursorRunning = true;
        renderCursorRing();
      }
    }

    document.addEventListener('visibilitychange', syncCursorLoop);
    document.addEventListener('bs:pagechange', syncCursorLoop);
    syncCursorLoop();

    document.querySelectorAll('a,button,.sc-fab').forEach((el) => {
      el.addEventListener('mouseenter', () => document.body.classList.add('cx'));
      el.addEventListener('mouseleave', () => document.body.classList.remove('cx'));
    });
  }

  window.toggleChat = function () {
    const widget = document.getElementById('chat-widget');
    if (!widget) return;
    const nextOpen = !widget.classList.contains('open');
    widget.classList.toggle('open', nextOpen);
    const sc = document.getElementById('sticky-contact');
    if (sc) sc.classList.toggle('chat-open', nextOpen);
    if (nextOpen) {
      maybeRequestChatNotificationPermission();
      chatUnreadCount = 0;
      document.title = CHAT_BASE_TITLE;
    }
  };

  window.sendChat = async function () {
    const input = document.getElementById('chatInput');
    const body = document.getElementById('chatBody');
    if (!input || !body) return;
    const txt = input.value.trim();
    if (!txt) return;
    const sendButton = document.querySelector('#chat-widget .chat-foot button');
    const currentHistory = readChatHistory();
    const nextHistory = [...currentHistory, { role: 'user', text: txt }].slice(-20);
    appendChatBubble('user', txt);
    saveChatHistory(nextHistory);
    input.value = '';
    input.disabled = true;
    if (sendButton) sendButton.disabled = true;

    try {
      maybeRequestChatNotificationPermission();
      const response = await fetch(CHAT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: txt,
          visitorId: getChatVisitorId(),
          history: nextHistory,
          page: window.location.pathname
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || `HTTP ${response.status}`);
      }

      const reply = String(data?.reply || '').trim();
      if (reply) {
        appendChatBubble('assistant', reply);
        saveChatHistory([...nextHistory, { role: 'assistant', text: reply }]);
      }
    } catch (error) {
      console.error('Live chat failed:', error);
      appendChatBubble('assistant', CHAT_FALLBACK);
      saveChatHistory([...nextHistory, { role: 'assistant', text: CHAT_FALLBACK }]);
    } finally {
      input.disabled = false;
      if (sendButton) sendButton.disabled = false;
    }
  };

  ensurePreloaderMarkup();
  ensureAgeGateMarkup();
  ensureStickyContactMarkup();
  initChatWidget();
  startChatPolling();
  initCursor();
  initPreloader();
  initAgeGate();

  const nav = document.getElementById('nav');
  const button = document.getElementById('navHam');
  const mobNav = document.getElementById('mob-nav');
  const closeButton = document.getElementById('mob-close');

  let navOpen = false;

  function setNavOpen(nextState) {
    navOpen = nextState;
    if (mobNav) mobNav.classList.toggle('open', navOpen);
    if (button) button.classList.toggle('open', navOpen);
    document.body.classList.toggle('nav-open', navOpen);
    document.body.style.overflow = navOpen ? 'hidden' : '';
  }

  if (button && mobNav) {
    button.addEventListener('click', () => setNavOpen(!navOpen));
    mobNav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        if (navOpen) setNavOpen(false);
      });
    });
  }

  if (closeButton && mobNav) {
    closeButton.addEventListener('click', () => {
      if (navOpen) setNavOpen(false);
    });
  }

  if (nav) {
    const onScroll = () => nav.classList.toggle('solid', window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }
})();


