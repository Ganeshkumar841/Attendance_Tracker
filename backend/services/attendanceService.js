(function (global) {
  const AttendX = (global.AttendX = global.AttendX || {});
  AttendX.Backend = AttendX.Backend || {};

  let realtimeChannel = null;
  let activeSubscribedEventId = null;
  let activeCallbacks = null;
  let broadcastChannel = null;
  let reconnectTimeoutId = null;
  let isReconnecting = false;

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

    if (typeof global.addEventListener === 'function') {
      global.addEventListener('storage', e => {
        if (e.key === CROSS_TAB_STORAGE_KEY && e.newValue) {
          try {
            handleCrossTabPayload(JSON.parse(e.newValue));
          } catch (_err) {}
        }
      });
    }
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
    } else if (msg.type === 'BULK_DELETE' && Array.isArray(msg.payload?.items) && typeof activeCallbacks.onDelete === 'function') {
      msg.payload.items.forEach(item => {
        activeCallbacks.onDelete(item.id, item.rollNo);
      });
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

  async function insertEntry({ eventId, rollNo, year, yearLabel, branch, num, status = 'attended', recordedBy }) {
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

    const normalizedStatus = status === 'preregistered' ? 'preregistered' : 'attended';

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
            status: normalizedStatus,
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
      } else if (eventId && rollNo) {
        const resByRoll = await client
          .from('attendance')
          .delete()
          .eq('event_id', eventId)
          .eq('roll_no', rollNo);
        error = resByRoll.error;
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

  async function deleteEntriesBulk({ ids = [], rollNos = [], eventId }) {
    if (!verifyCoordinatorWriteAccess(eventId, 'BULK_DELETE_ENTRIES') || !AttendX.State?.editAuthorized) {
      return { error: new Error('Forbidden: Unauthorized bulk delete request.') };
    }

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return { error: new Error('Network offline. Unable to delete selected entries.') };
    }

    const client = AttendX.Backend.Supabase.getClient();
    if (!client) return { error: new Error('Database not configured') };

    const validUuidIds = (Array.isArray(ids) ? ids : []).filter(
      id => id !== undefined && id !== null && !rollNos.includes(String(id))
    );

    try {
      let error = null;
      if (validUuidIds.length > 0) {
        const res = await client
          .from('attendance')
          .delete()
          .in('id', validUuidIds);
        error = res.error;
      } else if (eventId && Array.isArray(rollNos) && rollNos.length > 0) {
        const res = await client
          .from('attendance')
          .delete()
          .eq('event_id', eventId)
          .in('roll_no', rollNos);
        error = res.error;
      }

      if (!error) {
        const items = validUuidIds.map((id, idx) => ({ id, rollNo: rollNos[idx] || null }));
        emitCrossTabEvent('BULK_DELETE', eventId, { items });
        AttendX.Backend.AuditService.logAction('ATTENDANCE_BULK_DELETED', {
          count: validUuidIds.length || rollNos.length,
          eventId
        });
      }

      return { error };
    } catch (err) {
      return { error: err };
    }
  }

  function createRealtimeSubscription(cleanEventId, callbacks) {
    const client = AttendX.Backend.Supabase.getClient();
    if (!client || !cleanEventId) return;

    if (realtimeChannel) {
      try {
        client.removeChannel(realtimeChannel);
      } catch (_e) {}
      realtimeChannel = null;
    }

    const handleMissingPayloadFallback = async () => {
      if (typeof callbacks?.onSync !== 'function') return;
      const { data, error } = await fetchByEvent(cleanEventId);
      if (!error && Array.isArray(data)) {
        callbacks.onSync(data);
      }
    };

    const channel = client
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
          if (payload?.new && (payload.new.id || payload.new.roll_no)) {
            if (typeof callbacks?.onInsert === 'function') {
              callbacks.onInsert(mapDbToLocal(payload.new));
            }
          } else {
            handleMissingPayloadFallback();
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
          if (payload?.new && (payload.new.id || payload.new.roll_no)) {
            if (typeof callbacks?.onUpdate === 'function') {
              callbacks.onUpdate(mapDbToLocal(payload.new));
            }
          } else {
            handleMissingPayloadFallback();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'attendance',
          filter: `event_id=eq.${cleanEventId}`
        },
        payload => {
          if (payload?.old && (payload.old.id !== undefined || payload.old.roll_no)) {
            if (typeof callbacks?.onDelete === 'function') {
              callbacks.onDelete(payload.old.id, payload.old.roll_no);
            }
          } else {
            handleMissingPayloadFallback();
          }
        }
      )
      .subscribe(status => {
        if (status === 'SUBSCRIBED') {
          isReconnecting = false;
        } else if (
          (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') &&
          activeSubscribedEventId === cleanEventId &&
          !isReconnecting
        ) {
          isReconnecting = true;
          if (reconnectTimeoutId) clearTimeout(reconnectTimeoutId);
          reconnectTimeoutId = setTimeout(async () => {
            if (activeSubscribedEventId !== cleanEventId) return;
            createRealtimeSubscription(cleanEventId, activeCallbacks);
            const { data, error } = await fetchByEvent(cleanEventId);
            if (!error && Array.isArray(data) && typeof activeCallbacks?.onSync === 'function') {
              activeCallbacks.onSync(data);
            }
            isReconnecting = false;
          }, 1200);
        }
      });

    realtimeChannel = channel;
  }

  function subscribeToEventAttendance(eventId, callbacks) {
    if (!eventId) return;

    const cleanEventId = String(eventId).trim().toUpperCase();
    unsubscribeRealtime();

    activeSubscribedEventId = cleanEventId;
    activeCallbacks = callbacks || null;

    createRealtimeSubscription(cleanEventId, callbacks);
  }

  function unsubscribeRealtime() {
    if (reconnectTimeoutId) {
      clearTimeout(reconnectTimeoutId);
      reconnectTimeoutId = null;
    }
    isReconnecting = false;

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
    deleteEntriesBulk,
    subscribeToEventAttendance,
    unsubscribeRealtime,
    isRealtimeSubscribed,
    emitCrossTabEvent
  };
})(window);
