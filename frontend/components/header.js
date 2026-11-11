(function (global) {
  const AttendX = (global.AttendX = global.AttendX || {});
  AttendX.Components = AttendX.Components || {};

  const ROLE_SWITCHABLE_SCREENS = new Set(['screen-menu', 'screen-student-events']);
  const OPENING_SCREENS = new Set(['screen-login', 'screen-role']);

  function renderHeader() {
    const mount = document.getElementById('app-header-mount');
    if (!mount) return;

    mount.innerHTML = `
      <header class="sticky top-0 z-[200] flex items-center justify-between px-4 sm:px-8 py-3.5 border-b border-theme bg-header backdrop-blur-md select-none gap-3">
        <div class="flex items-center gap-2.5 min-w-0">
          <div class="w-[30px] h-[30px] rounded-lg bg-primary text-white flex items-center justify-center font-sans font-bold text-[0.86rem] tracking-tight shadow-btn-primary shrink-0">
            AX
          </div>
          <span class="font-sans text-[1.16rem] font-semibold text-main tracking-[-0.015em] truncate">AttendX</span>
          <span
            id="header-role-badge"
            class="hidden ml-1.5 py-0.5 px-2.5 rounded-md text-[0.72rem] font-semibold tracking-wide bg-surface-tint text-accent border border-theme select-none shrink-0"
          ></span>
        </div>
        <div class="flex items-center gap-2.5 shrink-0">
          <span
            id="header-portal-tagline"
            class="text-[0.76rem] text-muted font-normal tracking-tight select-none"
          >
            Real-time Sync · Coordinator &amp; Student Portals
          </span>
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
        </div>
      </header>
    `;
  }

  function updateHeaderRoleBadge(activeScreenId) {
    const badge = document.getElementById('header-role-badge');
    const switchBtn = document.getElementById('header-switch-role-btn');
    const headerTagline = document.getElementById('header-portal-tagline');
    const footerTagline = document.getElementById('footer-portal-tagline');
    const footerContainer = document.getElementById('footer-inner-container');
    if (!badge) return;

    const user = AttendX.State?.user;
    const role = AttendX.Backend?.SecurityConfig?.getSessionRole?.() || AttendX.State?.role;
    const currentScreen =
      activeScreenId ||
      document.querySelector('.screen.active')?.id ||
      'screen-login';

    const isOpeningScreen = OPENING_SCREENS.has(currentScreen) || !user || !role;

    if (headerTagline) {
      if (isOpeningScreen) {
        headerTagline.classList.remove('hidden');
      } else {
        headerTagline.classList.add('hidden');
      }
    }

    if (footerTagline && footerContainer) {
      if (isOpeningScreen) {
        footerTagline.classList.add('hidden');
        footerContainer.className = 'max-w-[760px] mx-auto flex items-center justify-center text-center';
      } else {
        footerTagline.classList.remove('hidden');
        footerContainer.className = 'max-w-[760px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2';
      }
    }

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
      'inline-flex items-center ml-1.5 py-0.5 px-2.5 rounded-md text-[0.72rem] font-semibold tracking-wide bg-surface-tint text-accent border border-theme select-none shrink-0';

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
