(function (global) {
  const AttendX = (global.AttendX = global.AttendX || {});
  AttendX.Components = AttendX.Components || {};

  const ROLE_SWITCHABLE_SCREENS = new Set(['screen-menu', 'screen-student-events']);

  function renderHeader() {
    const mount = document.getElementById('app-header-mount');
    if (!mount) return;

    mount.innerHTML = `
      <header class="sticky top-0 z-[200] border-b border-theme bg-header backdrop-blur-md">
        <div class="max-w-[960px] mx-auto flex items-center justify-between px-4 sm:px-6 py-3 select-none gap-3">
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center font-sans font-bold text-[0.84rem] tracking-tight shadow-btn-primary shrink-0">
              AX
            </div>
            <span class="font-sans text-[1.12rem] font-semibold text-main tracking-[-0.015em] truncate">AttendX</span>
            <span
              id="header-role-badge"
              class="hidden ml-1 py-0.5 px-2.5 rounded-md text-[0.72rem] font-semibold tracking-wide bg-surface-tint text-accent border border-theme select-none shrink-0"
            ></span>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <button
              type="button"
              id="header-switch-role-btn"
              onclick="switchRoleScreen()"
              title="Switch Portal Role"
              class="hidden items-center gap-1.5 py-1.5 px-3 rounded-lg font-sans text-[0.78rem] font-medium text-secondary hover:text-main bg-surface2 hover:bg-surface-hover border border-theme hover:border-strong transition-all cursor-pointer focus:outline-none select-none"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="pointer-events-none">
                <polyline points="17 1 21 5 17 9"></polyline>
                <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
                <polyline points="7 23 3 19 7 15"></polyline>
                <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
              </svg>
              <span>Switch Role</span>
            </button>
            <button
              type="button"
              id="theme-toggle-btn"
              onclick="toggleTheme()"
              title="Switch Dark / Light Theme"
              aria-label="Switch Dark / Light Theme"
              class="w-9 h-9 rounded-lg inline-flex items-center justify-center bg-surface2 border border-theme hover:border-strong hover:bg-surface-hover text-accent transition-all cursor-pointer focus:outline-none select-none"
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
        </div>
      </header>
    `;
  }

  function updateHeaderRoleBadge(activeScreenId) {
    const badge = document.getElementById('header-role-badge');
    const switchBtn = document.getElementById('header-switch-role-btn');
    if (!badge) return;

    const user = AttendX.State?.user;
    const role = AttendX.Backend?.SecurityConfig?.getSessionRole?.() || AttendX.State?.role;
    const currentScreen =
      activeScreenId ||
      document.querySelector('.screen.active')?.id ||
      '';

    if (!user || !role || currentScreen === 'screen-login' || currentScreen === 'screen-role') {
      badge.className = 'hidden';
      badge.textContent = '';
      if (switchBtn) {
        switchBtn.classList.add('hidden');
        switchBtn.classList.remove('inline-flex');
      }
      return;
    }

    badge.textContent = role === 'student' ? 'Student' : 'Coordinator / Staff';
    badge.className =
      'inline-flex items-center ml-1 py-0.5 px-2.5 rounded-md text-[0.72rem] font-semibold tracking-wide bg-surface-tint text-accent border border-theme select-none shrink-0';

    if (switchBtn) {
      if (ROLE_SWITCHABLE_SCREENS.has(currentScreen)) {
        switchBtn.classList.remove('hidden');
        switchBtn.classList.add('inline-flex');
      } else {
        switchBtn.classList.add('hidden');
        switchBtn.classList.remove('inline-flex');
      }
    }
  }

  AttendX.Components.Header = {
    renderHeader,
    updateHeaderRoleBadge
  };
})(window);
