// Security Utilities - Rate Limiting, Throttling, CSRF, Session Management

class RateLimiter {
  constructor(maxAttempts = 5, windowMs = 15 * 60 * 1000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
    this.attempts = new Map();
  }

  checkLimit(identifier) {
    const now = Date.now();
    const userAttempts = this.attempts.get(identifier) || [];

    // Remove old attempts outside the window
    const recentAttempts = userAttempts.filter(time => now - time < this.windowMs);

    if (recentAttempts.length >= this.maxAttempts) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: Math.ceil((recentAttempts[0] + this.windowMs - now) / 1000)
      };
    }

    recentAttempts.push(now);
    this.attempts.set(identifier, recentAttempts);

    return {
      allowed: true,
      remaining: this.maxAttempts - recentAttempts.length,
      resetTime: 0
    };
  }

  reset(identifier) {
    this.attempts.delete(identifier);
  }
}

// Rate limiters for different operations
const loginLimiter = new RateLimiter(5, 15 * 60 * 1000); // 5 attempts per 15 minutes
const passwordVerifyLimiter = new RateLimiter(3, 10 * 60 * 1000); // 3 attempts per 10 minutes

function getLoginIdentifier() {
  return document.getElementById('login-email')?.value?.toLowerCase() || 'unknown';
}

function throttle(func, delay) {
  let timeout;
  let lastCall = 0;

  return function(...args) {
    const now = Date.now();
    const remaining = delay - (now - lastCall);

    clearTimeout(timeout);

    if (remaining <= 0) {
      lastCall = now;
      func.apply(this, args);
    } else {
      timeout = setTimeout(() => {
        lastCall = Date.now();
        func.apply(this, args);
      }, remaining);
    }
  };
}

function debounce(func, delay) {
  let timeout;

  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}

// Session Management
class SessionManager {
  constructor(timeoutMs = 30 * 60 * 1000) {
    this.timeoutMs = timeoutMs;
    this.timeoutId = null;
    this.sessionExpiredCallback = null;
    this.lastActivityTime = Date.now();

    this.initializeActivityListeners();
  }

  initializeActivityListeners() {
    ['click', 'keydown', 'scroll', 'touchstart', 'mousemove'].forEach(event => {
      document.addEventListener(event, () => this.resetTimeout(), true);
    });
  }

  resetTimeout() {
    this.lastActivityTime = Date.now();

    if (this.timeoutId) clearTimeout(this.timeoutId);

    this.timeoutId = setTimeout(() => {
      this.sessionExpired();
    }, this.timeoutMs);
  }

  sessionExpired() {
    if (this.sessionExpiredCallback) {
      this.sessionExpiredCallback();
    }
  }

  onSessionExpired(callback) {
    this.sessionExpiredCallback = callback;
  }

  destroy() {
    if (this.timeoutId) clearTimeout(this.timeoutId);
  }

  getTimeRemaining() {
    const elapsed = Date.now() - this.lastActivityTime;
    const remaining = Math.max(0, this.timeoutMs - elapsed);
    return Math.ceil(remaining / 1000);
  }
}

// CSRF Token Management
class CSRFManager {
  constructor() {
    this.token = this.generateToken();
  }

  generateToken() {
    return Math.random().toString(36).substring(2, 15) +
           Math.random().toString(36).substring(2, 15);
  }

  getToken() {
    return this.token;
  }

  verifyToken(token) {
    return token === this.token;
  }

  refreshToken() {
    this.token = this.generateToken();
    return this.token;
  }
}

// Retry Logic with Exponential Backoff
async function retryWithBackoff(asyncFunc, maxAttempts = 3, initialDelay = 1000) {
  let lastError;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await asyncFunc();
    } catch (error) {
      lastError = error;

      if (attempt < maxAttempts - 1) {
        const delay = initialDelay * Math.pow(2, attempt) + Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

// Offline Queue for Pending Operations
class SyncQueue {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
    this.onSyncCallback = null;
  }

  add(operation) {
    this.queue.push({
      id: Math.random().toString(36),
      ...operation,
      timestamp: Date.now()
    });
  }

  async process(processFn) {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const operation = this.queue[0];

      try {
        await processFn(operation);
        this.queue.shift();

        if (this.onSyncCallback) {
          this.onSyncCallback(operation);
        }
      } catch (error) {
        console.error('Sync error:', error);
        break;
      }
    }

    this.isProcessing = false;
  }

  onSync(callback) {
    this.onSyncCallback = callback;
  }

  clear() {
    this.queue = [];
  }

  getQueue() {
    return [...this.queue];
  }
}
