// Audit Logging Utilities

const LOG_TYPES = {
  AUTH_LOGIN: 'auth_login',
  AUTH_LOGOUT: 'auth_logout',
  AUTH_FAILED: 'auth_failed_attempt',
  EVENT_CREATED: 'event_created',
  EVENT_JOINED: 'event_joined',
  EVENT_DELETED: 'event_deleted',
  ENTRY_ADDED: 'entry_added',
  ENTRY_DELETED: 'entry_deleted',
  ENTRY_UPDATED: 'entry_updated',
  CSV_UPLOADED: 'csv_uploaded',
  DATA_EXPORTED: 'data_exported',
  PASSWORD_VERIFIED: 'password_verified',
  PASSWORD_FAILED: 'password_failed_verification'
};

class AuditLogger {
  constructor(supabaseClient) {
    this.supabaseClient = supabaseClient;
    this.isEnabled = true;
    this.pendingLogs = [];
  }

  async log(logType, details = {}) {
    if (!this.isEnabled || !this.supabaseClient) return;

    const logEntry = {
      log_type: logType,
      user_email: this.getCurrentUserEmail(),
      details: details,
      timestamp: new Date().toISOString(),
      user_agent: navigator.userAgent,
      url: window.location.href
    };

    // Add to pending logs for offline support
    this.pendingLogs.push(logEntry);

    // Try to send immediately
    try {
      const { error } = await this.supabaseClient
        .from('audit_logs')
        .insert([logEntry]);

      if (!error) {
        this.pendingLogs.shift();
      }
    } catch (error) {
      console.error('Failed to log audit event:', error);
      // Keep in pending logs for retry
    }
  }

  async syncPendingLogs() {
    if (!this.supabaseClient || this.pendingLogs.length === 0) return;

    try {
      const { error } = await this.supabaseClient
        .from('audit_logs')
        .insert(this.pendingLogs);

      if (!error) {
        this.pendingLogs = [];
      }
    } catch (error) {
      console.error('Failed to sync audit logs:', error);
    }
  }

  getCurrentUserEmail() {
    // This will be set by app.js after authentication
    return window.__appState?.user?.email || 'unknown';
  }

  disable() {
    this.isEnabled = false;
  }

  enable() {
    this.isEnabled = true;
  }

  // Convenience methods
  async logLogin(email) {
    await this.log(LOG_TYPES.AUTH_LOGIN, { email });
  }

  async logLogout() {
    await this.log(LOG_TYPES.AUTH_LOGOUT, {});
  }

  async logLoginFailure(email, reason) {
    await this.log(LOG_TYPES.AUTH_FAILED, { email, reason });
  }

  async logEventCreated(eventId, eventName) {
    await this.log(LOG_TYPES.EVENT_CREATED, { eventId, eventName });
  }

  async logEventJoined(eventId, eventName) {
    await this.log(LOG_TYPES.EVENT_JOINED, { eventId, eventName });
  }

  async logEventDeleted(eventId, eventName) {
    await this.log(LOG_TYPES.EVENT_DELETED, { eventId, eventName });
  }

  async logEntryAdded(eventId, rollNumber) {
    await this.log(LOG_TYPES.ENTRY_ADDED, { eventId, rollNumber });
  }

  async logEntryDeleted(eventId, rollNumber) {
    await this.log(LOG_TYPES.ENTRY_DELETED, { eventId, rollNumber });
  }

  async logEntryUpdated(eventId, rollNumber, oldStatus, newStatus) {
    await this.log(LOG_TYPES.ENTRY_UPDATED, {
      eventId,
      rollNumber,
      oldStatus,
      newStatus
    });
  }

  async logCSVUploaded(eventId, recordCount) {
    await this.log(LOG_TYPES.CSV_UPLOADED, { eventId, recordCount });
  }

  async logDataExported(eventId, format, recordCount) {
    await this.log(LOG_TYPES.DATA_EXPORTED, { eventId, format, recordCount });
  }

  async logPasswordVerified(eventId) {
    await this.log(LOG_TYPES.PASSWORD_VERIFIED, { eventId });
  }

  async logPasswordFailedVerification(eventId, reason) {
    await this.log(LOG_TYPES.PASSWORD_FAILED, { eventId, reason });
  }
}

// Export for use
let auditLogger = null;

function initializeAuditLogger(supabaseClient) {
  auditLogger = new AuditLogger(supabaseClient);
  return auditLogger;
}

function getAuditLogger() {
  return auditLogger;
}
