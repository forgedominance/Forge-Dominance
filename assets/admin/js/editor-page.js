/* editor-page.js — Admin visual page editor */
const pageSelect = document.getElementById('pageSelect');
const saveBtn = document.getElementById('saveBtn');
const undoBtn = document.getElementById('undoBtn');
const redoBtn = document.getElementById('redoBtn');
const propsContent = document.getElementById('propsContent');
const iframeWrap = document.getElementById('iframeWrap');
const frame = document.getElementById('editorFrame');

let currentFile = '';
let selectedEl = null;
let history = [];
let historyIdx = -1;
let unsaved = false;
let originalHtml = '';

function edToast(msg, type) {
  const el = document.createElement('div');
  el.className = 'ed-toast ' + (type||'info');
  el.textContent = msg;
  document.getElementById('toastWrap').appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// Dynamically loaded list of editable pages (file + label), fetched from backend
let editablePages = [];

async function loadEditablePagesList() {
  try {
    const res = await fetch('/api/editor/pages', { headers: { ...TokenManager.getAuthHeader() } });
    const data = await res.json();
    editablePages = Array.isArray(data.pages) ? data.pages : [];

    pageSelect.innerHTML = '<option value="">Select Page...</option>' +
      editablePages.map(p => `<option value="${p.file}">${p.label}</option>`).join('');

    const quickLoadList = document.getElementById('quickLoadList');
    if (quickLoadList) {
      quickLoadList.innerHTML = editablePages.map(p =>
        `<div class="ed-section-item" style="cursor:pointer" onclick="loadPage('${p.file}')">${p.label}</div>`
      ).join('');
    }
  } catch (e) {
    edToast('Failed to load page list', 'error');
  }
}
loadEditablePagesList();

// Load page by setting iframe src to actual URL so all CSS/JS/images load properly
pageSelect.addEventListener('change', () => { if (pageSelect.value) loadPage(pageSelect.value); });

async function loadPage(file) {
  currentFile = file;
  pageSelect.value = file;
  document.getElementById('edPlaceholder').classList.add('hidden');
  try {
    // Fetch real page HTML via authenticated API (bypasses admin-subdomain routing block)
    const res = await fetch('/api/editor/page?file=' + encodeURIComponent(file), {
      headers: { ...TokenManager.getAuthHeader() }
    });
    if (!res.ok) throw new Error('Failed to fetch page (' + res.status + ')');
    const data = await res.json();
    let html = data.html || '';

    // Inject <base href="/"> so relative asset paths (e.g. "assets/css/x.css")
    // resolve against the admin subdomain's root instead of the srcdoc's
    // implicit base (the editor.html URL). Same-origin, so no CSP issues.
    if (/<head[^>]*>/i.test(html)) {
      html = html.replace(/<head([^>]*)>/i, '<head$1><base href="/">');
    } else {
      html = '<base href="/">' + html;
    }

    frame.onload = () => {
      try {
        originalHtml = '<!DOCTYPE html>\n' + frame.contentDocument.documentElement.outerHTML;
        injectEditor();
        history = [originalHtml];
        historyIdx = 0;
        unsaved = false;
        saveBtn.classList.remove('unsaved');
        updateUndoRedo();
        edToast('Loaded: ' + file, 'info');
      } catch(e) {
        edToast('Failed to access page frame', 'error');
      }
    };
    frame.srcdoc = html;
  } catch (e) {
    edToast('Failed to load page: ' + e.message, 'error');
  }
}

function injectEditor() {
  const doc = frame.contentDocument;
  if (!doc) return;

  // Hide preloader/age-gate/promo ads if present
  const preloader = doc.getElementById('preloader');
  if (preloader) preloader.style.display = 'none';
  const ageGate = doc.getElementById('age-gate');
  if (ageGate) ageGate.style.display = 'none';
  const promoAd = doc.getElementById('promo-ad-modal');
  if (promoAd) promoAd.remove();
  const promoBackdrop = doc.getElementById('promo-ad-backdrop');
  if (promoBackdrop) promoBackdrop.remove();
  // Remove any remaining ad overlays
  doc.querySelectorAll('[id*="promo-ad"]').forEach(el => el.remove());
  // Restore body scroll if locked by ad
  doc.body.style.overflow = '';

  // Inject minimal editor styles (only shows when element is selected)
  const style = doc.createElement('style');
  style.id = 'editor-inject-style';
  style.textContent = `
    [data-ed-selected]{outline:2px solid #3B82F6!important;outline-offset:2px}
    [contenteditable=true]{outline:2px solid #10B981!important;outline-offset:1px;min-height:1em}
  `;
  doc.head.appendChild(style);

  // Single click = normal page use (browse, click links, scroll)
  // Double click = select element for editing + show properties
  // Triple click on text = inline edit mode

  let lastClickTime = 0;
  let lastClickEl = null;

  doc.addEventListener('click', (e) => {
    const now = Date.now();
    const el = e.target;

    // Detect double-click (two clicks within 400ms on same element)
    if (el === lastClickEl && now - lastClickTime < 400) {
      // Double click: select element for editing
      e.preventDefault();
      e.stopPropagation();
      selectElement(el);
      lastClickTime = 0;
      lastClickEl = null;
      return;
    }

    lastClickTime = now;
    lastClickEl = el;

    // Intercept internal navigation links to load in editor instead
    const link = el.closest('a');
    if (link && link.href) {
      const url = new URL(link.href, frame.contentWindow.location.origin);
      const path = url.pathname.replace(/^\//, '');
      const allowed = editablePages.map(p => p.file);
      if (allowed.includes(path) || (path === '' && allowed.includes('index.html'))) {
        e.preventDefault();
        const file = path === '' ? 'index.html' : path;
        loadPage(file);
        return;
      }
    }
    // Single click: let the page handle it normally
  }, false);

  // Triple-click (dblclick event) on text = inline text editing
  doc.addEventListener('dblclick', (e) => {
    const el = e.target;
    const editable = ['H1','H2','H3','H4','H5','H6','P','SPAN','A','LI','BUTTON','LABEL','TD','TH','SUMMARY','FIGCAPTION'];
    // Only enter edit mode if element is already selected
    if (el.hasAttribute('data-ed-selected') && editable.includes(el.tagName)) {
      e.preventDefault();
      el.contentEditable = 'true';
      el.focus();
      el.addEventListener('blur', () => {
        el.contentEditable = 'false';
        markUnsaved();
        pushHistory();
      }, { once: true });
      el.addEventListener('keydown', (ke) => {
        if (ke.key === 'Escape') { el.blur(); }
      });
    }
  });

  // Drag & drop for sections
  doc.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
  doc.addEventListener('drop', (e) => {
    e.preventDefault();
    const key = e.dataTransfer.getData('text/plain');
    const tmpl = SECTION_TEMPLATES[key];
    if (!tmpl) return;
    const target = e.target.closest('section,main,body') || doc.body;
    const main = doc.querySelector('main') || doc.body;
    main.insertAdjacentHTML('beforeend', tmpl);
    markUnsaved();
    pushHistory();
    edToast('Section added', 'success');
  });
}

function selectElement(el) {
  const doc = frame.contentDocument;
  if (!doc) return;
  if (selectedEl) selectedEl.removeAttribute('data-ed-selected');
  selectedEl = el;
  el.setAttribute('data-ed-selected', '');
  el.removeAttribute('data-ed-hover');
  showProps(el);
}

function showProps(el) {
  const win = frame.contentWindow;
  if (!win) return;
  const cs = win.getComputedStyle(el);
  const tag = el.tagName.toLowerCase();
  const isImg = tag === 'img';
  const isText = ['h1','h2','h3','h4','h5','h6','p','span','a','li','button','label','summary','figcaption'].includes(tag);

  let html = `<div class="ed-panel-section"><div class="ed-panel-title">&lt;${tag}&gt;</div></div>`;

  if (isText) {
    html += `<div class="prop-group"><div class="prop-label">Text Content</div><textarea class="prop-input" id="pText" rows="3">${esc(el.textContent)}</textarea></div>`;
    html += `<div class="prop-group"><div class="prop-label">Font Size</div><input class="prop-input" id="pFS" value="${cs.fontSize}"></div>`;
    html += `<div class="prop-group"><div class="prop-label">Font Weight</div><select class="prop-input" id="pFW"><option value="300">Light</option><option value="400">Normal</option><option value="500">Medium</option><option value="600">Semi-bold</option><option value="700">Bold</option></select></div>`;
    html += `<div class="prop-group"><div class="prop-label">Color</div><div class="prop-row"><div class="prop-color"><input type="color" id="pColor" value="${rgbHex(cs.color)}"></div><input class="prop-input" id="pColorHex" value="${rgbHex(cs.color)}"></div></div>`;
    html += `<div class="prop-group"><div class="prop-label">Text Align</div><select class="prop-input" id="pTA"><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option><option value="justify">Justify</option></select></div>`;
  }

  if (isImg) {
    html += `<div class="prop-group"><div class="prop-label">Image Source</div><input class="prop-input" id="pSrc" value="${esc(el.getAttribute('src')||'')}"></div>`;
    html += `<div class="prop-group"><div class="prop-label">Alt Text</div><input class="prop-input" id="pAlt" value="${esc(el.alt||'')}"></div>`;
    html += `<div class="prop-group"><button class="prop-btn" id="pUpload">Upload New Image</button></div>`;
  }

  html += `<div class="prop-group"><div class="prop-label">Background</div><div class="prop-row"><div class="prop-color"><input type="color" id="pBg" value="${rgbHex(cs.backgroundColor)}"></div><input class="prop-input" id="pBgHex" value="${rgbHex(cs.backgroundColor)}"></div></div>`;
  html += `<div class="prop-group"><div class="prop-label">Padding</div><input class="prop-input" id="pPad" value="${cs.padding}"></div>`;
  html += `<div class="prop-group"><div class="prop-label">Margin</div><input class="prop-input" id="pMar" value="${cs.margin}"></div>`;
  html += `<div class="prop-group"><div class="prop-label">Border Radius</div><input class="prop-input" id="pBR" value="${cs.borderRadius}"></div>`;
  html += `<div class="prop-group"><button class="prop-btn prop-btn-danger" id="pDel">Delete Element</button></div>`;

  propsContent.innerHTML = html;
  bindProps(el, cs);
}

function bindProps(el, cs) {
  const on = (id, cb) => { const e = document.getElementById(id); if(e) e.addEventListener('input', cb); if(e) e.addEventListener('change', () => pushHistory()); };

  on('pText', () => { el.textContent = document.getElementById('pText').value; markUnsaved(); });
  on('pFS', () => { el.style.fontSize = document.getElementById('pFS').value; markUnsaved(); });
  on('pFW', () => { el.style.fontWeight = document.getElementById('pFW').value; markUnsaved(); });
  on('pColor', () => { const v=document.getElementById('pColor').value; el.style.color=v; const h=document.getElementById('pColorHex'); if(h)h.value=v; markUnsaved(); });
  on('pColorHex', () => { const v=document.getElementById('pColorHex').value; el.style.color=v; const c=document.getElementById('pColor'); if(c)c.value=v; markUnsaved(); });
  on('pTA', () => { el.style.textAlign = document.getElementById('pTA').value; markUnsaved(); });
  on('pBg', () => { const v=document.getElementById('pBg').value; el.style.backgroundColor=v; const h=document.getElementById('pBgHex'); if(h)h.value=v; markUnsaved(); });
  on('pBgHex', () => { const v=document.getElementById('pBgHex').value; el.style.backgroundColor=v; const c=document.getElementById('pBg'); if(c)c.value=v; markUnsaved(); });
  on('pPad', () => { el.style.padding = document.getElementById('pPad').value; markUnsaved(); });
  on('pMar', () => { el.style.margin = document.getElementById('pMar').value; markUnsaved(); });
  on('pBR', () => { el.style.borderRadius = document.getElementById('pBR').value; markUnsaved(); });

  const srcEl = document.getElementById('pSrc');
  if(srcEl) srcEl.addEventListener('change', () => { el.src = srcEl.value; markUnsaved(); pushHistory(); });
  const altEl = document.getElementById('pAlt');
  if(altEl) altEl.addEventListener('change', () => { el.alt = altEl.value; markUnsaved(); pushHistory(); });

  const upEl = document.getElementById('pUpload');
  if(upEl) upEl.addEventListener('click', () => {
    const inp = document.createElement('input'); inp.type='file'; inp.accept='image/*';
    inp.onchange = async () => {
      const f = inp.files[0]; if(!f) return;
      const fd = new FormData(); fd.append('image', f);
      try {
        const r = await fetch('/api/uploads/upload-image', { method:'POST', headers:TokenManager.getAuthHeader(), body:fd });
        const d = await r.json();
        const url = d.url || d.imageUrl || d.path;
        if(url){ el.src=url; if(srcEl) srcEl.value=url; markUnsaved(); pushHistory(); edToast('Uploaded','success'); }
      } catch(e){ edToast('Upload failed','error'); }
    };
    inp.click();
  });

  const delEl = document.getElementById('pDel');
  if(delEl) delEl.addEventListener('click', () => {
    if(!confirm('Delete this element?')) return;
    el.remove(); selectedEl=null;
    propsContent.innerHTML='<div class="no-sel">Element deleted</div>';
    markUnsaved(); pushHistory();
  });

  // Set current values for selects
  const fw = document.getElementById('pFW'); if(fw) fw.value = parseInt(cs.fontWeight)||400;
  const ta = document.getElementById('pTA'); if(ta) ta.value = cs.textAlign || 'left';
}

// History
function pushHistory() {
  const doc = frame.contentDocument; if(!doc) return;
  const snap = getCleanHtml();
  if(historyIdx < history.length-1) history = history.slice(0, historyIdx+1);
  history.push(snap);
  if(history.length>50) history.shift();
  historyIdx = history.length-1;
  updateUndoRedo();
}
function undo() { if(historyIdx<=0) return; historyIdx--; restoreSnap(); }
function redo() { if(historyIdx>=history.length-1) return; historyIdx++; restoreSnap(); }
function restoreSnap() {
  frame.srcdoc = history[historyIdx];
  frame.onload = () => { injectEditor(); updateUndoRedo(); };
  markUnsaved();
}
function updateUndoRedo() {
  undoBtn.style.opacity = historyIdx>0?'1':'.4';
  redoBtn.style.opacity = historyIdx<history.length-1?'1':'.4';
}
undoBtn.addEventListener('click', undo);
redoBtn.addEventListener('click', redo);
document.addEventListener('keydown', (e) => {
  if(e.ctrlKey&&e.key==='z'){e.preventDefault();undo();}
  if(e.ctrlKey&&e.key==='y'){e.preventDefault();redo();}
  if(e.ctrlKey&&e.key==='s'){e.preventDefault();save();}
});

// Save
function markUnsaved(){unsaved=true;saveBtn.classList.add('unsaved');}

function getCleanHtml() {
  const doc = frame.contentDocument; if(!doc) return '';
  const clone = doc.documentElement.cloneNode(true);
  // Remove the <base href="/"> tag we injected for editing — must never be saved to disk
  const baseTag = clone.querySelector('base[href="/"]');
  if (baseTag) baseTag.remove();
  // Remove editor injections
  const injStyle = clone.querySelector('#editor-inject-style');
  if(injStyle) injStyle.remove();
  clone.querySelectorAll('[data-ed-hover]').forEach(e=>e.removeAttribute('data-ed-hover'));
  clone.querySelectorAll('[data-ed-selected]').forEach(e=>e.removeAttribute('data-ed-selected'));
  clone.querySelectorAll('[contenteditable]').forEach(e=>e.removeAttribute('contenteditable'));
  // Remove JS-injected runtime elements that should never be saved to disk
  clone.querySelectorAll('#promo-ad-modal, #promo-ad-backdrop, [id*="promo-ad"]').forEach(e=>e.remove());
  clone.querySelectorAll('.toast-container, .chat-widget-wrap, .sticky-contact').forEach(e=>e.remove());
  // Remove parent div wrapper if it only contained the ad
  clone.querySelectorAll('div:empty').forEach(e=>{ if(!e.id&&!e.className) e.remove(); });
  // Clean body style overflow if it was locked by ad/modal
  const body = clone.querySelector('body');
  if(body && body.style.overflow === 'hidden') body.style.overflow = '';
  if(body && !body.getAttribute('style')?.trim()) body.removeAttribute('style');
  return '<!DOCTYPE html>\n' + clone.outerHTML;
}

async function save() {
  if(!currentFile){edToast('No page selected','error');return;}
  saveBtn.classList.add('saving'); saveBtn.textContent='Saving...';
  const html = getCleanHtml();
  try{localStorage.setItem('editor_draft_'+currentFile,html);}catch(e){}
  try{
    const res = await fetch('/api/editor/save',{method:'POST',headers:{'Content-Type':'application/json',...TokenManager.getAuthHeader()},body:JSON.stringify({file:currentFile,html})});
    const data = await res.json();
    if(!res.ok) throw new Error(data.error||'Save failed');
    unsaved=false; saveBtn.classList.remove('unsaved');
    edToast('Saved!','success');
  }catch(e){edToast(e.message,'error');}
  finally{saveBtn.classList.remove('saving');saveBtn.textContent='Save';}
}
saveBtn.addEventListener('click', save);

// Device toggle
document.querySelectorAll('[data-device]').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('[data-device]').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    iframeWrap.className='ed-iframe-wrap'+(btn.dataset.device!=='desktop'?' '+btn.dataset.device:'');
  });
});

// Panel toggles
document.getElementById('togglePanelBtn').addEventListener('click',()=>document.getElementById('edPanel').classList.toggle('open'));
document.getElementById('togglePropsBtn').addEventListener('click',()=>document.getElementById('edProps').classList.toggle('open'));

// Section templates
const SECTION_TEMPLATES = {
  hero:`<section style="padding:5rem 2rem;text-align:center;background:linear-gradient(180deg,#0B0B0B,#111)"><div style="max-width:60rem;margin:0 auto"><h1 style="font-family:'Bebas Neue',sans-serif;font-size:4rem;color:#F2F0EC;margin-bottom:1rem">Your Headline Here</h1><p style="color:#9A9A9A;font-size:1.1rem;max-width:36rem;margin:0 auto">Your subtext goes here. Double-click to edit.</p></div></section>`,
  text:`<section style="padding:4rem 2rem"><div style="max-width:48rem;margin:0 auto"><h2 style="font-family:'Bebas Neue',sans-serif;font-size:2.5rem;color:#D4500A;margin-bottom:1rem">Section Title</h2><p style="color:#9A9A9A;line-height:1.8">Your paragraph text here. Double-click to edit.</p></div></section>`,
  cta:`<section style="padding:4rem 2rem;text-align:center;background:#0B0B0B;border-top:1px solid rgba(212,80,10,.2);border-bottom:1px solid rgba(212,80,10,.2)"><h2 style="font-family:'Bebas Neue',sans-serif;font-size:3rem;color:#F2F0EC;margin-bottom:1rem">Ready to Order?</h2><p style="color:#9A9A9A;margin-bottom:2rem">Take the next step.</p><a href="/pages/commission.html" style="display:inline-block;padding:.875rem 2rem;background:#D4500A;color:#050505;font-weight:700;text-decoration:none">Get Started</a></section>`,
  features:`<section style="padding:4rem 2rem"><div style="max-width:64rem;margin:0 auto;display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem"><div style="padding:1.5rem;border:1px solid rgba(212,80,10,.15);border-radius:8px"><h3 style="color:#D4500A;margin-bottom:.5rem">Feature One</h3><p style="color:#9A9A9A;font-size:.9rem">Description here.</p></div><div style="padding:1.5rem;border:1px solid rgba(212,80,10,.15);border-radius:8px"><h3 style="color:#D4500A;margin-bottom:.5rem">Feature Two</h3><p style="color:#9A9A9A;font-size:.9rem">Description here.</p></div><div style="padding:1.5rem;border:1px solid rgba(212,80,10,.15);border-radius:8px"><h3 style="color:#D4500A;margin-bottom:.5rem">Feature Three</h3><p style="color:#9A9A9A;font-size:.9rem">Description here.</p></div></div></section>`,
  testimonial:`<section style="padding:4rem 2rem;background:#0B0B0B"><div style="max-width:40rem;margin:0 auto;text-align:center"><p style="font-size:1.2rem;color:#F2F0EC;font-style:italic;line-height:1.8;margin-bottom:1.5rem">"This is the best knife I've ever owned."</p><p style="color:#D4500A;font-weight:600">— Customer Name</p></div></section>`,
  divider:`<div style="padding:2rem 0"><hr style="border:none;border-top:1px solid rgba(212,80,10,.2);max-width:60rem;margin:0 auto"></div>`
};

document.querySelectorAll('.ed-section-item[draggable]').forEach(item=>{
  item.addEventListener('dragstart',(e)=>{e.dataTransfer.setData('text/plain',item.dataset.section);});
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', async()=>{
  await AuthService.logout();
  window.location.href='/admin/login.html';
});

function esc(s){const d=document.createElement('div');d.textContent=s||'';return d.innerHTML;}
function rgbHex(rgb){
  if(!rgb||rgb==='transparent'||rgb.includes('rgba(0, 0, 0, 0)'))return'#000000';
  const m=rgb.match(/\d+/g);if(!m||m.length<3)return'#000000';
  return'#'+[m[0],m[1],m[2]].map(x=>parseInt(x).toString(16).padStart(2,'0')).join('');
}

window.loadPage = loadPage;



