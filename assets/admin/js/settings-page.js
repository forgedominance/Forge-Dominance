/* settings-page.js — Admin settings management */
    var authToken = TokenManager.accessToken;
    const logoutBtn = document.getElementById('logoutBtn');

    if (!authToken) {
      window.location.href = '/admin/login.html';
    }

    logoutBtn.addEventListener('click', async () => {
      await AuthService.logout();
      window.location.href = '/admin/login.html';
    });

    // Tab switching
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tabName = btn.getAttribute('data-tab');
        switchTab(tabName);
      });
    });

    function switchTab(tabName) {
      document.querySelectorAll('.nav-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
      });

      document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
      });
      const activeContent = document.getElementById(tabName + 'Content');
      if (activeContent) {
        activeContent.classList.add('active');
        if (tabName === 'email') {
          loadEmailConfig();
        } else if (tabName === 'site') {
          loadSiteSettings();
        } else if (tabName === 'security') {
          loadSecuritySettings();
          loadTotpStatus();
        } else if (tabName === 'homepage') {
          loadHomepageContent();
        } else if (tabName === 'store') {
          loadStoreSettings();
        } else if (tabName === 'payments') {
          loadPaymentsSettings();
        }
      }
    }

    // Load users
    async function loadUsers() {
      try {
        const response = await UsersService.getAll();
        const users = response?.data || [];
        const tbody = document.getElementById('usersTableBody');
        tbody.innerHTML = users.map(user => `
          <tr>
            <td>${escapeHtml(user.email || '')}</td>
            <td>${escapeHtml((user.role || 'admin').toUpperCase())}</td>
            <td>
              <button data-user-id="${user.id}" class="delete-user-btn settings-delete-btn">Delete</button>
            </td>
          </tr>
        `).join('') || '<tr><td colspan="3" class="table-empty">No users found</td></tr>';

        document.querySelectorAll('.delete-user-btn').forEach(btn => {
          btn.addEventListener('click', async () => {
            const userId = btn.getAttribute('data-user-id');
            if (confirm('Delete this user?')) {
              await UsersService.delete(userId);
              Toast.success('User deleted');
              loadUsers();
            }
          });
        });
      } catch (error) {
        const tbody = document.getElementById('usersTableBody');
        tbody.innerHTML = `<tr><td colspan="3" class="table-empty" style="color:var(--error-400);">Error: ${escapeHtml(error.message)}</td></tr>`;
      }
    }

    // Load roles
    async function loadRoles() {
      try {
        const response = await RolesService.getAll();
        const roles = response?.data || [];
        const tbody = document.getElementById('rolesTableBody');
        tbody.innerHTML = roles.map(role => `
          <tr>
            <td>${escapeHtml(role.name || '')}</td>
            <td>${escapeHtml(role.permission || '')}</td>
          </tr>
        `).join('') || '<tr><td colspan="2" class="table-empty">No roles found</td></tr>';
      } catch (error) {
        const tbody = document.getElementById('rolesTableBody');
        tbody.innerHTML = `<tr><td colspan="2" class="table-empty" style="color:var(--error-400);">Error: ${escapeHtml(error.message)}</td></tr>`;
      }
    }

    // Load email config
    async function loadEmailConfig() {
      try {
        const response = await SettingsService.getAll();
        const settings = response?.data || {};
        
        // Populate form
        document.getElementById('senderEmail').value = settings.senderEmail || '';
        document.getElementById('appPassword').value = '';
        document.getElementById('smtpHost').value = settings.smtpHost || 'smtp.gmail.com';
        document.getElementById('smtpPort').value = settings.smtpPort || '587';
        document.getElementById('smtpEncryption').value = settings.smtpEncryption || 'TLS';

        // Display current config
        const display = document.getElementById('emailSettingsDisplay');
        display.innerHTML = `
          <div><strong>Sender Email:</strong> ${escapeHtml(settings.senderEmail || 'Not configured')}</div>
          <div style="margin-top:0.5rem;"><strong>SMTP Host:</strong> ${escapeHtml(settings.smtpHost || 'Not configured')}</div>
          <div style="margin-top:0.5rem;"><strong>SMTP Port:</strong> ${escapeHtml(settings.smtpPort || 'Not configured')}</div>
          <div style="margin-top:0.5rem;"><strong>Encryption:</strong> ${escapeHtml(settings.smtpEncryption || 'Not configured')}</div>
        `;
      } catch (error) {
        const display = document.getElementById('emailSettingsDisplay');
        display.innerHTML = `<p style="color:var(--error-400);">Error loading config: ${escapeHtml(error.message)}</p>`;
      }
    }

    async function loadSiteSettings() {
      try {
        const response = await SettingsService.getAll();
        const settings = response?.data || {};
        document.getElementById('siteName').value = settings.siteName || 'Forge Dominance';
        document.getElementById('supportName').value = settings.supportName || 'James';
        document.getElementById('supportLabel').value = settings.supportLabel || 'Forge Dominance';
        document.getElementById('contactEmail').value = settings.contactEmail || 'orders@forgedominance.com';
        document.getElementById('whatsappNumber').value = settings.whatsappNumber || '923298399619';
        document.getElementById('whatsappMessage').value = settings.whatsappMessage || "Hi Forge Dominance, I'm interested in a knife.";
      } catch (error) {
        Toast.error('Failed to load website settings: ' + error.message);
      }
    }

    // Create user
    document.getElementById('createUserBtn').addEventListener('click', async () => {
      const email = document.getElementById('userEmail').value.trim();
      const password = document.getElementById('userPassword').value.trim();
      const role = document.getElementById('newUserRole').value;
      if (!email) {
        Toast.error('Email is required');
        return;
      }
      if (!password || password.length < 8) {
        Toast.error('Password is required (minimum 8 characters)');
        return;
      }
      try {
        await UsersService.create({ email, password, role });
        Toast.success('User created');
        document.getElementById('userEmail').value = '';
        document.getElementById('userPassword').value = '';
        loadUsers();
      } catch (error) {
        Toast.error(error.message || 'Failed to create user');
      }
    });

    // Load roles into selector
    async function loadRoleSelector() {
      try {
        const response = await RolesService.getAll();
        const roles = response?.data || [];
        const selector = document.getElementById('roleSelector');
        selector.innerHTML = '<option value="">-- Choose a role --</option>' + roles.map(role => `
          <option value="${escapeHtml(role.id || role.name?.toLowerCase().replace(/\s+/g, '-'))}">${escapeHtml(role.name || '')}</option>
        `).join('');
      } catch (error) {
        Toast.error('Failed to load roles: ' + error.message);
      }
    }

    // Role selector change
    document.getElementById('roleSelector').addEventListener('change', async (e) => {
      const roleId = e.target.value;
      const permDiv = document.getElementById('rolePermissionsCheckboxes');
      if (!roleId) {
        permDiv.classList.remove('visible');
        return;
      }

      const permMap = {
        'super-admin': ['dashboard', 'products', 'orders', 'customers', 'promotions', 'settings', 'logs'],
        'operations': ['dashboard', 'orders', 'products', 'customers'],
        'marketing': ['dashboard', 'promotions'],
        'product-manager': ['dashboard', 'products']
      };

      const perms = permMap[roleId] || [];
      document.querySelectorAll('.rolePermissionCheckbox').forEach(checkbox => {
        checkbox.checked = perms.includes(checkbox.value);
      });
      permDiv.classList.add('visible');
    });

    // Save role permissions
    document.getElementById('saveRolePermissionsBtn').addEventListener('click', async () => {
      const roleId = document.getElementById('roleSelector').value;
      if (!roleId) {
        Toast.error('Select a role first');
        return;
      }

      const selectedPerms = Array.from(document.querySelectorAll('.rolePermissionCheckbox:checked')).map(cb => cb.value);
      if (selectedPerms.length === 0) {
        Toast.error('Select at least one permission');
        return;
      }

      const btn = document.getElementById('saveRolePermissionsBtn');
      btn.disabled = true;
      btn.textContent = 'Saving...';
      try {
        const response = await SettingsService.getAll();
        const settings = response?.data || {};
        const roles = settings.roles || [];

        const roleIdx = roles.findIndex(r => (r.name?.toLowerCase().replace(/\s+/g, '-') || r.id) === roleId);
        if (roleIdx >= 0) {
          roles[roleIdx].permission = selectedPerms.join(', ');
          await SettingsService.update({ ...settings, roles });
          Toast.success('Role permissions saved successfully');
          loadRoles();
        }
      } catch (error) {
        Toast.error(error.message || 'Failed to save permissions');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Save Permissions';
      }
    });

    // Save email config
    document.getElementById('saveEmailBtn').addEventListener('click', async () => {
      const btn = document.getElementById('saveEmailBtn');
      btn.disabled = true;
      btn.textContent = 'Saving...';
      try {
        const senderEmail = document.getElementById('senderEmail').value.trim();
        const appPassword = document.getElementById('appPassword').value.trim();
        const smtpHost = document.getElementById('smtpHost').value.trim();
        const smtpPort = parseInt(document.getElementById('smtpPort').value || '587');
        const smtpEncryption = document.getElementById('smtpEncryption').value;

        if (!senderEmail || !appPassword || !smtpHost) {
          Toast.error('Email, password, and host are required');
          return;
        }

        await SettingsService.update({
          senderEmail,
          appPassword,
          smtpHost,
          smtpPort,
          smtpEncryption
        });
        Toast.success('Email configuration saved successfully');
        loadEmailConfig();
      } catch (error) {
        Toast.error(error.message || 'Failed to save config');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Save Config';
      }
    });

    document.getElementById('saveSiteBtn').addEventListener('click', async () => {
      const btn = document.getElementById('saveSiteBtn');
      btn.disabled = true;
      btn.textContent = 'Saving...';
      try {
        const siteName = document.getElementById('siteName').value.trim();
        const supportName = document.getElementById('supportName').value.trim();
        const supportLabel = document.getElementById('supportLabel').value.trim();
        const contactEmail = document.getElementById('contactEmail').value.trim();
        const whatsappNumber = document.getElementById('whatsappNumber').value.trim();
        const whatsappMessage = document.getElementById('whatsappMessage').value.trim();

        if (!siteName || !contactEmail || !whatsappNumber) {
          Toast.error('Website name, contact email, and WhatsApp number are required');
          return;
        }

        await SettingsService.update({
          siteName,
          supportName,
          supportLabel,
          contactEmail,
          whatsappNumber,
          whatsappMessage
        });
        try {
          localStorage.setItem('bs_site_settings_refresh', String(Date.now()));
        } catch {}
        window.dispatchEvent(new CustomEvent('bs:site-settings-force-refresh'));
        Toast.success('Website settings saved successfully');
      } catch (error) {
        Toast.error(error.message || 'Failed to save website settings');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Save Website Settings';
      }
    });

    // Test email
    document.getElementById('testEmailBtn').addEventListener('click', async () => {
      try {
        const senderEmail = document.getElementById('senderEmail').value.trim();
        const appPassword = document.getElementById('appPassword').value.trim();
        const smtpHost = document.getElementById('smtpHost').value.trim();
        const smtpPort = parseInt(document.getElementById('smtpPort').value || '587');
        const smtpEncryption = document.getElementById('smtpEncryption').value;

        if (!senderEmail || !appPassword || !smtpHost) {
          Toast.error('Email, password, and host are required');
          return;
        }

        await SettingsService.testEmailConnection({
          senderEmail,
          appPassword,
          smtpHost,
          smtpPort,
          smtpEncryption
        });
        Toast.success('Email connection successful');
      } catch (error) {
        Toast.error(error.message || 'Email test failed');
      }
    });

    // Load security settings
    async function loadSecuritySettings(fresh) {
      try {
        const endpoint = fresh ? '/settings?fresh=1' : '/settings';
        const response = await apiCall(endpoint);
        const settings = response?.data || {};

        const sessionTimeoutMinutes = Number(settings.sessionTimeoutMinutes || 0) || Math.round((Number(settings.sessionTimeout) || 1800) / 60);

        document.getElementById('require2FA').checked = !!settings.require2FA;
        document.getElementById('authType').value = settings.authType || 'email';
        document.getElementById('sessionTimeout').value = sessionTimeoutMinutes;
        document.getElementById('sessionTimeoutStatus').textContent = `${sessionTimeoutMinutes} minutes`;

        // Update status display
        updateSecurityStatus();
      } catch (error) {
        Toast.error('Failed to load security settings: ' + error.message);
      }
    }

    // Update security status display
    function updateSecurityStatus() {
      const twoFA = document.getElementById('require2FA').checked;
      const authType = document.getElementById('authType').value;
      const sessionTimeout = document.getElementById('sessionTimeout').value;
      
      document.getElementById('twoFAStatus').innerHTML = twoFA ? '<span style="padding:0.25rem 0.75rem;border-radius:0.25rem;background:var(--success-400);color:white;">Enabled</span>' : '<span style="padding:0.25rem 0.75rem;border-radius:0.25rem;background:var(--bg-secondary);color:var(--warning-400);">Disabled</span>';
      document.getElementById('authTypeStatus').textContent = authType === 'email' ? 'Email (OTP)' : authType === 'authenticator' ? 'Authenticator App (TOTP)' : 'Both Email & Authenticator';
      document.getElementById('sessionTimeoutStatus').textContent = sessionTimeout + ' minutes';
      document.getElementById('sessionTimeoutStatus').title = `Stored timeout: ${Number(sessionTimeout) * 60} seconds`;
    }

    // Save security settings
    document.getElementById('saveSecurityBtn').addEventListener('click', async () => {
      const btn = document.getElementById('saveSecurityBtn');
      btn.disabled = true;
      btn.textContent = 'Saving...';
      try {
        const require2FA = document.getElementById('require2FA').checked;
        const authType = document.getElementById('authType').value;
        const sessionTimeoutMinutes = parseInt(document.getElementById('sessionTimeout').value || '30');
        if (sessionTimeoutMinutes < 5 || sessionTimeoutMinutes > 1440) {
          Toast.error('Session timeout must be between 5 and 1440 minutes');
          return;
        }

        await SettingsService.update({
          require2FA,
          authType,
          sessionTimeout: sessionTimeoutMinutes * 60,
        });
        Toast.success('Security settings saved');
        loadSecuritySettings(true);
      } catch (error) {
        Toast.error(error.message || 'Failed to save security settings');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Save Security Settings';
      }
    });

    // Show toast on toggle change (immediate feedback)
    document.getElementById('require2FA').addEventListener('change', (e) => {
      Toast.info(e.target.checked ? '2FA enabled — save to apply' : '2FA disabled — save to apply');
    });

    // ===== TOTP AUTHENTICATOR SETUP =====
    async function loadTotpStatus() {
      try {
        const res = await apiCall('/auth/totp/status');
        const enabled = !!res?.enabled;
        document.getElementById('totpStatus').innerHTML = enabled
          ? '<span style="padding:0.25rem 0.75rem;border-radius:0.25rem;background:var(--success-400);color:white;">Enabled</span>'
          : '<span style="padding:0.25rem 0.75rem;border-radius:0.25rem;background:var(--bg-secondary);color:var(--warning-400);">Not configured</span>';
        document.getElementById('totpSetupBtn').style.display = enabled ? 'none' : '';
        document.getElementById('totpDisableBtn').style.display = enabled ? '' : 'none';
        document.getElementById('totpQrContainer').style.display = 'none';
        document.getElementById('totpDescription').textContent = enabled
          ? 'Your authenticator app is active. You can disable it below.'
          : 'Set up Google Authenticator or any TOTP app for your account.';
      } catch (e) {
        document.getElementById('totpStatus').textContent = 'Error';
      }
    }

    document.getElementById('totpSetupBtn').addEventListener('click', async () => {
      try {
        const res = await apiCall('/auth/totp/setup', { method: 'POST' });
        if (res?.qrCode) {
          document.getElementById('totpQrImage').src = res.qrCode;
          document.getElementById('totpSecretDisplay').value = res.secret || '';
          document.getElementById('totpQrContainer').style.display = 'block';
          document.getElementById('totpSetupBtn').style.display = 'none';
        }
      } catch (e) {
        Toast.error(e.message || 'Failed to generate QR code');
      }
    });

    document.getElementById('totpVerifyBtn').addEventListener('click', async () => {
      const code = document.getElementById('totpVerifyCode').value.trim();
      if (!code || code.length < 6) {
        Toast.error('Enter the 6-digit code from your authenticator app');
        return;
      }
      try {
        await apiCall('/auth/totp/verify-setup', {
          method: 'POST',
          body: JSON.stringify({ code })
        });
        Toast.success('Authenticator app configured successfully');
        document.getElementById('totpVerifyCode').value = '';
        loadTotpStatus();
      } catch (e) {
        Toast.error(e.message || 'Invalid code. Try again.');
      }
    });

    document.getElementById('totpDisableBtn').addEventListener('click', async () => {
      if (!confirm('Disable authenticator app? You will need to set it up again.')) return;
      try {
        await apiCall('/auth/totp/disable', { method: 'POST', body: JSON.stringify({}) });
        Toast.success('Authenticator app disabled');
        loadTotpStatus();
      } catch (e) {
        Toast.error(e.message || 'Failed to disable authenticator');
      }
    });

    // ===== PAYMENTS SETTINGS =====
    async function loadPaymentsSettings() {
      try {
        const response = await SettingsService.getAll();
        const settings = response?.data || {};
        const stripe = settings.stripe || {};
        document.getElementById('stripeEnabled').checked = !!stripe.enabled;
        document.getElementById('stripePublishableKey').value = stripe.publishableKey || '';
        document.getElementById('stripeSecretKey').value = '';
        document.getElementById('stripeWebhookSecret').value = '';
        document.getElementById('stripeCurrency').value = stripe.currency || 'usd';
        updatePaymentStatus(stripe);
      } catch (error) {
        Toast.error('Failed to load payment settings: ' + error.message);
      }
    }

    function updatePaymentStatus(stripe) {
      const s = stripe || {};
      document.getElementById('stripeStatus').innerHTML = s.enabled
        ? '<span style="padding:0.25rem 0.75rem;border-radius:0.25rem;background:var(--success-400);color:white;">Enabled</span>'
        : '<span style="padding:0.25rem 0.75rem;border-radius:0.25rem;background:var(--bg-secondary);color:var(--warning-400);">Disabled</span>';
      document.getElementById('stripePkStatus').textContent = s.publishableKey ? s.publishableKey.slice(0, 12) + '...' : 'Not configured';
      document.getElementById('stripeSkStatus').textContent = s.hasSecretKey ? 'Configured' : 'Not configured';
      document.getElementById('stripeWhStatus').textContent = s.hasWebhookSecret ? 'Configured' : 'Not configured';
      document.getElementById('stripeCurrencyStatus').textContent = (s.currency || 'usd').toUpperCase();
    }

    document.getElementById('savePaymentsBtn').addEventListener('click', async () => {
      const btn = document.getElementById('savePaymentsBtn');
      btn.disabled = true;
      btn.textContent = 'Saving...';
      try {
        const stripe = {
          enabled: document.getElementById('stripeEnabled').checked,
          publishableKey: document.getElementById('stripePublishableKey').value.trim(),
          currency: document.getElementById('stripeCurrency').value
        };
        const secretKey = document.getElementById('stripeSecretKey').value.trim();
        const webhookSecret = document.getElementById('stripeWebhookSecret').value.trim();
        if (secretKey) stripe.secretKey = secretKey;
        if (webhookSecret) stripe.webhookSecret = webhookSecret;

        await SettingsService.update({ stripe });
        Toast.success('Payment settings saved');
        loadPaymentsSettings();
      } catch (error) {
        Toast.error(error.message || 'Failed to save payment settings');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Save Payment Settings';
      }
    });

    // ===== STORE SETTINGS =====
    async function loadStoreSettings() {
      try {
        const response = await SettingsService.getAll();
        const settings = response?.data || {};
        const ageGateEnabled = settings.ageGateEnabled !== false;
        document.getElementById('ageGateEnabled').checked = ageGateEnabled;
        updateAgeGateStatus(ageGateEnabled);
      } catch (error) {
        Toast.error('Failed to load store settings: ' + error.message);
      }
    }

    function updateAgeGateStatus(enabled) {
      const el = document.getElementById('ageGateStatus');
      el.innerHTML = enabled
        ? '<span style="padding:0.25rem 0.75rem;border-radius:0.25rem;background:var(--success-400);color:white;">Enabled</span>'
        : '<span style="padding:0.25rem 0.75rem;border-radius:0.25rem;background:var(--bg-secondary);color:var(--warning-400);">Disabled</span>';
    }

    document.getElementById('saveStoreBtn').addEventListener('click', async () => {
      const btn = document.getElementById('saveStoreBtn');
      btn.disabled = true;
      btn.textContent = 'Saving...';
      try {
        const ageGateEnabled = document.getElementById('ageGateEnabled').checked;
        await SettingsService.update({ ageGateEnabled });
        updateAgeGateStatus(ageGateEnabled);
        Toast.success('Store settings saved');
      } catch (error) {
        Toast.error(error.message || 'Failed to save store settings');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Save Store Settings';
      }
    });

    document.getElementById('ageGateEnabled').addEventListener('change', (e) => {
      Toast.info(e.target.checked ? 'Age gate enabled — save to apply' : 'Age gate disabled — save to apply');
    });

    // Initialize
    // ===== HOMEPAGE CONTENT =====
    async function loadHomepageContent() {
      try {
        const data = await apiCall('/homepage-content');
        if (data.hero) {
          document.getElementById('heroEyebrow').value = data.hero.eyebrow || '';
          const hl = data.hero.headline || [];
          document.getElementById('heroLine1').value = hl[0] || '';
          document.getElementById('heroLine2').value = hl[1] || '';
          document.getElementById('heroLine3').value = hl[2] || '';
          document.getElementById('heroSubtext').value = data.hero.subtext || '';
        }
        if (data.statsBar && Array.isArray(data.statsBar)) {
          const container = document.getElementById('statsBarFields');
          container.innerHTML = data.statsBar.map((s, i) => `
            <div class="settings-field-group" style="margin-bottom:1rem;padding-bottom:1rem;border-bottom:0.0625rem solid var(--border-light);">
              <label class="settings-label">STAT ${i + 1}</label>
              <div class="settings-grid-half">
                <div>
                  <input type="text" class="settings-input stat-value" data-idx="${i}" value="${escapeHtml(s.value || '')}" placeholder="Value (e.g. 1400)">
                </div>
                <div>
                  <input type="text" class="settings-input stat-suffix" data-idx="${i}" value="${escapeHtml(s.suffix || '')}" placeholder="Suffix (e.g. +, yr, h)">
                </div>
              </div>
              <input type="text" class="settings-input stat-label" data-idx="${i}" value="${escapeHtml(s.label || '')}" placeholder="Label" style="margin-top:0.4rem;">
              <input type="text" class="settings-input stat-desc" data-idx="${i}" value="${escapeHtml(s.desc || '')}" placeholder="Description" style="margin-top:0.4rem;">
            </div>
          `).join('');
        }
      } catch (e) {
        Toast.error('Failed to load homepage content: ' + e.message);
      }
    }

    document.getElementById('saveHomepageHeroBtn').addEventListener('click', async () => {
      const btn = document.getElementById('saveHomepageHeroBtn');
      btn.disabled = true; btn.textContent = 'Saving...';
      try {
        const hero = {
          eyebrow: document.getElementById('heroEyebrow').value.trim(),
          headline: [
            document.getElementById('heroLine1').value.trim(),
            document.getElementById('heroLine2').value.trim(),
            document.getElementById('heroLine3').value.trim()
          ].filter(Boolean),
          subtext: document.getElementById('heroSubtext').value.trim()
        };
        await apiCall('/homepage-content', { method: 'PUT', body: JSON.stringify({ hero }) });
        Toast.success('Hero section saved');
      } catch (e) { Toast.error(e.message || 'Failed to save'); }
      finally { btn.disabled = false; btn.textContent = 'Save Hero'; }
    });

    document.getElementById('saveHomepageStatsBtn').addEventListener('click', async () => {
      const btn = document.getElementById('saveHomepageStatsBtn');
      btn.disabled = true; btn.textContent = 'Saving...';
      try {
        const statsBar = [];
        document.querySelectorAll('.stat-value').forEach((el, i) => {
          statsBar.push({
            value: el.value.trim(),
            suffix: document.querySelectorAll('.stat-suffix')[i]?.value.trim() || '',
            label: document.querySelectorAll('.stat-label')[i]?.value.trim() || '',
            desc: document.querySelectorAll('.stat-desc')[i]?.value.trim() || ''
          });
        });
        await apiCall('/homepage-content', { method: 'PUT', body: JSON.stringify({ statsBar }) });
        Toast.success('Stats bar saved');
      } catch (e) { Toast.error(e.message || 'Failed to save'); }
      finally { btn.disabled = false; btn.textContent = 'Save Stats'; }
    });

    // ===== ADMIN AVATAR UPLOAD =====
    const avatarFileInput = document.getElementById('avatarFileInput');
    const uploadAvatarBtn = document.getElementById('uploadAvatarBtn');
    const avatarPreview = document.getElementById('avatarPreview');
    const avatarImg = document.getElementById('avatarImg');
    const avatarLetter = document.getElementById('avatarLetter');
    const avatarFileName = document.getElementById('avatarFileName');

    function showAvatarFromUrl(url) {
      if (url) {
        avatarImg.src = url;
        avatarImg.style.display = 'block';
        avatarLetter.style.display = 'none';
      }
    }

    async function loadSavedAvatar() {
      let saved = localStorage.getItem('admin_avatar_url');
      if (!saved) {
        try {
          const token = localStorage.getItem('auth_token');
          const resp = await fetch('/api/settings/me', { headers: { 'Authorization': `Bearer ${token}` } });
          const result = await resp.json();
          if (result?.data?.avatar_url) {
            saved = result.data.avatar_url;
            localStorage.setItem('admin_avatar_url', saved);
          }
        } catch (_) {}
      }
      if (saved) {
        showAvatarFromUrl(saved);
        const sidebarAvatar = document.getElementById('userAvatar');
        if (sidebarAvatar) {
          sidebarAvatar.innerHTML = `<img src="${saved}" alt="Avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
        }
      }
    }

    avatarFileInput.addEventListener('change', () => {
      const file = avatarFileInput.files[0];
      if (!file) return;
      avatarFileName.textContent = file.name;
      uploadAvatarBtn.style.display = 'inline-block';
      const reader = new FileReader();
      reader.onload = (e) => {
        avatarImg.src = e.target.result;
        avatarImg.style.display = 'block';
        avatarLetter.style.display = 'none';
      };
      reader.readAsDataURL(file);
    });

    uploadAvatarBtn.addEventListener('click', async () => {
      const file = avatarFileInput.files[0];
      if (!file) return;
      uploadAvatarBtn.disabled = true;
      uploadAvatarBtn.textContent = 'Uploading...';
      try {
        const formData = new FormData();
        formData.append('image', file);
        const token = localStorage.getItem('auth_token');
        const resp = await fetch('/api/uploads/upload-admin-avatar', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });
        const data = await resp.json();
        if (data.success && data.url) {
          localStorage.setItem('admin_avatar_url', data.url);
          showAvatarFromUrl(data.url);
          const sidebarAvatar = document.getElementById('userAvatar');
          if (sidebarAvatar) {
            sidebarAvatar.innerHTML = `<img src="${data.url}" alt="Avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
          }
          // Persist avatar to backend per-admin preferences
          try {
            const prefsResp = await fetch('/api/settings/me', { headers: { 'Authorization': `Bearer ${token}` } });
            const prefsData = await prefsResp.json();
            const prefs = prefsData?.data || {};
            prefs.avatar_url = data.url;
            await fetch('/api/settings/me', { method: 'PUT', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(prefs) });
          } catch (_) {}
          Toast.success('Avatar uploaded');
          uploadAvatarBtn.style.display = 'none';
          avatarFileName.textContent = '';
        } else {
          Toast.error(data.error || 'Upload failed');
        }
      } catch (e) {
        Toast.error(e.message || 'Upload failed');
      } finally {
        uploadAvatarBtn.disabled = false;
        uploadAvatarBtn.textContent = 'Upload';
      }
    });

    async function initSettingsPage() {
      if (typeof AuthService === 'undefined') {
        setTimeout(initSettingsPage, 50);
        return;
      }

      const user = AuthService.getCurrentUser();
      if (typeof initializeUserDisplay === 'function') initializeUserDisplay();

      loadSavedAvatar();
      loadUsers();
      loadRoles();
      loadRoleSelector();
      loadSiteSettings();
      loadSecuritySettings();
      loadTotpStatus();
    }
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initSettingsPage);
    } else {
      initSettingsPage();
    }


