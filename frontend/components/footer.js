(function (global) {
  const AttendX = (global.AttendX = global.AttendX || {});
  AttendX.Components = AttendX.Components || {};

  function renderFooter() {
    const mount = document.getElementById('app-footer-mount');
    if (!mount) return;

    mount.innerHTML = `
      <footer class="w-full py-4 px-5 border-t border-theme bg-surface/60 text-center text-[0.76rem] text-muted select-none">
        <div id="footer-inner-container" class="max-w-[760px] mx-auto flex items-center justify-center text-center">
          <span><strong class="font-medium text-secondary">AttendX</strong> — College Event Attendance System</span>
          <span id="footer-portal-tagline" class="hidden">Real-time Sync · Coordinator &amp; Student Portals</span>
        </div>
      </footer>
    `;
  }

  AttendX.Components.Footer = {
    renderFooter
  };
})(window);
