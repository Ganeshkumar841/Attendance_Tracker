/**
 * Backend Middleware — Client-Side Brute-Force Rate Limiter
 * Protects authentication and event password verification flows from rapid brute-force attempts.
 */
(function (global) {
  const AttendX = (global.AttendX = global.AttendX || {});
  AttendX.Backend = AttendX.Backend || {};

  const STORAGE_KEY = 'attendx_rate_limits_v1';

  function loadBuckets() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (_e) {
      return {};
    }
  }

  function saveBuckets(buckets) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(buckets));
    } catch (_e) {}
  }

  /**
   * Check whether a given action key (e.g. 'auth_login', 'event_pwd_EV1234') is currently locked out.
   */
  function checkLimit(key, maxAttempts, windowMs) {
    const now = Date.now();
    const buckets = loadBuckets();
    const record = buckets[key];

    if (!record) {
      return { allowed: true, remaining: maxAttempts, retryAfterSec: 0 };
    }

    // Filter out expired timestamps outside the window
    const validTimestamps = (record.attempts || []).filter(ts => now - ts < windowMs);
    buckets[key] = { attempts: validTimestamps };
    saveBuckets(buckets);

    if (validTimestamps.length >= maxAttempts) {
      const oldest = validTimestamps[0];
      const retryAfterSec = Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000));
      return { allowed: false, remaining: 0, retryAfterSec };
    }

    return {
      allowed: true,
      remaining: maxAttempts - validTimestamps.length,
      retryAfterSec: 0
    };
  }

  /**
   * Record a failed attempt for a specific key.
   */
  function recordFailure(key, windowMs) {
    const now = Date.now();
    const buckets = loadBuckets();
    const record = buckets[key] || { attempts: [] };
    const validTimestamps = (record.attempts || []).filter(ts => now - ts < windowMs);
    validTimestamps.push(now);
    buckets[key] = { attempts: validTimestamps };
    saveBuckets(buckets);
  }

  /**
   * Clear attempts after a successful verification.
   */
  function resetLimit(key) {
    const buckets = loadBuckets();
    if (buckets[key]) {
      delete buckets[key];
      saveBuckets(buckets);
    }
  }

  AttendX.Backend.RateLimiter = {
    checkLimit,
    recordFailure,
    resetLimit
  };
})(window);
