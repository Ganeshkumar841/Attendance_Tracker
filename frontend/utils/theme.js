(function (global) {
  const AttendX = (global.AttendX = global.AttendX || {});
  AttendX.Utils = AttendX.Utils || {};

  function applyTheme() {
    const root = document.documentElement;
    if (AttendX.State) {
      AttendX.State.theme = 'light';
    }
    if (root) {
      root.setAttribute('data-theme', 'light');
    }
    try {
      localStorage.removeItem('attendx_theme');
    } catch (_e) {}
  }

  function toggleTheme() {
    applyTheme();
  }

  function initTheme() {
    applyTheme();
  }

  global.toggleTheme = toggleTheme;

  AttendX.Utils.Theme = {
    applyTheme,
    toggleTheme,
    initTheme
  };
})(window);
