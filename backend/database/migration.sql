-- Non-destructive migration script for AttendX Round 2
-- 1. Ensure single-day & end_date columns exist
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS is_single_day boolean NOT NULL DEFAULT true;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS end_date date;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'ends_next_day'
  ) THEN
    UPDATE public.events
    SET
      end_date = CASE WHEN COALESCE(ends_next_day, false) THEN (date + INTERVAL '1 day')::date ELSE date END,
      is_single_day = NOT COALESCE(ends_next_day, false)
    WHERE end_date IS NULL;

    ALTER TABLE public.events DROP COLUMN ends_next_day;
  ELSE
    UPDATE public.events
    SET end_date = date
    WHERE end_date IS NULL;
  END IF;
END $$;

ALTER TABLE public.events ALTER COLUMN end_date SET NOT NULL;

ALTER TABLE public.events DROP CONSTRAINT IF EXISTS chk_events_end_date;
ALTER TABLE public.events ADD CONSTRAINT chk_events_end_date CHECK (end_date >= date);

-- 2. Remove obsolete password reset token columns
ALTER TABLE public.events
  DROP COLUMN IF EXISTS reset_token_hash,
  DROP COLUMN IF EXISTS reset_token_expires_at;

-- 3. Enable REPLICA IDENTITY FULL and add public.attendance to supabase_realtime publication safely
ALTER TABLE public.attendance REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'attendance'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance;
  END IF;
END $$;

-- 4. Ensure server-side active check function is up to date
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
