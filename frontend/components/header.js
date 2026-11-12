(function (global) {
  const AttendX = (global.AttendX = global.AttendX || {});
  AttendX.Components = AttendX.Components || {};

  const ROLE_SWITCHABLE_SCREENS = new Set(['screen-menu', 'screen-student-events']);
  const OPENING_SCREENS = new Set(['screen-login', 'screen-role']);

  function renderHeader() {
    const mount = document.getElementById('app-header-mount');
    if (!mount) return;

    mount.innerHTML = `
      <header class="sticky top-0 z-[200] flex items-center justify-between px-4 sm:px-8 py-3.5 border-b border-theme bg-header backdrop-blur-md gap-3">
        <div class="flex items-center gap-2.5 min-w-0">
          <div class="w-[30px] h-[30px] rounded-lg bg-primary text-white flex items-center justify-center font-sans font-bold text-[0.86rem] tracking-tight shadow-btn-primary shrink-0 select-none">
            AX
          </div>
          <span class="font-sans text-[1.16rem] font-semibold text-main tracking-[-0.015em] truncate">AttendX</span>
          <span
            id="header-role-badge"
            class="hidden ml-1.5 py-0.5 px-2.5 rounded-md text-[0.72rem] font-semibold tracking-wide bg-surface-tint text-accent border border-theme shrink-0"
          ></span>
        </div>
        <div class="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            id="header-switch-role-btn"
            onclick="switchRoleScreen()"
            title="Switch Portal Role"
            class="hidden items-center gap-1.5 py-1.5 px-3 rounded-lg font-sans text-[0.78rem] font-medium text-secondary hover:text-main bg-surface2 hover:bg-surface-hover border border-theme hover:border-strong transition-all cursor-pointer focus:outline-none"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="pointer-events-none select-none">
              <polyline points="17 1 21 5 17 9"></polyline>
              <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
              <polyline points="7 23 3 19 7 15"></polyline>
              <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
            </svg>
            <span>Switch Role</span>
          </button>
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
      'screen-login';

    const isOpeningScreen = OPENING_SCREENS.has(currentScreen) || !user || !role;

    if (isOpeningScreen) {
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
      'inline-flex items-center ml-1.5 py-0.5 px-2.5 rounded-md text-[0.72rem] font-semibold tracking-wide bg-surface-tint text-accent border border-theme shrink-0';

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
