/**
 * Backend Service — Event Management Service
 * Handles event creation, secure fetching of recent events (excluding passwords),
 * event password verification, and complete event deletion.
 */
(function (global) {
  const AttendX = (global.AttendX = global.AttendX || {});
  AttendX.Backend = AttendX.Backend || {};

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
   * Fetch recent events WITHOUT selecting the password column into public list memory.
   */
  async function fetchRecentEvents(limit = 5) {
    const client = AttendX.Backend.Supabase.getClient();
    if (!client) return { data: [], error: new Error('Supabase not configured') };

    const { data, error } = await client
      .from('events')
      .select('id, name, date, time, venue, organization, created_by, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    return { data: data || [], error };
  }

  /**
   * Create a new event in Supabase.
   * Stores the hashed password while keeping the plain password only in the creator's
   * immediate session summary so they can share it with co-coordinators.
   */
  async function createEvent({ name, date, time, venue, organization, password, createdBy }) {
    const client = AttendX.Backend.Supabase.getClient();
    if (!client) return { data: null, error: new Error('Supabase not configured') };

    const hashedPassword = await AttendX.Backend.SecurityConfig.hashSecret(password);
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
      AttendX.Backend.AuditService.logAction('EVENT_CREATED', { eventId: data.id, name: data.name });
    }

    return { data, error };
  }

  /**
   * Fetch a single event by ID and verify the provided password (supports both SHA-256 and legacy plain text).
   */
  async function verifyAndGetEvent(eventId, candidatePassword) {
    const client = AttendX.Backend.Supabase.getClient();
    if (!client) return { event: null, error: 'Database client not configured.' };

    const cleanId = String(eventId || '').trim().toUpperCase();
    if (!cleanId) return { event: null, error: 'Enter a valid Event ID.' };

    const rateKey = 'join_ev_' + cleanId;
    const { MAX_EVENT_PWD_ATTEMPTS, EVENT_PWD_LOCKOUT_MS } = AttendX.Backend.SecurityConfig;
    const limitStatus = AttendX.Backend.RateLimiter.checkLimit(rateKey, MAX_EVENT_PWD_ATTEMPTS, EVENT_PWD_LOCKOUT_MS);

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

    const isValid = await AttendX.Backend.SecurityConfig.verifySecret(candidatePassword, ev.password);
    if (!isValid) {
      AttendX.Backend.RateLimiter.recordFailure(rateKey, EVENT_PWD_LOCKOUT_MS);
      return { event: null, error: 'Incorrect event password.' };
    }

    AttendX.Backend.RateLimiter.resetLimit(rateKey);
    AttendX.Backend.AuditService.logAction('EVENT_JOINED', { eventId: ev.id });
    return { event: ev, error: null };
  }

  /**
   * Verify password against the currently active event (for edit/delete authorization).
   */
  async function verifyActiveEventPassword(currentEvent, candidatePassword) {
    if (!currentEvent) return { valid: false, error: 'No active event selected.' };

    const rateKey = 'auth_ev_' + currentEvent.id;
    const { MAX_EVENT_PWD_ATTEMPTS, EVENT_PWD_LOCKOUT_MS } = AttendX.Backend.SecurityConfig;
    const limitStatus = AttendX.Backend.RateLimiter.checkLimit(rateKey, MAX_EVENT_PWD_ATTEMPTS, EVENT_PWD_LOCKOUT_MS);

    if (!limitStatus.allowed) {
      const mins = Math.ceil(limitStatus.retryAfterSec / 60);
      return {
        valid: false,
        error: `Too many failed attempts. Locked for ${mins} min(s).`
      };
    }

    const isValid = await AttendX.Backend.SecurityConfig.verifySecret(candidatePassword, currentEvent.password);
    if (!isValid) {
      AttendX.Backend.RateLimiter.recordFailure(rateKey, EVENT_PWD_LOCKOUT_MS);
      return { valid: false, error: 'Incorrect password' };
    }

    AttendX.Backend.RateLimiter.resetLimit(rateKey);
    return { valid: true, error: null };
  }

  /**
   * Permanently delete an event and all of its attendance records.
   */
  async function deleteEventAndRecords(eventId) {
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

    AttendX.Backend.AuditService.logAction('EVENT_DELETED', { eventId });
    return { error: null };
  }

  AttendX.Backend.EventService = {
    generateEventId,
    fetchRecentEvents,
    createEvent,
    verifyAndGetEvent,
    verifyActiveEventPassword,
    deleteEventAndRecords
  };
})(window);
