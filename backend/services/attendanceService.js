/**
 * Backend Service — Attendance & Realtime Synchronization Service
 * Handles fetching, marking, pre-registering, deleting, and real-time syncing of participant attendance.
 */
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

  async function fetchByEvent(eventId) {
    const client = AttendX.Backend.Supabase.getClient();
    if (!client || !eventId) return { data: [], error: new Error('Invalid client or eventId') };

    const { data, error } = await client
      .from('attendance')
      .select('*')
      .eq('event_id', eventId)
      .order('timestamp', { ascending: false });

    return {
      data: Array.isArray(data) ? data.map(mapDbToLocal).filter(Boolean) : [],
      error
    };
  }

  async function markPresentFromPrereg(recordId, eventId, rollNo) {
    const client = AttendX.Backend.Supabase.getClient();
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
    const client = AttendX.Backend.Supabase.getClient();
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
    const client = AttendX.Backend.Supabase.getClient();
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

  /**
   * Delete a participant attendance record by primary key `id` and/or `(event_id, roll_no)`.
   */
  async function deleteEntry({ id, rollNo, eventId }) {
    const client = AttendX.Backend.Supabase.getClient();
    if (!client) return { error: new Error('Database not configured') };

    let error = null;

    // 1. Delete by primary key `id` (exact match as in original table schema)
    if (id !== undefined && id !== null && String(id) !== String(rollNo)) {
      const resById = await client.from('attendance').delete().eq('id', id);
      error = resById.error;
    }

    // 2. Also delete by (event_id, roll_no) to guarantee removal even if `id` was string/UUID/composite
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

  /**
   * Subscribe to real-time INSERT, UPDATE, and DELETE events for an event.
   */
  function subscribeToEventAttendance(eventId, callbacks) {
    const client = AttendX.Backend.Supabase.getClient();
    if (!client || !eventId) return;

    unsubscribeRealtime();

    realtimeChannel = client
      .channel('attendance_channel_' + eventId)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'attendance',
          filter: `event_id=eq.${eventId}`
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
          filter: `event_id=eq.${eventId}`
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
