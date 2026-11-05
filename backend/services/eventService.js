(function (global) {
  const AttendX = (global.AttendX = global.AttendX || {});
  AttendX.Backend = AttendX.Backend || {};

  // leave out password and reset token columns for public/student queries
  const PUBLIC_EVENT_COLUMNS =
    'id, name, date, time, end_time, ends_next_day, venue, organization, created_by, creator_email, is_closed, created_at';
  const LEGACY_PUBLIC_EVENT_COLUMNS =
    'id, name, date, time, venue, organization, created_by, created_at';

  const META_STORAGE_KEY = 'attendx_event_meta_v2';
  const SENT_EMAILS_KEY = 'attendx_sent_emails_v1';
  const memoryEventMeta = {};
  const memorySentEmails = [];
  const confirmedEmailEventIds = new Set();

  let inFlightCreateEvent = false;
  let inFlightJoinEvent = false;
  let serverClockOffsetMs = 0;

  function loadEventMetaMap() {
    try {
      const raw = localStorage.getItem(META_STORAGE_KEY) || sessionStorage.getItem(META_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          return { ...memoryEventMeta, ...parsed };
        }
      }
    } catch (_e) {}
    return { ...memoryEventMeta };
  }

  function saveEventMeta(eventId, metaPatch) {
    if (!eventId) return;
    const cleanId = String(eventId).trim().toUpperCase();
    const map = loadEventMetaMap();
    map[cleanId] = { ...(map[cleanId] || {}), ...metaPatch };
    memoryEventMeta[cleanId] = map[cleanId];
    try {
      const serialized = JSON.stringify(map);
      localStorage.setItem(META_STORAGE_KEY, serialized);
      sessionStorage.setItem(META_STORAGE_KEY, serialized);
    } catch (_e) {}
  }

  function getEventMeta(eventId) {
    if (!eventId) return {};
    const cleanId = String(eventId).trim().toUpperCase();
    const map = loadEventMetaMap();
    return map[cleanId] || {};
  }

  function loadSentEmails() {
    try {
      const raw = sessionStorage.getItem(SENT_EMAILS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (_e) {}
    return [...memorySentEmails];
  }

  function recordSentEmail(emailRecord) {
    memorySentEmails.unshift(emailRecord);
    try {
      const list = loadSentEmails();
      list.unshift(emailRecord);
      sessionStorage.setItem(SENT_EMAILS_KEY, JSON.stringify(list.slice(0, 50)));
    } catch (_e) {}
  }

  function getSentEmails() {
    return loadSentEmails();
  }

  function updateServerClockOffset(isoTimestamp) {
    if (!isoTimestamp) return;
    const serverMs = new Date(isoTimestamp).getTime();
    if (!isNaN(serverMs)) {
      const diff = serverMs - Date.now();
      if (Math.abs(diff) < 24 * 60 * 60 * 1000) {
        serverClockOffsetMs = diff;
      }
    }
  }

  function getTrustedNowMs() {
    return Date.now() + serverClockOffsetMs;
  }

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

  function sanitizeEventId(rawId) {
    const clean = String(rawId || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    if (clean.length < 3 || clean.length > 20) return '';
    return clean;
  }

  function validateEventTimes(startTimeRaw, endTimeRaw, crossesMidnight = false) {
    const { parseTimeString } = AttendX.Utils.Sanitizer;
    if (!startTimeRaw || !endTimeRaw) {
      return {
        valid: false,
        error: 'Both Event Start Time and Event End Time are required.'
      };
    }

    const startParsed = parseTimeString(startTimeRaw);
    const endParsed = parseTimeString(endTimeRaw);

    if (!startParsed || !endParsed) {
      return {
        valid: false,
        error: 'Please enter valid Start Time and End Time in 12-hour (AM/PM) format.'
      };
    }

    const overnight = Boolean(crossesMidnight);
    if (!overnight) {
      if (endParsed.totalMinutes <= startParsed.totalMinutes) {
        return {
          valid: false,
          error: 'Event End Time must be later than Event Start Time.'
        };
      }
    } else {
      if (endParsed.totalMinutes >= startParsed.totalMinutes) {
        return {
          valid: false,
          error: 'For overnight sessions crossing midnight, End Time on the next day must be earlier on the clock than Start Time.'
        };
      }
    }

    return {
      valid: true,
      startTime24: startParsed.time24,
      endTime24: endParsed.time24,
      startTime12: startParsed.time12,
      endTime12: endParsed.time12,
      endsNextDay: overnight
    };
  }

  function normalizeEventRow(rawEv) {
    if (!rawEv) return null;
    const meta = getEventMeta(rawEv.id);
    const { parseTimeString } = AttendX.Utils.Sanitizer;

    const startRaw = rawEv.time || meta.time || null;
    const endRaw = rawEv.end_time || rawEv.endTime || meta.end_time || meta.endTime || null;
    const startParsed = parseTimeString(startRaw);
    const endParsed = parseTimeString(endRaw);

    let endsNextDay = Boolean(rawEv.ends_next_day ?? rawEv.endsNextDay ?? meta.ends_next_day ?? false);
    if (!endsNextDay && startParsed && endParsed && endParsed.totalMinutes < startParsed.totalMinutes) {
      endsNextDay = true;
    }

    const creatorEmail =
      rawEv.creator_email ||
      rawEv.creatorEmail ||
      meta.creator_email ||
      (rawEv.created_by && String(rawEv.created_by).includes('@') ? rawEv.created_by : null) ||
      null;

    return {
      ...rawEv,
      time: startParsed ? startParsed.time24 : startRaw,
      end_time: endParsed ? endParsed.time24 : endRaw,
      start_time_12h: startParsed ? startParsed.time12 : (startRaw || '-'),
      end_time_12h: endParsed ? endParsed.time12 : (endRaw || '-'),
      ends_next_day: endsNextDay,
      creator_email: creatorEmail ? String(creatorEmail).trim().toLowerCase() : null,
      is_closed: Boolean(rawEv.is_closed ?? meta.is_closed ?? false),
      password: meta.password_override || rawEv.password,
      reset_token_hash: rawEv.reset_token_hash !== undefined ? rawEv.reset_token_hash : (meta.reset_token_hash ?? null),
      reset_token_expires_at:
        rawEv.reset_token_expires_at !== undefined
          ? rawEv.reset_token_expires_at
          : (meta.reset_token_expires_at ?? null)
    };
  }

  function computeEventEndTimestamp(event) {
    if (!event || !event.date) return null;
    const normalized = normalizeEventRow(event);
    const endStr = normalized.end_time;
    if (!endStr) return null;

    const { parseTimeString } = AttendX.Utils.Sanitizer;
    const endParsed = parseTimeString(endStr);
    if (!endParsed) return null;

    const parts = String(normalized.date).split('-').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return null;

    const endDate = new Date(
      parts[0],
      parts[1] - 1,
      parts[2],
      endParsed.hours24,
      endParsed.minutes,
      0,
      0
    );

    if (isNaN(endDate.getTime())) return null;

    if (normalized.ends_next_day) {
      endDate.setDate(endDate.getDate() + 1);
    }

    return endDate.getTime();
  }

  function isEventExpired(event, referenceNowMs) {
    if (!event) return false;
    const normalized = normalizeEventRow(event);
    if (normalized.is_closed) return true;

    const endTs = computeEventEndTimestamp(normalized);
    if (endTs === null) return false;

    const nowMs = typeof referenceNowMs === 'number' ? referenceNowMs : getTrustedNowMs();
    return nowMs >= endTs;
  }

  async function verifyEventActiveForAttendance(eventId, cachedEvent = null) {
    const targetEvent = cachedEvent || AttendX.State?.currentEvent;
    if (targetEvent && isEventExpired(targetEvent)) {
      return {
        active: false,
        expired: true,
        error: 'This event session has ended. New attendance entries are no longer accepted.'
      };
    }

    const client = AttendX.Backend.Supabase.getClient();
    const cleanId = sanitizeEventId(eventId || targetEvent?.id);
    if (client && cleanId) {
      try {
        const { data: ev } = await client
          .from('events')
          .select('*')
          .eq('id', cleanId)
          .single();
        if (ev) {
          const normalized = normalizeEventRow(ev);
          if (AttendX.State?.currentEvent && AttendX.State.currentEvent.id === cleanId) {
            AttendX.State.currentEvent = { ...AttendX.State.currentEvent, ...normalized };
          }
          if (isEventExpired(normalized)) {
            saveEventMeta(cleanId, { is_closed: true });
            return {
              active: false,
              expired: true,
              error: 'This event session has ended. New attendance entries are no longer accepted.'
            };
          }
        }
      } catch (_e) {}
    }

    return { active: true, expired: false, error: null };
  }

  async function sendEventCreationConfirmationEmail(eventData, creatorEmail) {
    const cleanEmail = String(creatorEmail || '').trim().toLowerCase();
    if (!eventData || !eventData.id || !cleanEmail) return { sent: false };

    // send confirmation email only once per event creation
    if (confirmedEmailEventIds.has(eventData.id)) {
      return { sent: false, skippedDuplicate: true };
    }
    confirmedEmailEventIds.add(eventData.id);

    const { formatTime12h } = AttendX.Utils.Sanitizer;
    const startTime12 = formatTime12h(eventData.time);
    const endTime12 = formatTime12h(eventData.end_time);
    const creationDateStr = eventData.created_at
      ? new Date(eventData.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
      : new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

    const emailPayload = {
      type: 'EVENT_CREATION_CONFIRMATION',
      to: cleanEmail,
      subject: `AttendX Event Created: ${eventData.name} (${eventData.id})`,
      eventId: eventData.id,
      eventName: eventData.name,
      eventStartDate: eventData.date,
      eventStartTime: startTime12,
      eventEndTime: endTime12 + (eventData.ends_next_day ? ' (Next Day)' : ''),
      eventCreationDate: creationDateStr,
      creatorEmail: cleanEmail,
      venue: eventData.venue || 'Not specified',
      organization: eventData.organization || 'Not specified',
      securityNotice:
        'For security reasons, your event password is not included in this email. Use the Forgot Password option on the event login screen if you need to reset it.',
      sentAt: new Date().toISOString()
    };

    recordSentEmail(emailPayload);

    await AttendX.Backend.AuditService.logAction(
      'EVENT_CONFIRMATION_EMAIL_SENT',
      {
        eventId: emailPayload.eventId,
        eventName: emailPayload.eventName,
        eventStartDate: emailPayload.eventStartDate,
        eventStartTime: emailPayload.eventStartTime,
        eventEndTime: emailPayload.eventEndTime,
        eventCreationDate: emailPayload.eventCreationDate,
        creatorEmail: emailPayload.creatorEmail,
        venue: emailPayload.venue,
        organization: emailPayload.organization
      },
      cleanEmail
    );

    return { sent: true, emailPayload };
  }

  async function fetchRecentEvents(limit = 5) {
    const client = AttendX.Backend.Supabase.getClient();
    if (!client) return { data: [], error: new Error('Supabase not configured') };

    const safeLimit = Math.min(Math.max(1, Number(limit) || 5), 25);
    try {
      let { data, error } = await client
        .from('events')
        .select(PUBLIC_EVENT_COLUMNS)
        .order('created_at', { ascending: false })
        .limit(safeLimit);

      if (error) {
        const fallbackRes = await client
          .from('events')
          .select(LEGACY_PUBLIC_EVENT_COLUMNS)
          .order('created_at', { ascending: false })
          .limit(safeLimit);
        data = fallbackRes.data;
        error = fallbackRes.error;
      }

      return {
        data: Array.isArray(data) ? data.map(normalizeEventRow).filter(Boolean) : [],
        error
      };
    } catch (err) {
      return { data: [], error: err };
    }
  }

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

    try {
      let { data: ev, error } = await client
        .from('events')
        .select(PUBLIC_EVENT_COLUMNS)
        .eq('id', cleanId)
        .single();

      if (error) {
        const fallback = await client
          .from('events')
          .select(LEGACY_PUBLIC_EVENT_COLUMNS)
          .eq('id', cleanId)
          .single();
        ev = fallback.data;
        error = fallback.error;
      }

      if (error || !ev) {
        AttendX.Backend.RateLimiter.recordFailure(rateKey, STUDENT_LOOKUP_WINDOW_MS);
        return { event: null, error: 'Event not found. Please check the Event ID.' };
      }

      const normalized = normalizeEventRow(ev);
      AttendX.Backend.AuditService.logAction('STUDENT_EVENT_VIEWED', { eventId: normalized.id });
      return { event: normalized, error: null };
    } catch (_err) {
      return { event: null, error: 'Network error while looking up event. Please check your connection.' };
    }
  }

  async function createEvent({
    name,
    date,
    time,
    endTime,
    endsNextDay = false,
    venue,
    organization,
    password,
    createdBy,
    creatorEmail
  }) {
    if (inFlightCreateEvent) {
      return { data: null, error: new Error('Event creation already in progress.') };
    }

    const { SecurityConfig, AuditService } = AttendX.Backend;
    if (!SecurityConfig.isCoordinator()) {
      AuditService.logAction('UNAUTHORIZED_EVENT_CREATE_BLOCKED', { role: SecurityConfig.getSessionRole() });
      return { data: null, error: new Error('Access denied: Only coordinators or staff can create events.') };
    }

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return { data: null, error: new Error('Network offline. Please check your internet connection.') };
    }

    const timeValidation = validateEventTimes(time, endTime, endsNextDay);
    if (!timeValidation.valid) {
      return { data: null, error: new Error(timeValidation.error) };
    }

    const client = AttendX.Backend.Supabase.getClient();
    if (!client) return { data: null, error: new Error('Supabase not configured') };

    inFlightCreateEvent = true;
    try {
      const hashedPassword = await SecurityConfig.hashSecret(password);
      const resolvedEmail = String(creatorEmail || AttendX.State?.user?.email || '').trim().toLowerCase() || null;
      const eventId = generateEventId();

      const fullPayload = {
        id: eventId,
        name: String(name).trim().slice(0, 120),
        date,
        time: timeValidation.startTime24,
        end_time: timeValidation.endTime24,
        ends_next_day: timeValidation.endsNextDay,
        venue: venue ? String(venue).trim().slice(0, 120) : null,
        organization: organization ? String(organization).trim().slice(0, 120) : null,
        password: hashedPassword,
        created_by: createdBy ? String(createdBy).trim().slice(0, 80) : null,
        creator_email: resolvedEmail,
        is_closed: false
      };

      saveEventMeta(eventId, {
        time: timeValidation.startTime24,
        end_time: timeValidation.endTime24,
        ends_next_day: timeValidation.endsNextDay,
        creator_email: resolvedEmail,
        is_closed: false
      });

      let { data, error } = await client
        .from('events')
        .insert([fullPayload])
        .select()
        .single();

      // fallback if remote database has not migrated new columns yet
      if (error && (error.code === 'PGRST204' || error.code === '42703' || /column/i.test(error.message || ''))) {
        const legacyPayload = {
          id: eventId,
          name: fullPayload.name,
          date: fullPayload.date,
          time: fullPayload.time,
          venue: fullPayload.venue,
          organization: fullPayload.organization,
          password: fullPayload.password,
          created_by: resolvedEmail || fullPayload.created_by
        };
        const retryRes = await client
          .from('events')
          .insert([legacyPayload])
          .select()
          .single();
        data = retryRes.data;
        error = retryRes.error;
      }

      if (!error && data) {
        updateServerClockOffset(data.created_at);
        const normalized = normalizeEventRow({
          ...data,
          end_time: timeValidation.endTime24,
          ends_next_day: timeValidation.endsNextDay,
          creator_email: resolvedEmail
        });
        SecurityConfig.markEventCoordinatorVerified(normalized.id);
        AuditService.logAction('EVENT_CREATED', {
          eventId: normalized.id,
          name: normalized.name,
          startTime: normalized.start_time_12h,
          endTime: normalized.end_time_12h
        });
        if (resolvedEmail) {
          await sendEventCreationConfirmationEmail(normalized, resolvedEmail);
        }
        return { data: normalized, error: null };
      }

      return { data: null, error: error || new Error('Failed to create event') };
    } catch (err) {
      return { data: null, error: err };
    } finally {
      inFlightCreateEvent = false;
    }
  }

  async function verifyAndGetEvent(eventId, candidatePassword) {
    if (inFlightJoinEvent) {
      return { event: null, error: 'Verification already in progress.' };
    }

    const { SecurityConfig, RateLimiter, AuditService } = AttendX.Backend;
    if (!SecurityConfig.isCoordinator()) {
      AuditService.logAction('UNAUTHORIZED_COORDINATOR_JOIN_BLOCKED', { eventId });
      return { event: null, error: 'Access denied: Please switch to Coordinator / Staff login to join as coordinator.' };
    }

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return { event: null, error: 'Network offline. Please check your internet connection.' };
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

    inFlightJoinEvent = true;
    try {
      const { data: ev, error } = await client
        .from('events')
        .select('*')
        .eq('id', cleanId)
        .single();

      if (error || !ev) {
        return { event: null, error: 'Event not found. Check the Event ID.' };
      }

      const normalized = normalizeEventRow(ev);
      const isValid = await SecurityConfig.verifySecret(candidatePassword, normalized.password);
      if (!isValid) {
        RateLimiter.recordFailure(rateKey, EVENT_PWD_LOCKOUT_MS);
        return { event: null, error: 'Incorrect event password.' };
      }

      RateLimiter.resetLimit(rateKey);
      SecurityConfig.markEventCoordinatorVerified(normalized.id);
      AuditService.logAction('EVENT_JOINED', { eventId: normalized.id });
      return { event: normalized, error: null };
    } catch (_err) {
      return { event: null, error: 'Network error while verifying event. Please try again.' };
    } finally {
      inFlightJoinEvent = false;
    }
  }

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

    const normalized = normalizeEventRow(currentEvent);
    const isValid = await SecurityConfig.verifySecret(candidatePassword, normalized.password);
    if (!isValid) {
      RateLimiter.recordFailure(rateKey, EVENT_PWD_LOCKOUT_MS);
      return { valid: false, error: 'Incorrect password' };
    }

    RateLimiter.resetLimit(rateKey);
    SecurityConfig.markEventCoordinatorVerified(normalized.id);
    return { valid: true, error: null };
  }

  async function requestEventPasswordReset(eventId) {
    const { SecurityConfig, RateLimiter, AuditService } = AttendX.Backend;
    if (!SecurityConfig.isCoordinator()) {
      AuditService.logAction('UNAUTHORIZED_EVENT_RESET_REQUEST_BLOCKED', { eventId });
      return {
        success: false,
        error: 'Access denied: Only coordinators can request event password recovery.'
      };
    }

    const cleanId = sanitizeEventId(eventId);
    if (!cleanId) {
      return { success: false, error: 'Please enter a valid Event ID first.' };
    }

    const rateKey = 'ev_pwd_reset_' + cleanId;
    const { MAX_EVENT_RESET_REQUESTS, EVENT_RESET_WINDOW_MS, EVENT_RESET_TOKEN_TTL_MS } = SecurityConfig;
    const limitStatus = RateLimiter.checkLimit(rateKey, MAX_EVENT_RESET_REQUESTS, EVENT_RESET_WINDOW_MS);

    if (!limitStatus.allowed) {
      const mins = Math.ceil(limitStatus.retryAfterSec / 60);
      return {
        success: false,
        error: `Password reset rate limit reached for this event. Please wait ${mins} minute(s) before requesting again.`
      };
    }

    // count every reset request toward rate limit to prevent email spam
    RateLimiter.recordFailure(rateKey, EVENT_RESET_WINDOW_MS);

    const genericSuccessMsg =
      'If this event has a registered creator email, a password reset link has been sent exclusively to the original event creator.';

    const client = AttendX.Backend.Supabase.getClient();
    if (!client) {
      return { success: false, error: 'Database client not configured.' };
    }

    try {
      const { data: ev, error } = await client
        .from('events')
        .select('*')
        .eq('id', cleanId)
        .single();

      if (error || !ev) {
        return { success: true, message: genericSuccessMsg };
      }

      const normalized = normalizeEventRow(ev);
      const creatorEmail = normalized.creator_email;
      if (!creatorEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(creatorEmail)) {
        return { success: true, message: genericSuccessMsg };
      }

      const rawToken = SecurityConfig.generateSecureToken(32);
      const tokenHash = await SecurityConfig.hashSecret(rawToken);
      const expiresAtIso = new Date(getTrustedNowMs() + EVENT_RESET_TOKEN_TTL_MS).toISOString();

      saveEventMeta(cleanId, {
        reset_token_hash: tokenHash,
        reset_token_expires_at: expiresAtIso
      });

      await client
        .from('events')
        .update({
          reset_token_hash: tokenHash,
          reset_token_expires_at: expiresAtIso
        })
        .eq('id', cleanId);

      const baseUrl = window.location.protocol.startsWith('http')
        ? window.location.origin + window.location.pathname
        : 'http://localhost:8000/';
      const resetLink = `${baseUrl}?event_reset=1&event_id=${encodeURIComponent(cleanId)}&reset_token=${encodeURIComponent(rawToken)}`;

      const emailPayload = {
        type: 'EVENT_PASSWORD_RESET',
        to: creatorEmail,
        subject: `AttendX Event Password Reset: ${normalized.name} (${cleanId})`,
        eventId: cleanId,
        eventName: normalized.name,
        recipientEmail: creatorEmail,
        resetLink,
        expiresAt: expiresAtIso,
        sentAt: new Date().toISOString()
      };

      recordSentEmail(emailPayload);

      await AuditService.logAction(
        'EVENT_PASSWORD_RESET_REQUESTED',
        { eventId: cleanId, expiresAt: expiresAtIso },
        AttendX.State?.user?.email || 'coordinator'
      );

      const currentUserEmail = String(AttendX.State?.user?.email || '').trim().toLowerCase();
      const isSignedInAsCreator = Boolean(currentUserEmail && currentUserEmail === creatorEmail);

      return {
        success: true,
        message: genericSuccessMsg,
        isCreatorSession: isSignedInAsCreator,
        creatorResetLink: isSignedInAsCreator ? resetLink : undefined
      };
    } catch (_err) {
      return { success: false, error: 'Unable to process password reset request right now.' };
    }
  }

  async function verifyEventResetToken(eventId, rawToken) {
    const { SecurityConfig } = AttendX.Backend;
    const cleanId = sanitizeEventId(eventId);
    const cleanToken = String(rawToken || '').trim();

    if (!cleanId || !cleanToken) {
      return { valid: false, error: 'Invalid or missing password reset token.' };
    }

    const client = AttendX.Backend.Supabase.getClient();
    if (!client) return { valid: false, error: 'Database client not configured.' };

    try {
      const { data: ev, error } = await client
        .from('events')
        .select('*')
        .eq('id', cleanId)
        .single();

      if (error || !ev) {
        return { valid: false, error: 'Invalid or expired password reset link.' };
      }

      const normalized = normalizeEventRow(ev);
      const storedHash = normalized.reset_token_hash;
      const expiresAt = normalized.reset_token_expires_at;

      if (!storedHash || !expiresAt) {
        return { valid: false, error: 'This password reset link has already been used or invalidated.' };
      }

      const expiresMs = new Date(expiresAt).getTime();
      if (isNaN(expiresMs) || getTrustedNowMs() >= expiresMs) {
        saveEventMeta(cleanId, { reset_token_hash: null, reset_token_expires_at: null });
        await client
          .from('events')
          .update({ reset_token_hash: null, reset_token_expires_at: null })
          .eq('id', cleanId);
        return { valid: false, error: 'This password reset link has expired. Please request a new one.' };
      }

      const candidateHash = await SecurityConfig.hashSecret(cleanToken);
      if (!SecurityConfig.timingSafeEqual(candidateHash, storedHash)) {
        return { valid: false, error: 'Invalid password reset token.' };
      }

      const currentUserEmail = String(AttendX.State?.user?.email || '').trim().toLowerCase();
      if (currentUserEmail && normalized.creator_email && currentUserEmail !== normalized.creator_email) {
        return {
          valid: false,
          error: 'Unauthorized: Only the original event creator account can reset this event password.'
        };
      }

      return { valid: true, event: normalized, error: null };
    } catch (_err) {
      return { valid: false, error: 'Unable to verify reset token right now.' };
    }
  }

  async function resetEventPasswordWithToken(eventId, rawToken, newPassword) {
    const { SecurityConfig, RateLimiter, AuditService } = AttendX.Backend;
    const passStr = String(newPassword || '');
    if (passStr.length < 4) {
      return { success: false, error: 'New event password must be at least 4 characters long.' };
    }

    const verification = await verifyEventResetToken(eventId, rawToken);
    if (!verification.valid || !verification.event) {
      return { success: false, error: verification.error || 'Invalid or expired reset link.' };
    }

    const ev = verification.event;
    const isSameAsOld = await SecurityConfig.verifySecret(passStr, ev.password);
    if (isSameAsOld) {
      return { success: false, error: 'New password must be different from the previous event password.' };
    }

    const newHashedPassword = await SecurityConfig.hashSecret(passStr);
    const client = AttendX.Backend.Supabase.getClient();

    try {
      saveEventMeta(ev.id, {
        password_override: newHashedPassword,
        reset_token_hash: null,
        reset_token_expires_at: null
      });

      const { error: fullErr } = await client
        .from('events')
        .update({
          password: newHashedPassword,
          reset_token_hash: null,
          reset_token_expires_at: null
        })
        .eq('id', ev.id);

      if (fullErr) {
        await client
          .from('events')
          .update({ password: newHashedPassword })
          .eq('id', ev.id);
      }

      RateLimiter.resetLimit('join_ev_' + ev.id);
      RateLimiter.resetLimit('auth_ev_' + ev.id);

      if (AttendX.State?.currentEvent && AttendX.State.currentEvent.id === ev.id) {
        AttendX.State.currentEvent.password = newHashedPassword;
        AttendX.State.currentEvent.reset_token_hash = null;
        AttendX.State.currentEvent.reset_token_expires_at = null;
      }

      await AuditService.logAction('EVENT_PASSWORD_RESET_SUCCESS', { eventId: ev.id });
      return { success: true, error: null };
    } catch (_err) {
      return { success: false, error: 'Unable to update event password right now.' };
    }
  }

  async function changeEventPassword(eventId, currentPassword, newPassword) {
    const { SecurityConfig, RateLimiter, AuditService } = AttendX.Backend;
    const cleanId = sanitizeEventId(eventId || AttendX.State?.currentEvent?.id);

    if (!SecurityConfig.isCoordinator() || !SecurityConfig.isEventCoordinatorVerified(cleanId)) {
      AuditService.logAction('UNAUTHORIZED_EVENT_PWD_CHANGE_BLOCKED', { eventId: cleanId });
      return { success: false, error: 'Access denied: Unauthorized event password change attempt.' };
    }

    if (!currentPassword) {
      return { success: false, error: 'Please enter the current event password.' };
    }

    const nextPass = String(newPassword || '');
    if (nextPass.length < 4) {
      return { success: false, error: 'New event password must be at least 4 characters long.' };
    }

    const client = AttendX.Backend.Supabase.getClient();
    if (!client) return { success: false, error: 'Database client not configured.' };

    try {
      const { data: ev, error } = await client
        .from('events')
        .select('*')
        .eq('id', cleanId)
        .single();

      const targetEvent = normalizeEventRow(ev || AttendX.State?.currentEvent);
      if (error || !targetEvent) {
        return { success: false, error: 'Event not found.' };
      }

      const authCheck = await verifyActiveEventPassword(targetEvent, currentPassword);
      if (!authCheck.valid) {
        return { success: false, error: authCheck.error || 'Current event password is incorrect.' };
      }

      const isSame = await SecurityConfig.verifySecret(nextPass, targetEvent.password);
      if (isSame) {
        return { success: false, error: 'New password must be different from the current password.' };
      }

      const newHashedPassword = await SecurityConfig.hashSecret(nextPass);
      saveEventMeta(cleanId, {
        password_override: newHashedPassword,
        reset_token_hash: null,
        reset_token_expires_at: null
      });

      const { error: updateErr } = await client
        .from('events')
        .update({
          password: newHashedPassword,
          reset_token_hash: null,
          reset_token_expires_at: null
        })
        .eq('id', cleanId);

      if (updateErr) {
        const { error: fallbackErr } = await client
          .from('events')
          .update({ password: newHashedPassword })
          .eq('id', cleanId);
        if (fallbackErr) {
          return { success: false, error: 'Failed to update password in database.' };
        }
      }

      if (AttendX.State?.currentEvent && AttendX.State.currentEvent.id === cleanId) {
        AttendX.State.currentEvent.password = newHashedPassword;
        AttendX.State.currentEvent.reset_token_hash = null;
        AttendX.State.currentEvent.reset_token_expires_at = null;
      }

      RateLimiter.resetLimit('join_ev_' + cleanId);
      RateLimiter.resetLimit('auth_ev_' + cleanId);
      await AuditService.logAction('EVENT_PASSWORD_CHANGED', { eventId: cleanId });

      return { success: true, error: null };
    } catch (_err) {
      return { success: false, error: 'Network error while updating event password.' };
    }
  }

  async function deleteEventAndRecords(eventId) {
    const { SecurityConfig, AuditService } = AttendX.Backend;
    if (!SecurityConfig.isCoordinator() || !SecurityConfig.isEventCoordinatorVerified(eventId)) {
      AuditService.logAction('UNAUTHORIZED_EVENT_DELETE_BLOCKED', { eventId });
      return { error: new Error('Access denied: Unauthorized event deletion attempt.') };
    }

    const client = AttendX.Backend.Supabase.getClient();
    if (!client) return { error: new Error('Supabase not configured') };

    try {
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
    } catch (err) {
      return { error: err, stage: 'network' };
    }
  }

  AttendX.Backend.EventService = {
    generateEventId,
    sanitizeEventId,
    validateEventTimes,
    normalizeEventRow,
    computeEventEndTimestamp,
    isEventExpired,
    verifyEventActiveForAttendance,
    sendEventCreationConfirmationEmail,
    getSentEmails,
    fetchRecentEvents,
    getPublicEventById,
    createEvent,
    verifyAndGetEvent,
    verifyActiveEventPassword,
    requestEventPasswordReset,
    verifyEventResetToken,
    resetEventPasswordWithToken,
    changeEventPassword,
    deleteEventAndRecords
  };
})(window);
