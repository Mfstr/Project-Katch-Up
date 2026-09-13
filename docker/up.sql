-- 0. Mock Supabase Auth Environment
create extension if not exists pgcrypto;
create schema if not exists auth;

create or replace function auth.uid()
returns uuid
language sql stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

do $$
begin
  if not exists (select from pg_roles where rolname = 'supabase_auth_admin') then
    create role supabase_auth_admin;
  end if;
end
$$;

create table if not exists auth.users (
    instance_id uuid,
    id uuid primary key,
    aud varchar(255),
    role varchar(255),
    email varchar(255) unique,
    encrypted_password varchar(255),
    email_confirmed_at timestamptz,
    raw_app_meta_data jsonb,
    raw_user_meta_data jsonb,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- 1. Profiles Table (User settings)
create table public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    created_at timestamptz not null default now(),
    focus_interval int4 default 25 check (focus_interval between 1 and 180),
    break_interval int4 default 5 check (break_interval between 1 and 60),
    pomodoro_cycles int4 default 4 check (pomodoro_cycles between 1 and 20)
);

-- 2. Tasks Table
create table public.tasks (
    id bigint generated always as identity primary key,
    created_at timestamptz not null default now(),
    title text not null check (char_length(trim(title)) > 0),
    description text,
    is_complete boolean not null default false,
    due_date timestamptz,
    profile_id uuid not null references public.profiles(id) on delete cascade
);

-- 3. Pomodoro Sessions Table (NEW)
create table public.pomodoro_sessions (
    id bigint generated always as identity primary key,
    created_at timestamptz not null default now(),
    started_at timestamptz not null default now(),
    ended_at timestamptz,
    duration_minutes int4 not null check (duration_minutes > 0),
    session_type text not null default 'focus' check (session_type in ('focus', 'short_break', 'long_break')),
    is_completed boolean not null default false,
    task_id bigint references public.tasks(id) on delete set null,
    profile_id uuid not null references public.profiles(id) on delete cascade
);

-- 4. Calendar Table
create table public.calendar (
    id bigint generated always as identity primary key,
    created_at timestamptz not null default now(),
    name text not null check (char_length(trim(name)) > 0),
    description text,
    ical_url text not null check (
        ical_url ~* '^(https|webcal)://[^\s/$.?#].[^\s]*$'
    ),
    profile_id uuid not null references public.profiles(id) on delete cascade
);

-- 5. Indexes
create index idx_tasks_profile_id on public.tasks(profile_id);
create index idx_tasks_is_complete on public.tasks(profile_id, is_complete);
create index idx_pomodoro_sessions_profile_id on public.pomodoro_sessions(profile_id);
create index idx_pomodoro_sessions_task_id on public.pomodoro_sessions(task_id);
create index idx_calendar_profile_id on public.calendar(profile_id);

-- 6. Row Level Security
alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.pomodoro_sessions enable row level security;
alter table public.calendar enable row level security;

create policy "Users can view own profile"
    on public.profiles for select
    using ((select auth.uid()) = id);

create policy "Users can update own profile"
    on public.profiles for update
    using ((select auth.uid()) = id)
    with check ((select auth.uid()) = id);

create policy "Users can CRUD own tasks"
    on public.tasks for all
    using ((select auth.uid()) = profile_id)
    with check ((select auth.uid()) = profile_id);

create policy "Users can CRUD own pomodoro sessions"
    on public.pomodoro_sessions for all
    using ((select auth.uid()) = profile_id)
    with check ((select auth.uid()) = profile_id);

create policy "Users can CRUD own calendars"
    on public.calendar for all
    using ((select auth.uid()) = profile_id)
    with check ((select auth.uid()) = profile_id);

-- 7. Trigger for Auth Provisioning
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
    insert into public.profiles (id)
    values (new.id)
    on conflict (id) do nothing;
    return new;
end;
$$;

revoke all on function public.handle_new_user() from public;
grant execute on function public.handle_new_user() to supabase_auth_admin;

create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();