(function (global) {
  const AttendX = (global.AttendX = global.AttendX || {});
  AttendX.Backend = AttendX.Backend || {};

  const SECURITY_CONFIG = {
    SESSION_TIMEOUT_MS: 30 * 60 * 1000,
    MAX_LOGIN_ATTEMPTS: 5,
    LOGIN_LOCKOUT_MS: 15 * 60 * 1000,
    MAX_EVENT_PWD_ATTEMPTS: 5,
    EVENT_PWD_LOCKOUT_MS: 10 * 60 * 1000,
    MAX_EVENT_RESET_REQUESTS: 3,
    EVENT_RESET_WINDOW_MS: 60 * 60 * 1000,
    MAX_STUDENT_LOOKUP_ATTEMPTS: 25,
    STUDENT_LOOKUP_WINDOW_MS: 5 * 60 * 1000,
    MAX_FILE_SIZE_BYTES: 5 * 1024 * 1024,
    MAX_CSV_ROWS: 5000,
    HASH_PREFIX: 'sha256$'
  };

  const ROLE_STORAGE_KEY = 'attendx_active_role_v2';
  const VERIFIED_EVENTS_KEY = 'attendx_verified_events_v2';
  const VALID_ROLES = new Set(['coordinator', 'student']);

  let privateRole = null;
  let privateRoleUserId = null;
  const privateVerifiedEvents = new Set();

  async function hashSecret(plainText) {
    const raw = String(plainText || '');
    if (!raw) return '';
    if (raw.startsWith(SECURITY_CONFIG.HASH_PREFIX)) return raw;

    if (global.crypto && global.crypto.subtle && typeof TextEncoder !== 'undefined') {
      try {
        const msgBuffer = new TextEncoder().encode('attendx_salt_v1:' + raw);
        const hashBuffer = await global.crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return SECURITY_CONFIG.HASH_PREFIX + hashHex;
      } catch (_e) {
        return raw;
      }
    }
    return raw;
  }

  function timingSafeEqual(a, b) {
    const strA = String(a || '');
    const strB = String(b || '');
    if (strA.length !== strB.length) return false;
    let diff = 0;
    for (let i = 0; i < strA.length; i++) {
      diff |= strA.charCodeAt(i) ^ strB.charCodeAt(i);
    }
    return diff === 0;
  }

  // supports both plain-text passwords and legacy sha256 hashed ones
  async function verifySecret(candidatePlain, storedValue) {
    if (!candidatePlain || !storedValue) return false;
    const stored = String(storedValue);
    if (stored.startsWith(SECURITY_CONFIG.HASH_PREFIX)) {
      const hashedCandidate = await hashSecret(candidatePlain);
      return timingSafeEqual(hashedCandidate, stored);
    }
    return timingSafeEqual(String(candidatePlain), stored);
  }

  function saveVerifiedEventsToStorage() {
    try {
      sessionStorage.setItem(VERIFIED_EVENTS_KEY, JSON.stringify(Array.from(privateVerifiedEvents)));
    } catch (_e) {}
  }

  function loadVerifiedEventsFromStorage() {
    try {
      const raw = sessionStorage.getItem(VERIFIED_EVENTS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach(id => {
          if (id) privateVerifiedEvents.add(String(id).trim().toUpperCase());
        });
      }
    } catch (_e) {}
  }

  function setSessionRole(role, userId) {
    const normalized = VALID_ROLES.has(role) ? role : null;
    privateRole = normalized;
    privateRoleUserId = userId || AttendX.State?.user?.id || null;

    if (normalized !== 'coordinator') {
      privateVerifiedEvents.clear();
      try {
        sessionStorage.removeItem(VERIFIED_EVENTS_KEY);
      } catch (_e) {}
      if (AttendX.State) {
        AttendX.State.editAuthorized = false;
        AttendX.State.pendingDeleteId = null;
        AttendX.State.pendingDeleteRoll = null;
        AttendX.State.pendingBulkDelete = false;
      }
    }

    if (AttendX.State) {
      AttendX.State.role = normalized;
    }

    const payload = normalized && privateRoleUserId
      ? JSON.stringify({ role: normalized, uid: String(privateRoleUserId) })
      : null;

    try {
      if (payload) {
        sessionStorage.setItem(ROLE_STORAGE_KEY, payload);
      } else {
        sessionStorage.removeItem(ROLE_STORAGE_KEY);
      }
    } catch (_e) {}

    return normalized;
  }

  function restoreSessionRole(userId) {
    if (privateRole && (!userId || privateRoleUserId === String(userId))) {
      if (AttendX.State) AttendX.State.role = privateRole;
      return privateRole;
    }
    try {
      const raw = sessionStorage.getItem(ROLE_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (
        parsed &&
        VALID_ROLES.has(parsed.role) &&
        (!userId || !parsed.uid || parsed.uid === String(userId))
      ) {
        privateRole = parsed.role;
        privateRoleUserId = String(userId || parsed.uid || '');
        if (privateRole === 'coordinator') {
          loadVerifiedEventsFromStorage();
        }
        if (AttendX.State) AttendX.State.role = privateRole;
        return privateRole;
      }
    } catch (_e) {}
    return null;
  }

  function clearSessionRole() {
    privateRole = null;
    privateRoleUserId = null;
    privateVerifiedEvents.clear();
    if (AttendX.State) {
      AttendX.State.role = null;
      AttendX.State.editAuthorized = false;
      AttendX.State.pendingDeleteId = null;
      AttendX.State.pendingDeleteRoll = null;
      AttendX.State.pendingBulkDelete = false;
    }
    try {
      sessionStorage.removeItem(ROLE_STORAGE_KEY);
      sessionStorage.removeItem(VERIFIED_EVENTS_KEY);
    } catch (_e) {}
  }

  function getSessionRole() {
    return privateRole;
  }

  function isCoordinator() {
    return privateRole === 'coordinator';
  }

  function isStudent() {
    return privateRole === 'student';
  }

  function markEventCoordinatorVerified(eventId) {
    if (privateRole !== 'coordinator' || !eventId) return false;
    privateVerifiedEvents.add(String(eventId).trim().toUpperCase());
    saveVerifiedEventsToStorage();
    return true;
  }

  function isEventCoordinatorVerified(eventId) {
    if (privateRole !== 'coordinator' || !eventId) return false;
    loadVerifiedEventsFromStorage();
    return privateVerifiedEvents.has(String(eventId).trim().toUpperCase());
  }

  AttendX.Backend.SecurityConfig = {
    ...SECURITY_CONFIG,
    hashSecret,
    verifySecret,
    timingSafeEqual,
    setSessionRole,
    restoreSessionRole,
    clearSessionRole,
    getSessionRole,
    isCoordinator,
    isStudent,
    markEventCoordinatorVerified,
    isEventCoordinatorVerified
  };
})(window);
