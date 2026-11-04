/**
 * Backend Configuration — Security Settings, Role Guard & Cryptographic Helpers
 * Defines rate-limit thresholds, session inactivity timeouts, file upload limits,
 * SHA-256 password hashing/verification utilities, and closure-sealed role authorization
 * to prevent client-side privilege escalation between Student and Coordinator/Staff modes.
 */
(function (global) {
  const AttendX = (global.AttendX = global.AttendX || {});
  AttendX.Backend = AttendX.Backend || {};

  const SECURITY_CONFIG = {
    SESSION_TIMEOUT_MS: 30 * 60 * 1000,    // 30 minutes of inactivity
    MAX_LOGIN_ATTEMPTS: 5,
    LOGIN_LOCKOUT_MS: 15 * 60 * 1000,      // 15 minutes
    MAX_EVENT_PWD_ATTEMPTS: 5,
    EVENT_PWD_LOCKOUT_MS: 10 * 60 * 1000,  // 10 minutes
    MAX_STUDENT_LOOKUP_ATTEMPTS: 25,       // Anti-enumeration limit for student Event ID lookups
    STUDENT_LOOKUP_WINDOW_MS: 5 * 60 * 1000,
    MAX_FILE_SIZE_BYTES: 5 * 1024 * 1024,  // 5 MB max CSV upload
    MAX_CSV_ROWS: 5000,
    HASH_PREFIX: 'sha256$'
  };

  const ROLE_STORAGE_KEY = 'attendx_active_role_v2';
  const VALID_ROLES = new Set(['coordinator', 'student']);

  // Private closure state — immune to direct `window.AttendX.State.role` console tampering
  let privateRole = null;
  let privateRoleUserId = null;
  const privateVerifiedEvents = new Set();

  /**
   * Hash an event password using Web Crypto SHA-256 so plain-text passwords
   * are not stored in new event records.
   */
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

  /**
   * Constant-time string comparison to mitigate timing attacks.
   */
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

  /**
   * Verify a candidate password against a stored password (supports both
   * SHA-256 hashed secrets and legacy plain-text event passwords).
   */
  async function verifySecret(candidatePlain, storedValue) {
    if (!candidatePlain || !storedValue) return false;
    const stored = String(storedValue);
    if (stored.startsWith(SECURITY_CONFIG.HASH_PREFIX)) {
      const hashedCandidate = await hashSecret(candidatePlain);
      return timingSafeEqual(hashedCandidate, stored);
    }
    return timingSafeEqual(String(candidatePlain), stored);
  }

  /**
   * Set the authenticated user's active role ('coordinator' or 'student').
   * Switching to 'student' or clearing role immediately revokes all coordinator event privileges.
   */
  function setSessionRole(role, userId) {
    const normalized = VALID_ROLES.has(role) ? role : null;
    privateRole = normalized;
    privateRoleUserId = userId || AttendX.State?.user?.id || null;

    if (normalized !== 'coordinator') {
      privateVerifiedEvents.clear();
      if (AttendX.State) {
        AttendX.State.editAuthorized = false;
        AttendX.State.pendingDeleteId = null;
        AttendX.State.pendingDeleteRoll = null;
      }
    }

    if (AttendX.State) {
      AttendX.State.role = normalized;
    }

    try {
      if (normalized && privateRoleUserId) {
        sessionStorage.setItem(
          ROLE_STORAGE_KEY,
          JSON.stringify({ role: normalized, uid: String(privateRoleUserId) })
        );
      } else {
        sessionStorage.removeItem(ROLE_STORAGE_KEY);
      }
    } catch (_e) {}

    return normalized;
  }

  /**
   * Restore previously chosen role for the same authenticated user within the active tab session.
   */
  function restoreSessionRole(userId) {
    if (!userId) return null;
    if (privateRole && privateRoleUserId === String(userId)) {
      if (AttendX.State) AttendX.State.role = privateRole;
      return privateRole;
    }
    try {
      const raw = sessionStorage.getItem(ROLE_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && parsed.uid === String(userId) && VALID_ROLES.has(parsed.role)) {
        privateRole = parsed.role;
        privateRoleUserId = String(userId);
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
    }
    try {
      sessionStorage.removeItem(ROLE_STORAGE_KEY);
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

  /**
   * Record that the current coordinator session has legitimately created or verified
   * the password for `eventId`. Ignored if current role is not 'coordinator'.
   */
  function markEventCoordinatorVerified(eventId) {
    if (privateRole !== 'coordinator' || !eventId) return false;
    privateVerifiedEvents.add(String(eventId).trim().toUpperCase());
    return true;
  }

  /**
   * Check whether the current session is both in Coordinator role AND has verified
   * the password (or created) the specified event.
   */
  function isEventCoordinatorVerified(eventId) {
    if (privateRole !== 'coordinator') return false;
    if (!eventId) return false;
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
