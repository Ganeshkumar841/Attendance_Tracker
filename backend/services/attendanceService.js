(function (global) {
  const AttendX = (global.AttendX = global.AttendX || {});
  AttendX.Backend = AttendX.Backend || {};

  let realtimeChannel = null;
  let activeSubscribedEventId = null;
  let activeCallbacks = null;
  let broadcastChannel = null;

  const CROSS_TAB_STORAGE_KEY = 'attendx_cross_tab_sync_v2';

  function initCrossTabSync() {
    if (typeof global.BroadcastChannel !== 'undefined' && !broadcastChannel) {
      try {
        broadcastChannel = new global.BroadcastChannel('attendx_realtime_sync_v2');
        broadcastChannel.onmessage = evt => {
          handleCrossTabPayload(evt?.data);
        };
      } catch (_e) {}
    }

    global.addEventListener('storage', e => {
      if (e.key === CROSS_TAB_STORAGE_KEY && e.newValue) {
        try {
          handleCrossTabPayload(JSON.parse(e.newValue));
        } catch (_err) {}
      }
    });
  }

  function emitCrossTabEvent(type, eventId, payload) {
    const message = {
      type,
      eventId: String(eventId || '').trim().toUpperCase(),
      payload,
      ts: Date.now()
    };
    try {
      if (broadcastChannel) {
        broadcastChannel.postMessage(message);
      }
    } catch (_e) {}
    try {
      localStorage.setItem(CROSS_TAB_STORAGE_KEY, JSON.stringify(message));
    } catch (_e) {}
  }

  function handleCrossTabPayload(msg) {
    if (!msg || !activeSubscribedEventId || !activeCallbacks) return;
    if (String(msg.eventId || '').toUpperCase() !== activeSubscribedEventId) return;

    if (msg.type === 'INSERT' && msg.payload && typeof activeCallbacks.onInsert === 'function') {
      activeCallbacks.onInsert(msg.payload);
    } else if (msg.type === 'UPDATE' && msg.payload && typeof activeCallbacks.onUpdate === 'function') {
      activeCallbacks.onUpdate(msg.payload);
    } else if (msg.type === 'DELETE' && msg.payload && typeof activeCallbacks.onDelete === 'function') {
      activeCallbacks.onDelete(msg.payload.id, msg.payload.rollNo);
    } else if (msg.type === 'EXPIRED' && typeof activeCallbacks.onExpired === 'function') {
      activeCallbacks.onExpired();
    }
  }

  initCrossTabSync();

  function mapDbToLocal(dbRow) {
    if (!dbRow) return null;
    return {
      id: dbRow.id !== undefined && dbRow.id !== null ? dbRow.id : dbRow.roll_no,
      eventId: dbRow.event_id,
      rollNo: String(dbRow.roll_no || '').toUpperCase(),
      year: Number(dbRow.year) || 1,
      yearLabel: dbRow.year_label || '1st',
      branch: String(dbRow.branch || '').toUpperCase(),
      num: String(dbRow.num || ''),
      status: dbRow.status === 'preregistered' ? 'preregistered' : 'attended',
      timestamp: dbRow.timestamp || new Date().toISOString(),
      recordedBy: dbRow.recorded_by || ''
    };
  }

  function verifyCoordinatorWriteAccess(eventId, actionName) {
    const { SecurityConfig, AuditService } = AttendX.Backend;
    const targetEventId = eventId || AttendX.State?.currentEvent?.id;
    if (!SecurityConfig.isCoordinator() || !SecurityConfig.isEventCoordinatorVerified(targetEventId)) {
      AuditService.logAction('UNAUTHORIZED_ATTENDANCE_MUTATION_BLOCKED', {
        action: actionName,
        eventId: targetEventId,
        role: SecurityConfig.getSessionRole()
      });
      return false;
    }
    return true;
  }

  async function fetchByEvent(eventId) {
    const client = AttendX.Backend.Supabase.getClient();
    if (!client || !eventId) return { data: [], error: new Error('Invalid client or eventId') };

    const cleanEventId = String(eventId).trim().toUpperCase();
    try {
      const { data, error } = await client
        .from('attendance')
        .select('*')
        .eq('event_id', cleanEventId)
        .order('timestamp', { ascending: false });

      return {
        data: Array.isArray(data) ? data.map(mapDbToLocal).filter(Boolean) : [],
        error
      };
    } catch (err) {
      return { data: [], error: err };
    }
  }

  async function markPresentFromPrereg(recordId, eventId, rollNo) {
    if (!verifyCoordinatorWriteAccess(eventId, 'MARK_PRESENT_FROM_PREREG')) {
      return { data: null, error: new Error('Forbidden: Student accounts are read-only.') };
    }

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return { data: null, error: new Error('Network offline. Unable to mark attendance.') };
    }

    const activeCheck = await AttendX.Backend.EventService.verifyEventActiveForAttendance(eventId);
    if (!activeCheck.active) {
      AttendX.Backend.AuditService.logAction('EXPIRED_EVENT_ATTENDANCE_BLOCKED', {
        action: 'MARK_PRESENT_FROM_PREREG',
        eventId,
        rollNo
      });
      return { data: null, error: new Error(activeCheck.error) };
    }

    const client = AttendX.Backend.Supabase.getClient();
    if (!client) return { data: null, error: new Error('Database not configured') };

    try {
      let query = client
        .from('attendance')
        .update({
          status: 'attended',
          timestamp: new Date().toISOString()
        });

      if (recordId !== undefined && recordId !== null && String(recordId) !== String(rollNo)) {
        query = query.eq('id', recordId);
      } else if (eventId && rollNo) {
        query = query.eq('event_id', eventId).eq('roll_no', rollNo);
      }

      const { data, error } = await query.select().single();
      const mapped = data ? mapDbToLocal(data) : null;
      if (!error && mapped) {
        emitCrossTabEvent('UPDATE', eventId, mapped);
      }
      return { data: mapped, error };
    } catch (err) {
      return { data: null, error: err };
    }
  }

  async function insertEntry({ eventId, rollNo, year, yearLabel, branch, num, recordedBy }) {
    if (!verifyCoordinatorWriteAccess(eventId, 'INSERT_ENTRY')) {
      return { data: null, error: new Error('Forbidden: Student accounts are read-only.') };
    }

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return { data: null, error: new Error('Network offline. Unable to mark attendance.') };
    }

    const activeCheck = await AttendX.Backend.EventService.verifyEventActiveForAttendance(eventId);
    if (!activeCheck.active) {
      AttendX.Backend.AuditService.logAction('EXPIRED_EVENT_ATTENDANCE_BLOCKED', {
        action: 'INSERT_ENTRY',
        eventId,
        rollNo
      });
      return { data: null, error: new Error(activeCheck.error) };
    }

    const client = AttendX.Backend.Supabase.getClient();
    if (!client) return { data: null, error: new Error('Database not configured') };

    try {
      const { data, error } = await client
        .from('attendance')
        .insert([
          {
            event_id: eventId,
            roll_no: rollNo,
            year,
            year_label: yearLabel,
            branch,
            num,
            status: 'attended',
            recorded_by: recordedBy || 'Coordinator'
          }
        ])
        .select()
        .single();

      const mapped = data ? mapDbToLocal(data) : null;
      if (!error && mapped) {
        emitCrossTabEvent('INSERT', eventId, mapped);
      }
      return { data: mapped, error };
    } catch (err) {
      return { data: null, error: err };
    }
  }

  async function bulkInsertPrereg(records) {
    const targetEventId = Array.isArray(records) && records[0]?.event_id
      ? records[0].event_id
      : AttendX.State?.currentEvent?.id;

    if (!verifyCoordinatorWriteAccess(targetEventId, 'BULK_INSERT_PREREG')) {
      return { data: [], error: new Error('Forbidden: Student accounts are read-only.') };
    }

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return { data: [], error: new Error('Network offline. Unable to upload pre-registrations.') };
    }

    const activeCheck = await AttendX.Backend.EventService.verifyEventActiveForAttendance(targetEventId);
    if (!activeCheck.active) {
      AttendX.Backend.AuditService.logAction('EXPIRED_EVENT_ATTENDANCE_BLOCKED', {
        action: 'BULK_INSERT_PREREG',
        eventId: targetEventId
      });
      return { data: [], error: new Error(activeCheck.error) };
    }

    const client = AttendX.Backend.Supabase.getClient();
    if (!client) return { data: [], error: new Error('Database not configured') };
    if (!Array.isArray(records) || records.length === 0) {
      return { data: [], error: null };
    }

    try {
      const { data, error } = await client
        .from('attendance')
        .upsert(records, { onConflict: 'event_id,roll_no', ignoreDuplicates: true })
        .select();

      const mappedList = Array.isArray(data) ? data.map(mapDbToLocal).filter(Boolean) : [];
      if (!error && mappedList.length > 0) {
        mappedList.forEach(item => emitCrossTabEvent('INSERT', targetEventId, item));
      }
      return { data: mappedList, error };
    } catch (err) {
      return { data: [], error: err };
    }
  }

  async function deleteEntry({ id, rollNo, eventId }) {
    if (!verifyCoordinatorWriteAccess(eventId, 'DELETE_ENTRY') || !AttendX.State?.editAuthorized) {
      return { error: new Error('Forbidden: Unauthorized delete request.') };
    }

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return { error: new Error('Network offline. Unable to delete entry.') };
    }

    const client = AttendX.Backend.Supabase.getClient();
    if (!client) return { error: new Error('Database not configured') };

    let error = null;

    try {
      if (id !== undefined && id !== null && String(id) !== String(rollNo)) {
        const resById = await client.from('attendance').delete().eq('id', id);
        error = resById.error;
      }

      // fallback delete by event_id + roll_no in case id wasn't numeric
      if (eventId && rollNo) {
        const resByRoll = await client
          .from('attendance')
          .delete()
          .eq('event_id', eventId)
          .eq('roll_no', rollNo);
        if (error && !resByRoll.error) {
          error = null;
        } else if (!error && resByRoll.error) {
          error = resByRoll.error;
        }
      }

      if (!error) {
        emitCrossTabEvent('DELETE', eventId, { id, rollNo });
        AttendX.Backend.AuditService.logAction('ATTENDANCE_DELETED', { id, rollNo, eventId });
      }
      return { error };
    } catch (err) {
      return { error: err };
    }
  }

  function subscribeToEventAttendance(eventId, callbacks) {
    if (!eventId) return;

    const cleanEventId = String(eventId).trim().toUpperCase();
    unsubscribeRealtime();

    activeSubscribedEventId = cleanEventId;
    activeCallbacks = callbacks || null;

    const client = AttendX.Backend.Supabase.getClient();
    if (!client) return;

    realtimeChannel = client
      .channel('attendance_channel_' + cleanEventId)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'attendance',
          filter: `event_id=eq.${cleanEventId}`
        },
        payload => {
          if (payload?.new && typeof callbacks?.onInsert === 'function') {
            callbacks.onInsert(mapDbToLocal(payload.new));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'attendance',
          filter: `event_id=eq.${cleanEventId}`
        },
        payload => {
          if (payload?.new && typeof callbacks?.onUpdate === 'function') {
            callbacks.onUpdate(mapDbToLocal(payload.new));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'attendance'
        },
        payload => {
          if (payload?.old && typeof callbacks?.onDelete === 'function') {
            if (!payload.old.event_id || String(payload.old.event_id).toUpperCase() === cleanEventId) {
              callbacks.onDelete(payload.old.id, payload.old.roll_no);
            }
          }
        }
      )
      .subscribe();
  }

  function unsubscribeRealtime() {
    const client = AttendX.Backend.Supabase.getClient();
    if (realtimeChannel && client) {
      try {
        client.removeChannel(realtimeChannel);
      } catch (_e) {}
    }
    realtimeChannel = null;
    activeSubscribedEventId = null;
    activeCallbacks = null;
  }

  function isRealtimeSubscribed() {
    return Boolean(realtimeChannel || activeSubscribedEventId);
  }

  AttendX.Backend.AttendanceService = {
    mapDbToLocal,
    fetchByEvent,
    markPresentFromPrereg,
    insertEntry,
    bulkInsertPrereg,
    deleteEntry,
    subscribeToEventAttendance,
    unsubscribeRealtime,
    isRealtimeSubscribed,
    emitCrossTabEvent
  };
})(window);
