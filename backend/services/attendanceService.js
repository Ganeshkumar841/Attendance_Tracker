(function (global) {
  const AttendX = (global.AttendX = global.AttendX || {});
  AttendX.Backend = AttendX.Backend || {};

  let realtimeChannel = null;

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
    const { data, error } = await client
      .from('attendance')
      .select('*')
      .eq('event_id', cleanEventId)
      .order('timestamp', { ascending: false });

    return {
      data: Array.isArray(data) ? data.map(mapDbToLocal).filter(Boolean) : [],
      error
    };
  }

  async function markPresentFromPrereg(recordId, eventId, rollNo) {
    if (!verifyCoordinatorWriteAccess(eventId, 'MARK_PRESENT_FROM_PREREG')) {
      return { data: null, error: new Error('Forbidden: Student accounts are read-only.') };
    }

    const client = AttendX.Backend.Supabase.getClient();
    if (!client) return { data: null, error: new Error('Database not configured') };

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
    return { data: data ? mapDbToLocal(data) : null, error };
  }

  async function insertEntry({ eventId, rollNo, year, yearLabel, branch, num, recordedBy }) {
    if (!verifyCoordinatorWriteAccess(eventId, 'INSERT_ENTRY')) {
      return { data: null, error: new Error('Forbidden: Student accounts are read-only.') };
    }

    const client = AttendX.Backend.Supabase.getClient();
    if (!client) return { data: null, error: new Error('Database not configured') };

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

    return { data: data ? mapDbToLocal(data) : null, error };
  }

  async function bulkInsertPrereg(records) {
    const targetEventId = Array.isArray(records) && records[0]?.event_id
      ? records[0].event_id
      : AttendX.State?.currentEvent?.id;

    if (!verifyCoordinatorWriteAccess(targetEventId, 'BULK_INSERT_PREREG')) {
      return { data: [], error: new Error('Forbidden: Student accounts are read-only.') };
    }

    const client = AttendX.Backend.Supabase.getClient();
    if (!client) return { data: [], error: new Error('Database not configured') };
    if (!Array.isArray(records) || records.length === 0) {
      return { data: [], error: null };
    }

    const { data, error } = await client
      .from('attendance')
      .upsert(records, { onConflict: 'event_id,roll_no', ignoreDuplicates: true })
      .select();

    return {
      data: Array.isArray(data) ? data.map(mapDbToLocal).filter(Boolean) : [],
      error
    };
  }

  async function deleteEntry({ id, rollNo, eventId }) {
    if (!verifyCoordinatorWriteAccess(eventId, 'DELETE_ENTRY') || !AttendX.State?.editAuthorized) {
      return { error: new Error('Forbidden: Unauthorized delete request.') };
    }

    const client = AttendX.Backend.Supabase.getClient();
    if (!client) return { error: new Error('Database not configured') };

    let error = null;

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
      } else if (!error && resByRoll.error && (id === undefined || id === null)) {
        error = resByRoll.error;
      }
    }

    if (!error) {
      AttendX.Backend.AuditService.logAction('ATTENDANCE_DELETED', { id, rollNo, eventId });
    }
    return { error };
  }

  function subscribeToEventAttendance(eventId, callbacks) {
    const client = AttendX.Backend.Supabase.getClient();
    if (!client || !eventId) return;

    const cleanEventId = String(eventId).trim().toUpperCase();
    unsubscribeRealtime();

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
            callbacks.onDelete(payload.old.id, payload.old.roll_no);
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
  }

  AttendX.Backend.AttendanceService = {
    mapDbToLocal,
    fetchByEvent,
    markPresentFromPrereg,
    insertEntry,
    bulkInsertPrereg,
    deleteEntry,
    subscribeToEventAttendance,
    unsubscribeRealtime
  };
})(window);
