/**
 * Backend Configuration — Security Settings & Cryptographic Helpers
 * Defines rate-limit thresholds, session inactivity timeouts, file upload limits,
 * and SHA-256 password hashing/verification utilities.
 */
(function (global) {
  const AttendX = (global.AttendX = global.AttendX || {});
  AttendX.Backend = AttendX.Backend || {};

  const SECURITY_CONFIG = {
    SESSION_TIMEOUT_MS: 30 * 60 * 1000, // 30 minutes of inactivity
    MAX_LOGIN_ATTEMPTS: 5,
    LOGIN_LOCKOUT_MS: 15 * 60 * 1000,   // 15 minutes
    MAX_EVENT_PWD_ATTEMPTS: 5,
    EVENT_PWD_LOCKOUT_MS: 10 * 60 * 1000, // 10 minutes
    MAX_FILE_SIZE_BYTES: 5 * 1024 * 1024, // 5 MB max CSV upload
    MAX_CSV_ROWS: 5000,
    HASH_PREFIX: 'sha256$'
  };

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

  AttendX.Backend.SecurityConfig = {
    ...SECURITY_CONFIG,
    hashSecret,
    verifySecret,
    timingSafeEqual
  };
})(window);
