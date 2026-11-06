-- ============================================================================
-- PROJECT KATCH-UP: Schema Parity Migration for Cloud Supabase
-- Target Project: wrikxqmhddkzixrwdqrf
-- ============================================================================

-- 1. PROFILES TABLE: Add missing columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS ical_url text UNIQUE,
  ADD COLUMN IF NOT EXISTS focus_interval integer DEFAULT 25,
  ADD COLUMN IF NOT EXISTS break_interval integer DEFAULT 5,
  ADD COLUMN IF NOT EXISTS pomodoro_cycles integer DEFAULT 4;

-- 2. CALENDARS TABLE: Add missing columns
ALTER TABLE public.calendars
  ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;

-- 3. POMODORO_SESSIONS TABLE: Add missing columns & foreign key
ALTER TABLE public.pomodoro_sessions
  ADD COLUMN IF NOT EXISTS task_id bigint REFERENCES public.tasks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS planned_duration_seconds integer DEFAULT 1500,
  ADD COLUMN IF NOT EXISTS actual_duration_seconds integer DEFAULT 1500,
  ADD COLUMN IF NOT EXISTS duration_minutes integer,
  ADD COLUMN IF NOT EXISTS tasks_completed integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_interrupted boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_completed boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS started_at timestamp with time zone DEFAULT now(),
  ADD COLUMN IF NOT EXISTS completed_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS ended_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now();

-- 4. INDEXES: Speed up session retrieval and stats calculation
CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_profile_started
  ON public.pomodoro_sessions (profile_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_profile_completed
  ON public.pomodoro_sessions (profile_id, is_completed);

CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_task_id
  ON public.pomodoro_sessions (task_id);

-- 5. ROW LEVEL SECURITY (RLS): Ensure policies are enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pomodoro_sessions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can manage their own profile') THEN
    CREATE POLICY "Users can manage their own profile" ON public.profiles FOR ALL USING (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'calendars' AND policyname = 'Users can manage their own calendars') THEN
    CREATE POLICY "Users can manage their own calendars" ON public.calendars FOR ALL USING (auth.uid() = profile_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tasks' AND policyname = 'Users can manage their own tasks') THEN
    CREATE POLICY "Users can manage their own tasks" ON public.tasks FOR ALL USING (auth.uid() = profile_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pomodoro_sessions' AND policyname = 'Users can manage their own pomodoro sessions') THEN
    CREATE POLICY "Users can manage their own pomodoro sessions" ON public.pomodoro_sessions FOR ALL USING (auth.uid() = profile_id);
  END IF;
END $$;

-- 6. AUTOMATIC PROFILE CREATION TRIGGER: Provision profile when a user signs up
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

-- 7. BACKFILL: Ensure existing users have a corresponding profile row
INSERT INTO public.profiles (id)
SELECT id FROM auth.users
ON CONFLICT (id) DO NOTHING;
