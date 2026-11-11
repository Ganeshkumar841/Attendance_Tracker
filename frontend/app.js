(function (global) {
  const AttendX = (global.AttendX = global.AttendX || {});

  const INITIAL_URL_HASH = window.location.hash || '';
  const INITIAL_URL_SEARCH = window.location.search || '';
  const IS_EVENT_RESET = INITIAL_URL_SEARCH.includes('event_reset=1');
  const IS_INITIAL_RECOVERY =
    !IS_EVENT_RESET &&
    (INITIAL_URL_HASH.includes('type=recovery') || INITIAL_URL_SEARCH.includes('type=recovery'));

  const CACHED_USER_KEY = 'attendx_cached_user_v2';
  const ACTIVE_EVENT_KEY = 'attendx_active_event_v2';
  const SIGNOUT_SIGNAL_KEY = 'attendx_signout_signal_v2';

  let signoutChannel = null;

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
    activeAttendanceTab: 'entry',
    editAuthorized: false,
    pendingDeleteId: null,
    pendingDeleteRoll: null,
    events: [],
    authMode: IS_INITIAL_RECOVERY ? 'update-password' : 'signin',
    pendingEmail: '',
    otpType: 'signup',
    isPasswordRecovery: IS_INITIAL_RECOVERY,
    theme: 'light',
    selectedYear: null,
    yearPrefixes
  };

  function cacheUserSession(user) {
    try {
      if (user && user.id) {
        const serialized = JSON.stringify(user);
        sessionStorage.setItem(CACHED_USER_KEY, serialized);
        localStorage.setItem(CACHED_USER_KEY, serialized);
      } else {
        sessionStorage.removeItem(CACHED_USER_KEY);
        localStorage.removeItem(CACHED_USER_KEY);
      }
    } catch (_e) {}
  }

  function loadCachedUserSession() {
    try {
      const raw = sessionStorage.getItem(CACHED_USER_KEY) || localStorage.getItem(CACHED_USER_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.id) return parsed;
      }
    } catch (_e) {}
    return null;
  }

  function persistActiveEventSession(eventObj) {
    try {
      if (eventObj && eventObj.id) {
        sessionStorage.setItem(ACTIVE_EVENT_KEY, JSON.stringify(eventObj));
      } else {
        sessionStorage.removeItem(ACTIVE_EVENT_KEY);
      }
    } catch (_e) {}
  }

  function loadPersistedActiveEvent() {
    try {
      const raw = sessionStorage.getItem(ACTIVE_EVENT_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && parsed.id ? AttendX.Backend.EventService.normalizeEventRow(parsed) : null;
    } catch (_e) {
      return null;
    }
  }

  function clearPersistedActiveEvent() {
    try {
      sessionStorage.removeItem(ACTIVE_EVENT_KEY);
    } catch (_e) {}
  }

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

    if (id !== 'screen-attendance') {
      clearPersistedActiveEvent();
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
      AttendX.Components.Header.updateHeaderRoleBadge(id);
    }

    if (id === 'screen-attendance') {
      AttendX.Pages.Attendance.updateAttendanceUI();
    }
    if (id === 'screen-join' || id === 'screen-student-events') {
      AttendX.Pages.Events.fetchRecentEvents();
    }
  }

  async function afterLogin(preserveCurrentScreen = false) {
    const state = AttendX.State;
    const { SecurityConfig, AttendanceService } = AttendX.Backend;
    if (!state.user) return;

    cacheUserSession(state.user);

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

    if (preserveCurrentScreen) {
      const currentActive = document.querySelector('.screen.active')?.id;
      if (currentActive && currentActive !== 'screen-login') {
        AttendX.Components.Header.updateHeaderRoleBadge(currentActive);
        return;
      }
    }

    const persistedEvent = loadPersistedActiveEvent();
    if (restoredRole && persistedEvent && persistedEvent.id) {
      state.currentEvent = persistedEvent;
      if (restoredRole === 'coordinator') {
        SecurityConfig.markEventCoordinatorVerified(persistedEvent.id);
      }
      const { data: attList } = await AttendanceService.fetchByEvent(persistedEvent.id);
      state.attendance = attList || [];
      AttendX.Pages.Attendance.enterAttendance();
      return;
    }

    if (restoredRole === 'coordinator') {
      showScreen('screen-menu');
    } else if (restoredRole === 'student') {
      showScreen('screen-student-events');
    } else {
      showScreen('screen-role');
    }
  }

  function handleSignedOutCleanup() {
    AttendX.Backend.SessionManager.stopSessionMonitor();
    if (AttendX.Pages?.Attendance?.stopExpirationMonitor) {
      AttendX.Pages.Attendance.stopExpirationMonitor();
    }
    AttendX.Backend.AttendanceService.unsubscribeRealtime();
    AttendX.Backend.SecurityConfig.clearSessionRole();
    cacheUserSession(null);
    clearPersistedActiveEvent();

    if (AttendX.Components?.Modals?.closeAllModals) {
      AttendX.Components.Modals.closeAllModals();
    }

    const state = AttendX.State;
    state.user = null;
    state.role = null;
    state.currentEvent = null;
    state.attendance = [];
    state.studentSearchQuery = '';
    state.editAuthorized = false;
    state.pendingDeleteId = null;
    state.pendingDeleteRoll = null;

    if (AttendX.Pages?.SignIn?.switchAuthMode) {
      AttendX.Pages.SignIn.switchAuthMode('signin');
    }
    showScreen('screen-login');
  }

  function broadcastSignOutSignal() {
    try {
      if (signoutChannel) {
        signoutChannel.postMessage({ type: 'SIGN_OUT', ts: Date.now() });
      }
    } catch (_e) {}
    try {
      localStorage.setItem(SIGNOUT_SIGNAL_KEY, String(Date.now()));
    } catch (_e) {}
  }

  async function logout() {
    handleSignedOutCleanup();
    broadcastSignOutSignal();
    try {
      await AttendX.Backend.AuthService.signOut();
    } catch (_e) {}
  }

  function confirmLogout() {
    logout();
  }

  function initCrossTabSignOutListener() {
    if (typeof global.BroadcastChannel !== 'undefined' && !signoutChannel) {
      try {
        signoutChannel = new global.BroadcastChannel('attendx_auth_sync_v2');
        signoutChannel.onmessage = evt => {
          if (evt?.data?.type === 'SIGN_OUT') {
            handleSignedOutCleanup();
          }
        };
      } catch (_e) {}
    }

    global.addEventListener('storage', e => {
      if (e.key === SIGNOUT_SIGNAL_KEY && e.newValue) {
        handleSignedOutCleanup();
      }
    });
  }

  function initSupabaseAuthListeners() {
    const client = AttendX.Backend.Supabase.getClient();
    if (!client) {
      if (!AttendX.State.user) {
        showScreen('screen-login');
      }
      return;
    }

    const { AuthService } = AttendX.Backend;
    const { showAuthBanner, switchAuthMode } = AttendX.Pages.SignIn;
    const state = AttendX.State;

    client.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (session) {
          state.user = AuthService.extractUserFromSession(session);
          if (
            !IS_EVENT_RESET &&
            (state.isPasswordRecovery ||
              state.authMode === 'update-password' ||
              INITIAL_URL_HASH.includes('type=recovery'))
          ) {
            showScreen('screen-login');
            switchAuthMode('update-password');
            showAuthBanner('Reset link verified! Enter your new password below.', 'success');
          } else {
            afterLogin(true);
          }
        } else if (!state.user) {
          handleSignedOutCleanup();
        }
      })
      .catch(() => {
        if (!state.user) {
          showScreen('screen-login');
        }
      });

    client.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && !IS_EVENT_RESET) {
        state.isPasswordRecovery = true;
        showScreen('screen-login');
        switchAuthMode('update-password');
        showAuthBanner('Password recovery link verified! Enter your new password below.', 'success');
        return;
      }
      if (event === 'SIGNED_OUT' || !session) {
        handleSignedOutCleanup();
        return;
      }
      if (session) {
        state.user = AuthService.extractUserFromSession(session);
        cacheUserSession(state.user);
        if (!IS_EVENT_RESET && (state.isPasswordRecovery || state.authMode === 'update-password')) {
          showScreen('screen-login');
          return;
        }
        const loginScreen = document.getElementById('screen-login');
        if (!document.querySelector('.screen.active') || (loginScreen && loginScreen.classList.contains('active'))) {
          afterLogin();
        }
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
    initCrossTabSignOutListener();

    const prefixes = AttendX.State.yearPrefixes;
    ['1', '2', '3', '4'].forEach(y => {
      const el = document.getElementById(`y${y}-prefix`);
      if (el) el.textContent = prefixes[y];
    });

    const todayStr = AttendX.Utils.Sanitizer.getTodayDateInKolkata();
    const dateInput = document.getElementById('ev-date');
    const endDateInput = document.getElementById('ev-end-date');
    if (dateInput) {
      dateInput.value = todayStr;
    }
    if (endDateInput) {
      endDateInput.value = todayStr;
      endDateInput.min = todayStr;
    }

    const { AuthService, Supabase, SecurityConfig } = AttendX.Backend;
    const { showAuthBanner, switchAuthMode } = AttendX.Pages.SignIn;

    // synchronously restore cached user and role so hard refresh never flashes the login screen
    const cachedUser = loadCachedUserSession();
    if (cachedUser && !IS_INITIAL_RECOVERY) {
      AttendX.State.user = cachedUser;
      const role = SecurityConfig.restoreSessionRole(cachedUser.id);
      const nameEl = document.getElementById('user-name');
      if (nameEl) nameEl.textContent = cachedUser.name;
      const roleNameEl = document.getElementById('role-user-name');
      if (roleNameEl) roleNameEl.textContent = cachedUser.name;

      const persistedEv = loadPersistedActiveEvent();
      if (role && persistedEv && persistedEv.id) {
        AttendX.State.currentEvent = persistedEv;
        if (role === 'coordinator') {
          SecurityConfig.markEventCoordinatorVerified(persistedEv.id);
        }
        AttendX.Pages.Attendance.enterAttendance();
        AttendX.Backend.AttendanceService.fetchByEvent(persistedEv.id).then(({ data }) => {
          if (Array.isArray(data)) {
            AttendX.State.attendance = data;
            AttendX.Pages.Attendance.updateAttendanceUI();
          }
        });
      } else if (role === 'coordinator') {
        showScreen('screen-menu');
      } else if (role === 'student') {
        showScreen('screen-student-events');
      } else {
        showScreen('screen-role');
      }
    } else {
      showScreen('screen-login');
    }

    initSupabaseAuthListeners();

    if (IS_EVENT_RESET) {
      const searchParams = new URLSearchParams(INITIAL_URL_SEARCH);
      const resetEventId = searchParams.get('event_id');
      const resetToken = searchParams.get('reset_token');
      if (resetEventId && resetToken) {
        setTimeout(() => {
          AttendX.Pages.Events.openResetEventPasswordModal(resetEventId, resetToken);
        }, 120);
      }
    }

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
      !IS_EVENT_RESET &&
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
    confirmLogout,
    handleSignedOutCleanup,
    persistActiveEventSession,
    clearPersistedActiveEvent
  };
})(window);
