// Configuration Management

class AppConfig {
  constructor() {
    this.supabaseUrl = this.getEnv('SUPABASE_URL', 'https://dlycduroumqqaiywwxwm.supabase.co');
    this.supabaseAnonKey = this.getEnv('SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRseWNkdXJvdW1xcWFpeXd3eHdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzMDE3MTgsImV4cCI6MjA4Nzg3NzcxOH0.sDjlAAEL6o1lwUHuAs0L4mS7uxU7feIBvYkbIzWNkto');

    // Validate configuration
    this.validate();
  }

  getEnv(key, defaultValue = '') {
    // Check window.__config first (if loaded from HTML)
    if (window.__config && window.__config[key]) {
      return window.__config[key];
    }

    // Check sessionStorage (for testing)
    const stored = sessionStorage.getItem(`config_${key}`);
    if (stored) return stored;

    return defaultValue;
  }

  setEnv(key, value) {
    sessionStorage.setItem(`config_${key}`, value);
    this[key.toLowerCase()] = value;
  }

  validate() {
    if (!this.supabaseUrl || this.supabaseUrl === 'YOUR_SUPABASE_URL') {
      console.warn('⚠️ Supabase URL not configured properly');
    }

    if (!this.supabaseAnonKey || this.supabaseAnonKey === 'YOUR_SUPABASE_ANON_KEY') {
      console.warn('⚠️ Supabase anonymous key not configured properly');
    }
  }

  isConfigured() {
    return this.supabaseUrl !== 'YOUR_SUPABASE_URL' &&
           this.supabaseAnonKey !== 'YOUR_SUPABASE_ANON_KEY';
  }

  // Feature flags
  isFeatureEnabled(feature) {
    return this.getEnv(`FEATURE_${feature.toUpperCase()}`, 'true') === 'true';
  }

  // App settings
  getSessionTimeout() {
    return parseInt(this.getEnv('SESSION_TIMEOUT_MS', '1800000')); // 30 minutes default
  }

  getMaxLoginAttempts() {
    return parseInt(this.getEnv('MAX_LOGIN_ATTEMPTS', '5'));
  }

  getLoginAttemptWindowMs() {
    return parseInt(this.getEnv('LOGIN_ATTEMPT_WINDOW_MS', '900000')); // 15 minutes default
  }

  getMaxFileSize() {
    return parseInt(this.getEnv('MAX_FILE_SIZE_MB', '5'));
  }

  getAttendancePageSize() {
    return parseInt(this.getEnv('ATTENDANCE_PAGE_SIZE', '50'));
  }

  getEnableLiveSync() {
    return this.getEnv('ENABLE_LIVE_SYNC', 'true') === 'true';
  }

  getEnableAuditLogging() {
    return this.getEnv('ENABLE_AUDIT_LOGGING', 'true') === 'true';
  }

  // Debug mode
  isDebugMode() {
    return this.getEnv('DEBUG', 'false') === 'true';
  }

  log(...args) {
    if (this.isDebugMode()) {
      console.log('[AppConfig]', ...args);
    }
  }

  error(...args) {
    console.error('[AppConfig]', ...args);
  }
}

// Create singleton instance
const appConfig = new AppConfig();

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AppConfig, appConfig };
}
