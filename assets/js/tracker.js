// Forge Dominance User Tracking System
// Batches events and flushes every 10 seconds to reduce network calls

class BladeSmithTracker {
  constructor() {
    this.visitorId = this.getOrCreateVisitorId();
    this.sessionStart = Date.now();
    this.pageStart = Date.now();
    this.currentPage = window.location.pathname;
    this.pageViewCount = 0;
    this.eventQueue = [];
    this.flushInterval = null;
    this.isInitialized = false;
    this.maxScrollPercent = 0;

    this.init();
  }

  getOrCreateVisitorId() {
    let id = localStorage.getItem('bs_visitor_id');
    if (!id) {
      id = 'visitor_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
      localStorage.setItem('bs_visitor_id', id);
    }
    return id;
  }

  init() {
    this.trackPageView();

    document.addEventListener('click', (e) => this.trackClick(e));
    document.addEventListener('submit', (e) => this.trackFormSubmit(e));
    window.addEventListener('beforeunload', () => this.onBeforeUnload());
    window.addEventListener('popstate', () => this.onPageChange());

    document.addEventListener('click', (e) => {
      const link = e.target.closest('a');
      if (link && !link.target && !link.hasAttribute('onclick')) {
        const href = link.getAttribute('href');
        if (href && !href.startsWith('http') && !href.startsWith('mailto')) {
          setTimeout(() => this.onPageChange(), 100);
        }
      }
    });

    setInterval(() => this.sendPeriodicUpdate(), 30000);

    let throttled = false;
    window.addEventListener('scroll', () => {
      if (throttled) return;
      throttled = true;
      setTimeout(() => { throttled = false; }, 250);
      const doc = document.documentElement;
      const scrollTop = (window.pageYOffset || doc.scrollTop) - (doc.clientTop || 0);
      const height = Math.max(doc.scrollHeight - doc.clientHeight, 1);
      const percent = Math.round((scrollTop / height) * 100);
      if (percent > this.maxScrollPercent) this.maxScrollPercent = percent;
    });

    this.flushInterval = setInterval(() => this.flushQueue(), 10000);

    this.isInitialized = true;
  }

  trackPageView() {
    this.pageStart = Date.now();
    this.pageViewCount++;

    const payload = {
      visitorId: this.visitorId,
      path: this.currentPage,
      action: 'pageview',
      meta: {
        details: { title: document.title, referrer: document.referrer, viewCount: this.pageViewCount },
        durationMs: 0,
        sentAt: new Date().toISOString()
      }
    };

    this.eventQueue.push(payload);
  }

  trackClick(event) {
    const target = event.target;

    let actionType = 'click';
    if (target.tagName === 'BUTTON') actionType = 'button_click';
    if (target.tagName === 'A') actionType = 'link_click';
    if (target.type === 'submit') actionType = 'form_submit_btn';
    if (target.type === 'checkbox') actionType = 'checkbox';
    if (target.type === 'radio') actionType = 'radio';

    this.eventQueue.push({
      visitorId: this.visitorId,
      path: this.currentPage,
      action: actionType,
      meta: {
        details: {
          tag: target.tagName,
          id: target.id || '',
          class: target.className || '',
          text: target.textContent ? target.textContent.substring(0, 50) : ''
        },
        durationMs: Date.now() - this.pageStart,
        sentAt: new Date().toISOString()
      }
    });
  }

  trackFormSubmit(event) {
    const form = event.target;

    this.eventQueue.push({
      visitorId: this.visitorId,
      path: this.currentPage,
      action: 'form_submit',
      meta: {
        details: { formId: form.id || '', formName: form.name || '', formAction: form.action || '' },
        durationMs: Date.now() - this.pageStart,
        sentAt: new Date().toISOString()
      }
    });
  }

  trackPageExit() {
    const timeOnPage = Date.now() - this.pageStart;
    const details = { timeOnPage: Math.floor(timeOnPage / 1000) };
    if (this.maxScrollPercent > 0) details.maxScrollPercent = this.maxScrollPercent;

    this.eventQueue.push({
      visitorId: this.visitorId,
      path: this.currentPage,
      action: 'page_exit',
      meta: {
        details,
        durationMs: timeOnPage,
        sentAt: new Date().toISOString()
      }
    });
  }

  onPageChange() {
    const newPage = window.location.pathname;
    if (newPage !== this.currentPage) {
      this.trackPageExit();
      this.currentPage = newPage;
      this.maxScrollPercent = 0;
      setTimeout(() => this.trackPageView(), 100);
    }
  }

  onBeforeUnload() {
    this.trackPageExit();
    this.flushQueueBeacon();
  }

  sendPeriodicUpdate() {
    if (!this.isInitialized) return;
    const details = { sessionDuration: Math.floor((Date.now() - this.sessionStart) / 1000) };
    if (this.maxScrollPercent > 0) details.maxScrollPercent = this.maxScrollPercent;

    this.eventQueue.push({
      visitorId: this.visitorId,
      path: this.currentPage,
      action: 'periodic_check',
      meta: {
        details,
        durationMs: Date.now() - this.pageStart,
        sentAt: new Date().toISOString()
      }
    });
  }

  flushQueue() {
    if (this.eventQueue.length === 0) return;

    const batch = this.eventQueue.splice(0);

    fetch('/api/visitors/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: batch }),
      keepalive: true
    }).catch(() => {
      this.eventQueue.unshift(...batch);
    });
  }

  flushQueueBeacon() {
    if (this.eventQueue.length === 0) return;

    const batch = this.eventQueue.splice(0);
    const blob = new Blob([JSON.stringify({ events: batch })], { type: 'application/json' });
    navigator.sendBeacon('/api/visitors/track', blob);
  }

  trackEvent(eventName, details = {}) {
    this.eventQueue.push({
      visitorId: this.visitorId,
      path: this.currentPage,
      action: eventName,
      meta: {
        details,
        durationMs: Date.now() - this.pageStart,
        sentAt: new Date().toISOString()
      }
    });
  }

  getVisitorInfo() {
    return {
      visitorId: this.visitorId,
      currentPage: this.currentPage,
      sessionDuration: Math.floor((Date.now() - this.sessionStart) / 1000),
      pageViewCount: this.pageViewCount
    };
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.bsTracker = new BladeSmithTracker();
  });
} else {
  window.bsTracker = new BladeSmithTracker();
}

window.trackBSEvent = (name, details) => {
  if (window.bsTracker) {
    window.bsTracker.trackEvent(name, details);
  }
};


