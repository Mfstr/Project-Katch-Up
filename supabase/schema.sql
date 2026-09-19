-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.profiles (
  id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  ical_url text UNIQUE,
  focus_interval integer,
  break_interval integer,
  pomodoro_cycles integer,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id),
  CONSTRAINT profiles_ical_url_fkey FOREIGN KEY (ical_url) REFERENCES public.calendar(ical_url)
);
CREATE TABLE public.tasks (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  title text,
  description text,
  is_complete boolean,
  due_date timestamp with time zone,
  profile_id uuid,
  CONSTRAINT tasks_pkey PRIMARY KEY (id),
  CONSTRAINT tasks_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.calendar (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  name text,
  description text,
  ical_url text UNIQUE,
  CONSTRAINT calendar_pkey PRIMARY KEY (id)
);

CREATE TABLE public.pomodoro_sessions (
  id uuid NOT NULL,
  profile_id uuid NOT NULL,
  task_id bigint,
  session_type text NOT NULL,
  planned_duraton_seconds integer NOT NULL,
  actual_duration_seconds integer NOT NULL,
  was_interrupted boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT pomodoro_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT pomodoro_sessions_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id),
  CONSTRAINT pomodoro_sessions_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id)
)