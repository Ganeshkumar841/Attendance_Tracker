ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can select events" ON events;
CREATE POLICY "Authenticated users can select events"
  ON events FOR SELECT
  TO authenticated
  USING (true);

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

DROP POLICY IF EXISTS "Authenticated users can select attendance" ON attendance;
CREATE POLICY "Authenticated users can select attendance"
  ON attendance FOR SELECT
  TO authenticated
  USING (true);

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

DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON audit_logs;
CREATE POLICY "Authenticated users can insert audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);
