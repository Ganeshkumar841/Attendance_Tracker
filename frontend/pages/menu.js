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
            <div class="inline-flex items-center gap-2 py-1 px-3.5 rounded-full bg-surface-tint border border-theme text-accent text-[0.75rem] font-medium uppercase tracking-[0.06em] mb-3">
              Select Access Mode
            </div>
            <div class="text-[1.9rem] sm:text-[2.1rem] font-medium mb-2 tracking-[-0.02em] text-main">
              Welcome, <span id="role-user-name" class="text-accent">User</span>
            </div>
            <p class="text-muted text-[0.94rem] max-w-[460px] mx-auto leading-relaxed">
              Choose your portal to continue. Coordinators &amp; Staff can manage sessions, while Students can check their live attendance status.
            </p>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <!-- Coordinator / Staff Login Card -->
            <button
              type="button"
              id="btn-role-coordinator"
              onclick="selectRole('coordinator')"
              class="group bg-surface border border-theme hover:border-strong hover:bg-surface2 rounded-2xl p-6 cursor-pointer transition-all duration-150 flex flex-col justify-between gap-5 text-left w-full shadow-card focus:outline-none select-none active:scale-[0.99]"
            >
              <div class="flex items-start justify-between gap-4 w-full">
                <div class="w-12 h-12 rounded-xl flex items-center justify-center text-accent shrink-0 bg-surface-tint border border-theme">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                    <polyline points="9 12 11 14 15 10"></polyline>
                  </svg>
                </div>
                <span class="py-1 px-2.5 rounded-full text-[0.7rem] font-medium bg-surface2 text-secondary border border-theme">
                  Full Access
                </span>
              </div>
              <div>
                <h3 class="text-[1.08rem] font-medium text-main mb-1.5 flex items-center justify-between">
                  <span>Coordinator / Staff Login</span>
                  <span class="text-muted text-[1.25rem] transition-transform duration-150 group-hover:translate-x-[3px] group-hover:text-accent">›</span>
                </h3>
                <p class="text-[0.83rem] text-muted leading-relaxed">
                  For Event Coordinators, Staff &amp; HODs. Create events, mark attendance, modify records, and export branch-wise Excel reports.
                </p>
              </div>
            </button>

            <!-- Student Login Card -->
            <button
              type="button"
              id="btn-role-student"
              onclick="selectRole('student')"
              class="group bg-surface border border-theme hover:border-strong hover:bg-surface2 rounded-2xl p-6 cursor-pointer transition-all duration-150 flex flex-col justify-between gap-5 text-left w-full shadow-card focus:outline-none select-none active:scale-[0.99]"
            >
              <div class="flex items-start justify-between gap-4 w-full">
                <div class="w-12 h-12 rounded-xl flex items-center justify-center text-accent shrink-0 bg-surface-tint border border-theme">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
                    <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
                  </svg>
                </div>
                <span class="py-1 px-2.5 rounded-full text-[0.7rem] font-medium bg-surface-tint text-accent border border-theme">
                  View Only
                </span>
              </div>
              <div>
                <h3 class="text-[1.08rem] font-medium text-main mb-1.5 flex items-center justify-between">
                  <span>Student Login</span>
                  <span class="text-muted text-[1.25rem] transition-transform duration-150 group-hover:translate-x-[3px] group-hover:text-accent">›</span>
                </h3>
                <p class="text-[0.83rem] text-muted leading-relaxed">
                  For Students. View the live attendance list for any event and verify whether your roll number has been marked present.
                </p>
              </div>
            </button>
          </div>

          <div class="mt-10 text-center">
            <button
              type="button"
              onclick="logout()"
              class="inline-flex items-center justify-center py-2 px-5 rounded-full font-sans text-[0.8rem] font-medium text-accent bg-transparent border border-theme hover:border-strong hover:bg-surface-tint transition-all cursor-pointer focus:outline-none select-none"
            >
              Sign Out
            </button>
          </div>
        </div>
      </section>

      <!-- COORDINATOR / STAFF DASHBOARD MENU -->
      <section id="screen-menu" class="screen hidden flex-1 flex-col">
        <div class="max-w-[760px] mx-auto px-5 w-full pt-14 pb-10">
          <div class="mb-9 text-center select-none">
            <div class="text-[2rem] font-medium mb-2 tracking-[-0.02em] text-main">
              Welcome back, <span id="user-name" class="text-accent">Coordinator</span>
            </div>
            <p class="text-muted text-[0.95rem]">Create a new attendance session or join an active campus event.</p>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onclick="showScreen('screen-create')"
              class="group bg-surface border border-theme hover:border-strong hover:bg-surface2 rounded-[14px] p-6 cursor-pointer transition-all duration-150 flex items-center justify-between gap-4 text-left w-full focus:outline-none select-none active:scale-[0.99]"
            >
              <div class="flex items-center gap-4">
                <div class="w-11 h-11 rounded-[10px] flex items-center justify-center text-accent shrink-0 bg-surface-tint">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                </div>
                <div>
                  <h3 class="text-[1rem] font-medium text-main mb-1">Create New Event</h3>
                  <p class="text-[0.82rem] text-muted">Set up a fresh attendance session</p>
                </div>
              </div>
              <span class="text-muted text-[1.25rem] transition-all duration-150 group-hover:translate-x-[3px] group-hover:text-accent">›</span>
            </button>

            <button
              type="button"
              onclick="showScreen('screen-join')"
              class="group bg-surface border border-theme hover:border-strong hover:bg-surface2 rounded-[14px] p-6 cursor-pointer transition-all duration-150 flex items-center justify-between gap-4 text-left w-full focus:outline-none select-none active:scale-[0.99]"
            >
              <div class="flex items-center gap-4">
                <div class="w-11 h-11 rounded-[10px] flex items-center justify-center text-accent shrink-0 bg-surface-tint">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                  </svg>
                </div>
                <div>
                  <h3 class="text-[1rem] font-medium text-main mb-1">Join Existing Event</h3>
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
              class="inline-flex items-center justify-center py-2 px-4 rounded-full font-sans text-[0.8rem] font-medium text-secondary hover:text-main bg-surface border border-theme hover:border-strong transition-all cursor-pointer focus:outline-none select-none"
            >
              ← Switch Role
            </button>
            <button
              type="button"
              onclick="logout()"
              class="inline-flex items-center justify-center py-2 px-4 rounded-full font-sans text-[0.8rem] font-medium text-accent bg-transparent border border-theme hover:border-strong hover:bg-surface-tint transition-all cursor-pointer focus:outline-none select-none"
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
      toast('Student mode active (View Only)', 'info');
      AttendX.App.showScreen('screen-student-events');
    } else {
      AuditService.logAction('ROLE_SELECTED_COORDINATOR', { email: state.user.email });
      toast('Coordinator / Staff mode active', 'success');
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
