/**
 * Frontend Component — Toast Notification & Password Visibility Toggle
 */
(function (global) {
  const AttendX = (global.AttendX = global.AttendX || {});
  AttendX.Components = AttendX.Components || {};

  let toastTimer = null;

  function toast(msg, type = 'info') {
    const el = document.getElementById('toast');
    if (!el) return;

    el.textContent = msg;

    const borderClass =
      type === 'success'
        ? 'border-l-4 border-l-success'
        : type === 'error'
        ? 'border-l-4 border-l-danger'
        : 'border-l-4 border-l-primary';

    el.className =
      'fixed bottom-6 left-1/2 -translate-x-1/2 translate-y-0 bg-surface border border-strong text-main py-2.5 px-5 rounded-full text-[0.85rem] font-medium shadow-toast transition-transform duration-300 z-[1000] whitespace-nowrap max-w-[92vw] truncate ' +
      borderClass;

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.className =
        'fixed bottom-6 left-1/2 -translate-x-1/2 translate-y-[95px] bg-surface border border-strong text-main py-2.5 px-5 rounded-full text-[0.85rem] font-medium shadow-toast transition-transform duration-300 z-[1000] whitespace-nowrap pointer-events-none';
    }, 2800);
  }

  function togglePwd(id, btn) {
    const input = document.getElementById(id);
    if (!input || !btn) return;
    const svg = btn.querySelector('svg');
    if (input.type === 'password') {
      input.type = 'text';
      if (svg) {
        svg.innerHTML =
          '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>' +
          '<line x1="1" y1="1" x2="23" y2="23"></line>';
      }
    } else {
      input.type = 'password';
      if (svg) {
        svg.innerHTML =
          '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>' +
          '<circle cx="12" cy="12" r="3"></circle>';
      }
    }
  }

  global.toast = toast;
  global.togglePwd = togglePwd;

  AttendX.Components.Toast = {
    toast,
    togglePwd
  };
})(window);
