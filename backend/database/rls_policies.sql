-- ============================================================================
-- AttendX — Supabase Row-Level Security (RLS) Policies
-- ============================================================================

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 1. Events Policies
-- Both Authenticated Coordinators/Staff and Students can view events (password column is omitted in Student queries)
DROP POLICY IF EXISTS "Authenticated users can select events" ON events;
CREATE POLICY "Authenticated users can select events"
  ON events FOR SELECT
  TO authenticated
  USING (true);

-- Only non-student authenticated users (Coordinators / Staff) can insert or delete events
DROP POLICY IF EXISTS "Authenticated users can insert events" ON events;
CREATE POLICY "Authenticated users can insert events"
  ON events FOR INSERT
  TO authenticated
  WITH CHECK (COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', 'coordinator') <> 'student');

DROP POLICY IF EXISTS "Authenticated users can delete events" ON events;
CREATE POLICY "Authenticated users can delete events"
  ON events FOR DELETE
  TO authenticated
  USING (COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', 'coordinator') <> 'student');

-- 2. Attendance Policies
-- Both Authenticated Coordinators/Staff and Students can view attendance status
DROP POLICY IF EXISTS "Authenticated users can select attendance" ON attendance;
CREATE POLICY "Authenticated users can select attendance"
  ON attendance FOR SELECT
  TO authenticated
  USING (true);

-- Only Coordinators / Staff can insert, update, or delete attendance entries
DROP POLICY IF EXISTS "Authenticated users can insert attendance" ON attendance;
CREATE POLICY "Authenticated users can insert attendance"
  ON attendance FOR INSERT
  TO authenticated
  WITH CHECK (COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', 'coordinator') <> 'student');

DROP POLICY IF EXISTS "Authenticated users can update attendance" ON attendance;
CREATE POLICY "Authenticated users can update attendance"
  ON attendance FOR UPDATE
  TO authenticated
  USING (COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', 'coordinator') <> 'student');

DROP POLICY IF EXISTS "Authenticated users can delete attendance" ON attendance;
CREATE POLICY "Authenticated users can delete attendance"
  ON attendance FOR DELETE
  TO authenticated
  USING (COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', 'coordinator') <> 'student');

-- 3. Audit Logs Policies (append-only for all authenticated users)
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON audit_logs;
CREATE POLICY "Authenticated users can insert audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);
