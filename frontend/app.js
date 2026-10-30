/**
 * Frontend Application Bootstrapper & Router (`frontend/app.js`)
 * Initializes global application state, mounts modular components and pages,
 * and manages navigation and Supabase auth lifecycle events.
 */
(function (global) {
  const AttendX = (global.AttendX = global.AttendX || {});

  const INITIAL_URL_HASH = window.location.hash || '';
  const INITIAL_URL_SEARCH = window.location.search || '';
  const IS_INITIAL_RECOVERY =
    INITIAL_URL_HASH.includes('type=recovery') || INITIAL_URL_SEARCH.includes('type=recovery');

  const yearPrefixes = AttendX.Utils.Sanitizer.computeAcademicYears();

  // Global Reactive State
  AttendX.State = {
    user: null,
    currentEvent: null,
    attendance: [],
    currentFilter: 'all',
    editAuthorized: false,
    pendingDeleteId: null,
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
    document.querySelectorAll('.screen').forEach(s => {
      s.classList.add('hidden');
      s.classList.remove('flex', 'active');
    });

    const target = document.getElementById(id);
    if (target) {
      target.classList.remove('hidden');
      target.classList.add('flex', 'active');
    }

    if (id === 'screen-attendance') {
      AttendX.Pages.Attendance.updateAttendanceUI();
    }
    if (id === 'screen-join') {
      AttendX.Pages.Events.fetchRecentEvents();
    }
  }

  function afterLogin() {
    const state = AttendX.State;
    if (!state.user) return;
    const nameEl = document.getElementById('user-name');
    if (nameEl) {
      nameEl.textContent = state.user.name;
    }

    // Start 30-minute inactivity session monitor
    AttendX.Backend.SessionManager.startSessionMonitor(() => {
      AttendX.Components.Toast.toast('Session expired due to inactivity. Please sign in again.', 'info');
      logout();
    });

    showScreen('screen-menu');
  }

  async function logout() {
    AttendX.Backend.SessionManager.stopSessionMonitor();
    AttendX.Backend.AttendanceService.unsubscribeRealtime();
    await AttendX.Backend.AuthService.signOut();

    const state = AttendX.State;
    state.user = null;
    state.currentEvent = null;
    state.attendance = [];
    state.editAuthorized = false;
    state.pendingDeleteId = null;

    AttendX.Pages.SignIn.switchAuthMode('signin');
    showScreen('screen-login');
  }

  function confirmLogout() {
    logout();
  }

  function initSupabaseAuthListeners() {
    const client = AttendX.Backend.Supabase.getClient();
    if (!client) return;

    const { AuthService } = AttendX.Backend;
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
      .catch(err => console.warn('[AttendX] Session check error:', err));

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
        state.user = null;
        showScreen('screen-login');
      }
    });
  }

  async function bootstrapApp() {
    // 1. Mount all modular UI components & pages
    AttendX.Components.Header.renderHeader();
    AttendX.Pages.SignIn.renderSignInPage();
    AttendX.Pages.Menu.renderMenuPage();
    AttendX.Pages.Events.renderEventsPages();
    AttendX.Pages.Attendance.renderAttendancePage();
    AttendX.Components.Footer.renderFooter();
    AttendX.Components.Modals.renderModals();

    // 2. Initialize Dark / Light Theme (icon-only toggle)
    AttendX.Utils.Theme.initTheme();

    // 3. Populate dynamic academic year labels and default event date
    const prefixes = AttendX.State.yearPrefixes;
    ['1', '2', '3', '4'].forEach(y => {
      const el = document.getElementById(`y${y}-prefix`);
      if (el) el.textContent = prefixes[y];
    });

    const dateInput = document.getElementById('ev-date');
    if (dateInput) {
      dateInput.valueAsDate = new Date();
    }

    // 4. Register auth state listeners
    initSupabaseAuthListeners();

    const { AuthService, Supabase } = AttendX.Backend;
    const { showAuthBanner, switchAuthMode } = AttendX.Pages.SignIn;

    // 5. Handle URL error descriptions (e.g., expired OTP link)
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

    // 6. Handle token_hash in URL query if present
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
