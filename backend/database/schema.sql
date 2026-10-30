-- ============================================================================
-- AttendX — Supabase PostgreSQL Database Schema
-- ============================================================================

-- 1. Events Table
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  date DATE NOT NULL,
  time TIME,
  venue TEXT,
  password TEXT NOT NULL,
  organization TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Attendance Table
CREATE TABLE IF NOT EXISTS attendance (
  id BIGSERIAL PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  roll_no TEXT NOT NULL,
  year INTEGER,
  year_label TEXT,
  branch TEXT,
  num TEXT,
  status TEXT DEFAULT 'attended' CHECK (status IN ('attended', 'preregistered')),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  recorded_by TEXT,
  UNIQUE(event_id, roll_no)
);

-- Enable FULL replica identity so Supabase Realtime broadcasts complete old rows on DELETE
ALTER TABLE attendance REPLICA IDENTITY FULL;

-- Indexes for high-speed lookups and sorting
CREATE INDEX IF NOT EXISTS idx_attendance_event_id ON attendance(event_id);
CREATE INDEX IF NOT EXISTS idx_attendance_roll_no ON attendance(event_id, roll_no);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at DESC);

-- 3. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  log_type TEXT NOT NULL,
  user_email TEXT,
  details JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  user_agent TEXT,
  url TEXT
);
