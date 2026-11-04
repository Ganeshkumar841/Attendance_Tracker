(function (global) {
  const AttendX = (global.AttendX = global.AttendX || {});

  const INITIAL_URL_HASH = window.location.hash || '';
  const INITIAL_URL_SEARCH = window.location.search || '';
  const IS_INITIAL_RECOVERY =
    INITIAL_URL_HASH.includes('type=recovery') || INITIAL_URL_SEARCH.includes('type=recovery');

  const yearPrefixes = AttendX.Utils.Sanitizer.computeAcademicYears();

  const COORDINATOR_ONLY_SCREENS = new Set([
    'screen-menu',
    'screen-create',
    'screen-event-created',
    'screen-join'
  ]);

  AttendX.State = {
    user: null,
    role: null,
    currentEvent: null,
    attendance: [],
    currentFilter: 'all',
    studentSearchQuery: '',
    editAuthorized: false,
    pendingDeleteId: null,
    pendingDeleteRoll: null,
    events: [],
    authMode: IS_INITIAL_RECOVERY ? 'update-password' : 'signin',
    pendingEmail: '',
    otpType: 'signup',
    isPasswordRecovery: IS_INITIAL_RECOVERY,
    theme: 'dark',
    selectedYear: null,
    yearPrefixes
  };

  function showScreen(id) {
    const state = AttendX.State;
    const { SecurityConfig } = AttendX.Backend;

    if (id !== 'screen-login' && !state.user) {
      id = 'screen-login';
    }

    if (id !== 'screen-login' && id !== 'screen-role') {
      const activeRole = SecurityConfig.getSessionRole();
      if (!activeRole) {
        id = 'screen-role';
      } else if (activeRole === 'student' && COORDINATOR_ONLY_SCREENS.has(id)) {
        id = 'screen-student-events';
      } else if (activeRole === 'coordinator' && id === 'screen-student-events') {
        id = 'screen-menu';
      }
    }

    document.querySelectorAll('.screen').forEach(s => {
      s.classList.add('hidden');
      s.classList.remove('flex', 'active');
    });

    const target = document.getElementById(id);
    if (target) {
      target.classList.remove('hidden');
      target.classList.add('flex', 'active');
    }

    if (AttendX.Components?.Header?.updateHeaderRoleBadge) {
      AttendX.Components.Header.updateHeaderRoleBadge();
    }

    if (id === 'screen-attendance') {
      AttendX.Pages.Attendance.updateAttendanceUI();
    }
    if (id === 'screen-join' || id === 'screen-student-events') {
      AttendX.Pages.Events.fetchRecentEvents();
    }
  }

  function afterLogin() {
    const state = AttendX.State;
    const { SecurityConfig } = AttendX.Backend;
    if (!state.user) return;

    const nameEl = document.getElementById('user-name');
    if (nameEl) {
      nameEl.textContent = state.user.name;
    }
    const roleNameEl = document.getElementById('role-user-name');
    if (roleNameEl) {
      roleNameEl.textContent = state.user.name;
    }

    AttendX.Backend.SessionManager.startSessionMonitor(() => {
      AttendX.Components.Toast.toast('Session expired due to inactivity. Please sign in again.', 'info');
      logout();
    });

    const restoredRole = SecurityConfig.restoreSessionRole(state.user.id);
    AttendX.Components.Header.updateHeaderRoleBadge();

    if (restoredRole === 'coordinator') {
      showScreen('screen-menu');
    } else if (restoredRole === 'student') {
      showScreen('screen-student-events');
    } else {
      showScreen('screen-role');
    }
  }

  async function logout() {
    AttendX.Backend.SessionManager.stopSessionMonitor();
    AttendX.Backend.AttendanceService.unsubscribeRealtime();
    AttendX.Backend.SecurityConfig.clearSessionRole();

    if (AttendX.Components?.Modals) {
      ['modal-edit-auth', 'modal-delete-confirm', 'modal-delete-event'].forEach(id => {
        AttendX.Components.Modals.closeModal(id);
      });
    }

    await AttendX.Backend.AuthService.signOut();

    const state = AttendX.State;
    state.user = null;
    state.role = null;
    state.currentEvent = null;
    state.attendance = [];
    state.studentSearchQuery = '';
    state.editAuthorized = false;
    state.pendingDeleteId = null;
    state.pendingDeleteRoll = null;

    if (AttendX.Components?.Header?.updateHeaderRoleBadge) {
      AttendX.Components.Header.updateHeaderRoleBadge();
    }

    AttendX.Pages.SignIn.switchAuthMode('signin');
    showScreen('screen-login');
  }

  function confirmLogout() {
    logout();
  }

  function initSupabaseAuthListeners() {
    const client = AttendX.Backend.Supabase.getClient();
    if (!client) return;

    const { AuthService, SecurityConfig } = AttendX.Backend;
    const { showAuthBanner, switchAuthMode } = AttendX.Pages.SignIn;
    const state = AttendX.State;

    client.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (session) {
          state.user = AuthService.extractUserFromSession(session);
          if (
            state.isPasswordRecovery ||
            state.authMode === 'update-password' ||
            INITIAL_URL_HASH.includes('type=recovery')
          ) {
            showScreen('screen-login');
            switchAuthMode('update-password');
            showAuthBanner('Reset link verified! Enter your new password below.', 'success');
          } else {
            afterLogin();
          }
        }
      })
      .catch(err => console.warn('Session check error:', err));

    client.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        state.isPasswordRecovery = true;
        showScreen('screen-login');
        switchAuthMode('update-password');
        showAuthBanner('Password recovery link verified! Enter your new password below.', 'success');
        return;
      }
      if (session) {
        state.user = AuthService.extractUserFromSession(session);
        if (state.isPasswordRecovery || state.authMode === 'update-password') {
          showScreen('screen-login');
          return;
        }
        const loginScreen = document.getElementById('screen-login');
        if (loginScreen && loginScreen.classList.contains('active')) {
          afterLogin();
        }
      } else {
        SecurityConfig.clearSessionRole();
        state.user = null;
        if (AttendX.Components?.Header?.updateHeaderRoleBadge) {
          AttendX.Components.Header.updateHeaderRoleBadge();
        }
        showScreen('screen-login');
      }
    });
  }

  async function bootstrapApp() {
    AttendX.Components.Header.renderHeader();
    AttendX.Pages.SignIn.renderSignInPage();
    AttendX.Pages.Menu.renderMenuPage();
    AttendX.Pages.Events.renderEventsPages();
    AttendX.Pages.Attendance.renderAttendancePage();
    AttendX.Components.Footer.renderFooter();
    AttendX.Components.Modals.renderModals();

    AttendX.Utils.Theme.initTheme();

    const prefixes = AttendX.State.yearPrefixes;
    ['1', '2', '3', '4'].forEach(y => {
      const el = document.getElementById(`y${y}-prefix`);
      if (el) el.textContent = prefixes[y];
    });

    const dateInput = document.getElementById('ev-date');
    if (dateInput) {
      dateInput.valueAsDate = new Date();
    }

    initSupabaseAuthListeners();

    const { AuthService, Supabase, SecurityConfig } = AttendX.Backend;
    const { showAuthBanner, switchAuthMode } = AttendX.Pages.SignIn;

    if (
      INITIAL_URL_HASH.includes('error_description=') ||
      INITIAL_URL_SEARCH.includes('error_description=')
    ) {
      const rawParams = new URLSearchParams(
        INITIAL_URL_HASH.replace(/^#/, '') || INITIAL_URL_SEARCH.replace(/^\?/, '')
      );
      const errDesc = rawParams.get('error_description');
      if (errDesc) {
        const friendly = AuthService.formatAuthError(
          decodeURIComponent(errDesc.replace(/\+/g, ' ')),
          'otp'
        );
        showAuthBanner(friendly, 'error');
      }
    }

    if (
      Supabase.isConfigured() &&
      (INITIAL_URL_SEARCH.includes('token_hash=') || INITIAL_URL_SEARCH.includes('token='))
    ) {
      const searchParams = new URLSearchParams(INITIAL_URL_SEARCH);
      const tokenHash = searchParams.get('token_hash') || searchParams.get('token');
      const linkType = searchParams.get('type') || 'recovery';

      if (tokenHash) {
        if (linkType === 'recovery') {
          AttendX.State.isPasswordRecovery = true;
        }
        const { data, error } = await AuthService.verifyOtpPayload({
          token_hash: tokenHash,
          type: linkType
        });
        if (!error && linkType === 'recovery') {
          showScreen('screen-login');
          switchAuthMode('update-password');
          showAuthBanner('Reset link verified! Enter your new password below.', 'success');
          return;
        } else if (!error && data?.session) {
          SecurityConfig.clearSessionRole();
          AttendX.State.user = AuthService.extractUserFromSession(data.session);
          afterLogin();
          return;
        } else if (error) {
          showAuthBanner(AuthService.formatAuthError(error, linkType), 'error');
        }
      }
    }

    if (IS_INITIAL_RECOVERY) {
      showScreen('screen-login');
      switchAuthMode('update-password');
      showAuthBanner('Reset link verified! Enter your new password below.', 'success');
    }
  }

  document.addEventListener('DOMContentLoaded', bootstrapApp);

  global.showScreen = showScreen;
  global.logout = logout;
  global.confirmLogout = confirmLogout;

  AttendX.App = {
    showScreen,
    afterLogin,
    logout,
    confirmLogout
  };
})(window);
