/**
 * Backend Service — Audit Logging Service
 * Records security and operational events to Supabase `audit_logs` (gracefully degrades if table is absent).
 */
(function (global) {
  const AttendX = (global.AttendX = global.AttendX || {});
  AttendX.Backend = AttendX.Backend || {};

  async function logAction(logType, details = {}, userEmail = null) {
    try {
      const client = AttendX.Backend.Supabase.getClient();
      if (!client) return;

      const email =
        userEmail ||
        AttendX.State?.user?.email ||
        'anonymous';

      await client.from('audit_logs').insert([
        {
          log_type: String(logType).slice(0, 64),
          user_email: String(email).slice(0, 120),
          details: details || {},
          timestamp: new Date().toISOString(),
          user_agent: navigator.userAgent ? navigator.userAgent.slice(0, 250) : '',
          url: window.location.href ? window.location.href.slice(0, 250) : ''
        }
      ]);
    } catch (_err) {
      // Non-blocking: do not interrupt main user workflow if audit_logs table is not configured
    }
  }

  AttendX.Backend.AuditService = {
    logAction
  };
})(window);
