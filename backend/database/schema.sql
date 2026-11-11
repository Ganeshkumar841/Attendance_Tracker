-- 1. Wipe old tables clean (DESTRUCTIVE: drops existing events, attendance, and audit_logs data)
DROP TABLE IF EXISTS public.attendance CASCADE;
DROP TABLE IF EXISTS public.events CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;

-- 2. Create updated events table (with is_single_day, end_date, end_time, creator_email & password reset support)
CREATE TABLE public.events (
  id text PRIMARY KEY,
  name text NOT NULL,
  date date NOT NULL,
  end_date date NOT NULL,
  is_single_day boolean NOT NULL DEFAULT true,
  time time NOT NULL,
  end_time time NOT NULL,
  venue text,
  organization text,
  password text NOT NULL,
  created_by text,
  creator_email text,
  is_closed boolean DEFAULT false,
  reset_token_hash text,
  reset_token_expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT chk_events_end_date CHECK (end_date >= date),
  CONSTRAINT chk_events_schedule_order CHECK (
    (is_single_day = true AND end_date = date AND end_time > time)
    OR (is_single_day = false AND (end_date > date OR (end_date = date AND end_time > time)))
  )
);

-- 3. Create attendance table (once-per-event attendance per roll_no via UNIQUE(event_id, roll_no))
CREATE TABLE public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  roll_no text NOT NULL,
  year int,
  year_label text,
  branch text,
  num text,
  status text DEFAULT 'attended' CHECK (status IN ('attended', 'preregistered')),
  timestamp timestamptz DEFAULT now(),
  recorded_by text,
  UNIQUE(event_id, roll_no)
);

-- 4. Create audit_logs table
CREATE TABLE public.audit_logs (
  id bigserial PRIMARY KEY,
  log_type text NOT NULL,
  user_email text,
  details jsonb,
  timestamp timestamptz DEFAULT now(),
  user_agent text,
  url text
);

-- 5. Enable Realtime delete payloads & indexes
ALTER TABLE public.attendance REPLICA IDENTITY FULL;
CREATE INDEX IF NOT EXISTS idx_attendance_event_id ON public.attendance(event_id);
CREATE INDEX IF NOT EXISTS idx_attendance_roll_no ON public.attendance(event_id, roll_no);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON public.events(created_at DESC);

-- 6. Server-side function & trigger to enforce automatic event closure at (end_date + end_time) in Asia/Kolkata
CREATE OR REPLACE FUNCTION public.is_event_active(ev_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  ev_record RECORD;
  end_ts timestamp;
  now_local timestamp;
BEGIN
  SELECT
    date,
    COALESCE(end_date, date) AS effective_end_date,
    time,
    end_time,
    COALESCE(is_closed, false) AS is_closed
  INTO ev_record
  FROM public.events
  WHERE id = ev_id;

  IF NOT FOUND THEN RETURN false; END IF;
  IF ev_record.is_closed THEN RETURN false; END IF;
  IF ev_record.end_time IS NULL THEN RETURN false; END IF;

  end_ts := ev_record.effective_end_date + ev_record.end_time;
  now_local := (now() AT TIME ZONE 'Asia/Kolkata');

  IF now_local >= end_ts THEN
    UPDATE public.events SET is_closed = true WHERE id = ev_id AND is_closed = false;
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_attendance_event_active()
RETURNS trigger
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

DROP TRIGGER IF EXISTS trg_enforce_event_active ON public.attendance;
CREATE TRIGGER trg_enforce_event_active
  BEFORE INSERT OR UPDATE ON public.attendance
  FOR EACH ROW
  EXECUTE FUNCTION public.check_attendance_event_active();

-- 7. Keep RLS disabled for prototyping (or run backend/database/rls_policies.sql to enable RLS)
ALTER TABLE public.events DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs DISABLE ROW LEVEL SECURITY;
