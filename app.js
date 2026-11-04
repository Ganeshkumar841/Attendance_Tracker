/**
 * Root Compatibility Entry (`app.js`)
 * Ensures that even if the browser serves a cached legacy `index.html` that loads `<script src="app.js">`,
 * it automatically upgrades the DOM to the modular `frontend/` + `backend/` architecture and applies
 * role-based Coordinator/Student portals and smooth dark/light mode transitions.
 */
(function (global) {
  if (global.AttendX && global.AttendX.App) {
    return;
  }

  const SCRIPTS = [
    'https://cdn.tailwindcss.com',
    'frontend/styles/tailwind.config.js?v=2.2',
    'backend/config/securityConfig.js?v=2.2',
    'backend/config/supabaseClient.js?v=2.2',
    'backend/middleware/rateLimiter.js?v=2.2',
    'backend/middleware/sessionManager.js?v=2.2',
    'backend/services/auditService.js?v=2.2',
    'backend/services/authService.js?v=2.2',
    'backend/services/eventService.js?v=2.2',
    'backend/services/attendanceService.js?v=2.2',
    'frontend/utils/sanitizer.js?v=2.2',
    'frontend/utils/theme.js?v=2.2',
    'frontend/utils/exporter.js?v=2.2',
    'frontend/components/header.js?v=2.2',
    'frontend/components/footer.js?v=2.2',
    'frontend/components/modals.js?v=2.2',
    'frontend/components/toast.js?v=2.2',
    'frontend/pages/signin.js?v=2.2',
    'frontend/pages/menu.js?v=2.2',
    'frontend/pages/events.js?v=2.2',
    'frontend/pages/viewList.js?v=2.2',
    'frontend/pages/exportPage.js?v=2.2',
    'frontend/pages/attendance.js?v=2.2',
    'frontend/app.js?v=2.2'
  ];

  // If legacy DOM is present without modular mounts, upgrade the body mount structure first
  function ensureModularMounts() {
    if (!document.getElementById('app-header-mount')) {
      document.body.className =
        'font-sans bg-app text-main min-h-screen overflow-x-hidden flex flex-col select-none';
      document.body.innerHTML = `
        <div id="app-header-mount"></div>
        <main id="app" class="relative z-[1] flex-1 flex flex-col">
          <div id="page-signin-mount" class="flex-1 flex flex-col"></div>
          <div id="page-menu-mount" class="flex-1 flex flex-col"></div>
          <div id="page-events-mount" class="flex-1 flex flex-col"></div>
          <div id="page-attendance-mount" class="flex-1 flex flex-col"></div>
        </main>
        <div id="app-footer-mount"></div>
        <div id="app-modals-mount"></div>
        <div
          id="toast"
          class="fixed bottom-6 left-1/2 -translate-x-1/2 translate-y-[95px] bg-surface border border-strong text-main py-2.5 px-5 rounded-full text-[0.85rem] font-medium shadow-toast transition-transform duration-300 z-[1000] whitespace-nowrap pointer-events-none"
        ></div>
      `;
    }
  }

  function loadSequentially(index) {
    if (index >= SCRIPTS.length) {
      if (document.readyState !== 'loading' && global.AttendX?.Components?.Header) {
        document.dispatchEvent(new Event('DOMContentLoaded'));
      }
      return;
    }
    const s = document.createElement('script');
    s.src = SCRIPTS[index];
    s.onload = () => loadSequentially(index + 1);
    s.onerror = () => loadSequentially(index + 1);
    document.head.appendChild(s);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      ensureModularMounts();
      loadSequentially(0);
    });
  } else {
    ensureModularMounts();
    loadSequentially(0);
  }
})(window);
