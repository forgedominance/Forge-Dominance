(function () {
  const PLATFORMS = ['instagram', 'tiktok', 'youtube', 'facebook', 'twitter', 'pinterest', 'linkedin'];

  async function loadSocialSettings() {
    try {
      const res = await SettingsService.get();
      const settings = res && res.data ? res.data : {};
      const social = settings.socialLinks || {};
      PLATFORMS.forEach((key) => {
        const cfg = social[key] || {};
        const enabledEl = document.getElementById('social_' + key + '_enabled');
        const usernameEl = document.getElementById('social_' + key + '_username');
        if (enabledEl) enabledEl.checked = !!cfg.enabled;
        if (usernameEl) usernameEl.value = cfg.username || '';
      });
    } catch (error) {
      console.error('Failed to load social settings', error);
    }
  }

  function wireSaveButton() {
    const btn = document.getElementById('saveSocialBtn');
    if (!btn) return;
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      const originalText = btn.textContent;
      btn.textContent = 'Saving...';
      try {
        const socialLinks = {};
        PLATFORMS.forEach((key) => {
          const enabledEl = document.getElementById('social_' + key + '_enabled');
          const usernameEl = document.getElementById('social_' + key + '_username');
          socialLinks[key] = {
            enabled: !!(enabledEl && enabledEl.checked),
            username: (usernameEl && usernameEl.value.trim()) || ''
          };
        });
        await SettingsService.update({ socialLinks });
        try { localStorage.setItem('bs_site_settings_refresh', String(Date.now())); } catch (e) {}
        window.dispatchEvent(new CustomEvent('bs:site-settings-force-refresh'));
        if (typeof Toast !== 'undefined') Toast.success('Social media settings saved successfully');
      } catch (error) {
        if (typeof Toast !== 'undefined') Toast.error('Failed to save social media settings');
        console.error(error);
      } finally {
        btn.disabled = false;
        btn.textContent = originalText;
      }
    });
  }

  function init() {
    if (typeof AuthService === 'undefined' || typeof SettingsService === 'undefined') {
      setTimeout(init, 50);
      return;
    }
    wireSaveButton();
    loadSocialSettings();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
