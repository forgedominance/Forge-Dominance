// Shared Theme Manager - Ties all pages to admin dashboard theme toggle
(function() {
  const THEME_KEY = 'admin_theme';
  const DARK = 'dark';
  const LIGHT = 'light';

  // Apply theme by setting data-theme attribute on html element
  function applyTheme(theme) {
    try {
      if (theme === LIGHT) {
        document.documentElement.setAttribute('data-theme', LIGHT);
      } else {
        document.documentElement.removeAttribute('data-theme');
      }
    } catch (e) {
      console.warn('Error applying theme:', e.message);
    }
  }

  // Initialize theme from localStorage
  function initializeTheme() {
    try {
      const stored = localStorage.getItem(THEME_KEY);
      const theme = stored === LIGHT ? LIGHT : DARK;
      applyTheme(theme);
    } catch (e) {
      console.warn('Error initializing theme:', e.message);
    }
  }

  // Listen for storage changes (theme changed in another tab/admin panel)
  window.addEventListener('storage', function(event) {
    if (event.key === THEME_KEY) {
      const theme = event.newValue === LIGHT ? LIGHT : DARK;
      applyTheme(theme);
    }
  });

  // Expose public API
  window.ThemeManager = {
    init: initializeTheme,
    apply: applyTheme,
    get: () => localStorage.getItem(THEME_KEY) || DARK,
    set: (theme) => {
      try {
        localStorage.setItem(THEME_KEY, theme === LIGHT ? LIGHT : DARK);
        applyTheme(theme);
      } catch (e) {
        console.warn('Error setting theme:', e.message);
      }
    },
  };

  // Auto-initialize on script load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeTheme);
  } else {
    initializeTheme();
  }
})();


