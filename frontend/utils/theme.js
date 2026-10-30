/**
 * Frontend Utility — Theme Controller (Dark / Light Mode)
 * Updates the theme attribute and swaps ONLY the sun/moon icon symbol on the toggle button.
 */
(function (global) {
  const AttendX = (global.AttendX = global.AttendX || {});
  AttendX.Utils = AttendX.Utils || {};

  const SUN_SVG_PATHS =
    '<circle cx="12" cy="12" r="5"></circle>' +
    '<line x1="12" y1="1" x2="12" y2="3"></line>' +
    '<line x1="12" y1="21" x2="12" y2="23"></line>' +
    '<line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>' +
    '<line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>' +
    '<line x1="1" y1="12" x2="3" y2="12"></line>' +
    '<line x1="21" y1="12" x2="23" y2="12"></line>' +
    '<line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>' +
    '<line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>';

  const MOON_SVG_PATHS =
    '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>';

  function applyTheme(theme) {
    const normalized = theme === 'light' ? 'light' : 'dark';
    if (AttendX.State) {
      AttendX.State.theme = normalized;
    }
    document.documentElement.setAttribute('data-theme', normalized);

    const icon = document.getElementById('theme-icon');
    const btn = document.getElementById('theme-toggle-btn');

    if (icon) {
      icon.innerHTML = normalized === 'dark' ? SUN_SVG_PATHS : MOON_SVG_PATHS;
    }
    if (btn) {
      const nextModeLabel = normalized === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
      btn.setAttribute('title', nextModeLabel);
      btn.setAttribute('aria-label', nextModeLabel);
    }

    try {
      localStorage.setItem('attendx_theme', normalized);
    } catch (_e) {}
  }

  function toggleTheme() {
    const current = AttendX.State?.theme || document.documentElement.getAttribute('data-theme') || 'dark';
    applyTheme(current === 'dark' ? 'light' : 'dark');
  }

  function initTheme() {
    try {
      const saved = localStorage.getItem('attendx_theme');
      applyTheme(saved === 'light' ? 'light' : 'dark');
    } catch (_e) {
      applyTheme('dark');
    }
  }

  // Expose globally for direct button handlers
  global.toggleTheme = toggleTheme;

  AttendX.Utils.Theme = {
    applyTheme,
    toggleTheme,
    initTheme
  };
})(window);
