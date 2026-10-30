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
      id: dbRow.id,
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

  async function markPresentFromPrereg(recordId) {
    const client = AttendX.Backend.Supabase.getClient();
    const { data, error } = await client
      .from('attendance')
      .update({
        status: 'attended',
        timestamp: new Date().toISOString()
      })
      .eq('id', recordId)
      .select()
      .single();

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

    // Upsert with ignoreDuplicates so already existing roll numbers in DB never crash the batch
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
   * Delete a participant attendance record by ID and return immediately so the UI
   * can reactively remove the entry without waiting for a manual page reload.
   */
  async function deleteEntry(recordId, eventId) {
    const client = AttendX.Backend.Supabase.getClient();
    if (!client) return { error: new Error('Database not configured') };

    let query = client.from('attendance').delete().eq('id', recordId);
    if (eventId) {
      query = query.eq('event_id', eventId);
    }

    const { error } = await query;
    if (!error) {
      AttendX.Backend.AuditService.logAction('ATTENDANCE_DELETED', { recordId, eventId });
    }
    return { error };
  }

  /**
   * Subscribe to real-time INSERT, UPDATE, and DELETE events for an event.
   * Note: In Supabase Postgres Changes, DELETE events only send the primary key `id` in `payload.old`
   * unless REPLICA IDENTITY FULL is enabled on the table. Listening to DELETE on the table
   * and matching `payload.old.id` against local state guarantees real-time deletion across devices.
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
          if (payload?.old && payload.old.id !== undefined && typeof callbacks?.onDelete === 'function') {
            callbacks.onDelete(payload.old.id);
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
