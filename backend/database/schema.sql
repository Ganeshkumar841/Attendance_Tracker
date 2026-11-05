CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  end_time TIME NOT NULL,
  ends_next_day BOOLEAN DEFAULT FALSE,
  venue TEXT,
  password TEXT NOT NULL,
  organization TEXT,
  created_by TEXT,
  creator_email TEXT,
  is_closed BOOLEAN DEFAULT FALSE,
  reset_token_hash TEXT,
  reset_token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE events ADD COLUMN IF NOT EXISTS end_time TIME;
ALTER TABLE events ADD COLUMN IF NOT EXISTS ends_next_day BOOLEAN DEFAULT FALSE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS creator_email TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_closed BOOLEAN DEFAULT FALSE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS reset_token_hash TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS reset_token_expires_at TIMESTAMPTZ;

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

-- needed so realtime delete events include the old row values
ALTER TABLE attendance REPLICA IDENTITY FULL;

CREATE INDEX IF NOT EXISTS idx_attendance_event_id ON attendance(event_id);
CREATE INDEX IF NOT EXISTS idx_attendance_roll_no ON attendance(event_id, roll_no);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at DESC);

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  log_type TEXT NOT NULL,
  user_email TEXT,
  details JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  user_agent TEXT,
  url TEXT
);

CREATE OR REPLACE FUNCTION public.is_event_active(ev_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  ev_record RECORD;
  end_ts TIMESTAMP;
  now_local TIMESTAMP;
BEGIN
  SELECT date, time, end_time, COALESCE(ends_next_day, FALSE) AS ends_next_day, COALESCE(is_closed, FALSE) AS is_closed
  INTO ev_record
  FROM public.events
  WHERE id = ev_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  IF ev_record.is_closed THEN
    RETURN FALSE;
  END IF;

  IF ev_record.end_time IS NULL THEN
    RETURN TRUE;
  END IF;

  end_ts := (ev_record.date + CASE WHEN ev_record.ends_next_day THEN INTERVAL '1 day' ELSE INTERVAL '0 day' END) + ev_record.end_time;
  now_local := (NOW() AT TIME ZONE 'Asia/Kolkata');

  IF now_local >= end_ts THEN
    UPDATE public.events SET is_closed = TRUE WHERE id = ev_id AND is_closed = FALSE;
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_attendance_event_active()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT public.is_event_active(NEW.event_id) THEN
    RAISE EXCEPTION 'Event session has ended. New attendance entries are not allowed.'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_event_active ON attendance;
CREATE TRIGGER trg_enforce_event_active
  BEFORE INSERT OR UPDATE ON attendance
  FOR EACH ROW
  EXECUTE FUNCTION public.check_attendance_event_active();
