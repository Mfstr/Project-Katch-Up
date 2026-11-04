-- Migration: 20261103000001_sync_pomodoro_sessions_and_profiles.sql
-- Aligns pomodoro_sessions and profiles tables with backend logic and production needs

-- 1. Ensure public.profiles has all interval columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS focus_interval integer DEFAULT 25,
  ADD COLUMN IF NOT EXISTS break_interval integer DEFAULT 5,
  ADD COLUMN IF NOT EXISTS pomodoro_cycles integer DEFAULT 4;

-- 2. Ensure public.pomodoro_sessions has all expected columns
ALTER TABLE public.pomodoro_sessions
  ADD COLUMN IF NOT EXISTS task_id bigint REFERENCES public.tasks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS planned_duration_seconds integer DEFAULT 1500,
  ADD COLUMN IF NOT EXISTS actual_duration_seconds integer DEFAULT 1500,
  ADD COLUMN IF NOT EXISTS duration_minutes integer,
  ADD COLUMN IF NOT EXISTS is_interrupted boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_completed boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS started_at timestamp with time zone DEFAULT now(),
  ADD COLUMN IF NOT EXISTS completed_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS ended_at timestamp with time zone;

-- 3. Indexes for fast session retrieval, streak calculations, and charts
CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_profile_started
  ON public.pomodoro_sessions (profile_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_profile_completed
  ON public.pomodoro_sessions (profile_id, is_completed);

CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_task_id
  ON public.pomodoro_sessions (task_id);

-- 4. Automatic profile creation trigger on auth.users signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (new.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Backfill profiles for any auth.users that exist without a profile
INSERT INTO public.profiles (id)
SELECT id FROM auth.users
ON CONFLICT (id) DO NOTHING;

