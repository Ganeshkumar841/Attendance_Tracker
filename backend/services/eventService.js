/**
 * Backend Service — Event Management Service
 * Handles event creation, secure fetching of recent events (excluding passwords),
 * public read-only event lookup for students (excluding password hashes),
 * coordinator event password verification, and complete event deletion.
 */
(function (global) {
  const AttendX = (global.AttendX = global.AttendX || {});
  AttendX.Backend = AttendX.Backend || {};

  const PUBLIC_EVENT_COLUMNS = 'id, name, date, time, venue, organization, created_by, created_at';

  function generateEventId() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'EV';
    if (global.crypto && global.crypto.getRandomValues) {
      const arr = new Uint8Array(4);
      global.crypto.getRandomValues(arr);
      for (let i = 0; i < 4; i++) {
        code += chars[arr[i] % chars.length];
      }
      return code;
    }
    return 'EV' + Math.random().toString(36).substring(2, 6).toUpperCase();
  }

  /**
   * Validate an Event ID string format to prevent malformed queries or injection payloads.
   */
  function sanitizeEventId(rawId) {
    const clean = String(rawId || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    if (clean.length < 3 || clean.length > 20) return '';
    return clean;
  }

  /**
   * Fetch recent events WITHOUT selecting the password column into public list memory.
   */
  async function fetchRecentEvents(limit = 5) {
    const client = AttendX.Backend.Supabase.getClient();
    if (!client) return { data: [], error: new Error('Supabase not configured') };

    const safeLimit = Math.min(Math.max(1, Number(limit) || 5), 25);
    const { data, error } = await client
      .from('events')
      .select(PUBLIC_EVENT_COLUMNS)
      .order('created_at', { ascending: false })
      .limit(safeLimit);

    return { data: data || [], error };
  }

  /**
   * Fetch public event metadata by ID for Student read-only attendance viewing.
   * Strictly omits the `password` column so password hashes are never exposed to student sessions.
   */
  async function getPublicEventById(eventId) {
    const client = AttendX.Backend.Supabase.getClient();
    if (!client) return { event: null, error: 'Database client not configured.' };

    const cleanId = sanitizeEventId(eventId);
    if (!cleanId) {
      return { event: null, error: 'Please enter a valid Event ID (e.g. EV2405).' };
    }

    const { MAX_STUDENT_LOOKUP_ATTEMPTS, STUDENT_LOOKUP_WINDOW_MS } = AttendX.Backend.SecurityConfig;
    const rateKey = 'student_ev_lookup';
    const limitStatus = AttendX.Backend.RateLimiter.checkLimit(
      rateKey,
      MAX_STUDENT_LOOKUP_ATTEMPTS,
      STUDENT_LOOKUP_WINDOW_MS
    );

    if (!limitStatus.allowed) {
      const mins = Math.ceil(limitStatus.retryAfterSec / 60);
      return {
        event: null,
        error: `Too many lookup requests. Please wait ${mins} minute(s) before trying again.`
      };
    }

    const { data: ev, error } = await client
      .from('events')
      .select(PUBLIC_EVENT_COLUMNS)
      .eq('id', cleanId)
      .single();

    if (error || !ev) {
      AttendX.Backend.RateLimiter.recordFailure(rateKey, STUDENT_LOOKUP_WINDOW_MS);
      return { event: null, error: 'Event not found. Please check the Event ID.' };
    }

    AttendX.Backend.AuditService.logAction('STUDENT_EVENT_VIEWED', { eventId: ev.id });
    return { event: ev, error: null };
  }

  /**
   * Create a new event in Supabase (Coordinator / Staff only).
   * Stores the hashed password while keeping the plain password only in the creator's
   * immediate session summary so they can share it with co-coordinators.
   */
  async function createEvent({ name, date, time, venue, organization, password, createdBy }) {
    const { SecurityConfig, AuditService } = AttendX.Backend;
    if (!SecurityConfig.isCoordinator()) {
      AuditService.logAction('UNAUTHORIZED_EVENT_CREATE_BLOCKED', { role: SecurityConfig.getSessionRole() });
      return { data: null, error: new Error('Access denied: Only coordinators or staff can create events.') };
    }

    const client = AttendX.Backend.Supabase.getClient();
    if (!client) return { data: null, error: new Error('Supabase not configured') };

    const hashedPassword = await SecurityConfig.hashSecret(password);
    const newEventPayload = {
      id: generateEventId(),
      name: String(name).trim().slice(0, 120),
      date,
      time: time || null,
      venue: venue ? String(venue).trim().slice(0, 120) : null,
      organization: organization ? String(organization).trim().slice(0, 120) : null,
      password: hashedPassword,
      created_by: createdBy ? String(createdBy).trim().slice(0, 80) : null
    };

    const { data, error } = await client
      .from('events')
      .insert([newEventPayload])
      .select()
      .single();

    if (!error && data) {
      SecurityConfig.markEventCoordinatorVerified(data.id);
      AuditService.logAction('EVENT_CREATED', { eventId: data.id, name: data.name });
    }

    return { data, error };
  }

  /**
   * Fetch a single event by ID and verify the provided password (Coordinator / Staff only).
   */
  async function verifyAndGetEvent(eventId, candidatePassword) {
    const { SecurityConfig, RateLimiter, AuditService } = AttendX.Backend;
    if (!SecurityConfig.isCoordinator()) {
      AuditService.logAction('UNAUTHORIZED_COORDINATOR_JOIN_BLOCKED', { eventId });
      return { event: null, error: 'Access denied: Please switch to Coordinator / Staff login to join as coordinator.' };
    }

    const client = AttendX.Backend.Supabase.getClient();
    if (!client) return { event: null, error: 'Database client not configured.' };

    const cleanId = sanitizeEventId(eventId);
    if (!cleanId) return { event: null, error: 'Enter a valid Event ID.' };

    const rateKey = 'join_ev_' + cleanId;
    const { MAX_EVENT_PWD_ATTEMPTS, EVENT_PWD_LOCKOUT_MS } = SecurityConfig;
    const limitStatus = RateLimiter.checkLimit(rateKey, MAX_EVENT_PWD_ATTEMPTS, EVENT_PWD_LOCKOUT_MS);

    if (!limitStatus.allowed) {
      const mins = Math.ceil(limitStatus.retryAfterSec / 60);
      return {
        event: null,
        error: `Too many password attempts for ${cleanId}. Try again in ${mins} min(s).`
      };
    }

    const { data: ev, error } = await client
      .from('events')
      .select('*')
      .eq('id', cleanId)
      .single();

    if (error || !ev) {
      return { event: null, error: 'Event not found. Check the Event ID.' };
    }

    const isValid = await SecurityConfig.verifySecret(candidatePassword, ev.password);
    if (!isValid) {
      RateLimiter.recordFailure(rateKey, EVENT_PWD_LOCKOUT_MS);
      return { event: null, error: 'Incorrect event password.' };
    }

    RateLimiter.resetLimit(rateKey);
    SecurityConfig.markEventCoordinatorVerified(ev.id);
    AuditService.logAction('EVENT_JOINED', { eventId: ev.id });
    return { event: ev, error: null };
  }

  /**
   * Verify password against the currently active event (for edit/delete authorization — Coordinator / Staff only).
   */
  async function verifyActiveEventPassword(currentEvent, candidatePassword) {
    const { SecurityConfig, RateLimiter, AuditService } = AttendX.Backend;
    if (!SecurityConfig.isCoordinator()) {
      AuditService.logAction('UNAUTHORIZED_PASSWORD_VERIFY_BLOCKED', { eventId: currentEvent?.id });
      return { valid: false, error: 'Access denied: Student accounts are read-only.' };
    }

    if (!currentEvent || !currentEvent.id || !currentEvent.password) {
      return { valid: false, error: 'No coordinator-verified active event selected.' };
    }

    const rateKey = 'auth_ev_' + currentEvent.id;
    const { MAX_EVENT_PWD_ATTEMPTS, EVENT_PWD_LOCKOUT_MS } = SecurityConfig;
    const limitStatus = RateLimiter.checkLimit(rateKey, MAX_EVENT_PWD_ATTEMPTS, EVENT_PWD_LOCKOUT_MS);

    if (!limitStatus.allowed) {
      const mins = Math.ceil(limitStatus.retryAfterSec / 60);
      return {
        valid: false,
        error: `Too many failed attempts. Locked for ${mins} min(s).`
      };
    }

    const isValid = await SecurityConfig.verifySecret(candidatePassword, currentEvent.password);
    if (!isValid) {
      RateLimiter.recordFailure(rateKey, EVENT_PWD_LOCKOUT_MS);
      return { valid: false, error: 'Incorrect password' };
    }

    RateLimiter.resetLimit(rateKey);
    SecurityConfig.markEventCoordinatorVerified(currentEvent.id);
    return { valid: true, error: null };
  }

  /**
   * Permanently delete an event and all of its attendance records (Coordinator / Staff only).
   */
  async function deleteEventAndRecords(eventId) {
    const { SecurityConfig, AuditService } = AttendX.Backend;
    if (!SecurityConfig.isCoordinator() || !SecurityConfig.isEventCoordinatorVerified(eventId)) {
      AuditService.logAction('UNAUTHORIZED_EVENT_DELETE_BLOCKED', { eventId });
      return { error: new Error('Access denied: Unauthorized event deletion attempt.') };
    }

    const client = AttendX.Backend.Supabase.getClient();
    if (!client) return { error: new Error('Supabase not configured') };

    const { error: attErr } = await client
      .from('attendance')
      .delete()
      .eq('event_id', eventId);

    if (attErr) {
      return { error: attErr, stage: 'attendance' };
    }

    const { error: evErr } = await client
      .from('events')
      .delete()
      .eq('id', eventId);

    if (evErr) {
      return { error: evErr, stage: 'events' };
    }

    AuditService.logAction('EVENT_DELETED', { eventId });
    return { error: null };
  }

  AttendX.Backend.EventService = {
    generateEventId,
    sanitizeEventId,
    fetchRecentEvents,
    getPublicEventById,
    createEvent,
    verifyAndGetEvent,
    verifyActiveEventPassword,
    deleteEventAndRecords
  };
})(window);
