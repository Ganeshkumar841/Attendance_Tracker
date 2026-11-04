/**
 * Frontend Page — Post-Auth Role Selection (Coordinator/Staff vs. Student) & Coordinator Dashboard Menu Page
 */
(function (global) {
  const AttendX = (global.AttendX = global.AttendX || {});
  AttendX.Pages = AttendX.Pages || {};

  function renderMenuPage() {
    const mount = document.getElementById('page-menu-mount');
    if (!mount) return;

    mount.innerHTML = `
      <!-- POST-AUTHENTICATION ROLE SELECTION SCREEN -->
      <section id="screen-role" class="screen hidden flex-1 flex-col">
        <div class="max-w-[760px] mx-auto px-5 w-full pt-14 pb-10 flex-1 flex flex-col justify-center">
          <div class="mb-9 text-center select-none">
            <div class="text-[1.95rem] sm:text-[2.15rem] font-semibold mb-2 tracking-[-0.025em] text-main">
              Welcome, <span id="role-user-name" class="text-accent">User</span>
            </div>
            <p class="text-muted text-[0.94rem] max-w-[460px] mx-auto leading-relaxed">
              Choose your portal to continue.
            </p>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <!-- Coordinator / Staff Login Card -->
            <button
              type="button"
              id="btn-role-coordinator"
              onclick="selectRole('coordinator')"
              class="group bg-surface border border-theme hover:border-strong hover:bg-surface2 rounded-2xl p-6 cursor-pointer transition-all duration-150 flex items-center justify-between gap-4 text-left w-full shadow-card focus:outline-none select-none active:scale-[0.99]"
            >
              <div class="flex items-center gap-4">
                <div class="w-11 h-11 rounded-xl flex items-center justify-center text-accent shrink-0 bg-surface-tint border border-theme">
                  <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                    <polyline points="9 12 11 14 15 10"></polyline>
                  </svg>
                </div>
                <div>
                  <h3 class="text-[1.02rem] font-semibold text-main">Coordinator / Staff Login</h3>
                </div>
              </div>
              <span class="text-muted text-[1.25rem] transition-all duration-150 group-hover:translate-x-[3px] group-hover:text-accent">›</span>
            </button>

            <!-- Student Login Card -->
            <button
              type="button"
              id="btn-role-student"
              onclick="selectRole('student')"
              class="group bg-surface border border-theme hover:border-strong hover:bg-surface2 rounded-2xl p-6 cursor-pointer transition-all duration-150 flex items-center justify-between gap-4 text-left w-full shadow-card focus:outline-none select-none active:scale-[0.99]"
            >
              <div class="flex items-center gap-4">
                <div class="w-11 h-11 rounded-xl flex items-center justify-center text-accent shrink-0 bg-surface-tint border border-theme">
                  <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
                    <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
                  </svg>
                </div>
                <div>
                  <h3 class="text-[1.02rem] font-semibold text-main">Student Login</h3>
                </div>
              </div>
              <span class="text-muted text-[1.25rem] transition-all duration-150 group-hover:translate-x-[3px] group-hover:text-accent">›</span>
            </button>
          </div>

          <div class="mt-10 text-center">
            <button
              type="button"
              onclick="logout()"
              class="inline-flex items-center justify-center py-2.5 px-5 rounded-xl font-sans text-[0.82rem] font-medium text-secondary hover:text-main bg-surface2 hover:bg-surface-hover border border-theme hover:border-strong transition-all cursor-pointer focus:outline-none select-none"
            >
              Sign Out
            </button>
          </div>
        </div>
      </section>

      <!-- COORDINATOR / STAFF DASHBOARD MENU -->
      <section id="screen-menu" class="screen hidden flex-1 flex-col">
        <div class="max-w-[760px] mx-auto px-5 w-full pt-14 pb-10 flex-1 flex flex-col justify-center">
          <div class="mb-9 text-center select-none">
            <div class="text-[1.95rem] sm:text-[2.15rem] font-semibold mb-2 tracking-[-0.025em] text-main">
              Welcome back, <span id="user-name" class="text-accent">Coordinator</span>
            </div>
            <p class="text-muted text-[0.94rem]">Create a new attendance session or join an active campus event.</p>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onclick="showScreen('screen-create')"
              class="group bg-surface border border-theme hover:border-strong hover:bg-surface2 rounded-2xl p-6 cursor-pointer transition-all duration-150 flex items-center justify-between gap-4 text-left w-full shadow-card focus:outline-none select-none active:scale-[0.99]"
            >
              <div class="flex items-center gap-4">
                <div class="w-11 h-11 rounded-xl flex items-center justify-center text-accent shrink-0 bg-surface-tint border border-theme">
                  <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                </div>
                <div>
                  <h3 class="text-[1.02rem] font-semibold text-main mb-1">Create New Event</h3>
                  <p class="text-[0.82rem] text-muted">Set up a fresh attendance session</p>
                </div>
              </div>
              <span class="text-muted text-[1.25rem] transition-all duration-150 group-hover:translate-x-[3px] group-hover:text-accent">›</span>
            </button>

            <button
              type="button"
              onclick="showScreen('screen-join')"
              class="group bg-surface border border-theme hover:border-strong hover:bg-surface2 rounded-2xl p-6 cursor-pointer transition-all duration-150 flex items-center justify-between gap-4 text-left w-full shadow-card focus:outline-none select-none active:scale-[0.99]"
            >
              <div class="flex items-center gap-4">
                <div class="w-11 h-11 rounded-xl flex items-center justify-center text-accent shrink-0 bg-surface-tint border border-theme">
                  <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                  </svg>
                </div>
                <div>
                  <h3 class="text-[1.02rem] font-semibold text-main mb-1">Join Existing Event</h3>
                  <p class="text-[0.82rem] text-muted">Multiple coordinators, same event</p>
                </div>
              </div>
              <span class="text-muted text-[1.25rem] transition-all duration-150 group-hover:translate-x-[3px] group-hover:text-accent">›</span>
            </button>
          </div>

          <div class="mt-10 flex items-center justify-center gap-3">
            <button
              type="button"
              onclick="switchRoleScreen()"
              class="inline-flex items-center justify-center py-2.5 px-5 rounded-xl font-sans text-[0.82rem] font-medium text-secondary hover:text-main bg-surface2 hover:bg-surface-hover border border-theme hover:border-strong transition-all cursor-pointer focus:outline-none select-none"
            >
              ← Switch Role
            </button>
            <button
              type="button"
              onclick="logout()"
              class="inline-flex items-center justify-center py-2.5 px-5 rounded-xl font-sans text-[0.82rem] font-medium text-secondary hover:text-main bg-surface2 hover:bg-surface-hover border border-theme hover:border-strong transition-all cursor-pointer focus:outline-none select-none"
            >
              Sign Out
            </button>
          </div>
        </div>
      </section>
    `;
  }

  function selectRole(role) {
    const state = AttendX.State;
    const { SecurityConfig, AuditService, AttendanceService } = AttendX.Backend;
    const { toast } = AttendX.Components.Toast;

    if (!state.user) {
      AttendX.App.showScreen('screen-login');
      return;
    }

    const normalized = role === 'student' ? 'student' : 'coordinator';

    // Reset any active event state when selecting or changing role
    AttendanceService.unsubscribeRealtime();
    state.currentEvent = null;
    state.attendance = [];
    state.editAuthorized = false;
    state.pendingDeleteId = null;
    state.pendingDeleteRoll = null;
    state.studentSearchQuery = '';

    SecurityConfig.setSessionRole(normalized, state.user.id);
    AttendX.Components.Header.updateHeaderRoleBadge();

    if (normalized === 'student') {
      AuditService.logAction('ROLE_SELECTED_STUDENT', { email: state.user.email });
      toast('Student portal active', 'info');
      AttendX.App.showScreen('screen-student-events');
    } else {
      AuditService.logAction('ROLE_SELECTED_COORDINATOR', { email: state.user.email });
      toast('Coordinator / Staff portal active', 'success');
      AttendX.App.showScreen('screen-menu');
    }
  }

  function switchRoleScreen() {
    const state = AttendX.State;
    const { SecurityConfig, AttendanceService } = AttendX.Backend;

    if (!state.user) {
      AttendX.App.showScreen('screen-login');
      return;
    }

    // Close any open modals and clear active event session
    if (AttendX.Components?.Modals) {
      ['modal-edit-auth', 'modal-delete-confirm', 'modal-delete-event'].forEach(id => {
        AttendX.Components.Modals.closeModal(id);
      });
    }

    AttendanceService.unsubscribeRealtime();
    state.currentEvent = null;
    state.attendance = [];
    state.editAuthorized = false;
    state.pendingDeleteId = null;
    state.pendingDeleteRoll = null;
    state.studentSearchQuery = '';

    SecurityConfig.clearSessionRole();
    AttendX.Components.Header.updateHeaderRoleBadge();
    AttendX.App.showScreen('screen-role');
  }

  global.selectRole = selectRole;
  global.switchRoleScreen = switchRoleScreen;

  AttendX.Pages.Menu = {
    renderMenuPage,
    selectRole,
    switchRoleScreen
  };
})(window);
