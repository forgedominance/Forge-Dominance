(function () {
  if (sessionStorage.getItem('bs_age_verified') === 'true') return;

  var gate = document.getElementById('age-gate');
  if (!gate) {
    gate = document.createElement('div');
    gate.id = 'age-gate';
    gate.innerHTML =
      '<div class="ag">' +
        '<div class="ag-ico">' +
          '<svg width="36" height="36" viewBox="0 0 36 36" fill="none">' +
            '<path d="M18 3L33 30H3L18 3Z" stroke="var(--ember)" stroke-width="1.5" stroke-linejoin="round"/>' +
            '<path d="M18 14v7M18 24v2" stroke="var(--ember)" stroke-width="2" stroke-linecap="round"/>' +
          '</svg>' +
        '</div>' +
        '<div class="ag-brand">FORGE DOMINANCE</div>' +
        '<div class="ag-line"></div>' +
        '<p class="ag-h">Age Verification Required</p>' +
        '<p class="ag-p">This site sells precision hunting tools intended for lawful adult use. Confirm your date of birth to continue.</p>' +
        '<div class="ag-sel">' +
          '<select id="agM"><option value="">Month</option></select>' +
          '<select id="agY"><option value="">Year</option></select>' +
        '</div>' +
        '<div class="ag-btns">' +
          '<button class="ag-yes" type="button">Enter Site</button>' +
          '<button class="ag-no" type="button">I\'m Under 18</button>' +
        '</div>' +
        '<p class="ag-legal">By entering you confirm you are of legal age in your jurisdiction. Verify local blade laws before purchasing.</p>' +
      '</div>';
    document.body.insertBefore(gate, document.body.firstChild);
  }

  gate.style.display = 'none';

  function initCustomSelects() {
    if (gate.dataset.customSelectInit === 'true') return;
    var useCustom = window.matchMedia('(pointer: coarse), (max-width: 48rem)').matches;
    if (!useCustom) return;
    gate.dataset.customSelectInit = 'true';
    gate.classList.add('ag-custom');

    var closeAll = function () {
      gate.querySelectorAll('.ag-select.open').forEach(function (wrap) {
        wrap.classList.remove('open');
        var btn = wrap.querySelector('.ag-select-btn');
        if (btn) btn.setAttribute('aria-expanded', 'false');
      });
    };

    gate.querySelectorAll('.ag-sel select').forEach(function (select) {
      if (select.dataset.customized === 'true') return;
      select.dataset.customized = 'true';

      var wrap = document.createElement('div');
      wrap.className = 'ag-select';

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ag-select-btn';
      btn.setAttribute('aria-haspopup', 'listbox');
      btn.setAttribute('aria-expanded', 'false');

      var label = document.createElement('span');
      label.className = 'ag-select-label';
      label.textContent = select.options[select.selectedIndex] ? select.options[select.selectedIndex].text : 'Select';
      btn.appendChild(label);
      wrap.appendChild(btn);

      var list = document.createElement('div');
      list.className = 'ag-select-list';
      list.setAttribute('role', 'listbox');

      Array.from(select.options).forEach(function (opt) {
        var item = document.createElement('button');
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
        item.addEventListener('click', function (e) {
          e.stopPropagation();
          select.value = opt.value;
          select.dispatchEvent(new Event('change', { bubbles: true }));
          label.textContent = opt.textContent;
          closeAll();
        });
        list.appendChild(item);
      });

      wrap.appendChild(list);
      select.classList.add('ag-native');
      select.setAttribute('tabindex', '-1');
      select.setAttribute('aria-hidden', 'true');
      select.parentNode.insertBefore(wrap, select);
      wrap.appendChild(select);

      select.addEventListener('change', function () {
        label.textContent = select.options[select.selectedIndex] ? select.options[select.selectedIndex].text : label.textContent;
        Array.from(list.children).forEach(function (child) {
          child.setAttribute('aria-selected', child.dataset.value === select.value ? 'true' : 'false');
        });
      });

      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var isOpen = wrap.classList.contains('open');
        closeAll();
        if (!isOpen) {
          wrap.classList.add('open');
          btn.setAttribute('aria-expanded', 'true');
        }
      });
    });

    document.addEventListener('click', function (e) {
      if (!gate.contains(e.target)) return;
      if (e.target.closest('.ag-select')) return;
      closeAll();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeAll();
    });
  }

  function showGate() {
    gate.style.display = '';
    gate.classList.remove('hidden');
    var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    var mSel = document.getElementById('agM'), ySel = document.getElementById('agY');
    if (mSel && mSel.children.length <= 1 && ySel) {
      months.forEach(function (m, i) {
        var o = document.createElement('option');
        o.value = i + 1;
        o.textContent = m;
        mSel.appendChild(o);
      });
      var yr = new Date().getFullYear();
      for (var y = yr; y >= 1920; y--) {
        var o = document.createElement('option');
        o.value = y;
        o.textContent = y;
        ySel.appendChild(o);
      }
    }
    initCustomSelects();
  }

  function hideGate() {
    gate.classList.add('hidden');
    gate.style.display = 'none';
  }

  function checkAge() {
    var mNode = document.getElementById('agM');
    var yNode = document.getElementById('agY');
    if (!mNode || !yNode) return;
    var m = parseInt(mNode.value, 10);
    var y = parseInt(yNode.value, 10);
    if (!m || !y) { alert('Please select your birth month and year.'); return; }
    var age = (Date.now() - new Date(y, m - 1, 1)) / (365.25 * 24 * 60 * 60 * 1000);
    if (age < 18) { window.location.href = 'https://www.google.com'; return; }
    sessionStorage.setItem('bs_age_verified', 'true');
    hideGate();
  }

  gate.querySelector('.ag-yes').addEventListener('click', checkAge);
  gate.querySelector('.ag-no').addEventListener('click', function () {
    window.location.href = 'https://www.google.com';
  });

  function decide(settings) {
    if (settings && settings.ageGateEnabled === false) { hideGate(); return; }
    if (sessionStorage.getItem('bs_age_verified') === 'true') { hideGate(); return; }
    showGate();
  }

  var ready = window.bladesmithSiteSettingsReady;
  if (ready && typeof ready.then === 'function') {
    ready.then(decide).catch(function () { decide({ ageGateEnabled: false }); });
  } else {
    decide(window.getBladesmithSiteSettings ? window.getBladesmithSiteSettings() : { ageGateEnabled: false });
  }
})();
