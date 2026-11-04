(function (global) {
  const AttendX = (global.AttendX = global.AttendX || {});
  AttendX.Components = AttendX.Components || {};

  function renderHeader() {
    const mount = document.getElementById('app-header-mount');
    if (!mount) return;

    mount.innerHTML = `
      <header class="sticky top-0 z-[200] flex items-center justify-between px-4 sm:px-8 py-3.5 border-b border-theme bg-header backdrop-blur-md">
        <div class="flex items-center gap-2.5 select-none">
          <div class="w-[30px] h-[30px] rounded-lg bg-primary text-white flex items-center justify-center font-sans font-bold text-[0.86rem] tracking-tight shadow-btn-primary">
            AX
          </div>
          <span class="font-sans text-[1.16rem] font-semibold text-main tracking-[-0.015em]">AttendX</span>
          <span
            id="header-role-badge"
            class="hidden ml-1.5 py-1 px-2.5 rounded-lg text-[0.72rem] font-medium tracking-wide bg-surface-tint text-accent border border-theme select-none"
          ></span>
        </div>
        <div class="flex items-center gap-2.5">
          <button
            type="button"
            id="header-switch-role-btn"
            onclick="switchRoleScreen()"
            title="Switch Login Role"
            class="hidden py-1.5 px-3.5 rounded-lg font-sans text-[0.76rem] font-medium text-secondary hover:text-main bg-surface2 hover:bg-surface-hover border border-theme hover:border-strong cursor-pointer focus:outline-none select-none"
          >
            Switch Role
          </button>
          <button
            type="button"
            id="theme-toggle-btn"
            onclick="toggleTheme()"
            title="Switch Dark / Light Theme"
            aria-label="Switch Dark / Light Theme"
            class="w-9 h-9 rounded-lg inline-flex items-center justify-center bg-surface2 border border-theme hover:border-strong hover:bg-surface-hover text-accent cursor-pointer focus:outline-none focus:ring-0 select-none"
          >
            <svg
              id="theme-icon"
              class="w-[17px] h-[17px] text-accent pointer-events-none"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="12" cy="12" r="5"></circle>
              <line x1="12" y1="1" x2="12" y2="3"></line>
              <line x1="12" y1="21" x2="12" y2="23"></line>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
              <line x1="1" y1="12" x2="3" y2="12"></line>
              <line x1="21" y1="12" x2="23" y2="12"></line>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
            </svg>
          </button>
        </div>
      </header>
    `;
  }

  function updateHeaderRoleBadge() {
    const badge = document.getElementById('header-role-badge');
    const switchBtn = document.getElementById('header-switch-role-btn');
    if (!badge) return;

    const user = AttendX.State?.user;
    const role = AttendX.Backend?.SecurityConfig?.getSessionRole?.() || AttendX.State?.role;

    if (!user || !role) {
      badge.className = 'hidden';
      badge.textContent = '';
      if (switchBtn) switchBtn.classList.add('hidden');
      return;
    }

    badge.textContent = role === 'student' ? 'Student' : 'Coordinator / Staff';
    badge.className =
      'inline-flex items-center ml-1.5 py-1 px-2.5 rounded-lg text-[0.72rem] font-medium tracking-wide bg-surface-tint text-accent border border-theme select-none';

    if (switchBtn) {
      switchBtn.classList.remove('hidden');
    }
  }

  AttendX.Components.Header = {
    renderHeader,
    updateHeaderRoleBadge
  };
})(window);
