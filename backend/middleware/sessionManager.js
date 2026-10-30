/**
 * Backend Middleware — Session Inactivity Manager
 * Automatically logs out the coordinator after 30 minutes of inactivity.
 */
(function (global) {
  const AttendX = (global.AttendX = global.AttendX || {});
  AttendX.Backend = AttendX.Backend || {};

  let inactivityTimer = null;
  let onTimeoutCallback = null;
  let isTracking = false;

  const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'touchstart', 'scroll'];

  function resetTimer() {
    if (!isTracking) return;
    clearTimeout(inactivityTimer);
    const timeoutMs =
      AttendX.Backend.SecurityConfig?.SESSION_TIMEOUT_MS || 30 * 60 * 1000;
    inactivityTimer = setTimeout(() => {
      if (typeof onTimeoutCallback === 'function') {
        onTimeoutCallback();
      }
    }, timeoutMs);
  }

  function startSessionMonitor(onTimeout) {
    onTimeoutCallback = onTimeout;
    if (!isTracking) {
      isTracking = true;
      ACTIVITY_EVENTS.forEach(evt => {
        document.addEventListener(evt, resetTimer, { passive: true });
      });
    }
    resetTimer();
  }

  function stopSessionMonitor() {
    isTracking = false;
    clearTimeout(inactivityTimer);
    inactivityTimer = null;
  }

  AttendX.Backend.SessionManager = {
    startSessionMonitor,
    stopSessionMonitor,
    resetTimer
  };
})(window);
