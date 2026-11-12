(function (global) {
  const AttendX = (global.AttendX = global.AttendX || {});
  AttendX.Backend = AttendX.Backend || {};

  // leave out password column for public/student queries
  const PUBLIC_EVENT_COLUMNS =
    'id, name, date, end_date, is_single_day, time, end_time, venue, organization, created_by, creator_email, is_closed, created_at';
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

  function parseKolkataTimestampMs(dateStr, time24Str) {
    if (!dateStr || !time24Str) return NaN;
    const cleanDate = String(dateStr).trim();
    const cleanTime = String(time24Str).trim().slice(0, 5);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanDate) || !/^\d{2}:\d{2}$/.test(cleanTime)) {
      return NaN;
    }
    return new Date(`${cleanDate}T${cleanTime}:00+05:30`).getTime();
  }

  function validateEventSchedule({
    date,
    endDate = null,
    isSingleDay = true,
    startTimeRaw,
    endTimeRaw,
    checkNotPast = false
  }) {
    const { parseTimeString } = AttendX.Utils.Sanitizer;

    const startDate = String(date || '').trim();
    if (!startDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      return { valid: false, error: 'Please select a valid Start Date.' };
    }

    const singleDay = Boolean(isSingleDay);
    const resolvedEndDate = singleDay ? startDate : String(endDate || '').trim();

    if (!resolvedEndDate || !/^\d{4}-\d{2}-\d{2}$/.test(resolvedEndDate)) {
      return { valid: false, error: 'Please select a valid End Date.' };
    }

    if (resolvedEndDate < startDate) {
      return { valid: false, error: 'End date cannot be before start date.' };
    }

    if (!startTimeRaw || !endTimeRaw) {
      return {
        valid: false,
        error: 'Both Start Time and End Time are required.'
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

    if (singleDay || resolvedEndDate === startDate) {
      if (endParsed.totalMinutes <= startParsed.totalMinutes) {
        return {
          valid: false,
          error: singleDay
            ? 'For a single-day event, end time must be after start time.'
            : 'End date and time must be after start date and time.'
        };
      }
    }

    const startTs = parseKolkataTimestampMs(startDate, startParsed.time24);
    const endTs = parseKolkataTimestampMs(resolvedEndDate, endParsed.time24);

    if (isNaN(startTs) || isNaN(endTs) || endTs <= startTs) {
      return {
        valid: false,
        error: 'End date and time must be after start date and time.'
      };
    }

    if (checkNotPast && endTs <= getTrustedNowMs()) {
      return {
        valid: false,
        error: 'Event end date and time cannot be in the past.'
      };
    }

    return {
      valid: true,
      date: startDate,
      endDate: resolvedEndDate,
      isSingleDay: singleDay,
      startTime24: startParsed.time24,
      endTime24: endParsed.time24,
      startTime12: startParsed.time12,
      endTime12: endParsed.time12,
      startTs,
      endTs
    };
  }

  function validateEventTimes(startTimeRaw, endTimeRaw, isSingleDay = true, startDate = '2027-01-01', endDate = null) {
    const resolvedEnd = isSingleDay ? startDate : (endDate || '2027-01-02');
    return validateEventSchedule({
      date: startDate,
      endDate: resolvedEnd,
      isSingleDay,
      startTimeRaw,
      endTimeRaw,
      checkNotPast: false
    });
  }

  function normalizeEventRow(rawEv) {
    if (!rawEv) return null;
    const meta = getEventMeta(rawEv.id);
    const { parseTimeString } = AttendX.Utils.Sanitizer;

    const startRaw = rawEv.time || meta.time || null;
    const endRaw = rawEv.end_time || rawEv.endTime || meta.end_time || meta.endTime || null;
    const startParsed = parseTimeString(startRaw);
    const endParsed = parseTimeString(endRaw);

    const startDate = rawEv.date || meta.date || null;
    const resolvedEndDate = rawEv.end_date || rawEv.endDate || meta.end_date || meta.endDate || startDate;
    const isSingleDay =
      rawEv.is_single_day !== undefined
        ? Boolean(rawEv.is_single_day)
        : rawEv.isSingleDay !== undefined
        ? Boolean(rawEv.isSingleDay)
        : meta.is_single_day !== undefined
        ? Boolean(meta.is_single_day)
        : resolvedEndDate === startDate;

    const creatorEmail =
      rawEv.creator_email ||
      rawEv.creatorEmail ||
      meta.creator_email ||
      (rawEv.created_by && String(rawEv.created_by).includes('@') ? rawEv.created_by : null) ||
      null;

    return {
      ...rawEv,
      date: startDate,
      end_date: isSingleDay ? startDate : resolvedEndDate,
      is_single_day: isSingleDay,
      time: startParsed ? startParsed.time24 : startRaw,
      end_time: endParsed ? endParsed.time24 : endRaw,
      start_time_12h: startParsed ? startParsed.time12 : (startRaw || '-'),
      end_time_12h: endParsed ? endParsed.time12 : (endRaw || '-'),
      creator_email: creatorEmail ? String(creatorEmail).trim().toLowerCase() : null,
      is_closed: Boolean(rawEv.is_closed ?? meta.is_closed ?? false),
      password: meta.password_override || rawEv.password
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

    const effectiveEndDate = normalized.end_date || normalized.date;
    const ts = parseKolkataTimestampMs(effectiveEndDate, endParsed.time24);
    return isNaN(ts) ? null : ts;
  }

  function isEventExpired(event, referenceNowMs) {
    if (!event) return false;
    const normalized = normalizeEventRow(event);
    if (normalized.is_closed) return true;
    if (!normalized.end_time) return true;

    const endTs = computeEventEndTimestamp(normalized);
    if (endTs === null) return true;

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

  async function dispatchTransactionalEmail({ to, subject, html, text }) {
    const errors = [];

    // 1. Try Vercel Serverless Function (/api/send-email) when running over HTTP(S)
    if (typeof global.fetch === 'function' && global.location?.protocol?.startsWith('http')) {
      try {
        const resp = await global.fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to, subject, html, text })
        });
        if (resp.ok) {
          const data = await resp.json().catch(() => ({}));
          if (data && data.sent) {
            return { sent: true, provider: data.provider || 'api-route', error: null };
          }
        } else {
          const errBody = await resp.json().catch(() => ({}));
          errors.push(errBody?.error || `/api/send-email returned HTTP ${resp.status}`);
        }
      } catch (err) {
        errors.push(`API route unreachable: ${err.message || err}`);
      }
    }

    // 2. Try Supabase Edge Function ('send-email') if available on the Supabase client
    const client = AttendX.Backend.Supabase.getClient();
    if (client && client.functions && typeof client.functions.invoke === 'function') {
      try {
        const { data, error } = await client.functions.invoke('send-email', {
          body: { to, subject, html, text }
        });
        if (!error && data?.sent) {
          return { sent: true, provider: 'supabase-edge-function', error: null };
        }
        if (error) {
          errors.push(`Edge function error: ${error.message || error}`);
        }
      } catch (err) {
        errors.push(`Edge function exception: ${err.message || err}`);
      }
    }

    const combinedError =
      errors.length > 0
        ? errors.join(' | ')
        : 'No transactional email provider configured (set RESEND_API_KEY or BREVO_API_KEY in Vercel).';

    return { sent: false, provider: null, error: combinedError };
  }

  async function sendEventCreationConfirmationEmail(eventData, creatorEmail, plainPassword = '') {
    const cleanEmail = String(creatorEmail || '').trim().toLowerCase();
    if (!eventData || !eventData.id || !cleanEmail) {
      return { sent: false, error: 'Missing event data or creator email address.' };
    }

    if (confirmedEmailEventIds.has(eventData.id)) {
      return { sent: false, skippedDuplicate: true, error: null };
    }
    confirmedEmailEventIds.add(eventData.id);

    const { formatTime12h, escapeHtml } = AttendX.Utils.Sanitizer;
    const startTime12 = formatTime12h(eventData.time);
    const endTime12 = formatTime12h(eventData.end_time);
    const endDateStr = eventData.end_date || eventData.date;
    const resolvedPlainPassword = String(plainPassword || eventData.password || '');
    const creationDateStr = eventData.created_at
      ? new Date(eventData.created_at).toLocaleString('en-IN', {
          timeZone: 'Asia/Kolkata',
          dateStyle: 'medium',
          timeStyle: 'short'
        })
      : new Date().toLocaleString('en-IN', {
          timeZone: 'Asia/Kolkata',
          dateStyle: 'medium',
          timeStyle: 'short'
        });

    const subject = `AttendX Event Created: ${eventData.name} (${eventData.id})`;
    const textBody = [
      `Event ID: ${eventData.id}`,
      `Event Name: ${eventData.name}`,
      `Event Password: ${resolvedPlainPassword}`,
      `Start Date: ${eventData.date}`,
      `End Date: ${endDateStr}`,
      `Start Time: ${startTime12}`,
      `End Time: ${endTime12}`,
      `Venue: ${eventData.venue || 'Not specified'}`,
      `Organization: ${eventData.organization || 'Not specified'}`,
      `Created On: ${creationDateStr}`,
      `Creator Email: ${cleanEmail}`
    ].join('\n');

    const htmlBody = `
      <div style="font-family: sans-serif; color: #0f172a; max-width: 520px; margin: 0 auto; padding: 20px; border: 1px solid #cbd5e1; border-radius: 12px;">
        <h2 style="margin-top: 0; color: #2563eb;">AttendX Event Created</h2>
        <table style="width: 100%; border-collapse: collapse; margin: 12px 0 0 0; font-size: 14px;">
          <tr><td style="padding: 6px 0; color: #64748b;">Event ID</td><td style="padding: 6px 0; font-weight: 600; font-family: monospace;">${escapeHtml(eventData.id)}</td></tr>
          <tr><td style="padding: 6px 0; color: #64748b;">Event Name</td><td style="padding: 6px 0; font-weight: 600;">${escapeHtml(eventData.name)}</td></tr>
          <tr><td style="padding: 6px 0; color: #64748b;">Event Password</td><td style="padding: 6px 0; font-weight: 600; font-family: monospace;">${escapeHtml(resolvedPlainPassword)}</td></tr>
          <tr><td style="padding: 6px 0; color: #64748b;">Start Date</td><td style="padding: 6px 0;">${escapeHtml(eventData.date)}</td></tr>
          <tr><td style="padding: 6px 0; color: #64748b;">End Date</td><td style="padding: 6px 0;">${escapeHtml(endDateStr)}</td></tr>
          <tr><td style="padding: 6px 0; color: #64748b;">Start Time</td><td style="padding: 6px 0;">${escapeHtml(startTime12)}</td></tr>
          <tr><td style="padding: 6px 0; color: #64748b;">End Time</td><td style="padding: 6px 0;">${escapeHtml(endTime12)}</td></tr>
          <tr><td style="padding: 6px 0; color: #64748b;">Venue</td><td style="padding: 6px 0;">${escapeHtml(eventData.venue || 'Not specified')}</td></tr>
          <tr><td style="padding: 6px 0; color: #64748b;">Organization</td><td style="padding: 6px 0;">${escapeHtml(eventData.organization || 'Not specified')}</td></tr>
          <tr><td style="padding: 6px 0; color: #64748b;">Created On</td><td style="padding: 6px 0;">${escapeHtml(creationDateStr)}</td></tr>
          <tr><td style="padding: 6px 0; color: #64748b;">Creator Email</td><td style="padding: 6px 0;">${escapeHtml(cleanEmail)}</td></tr>
        </table>
      </div>
    `;

    const dispatchRes = await dispatchTransactionalEmail({
      to: cleanEmail,
      subject,
      html: htmlBody,
      text: textBody
    });

    const emailPayload = {
      type: 'EVENT_CREATION_CONFIRMATION',
      to: cleanEmail,
      subject,
      eventId: eventData.id,
      eventName: eventData.name,
      eventPassword: resolvedPlainPassword,
      eventStartDate: eventData.date,
      eventEndDate: endDateStr,
      isSingleDay: Boolean(eventData.is_single_day),
      eventStartTime: startTime12,
      eventEndTime: endTime12,
      eventCreationDate: creationDateStr,
      creatorEmail: cleanEmail,
      venue: eventData.venue || 'Not specified',
      organization: eventData.organization || 'Not specified',
      delivered: dispatchRes.sent,
      provider: dispatchRes.provider,
      deliveryError: dispatchRes.error,
      sentAt: new Date().toISOString()
    };

    recordSentEmail(emailPayload);

    await AttendX.Backend.AuditService.logAction(
      dispatchRes.sent ? 'EVENT_CONFIRMATION_EMAIL_SENT' : 'EVENT_CONFIRMATION_EMAIL_FAILED',
      {
        eventId: emailPayload.eventId,
        eventName: emailPayload.eventName,
        eventStartDate: emailPayload.eventStartDate,
        eventEndDate: emailPayload.eventEndDate,
        eventStartTime: emailPayload.eventStartTime,
        eventEndTime: emailPayload.eventEndTime,
        creatorEmail: emailPayload.creatorEmail,
        provider: dispatchRes.provider,
        error: dispatchRes.error
      },
      cleanEmail
    );

    return {
      sent: dispatchRes.sent,
      provider: dispatchRes.provider,
      error: dispatchRes.error,
      emailPayload
    };
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
    endDate = null,
    isSingleDay = true,
    time,
    endTime,
    venue,
    organization,
    password,
    createdBy,
    creatorEmail,
    allowPastForTesting = false
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

    const scheduleCheck = validateEventSchedule({
      date,
      endDate: isSingleDay ? date : (endDate || date),
      isSingleDay,
      startTimeRaw: time,
      endTimeRaw: endTime,
      checkNotPast: !allowPastForTesting
    });

    if (!scheduleCheck.valid) {
      return { data: null, error: new Error(scheduleCheck.error) };
    }

    const client = AttendX.Backend.Supabase.getClient();
    if (!client) return { data: null, error: new Error('Supabase not configured') };

    inFlightCreateEvent = true;
    try {
      const plainPassword = String(password || '');
      const resolvedEmail = String(creatorEmail || AttendX.State?.user?.email || '').trim().toLowerCase() || null;
      const eventId = generateEventId();

      const fullPayload = {
        id: eventId,
        name: String(name).trim().slice(0, 120),
        date: scheduleCheck.date,
        end_date: scheduleCheck.endDate,
        is_single_day: scheduleCheck.isSingleDay,
        time: scheduleCheck.startTime24,
        end_time: scheduleCheck.endTime24,
        venue: venue ? String(venue).trim().slice(0, 120) : null,
        organization: organization ? String(organization).trim().slice(0, 120) : null,
        password: plainPassword,
        created_by: createdBy ? String(createdBy).trim().slice(0, 80) : null,
        creator_email: resolvedEmail,
        is_closed: false
      };

      saveEventMeta(eventId, {
        date: scheduleCheck.date,
        end_date: scheduleCheck.endDate,
        is_single_day: scheduleCheck.isSingleDay,
        time: scheduleCheck.startTime24,
        end_time: scheduleCheck.endTime24,
        creator_email: resolvedEmail,
        password_override: plainPassword,
        is_closed: false
      });

      let { data, error } = await client
        .from('events')
        .insert([fullPayload])
        .select()
        .single();

      if (error && (error.code === 'PGRST204' || error.code === '42703' || /column/i.test(error.message || ''))) {
        const legacyPayload = {
          id: eventId,
          name: fullPayload.name,
          date: fullPayload.date,
          time: fullPayload.time,
          end_time: fullPayload.end_time,
          venue: fullPayload.venue,
          organization: fullPayload.organization,
          password: fullPayload.password,
          created_by: resolvedEmail || fullPayload.created_by,
          creator_email: resolvedEmail
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
          end_date: scheduleCheck.endDate,
          is_single_day: scheduleCheck.isSingleDay,
          end_time: scheduleCheck.endTime24,
          creator_email: resolvedEmail,
          password: plainPassword
        });
        SecurityConfig.markEventCoordinatorVerified(normalized.id);
        AuditService.logAction('EVENT_CREATED', {
          eventId: normalized.id,
          name: normalized.name,
          date: normalized.date,
          endDate: normalized.end_date,
          isSingleDay: normalized.is_single_day,
          startTime: normalized.start_time_12h,
          endTime: normalized.end_time_12h
        });
        let emailResult = null;
        if (resolvedEmail) {
          emailResult = await sendEventCreationConfirmationEmail(normalized, resolvedEmail, plainPassword);
        }
        return { data: normalized, emailResult, error: null };
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

  async function requestEventPasswordReset(eventId, candidateCreatorEmail) {
    const { SecurityConfig, RateLimiter, AuditService } = AttendX.Backend;
    const { escapeHtml } = AttendX.Utils.Sanitizer;

    const cleanId = sanitizeEventId(eventId);
    const cleanCandidateEmail = String(candidateCreatorEmail || '').trim().toLowerCase();

    if (!cleanId) {
      return { success: false, error: 'Please enter a valid Event ID.' };
    }

    if (!cleanCandidateEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanCandidateEmail)) {
      return { success: false, error: 'Please enter a valid creator email address.' };
    }

    const rateKey = 'ev_pwd_reset_' + cleanId;
    const { MAX_EVENT_RESET_REQUESTS, EVENT_RESET_WINDOW_MS } = SecurityConfig;
    const limitStatus = RateLimiter.checkLimit(rateKey, MAX_EVENT_RESET_REQUESTS, EVENT_RESET_WINDOW_MS);

    if (!limitStatus.allowed) {
      const mins = Math.ceil(limitStatus.retryAfterSec / 60);
      return {
        success: false,
        error: `Too many requests for this event. Please wait ${mins} minute(s) before trying again.`
      };
    }

    RateLimiter.recordFailure(rateKey, EVENT_RESET_WINDOW_MS);

    const genericSuccessMsg = 'If the details match, the password has been emailed.';

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
        return { success: true, emailSent: true, message: genericSuccessMsg };
      }

      const normalized = normalizeEventRow(ev);
      const creatorEmail = String(normalized.creator_email || '').trim().toLowerCase();

      if (!creatorEmail || creatorEmail !== cleanCandidateEmail) {
        return { success: true, emailSent: true, message: genericSuccessMsg };
      }

      const storedPassword = String(normalized.password || '');
      const subject = `AttendX Event Password: ${normalized.name} (${cleanId})`;
      const textBody = [
        `Event ID: ${cleanId}`,
        `Event Name: ${normalized.name}`,
        `Event Password: ${storedPassword}`,
        ``,
        `To change the password, go to the Export section and use the Change Password option.`
      ].join('\n');

      const htmlBody = `
        <div style="font-family: sans-serif; color: #0f172a; max-width: 520px; margin: 0 auto; padding: 20px; border: 1px solid #cbd5e1; border-radius: 12px;">
          <h2 style="margin-top: 0; color: #2563eb;">AttendX Event Password</h2>
          <table style="width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 14px;">
            <tr><td style="padding: 6px 0; color: #64748b;">Event ID</td><td style="padding: 6px 0; font-weight: 600; font-family: monospace;">${escapeHtml(cleanId)}</td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">Event Name</td><td style="padding: 6px 0; font-weight: 600;">${escapeHtml(normalized.name)}</td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">Event Password</td><td style="padding: 6px 0; font-weight: 600; font-family: monospace;">${escapeHtml(storedPassword)}</td></tr>
          </table>
          <p style="font-size: 13px; color: #64748b; margin-bottom: 0;">To change the password, go to the Export section and use the Change Password option.</p>
        </div>
      `;

      const dispatchRes = await dispatchTransactionalEmail({
        to: creatorEmail,
        subject,
        html: htmlBody,
        text: textBody
      });

      const emailPayload = {
        type: 'EVENT_PASSWORD_REMINDER',
        to: creatorEmail,
        subject,
        eventId: cleanId,
        eventName: normalized.name,
        eventPassword: storedPassword,
        recipientEmail: creatorEmail,
        delivered: dispatchRes.sent,
        provider: dispatchRes.provider,
        deliveryError: dispatchRes.error,
        sentAt: new Date().toISOString()
      };

      recordSentEmail(emailPayload);

      await AuditService.logAction(
        dispatchRes.sent ? 'EVENT_PASSWORD_EMAIL_SENT' : 'EVENT_PASSWORD_EMAIL_FAILED',
        {
          eventId: cleanId,
          provider: dispatchRes.provider,
          emailError: dispatchRes.error
        },
        creatorEmail
      );

      return {
        success: true,
        emailSent: dispatchRes.sent,
        emailProvider: dispatchRes.provider,
        emailError: dispatchRes.error,
        message: genericSuccessMsg
      };
    } catch (_err) {
      return { success: false, error: 'Unable to process password request right now.' };
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

      saveEventMeta(cleanId, {
        password_override: nextPass
      });

      const { error: updateErr } = await client
        .from('events')
        .update({ password: nextPass })
        .eq('id', cleanId);

      if (updateErr) {
        return { success: false, error: 'Failed to update password in database.' };
      }

      if (AttendX.State?.currentEvent && AttendX.State.currentEvent.id === cleanId) {
        AttendX.State.currentEvent.password = nextPass;
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
    validateEventSchedule,
    validateEventTimes,
    normalizeEventRow,
    computeEventEndTimestamp,
    isEventExpired,
    verifyEventActiveForAttendance,
    dispatchTransactionalEmail,
    sendEventCreationConfirmationEmail,
    getSentEmails,
    fetchRecentEvents,
    getPublicEventById,
    createEvent,
    verifyAndGetEvent,
    verifyActiveEventPassword,
    requestEventPasswordReset,
    changeEventPassword,
    deleteEventAndRecords
  };
})(window);
