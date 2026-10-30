/**
 * Frontend Component — Application Footer
 * Renders a minimal, unobtrusive footer matching the AttendX Luminous Void aesthetic.
 */
(function (global) {
  const AttendX = (global.AttendX = global.AttendX || {});
  AttendX.Components = AttendX.Components || {};

  function renderFooter() {
    const mount = document.getElementById('app-footer-mount');
    if (!mount) return;

    mount.innerHTML = `
      <footer class="w-full py-4 px-5 border-t border-theme bg-surface/60 text-center text-[0.76rem] text-muted select-none">
        <div class="max-w-[760px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span><strong class="font-medium text-secondary">AttendX</strong> — College Event Attendance System</span>
          <span>Real-time Sync · Secure Coordinator Workspace</span>
        </div>
      </footer>
    `;
  }

  AttendX.Components.Footer = {
    renderFooter
  };
})(window);
