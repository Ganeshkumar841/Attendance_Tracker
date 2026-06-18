// Database Query Optimization Utilities

class DatabaseHelper {
  constructor(supabaseClient) {
    this.supabaseClient = supabaseClient;
  }

  // Query constants
  static ATTENDANCE_PAGE_SIZE = 50;
  static EVENTS_PAGE_SIZE = 20;

  // Paginated attendance query
  async getAttendancePagedAsync(eventId, pageNumber = 0, pageSize = DatabaseHelper.ATTENDANCE_PAGE_SIZE) {
    const start = pageNumber * pageSize;
    const end = start + pageSize - 1;

    const { data, error, count } = await this.supabaseClient
      .from('attendance')
      .select('*', { count: 'exact' })
      .eq('event_id', eventId)
      .order('timestamp', { ascending: false })
      .range(start, end);

    return { data, error, totalCount: count };
  }

  // Get attendance with cursor (for real-time syncing)
  async getAttendanceSinceAsync(eventId, lastTimestamp) {
    const { data, error } = await this.supabaseClient
      .from('attendance')
      .select('*')
      .eq('event_id', eventId)
      .gt('timestamp', lastTimestamp)
      .order('timestamp', { ascending: true })
      .limit(100);

    return { data, error };
  }

  // Get filtered attendance
  async getAttendanceFilteredAsync(eventId, status, limit = 100) {
    let query = this.supabaseClient
      .from('attendance')
      .select('*', { count: 'exact' })
      .eq('event_id', eventId);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query
      .order('timestamp', { ascending: false })
      .limit(limit);

    return { data, error, count };
  }

  // Get all attendance for export (optimized)
  async getAllAttendanceAsync(eventId) {
    const { data, error } = await this.supabaseClient
      .from('attendance')
      .select('*')
      .eq('event_id', eventId)
      .order('timestamp', { ascending: true });

    return { data, error };
  }

  // Get event with minimal data
  async getEventAsync(eventId) {
    const { data, error } = await this.supabaseClient
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    return { data, error };
  }

  // Get recent events with pagination
  async getRecentEventsAsync(limit = DatabaseHelper.EVENTS_PAGE_SIZE) {
    const { data, error } = await this.supabaseClient
      .from('events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    return { data, error };
  }

  // Check if roll number exists in event
  async rollNumberExistsAsync(eventId, rollNo) {
    const { data, error, count } = await this.supabaseClient
      .from('attendance')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('roll_no', rollNo);

    return { exists: count > 0, error };
  }

  // Batch insert with error handling
  async insertBatchAsync(table, records, batchSize = 100) {
    const results = {
      successful: [],
      failed: [],
      errors: []
    };

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);

      try {
        const { data, error } = await this.supabaseClient
          .from(table)
          .insert(batch)
          .select();

        if (error) {
          results.failed.push(...batch);
          results.errors.push(error);
        } else {
          results.successful.push(...(data || []));
        }
      } catch (err) {
        results.failed.push(...batch);
        results.errors.push(err);
      }
    }

    return results;
  }

  // Delete with verification
  async deleteWithVerificationAsync(table, condition, verificationFn) {
    try {
      // Verify condition is met before deletion
      const verified = await verificationFn();
      if (!verified) {
        return { success: false, error: 'Verification failed' };
      }

      const { error } = await this.supabaseClient
        .from(table)
        .delete()
        .match(condition);

      return { success: !error, error };
    } catch (err) {
      return { success: false, error: err };
    }
  }

  // Get branch summary statistics
  async getBranchSummaryAsync(eventId) {
    const { data, error } = await this.supabaseClient
      .from('attendance')
      .select('branch, year_label, status')
      .eq('event_id', eventId)
      .eq('status', 'attended');

    if (error) return { summary: {}, error };

    const summary = {};
    data?.forEach(record => {
      if (!summary[record.branch]) {
        summary[record.branch] = { count: 0, years: new Set() };
      }
      summary[record.branch].count += 1;
      summary[record.branch].years.add(record.year_label);
    });

    // Convert Sets to Arrays for JSON serialization
    Object.keys(summary).forEach(branch => {
      summary[branch].years = Array.from(summary[branch].years);
    });

    return { summary, error: null };
  }
}

// Cache system for reducing database calls
class SimpleCache {
  constructor(ttlMs = 5 * 60 * 1000) {
    this.cache = new Map();
    this.ttlMs = ttlMs;
  }

  set(key, value) {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs
    });
  }

  get(key) {
    const item = this.cache.get(key);

    if (!item) return null;

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  invalidate(key) {
    this.cache.delete(key);
  }

  invalidateAll() {
    this.cache.clear();
  }

  invalidatePattern(pattern) {
    Array.from(this.cache.keys()).forEach(key => {
      if (key.match(pattern)) {
        this.cache.delete(key);
      }
    });
  }
}
