(function (global) {
  const AttendX = (global.AttendX = global.AttendX || {});

  const CACHED_USER_KEY = 'attendx_cached_user_v2';
  const ACTIVE_EVENT_KEY = 'attendx_active_event_v2';
  const SIGNOUT_SIGNAL_KEY = 'attendx_signout_signal_v2';

  let signoutChannel = null;
  let isHandlingPopState = false;

  const yearPrefixes = AttendX.Utils.Sanitizer.computeAcademicYears();

  const COORDINATOR_ONLY_SCREENS = new Set([
    'screen-menu',
    'screen-create',
    'screen-event-created',
    'screen-join'
  ]);

  const SCREEN_TO_PATH = {
    'screen-login': '/signin',
    'screen-role': '/menu',
    'screen-menu': '/coordinator',
    'screen-create': '/events/create',
    'screen-event-created': '/events/create',
    'screen-join': '/events/join',
    'screen-student-events': '/student'
  };

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
    pendingBulkDelete: false,
    events: [],
    authMode: 'signin',
    pendingEmail: '',
    otpType: 'signup',
    isPasswordRecovery: false,
    theme: 'light',
    selectedYear: null,
    yearPrefixes
  };

  function isHttpEnvironment() {
    return typeof window !== 'undefined' && /^https?:$/i.test(window.location?.protocol || '');
  }

  function updateBrowserHistory(path, stateObj = {}, replace = false) {
    if (!isHttpEnvironment() || isHandlingPopState || !window.history) return;
    try {
      const cleanPath = path || '/signin';
      if (window.location.pathname === cleanPath && !replace) return;
      if (replace) {
        window.history.replaceState(stateObj, document.title, cleanPath);
      } else {
        window.history.pushState(stateObj, document.title, cleanPath);
      }
    } catch (_e) {}
  }

  function syncRouteForAttendanceTab(tab, subRoute = null) {
    const evId = AttendX.State.currentEvent?.id;
    if (!evId) return;
    let targetPath = `/events/${encodeURIComponent(evId)}/attendance`;
    if (subRoute === 'prereg') {
      targetPath = `/events/${encodeURIComponent(evId)}/prereg`;
    } else if (tab === 'export') {
      targetPath = `/events/${encodeURIComponent(evId)}/export`;
    }
    updateBrowserHistory(targetPath, {
      screenId: 'screen-attendance',
      eventId: evId,
      tab,
      subRoute
    });
  }

  function parseRouteFromPathname(pathname) {
    const clean = String(pathname || '/').replace(/\/+$/, '') || '/';
    if (clean === '/' || clean === '/index.html' || clean === '/signin') {
      return { type: 'screen', screenId: 'screen-login' };
    }
    if (clean === '/menu') {
      return { type: 'screen', screenId: 'screen-role' };
    }
    if (clean === '/coordinator') {
      return { type: 'screen', screenId: 'screen-menu' };
    }
    if (clean === '/events/create') {
      return { type: 'screen', screenId: 'screen-create' };
    }
    if (clean === '/events/join') {
      return { type: 'screen', screenId: 'screen-join' };
    }
    if (clean === '/student') {
      return { type: 'screen', screenId: 'screen-student-events' };
    }

    const evMatch = clean.match(/^\/events\/([A-Za-z0-9_-]+)\/(attendance|prereg|export|list)$/);
    if (evMatch) {
      return {
        type: 'event',
        eventId: evMatch[1].toUpperCase(),
        action: evMatch[2].toLowerCase()
      };
    }

    return null;
  }

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

  function showScreen(id, options = {}) {
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

    if (!options.skipHistory && id !== 'screen-attendance') {
      const mappedPath = SCREEN_TO_PATH[id] || '/signin';
      updateBrowserHistory(mappedPath, { screenId: id }, Boolean(options.replaceHistory));
    }
  }

  async function navigateToParsedRoute(route, options = { skipHistory: false }) {
    const state = AttendX.State;
    const { SecurityConfig, AttendanceService, EventService } = AttendX.Backend;

    if (!state.user) {
      showScreen('screen-login', options);
      return true;
    }

    const activeRole = SecurityConfig.restoreSessionRole(state.user.id);
    if (!activeRole) {
      showScreen('screen-role', options);
      return true;
    }

    if (!route) return false;

    if (route.type === 'screen') {
      if (route.screenId === 'screen-login') {
        showScreen(activeRole === 'student' ? 'screen-student-events' : 'screen-menu', options);
        return true;
      }
      showScreen(route.screenId, options);
      return true;
    }

    if (route.type === 'event' && route.eventId) {
      const targetEvId = route.eventId;

      if (activeRole === 'student') {
        const { event: ev } = await EventService.getPublicEventById(targetEvId);
        if (ev) {
          state.currentEvent = ev;
          const { data: attList } = await AttendanceService.fetchByEvent(ev.id);
          state.attendance = attList || [];
          AttendX.Pages.Attendance.enterAttendance('list', { skipHistory: options.skipHistory });
          return true;
        }
        showScreen('screen-student-events', options);
        return true;
      }

      // Coordinator deep-link protection: require event to be unlocked in session
      if (!SecurityConfig.isEventCoordinatorVerified(targetEvId)) {
        const joinIdInput = document.getElementById('join-id');
        if (joinIdInput) joinIdInput.value = targetEvId;
        showScreen('screen-join', { replaceHistory: true });
        return true;
      }

      const persistedEv = loadPersistedActiveEvent();
      let resolvedEv =
        (state.currentEvent && state.currentEvent.id === targetEvId ? state.currentEvent : null) ||
        (persistedEv && persistedEv.id === targetEvId ? persistedEv : null);

      if (!resolvedEv) {
        const { event: pubEv } = await EventService.getPublicEventById(targetEvId);
        resolvedEv = pubEv;
      }

      if (!resolvedEv) {
        const joinIdInput = document.getElementById('join-id');
        if (joinIdInput) joinIdInput.value = targetEvId;
        showScreen('screen-join', { replaceHistory: true });
        return true;
      }

      state.currentEvent = resolvedEv;
      const { data: attList } = await AttendanceService.fetchByEvent(resolvedEv.id);
      state.attendance = attList || [];

      const tab = route.action === 'export' ? 'export' : route.action === 'list' ? 'list' : 'entry';
      const subRoute = route.action === 'prereg' ? 'prereg' : null;
      AttendX.Pages.Attendance.enterAttendance(tab, {
        skipHistory: options.skipHistory,
        subRoute
      });

      if (subRoute === 'prereg') {
        setTimeout(() => {
          document.getElementById('prereg-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 60);
      }
      return true;
    }

    return false;
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

    const parsedRoute = isHttpEnvironment() ? parseRouteFromPathname(window.location.pathname) : null;
    if (parsedRoute && parsedRoute.screenId !== 'screen-login') {
      const handled = await navigateToParsedRoute(parsedRoute, { skipHistory: false });
      if (handled) return;
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
    state.pendingBulkDelete = false;

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

    if (typeof global.addEventListener === 'function') {
      global.addEventListener('storage', e => {
        if (e.key === SIGNOUT_SIGNAL_KEY && e.newValue) {
          handleSignedOutCleanup();
        }
      });
    }
  }

  function initHistoryRouter() {
    if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return;
    window.addEventListener('popstate', async () => {
      isHandlingPopState = true;
      try {
        const route = parseRouteFromPathname(window.location.pathname);
        if (route) {
          await navigateToParsedRoute(route, { skipHistory: true });
        } else {
          await afterLogin(false);
        }
      } finally {
        isHandlingPopState = false;
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
    const state = AttendX.State;

    client.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (session) {
          state.user = AuthService.extractUserFromSession(session);
          afterLogin(true);
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
      if (event === 'SIGNED_OUT' || !session) {
        handleSignedOutCleanup();
        return;
      }
      if (session) {
        state.user = AuthService.extractUserFromSession(session);
        cacheUserSession(state.user);
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
    initHistoryRouter();

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

    const { SecurityConfig } = AttendX.Backend;

    const cachedUser = loadCachedUserSession();
    if (cachedUser) {
      AttendX.State.user = cachedUser;
      const role = SecurityConfig.restoreSessionRole(cachedUser.id);
      const nameEl = document.getElementById('user-name');
      if (nameEl) nameEl.textContent = cachedUser.name;
      const roleNameEl = document.getElementById('role-user-name');
      if (roleNameEl) roleNameEl.textContent = cachedUser.name;

      const initialRoute = isHttpEnvironment() ? parseRouteFromPathname(window.location.pathname) : null;
      if (initialRoute && initialRoute.screenId !== 'screen-login') {
        await navigateToParsedRoute(initialRoute, { skipHistory: true });
      } else {
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
          showScreen('screen-menu', { replaceHistory: true });
        } else if (role === 'student') {
          showScreen('screen-student-events', { replaceHistory: true });
        } else {
          showScreen('screen-role', { replaceHistory: true });
        }
      }
    } else {
      showScreen('screen-login', { replaceHistory: true });
    }

    initSupabaseAuthListeners();
  }

  document.addEventListener('DOMContentLoaded', bootstrapApp);

  global.showScreen = showScreen;
  global.logout = logout;
  global.confirmLogout = confirmLogout;

  AttendX.App = {
    showScreen,
    syncRouteForAttendanceTab,
    afterLogin,
    logout,
    confirmLogout,
    handleSignedOutCleanup,
    persistActiveEventSession,
    clearPersistedActiveEvent
  };
})(window);
