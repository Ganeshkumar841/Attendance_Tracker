(function (global) {
  const AttendX = (global.AttendX = global.AttendX || {});
  AttendX.Backend = AttendX.Backend || {};

  const STORAGE_KEY = 'attendx_rate_limits_v1';
  let memoryBuckets = {};

  function loadBuckets() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          memoryBuckets = parsed;
          return parsed;
        }
      }
    } catch (_e) {}
    return { ...memoryBuckets };
  }

  function saveBuckets(buckets) {
    memoryBuckets = { ...buckets };
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(buckets));
    } catch (_e) {}
  }

  function checkLimit(key, maxAttempts, windowMs) {
    const now = Date.now();
    const buckets = loadBuckets();
    const record = buckets[key];

    if (!record) {
      return { allowed: true, remaining: maxAttempts, retryAfterSec: 0 };
    }

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

  function recordFailure(key, windowMs) {
    const now = Date.now();
    const buckets = loadBuckets();
    const record = buckets[key] || { attempts: [] };
    const validTimestamps = (record.attempts || []).filter(ts => now - ts < windowMs);
    validTimestamps.push(now);
    buckets[key] = { attempts: validTimestamps };
    saveBuckets(buckets);
  }

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
