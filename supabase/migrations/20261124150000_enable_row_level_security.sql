-- Row Level Security for every user-data table.
--
-- The API runs Supabase queries with the signed-in user's JWT, so these policies are what
-- guarantee one user can never read or change another user's rows, even if application code
-- forgets an ownership filter. The anon role gets no access at all.
--
-- Replaces the earlier broad "Users can manage their own ..." policies (FOR ALL, TO public). Postgres
-- combines permissive policies with OR, so they must be dropped for the stricter checks below to apply.

drop policy if exists "Users can manage their own profile" on public.profiles;
drop policy if exists "Users can manage their own calendars" on public.calendars;
drop policy if exists "Users can manage their own tasks" on public.tasks;
drop policy if exists "Users can manage their own pomodoro sessions" on public.pomodoro_sessions;

-- ---------------------------------------------------------------------------
-- profiles: a user can see and edit only their own profile row
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

create policy "profiles_insert_own" on public.profiles
  for insert to authenticated
  with check (id = (select auth.uid()));

create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- calendars
-- ---------------------------------------------------------------------------
alter table public.calendars enable row level security;

drop policy if exists "calendars_select_own" on public.calendars;
drop policy if exists "calendars_insert_own" on public.calendars;
drop policy if exists "calendars_update_own" on public.calendars;
drop policy if exists "calendars_delete_own" on public.calendars;

create policy "calendars_select_own" on public.calendars
  for select to authenticated
  using (profile_id = (select auth.uid()));

create policy "calendars_insert_own" on public.calendars
  for insert to authenticated
  with check (profile_id = (select auth.uid()));

create policy "calendars_update_own" on public.calendars
  for update to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

create policy "calendars_delete_own" on public.calendars
  for delete to authenticated
  using (profile_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- tasks: owned rows only, and a task may only point at the owner's own calendar
-- ---------------------------------------------------------------------------
alter table public.tasks enable row level security;

drop policy if exists "tasks_select_own" on public.tasks;
drop policy if exists "tasks_insert_own" on public.tasks;
drop policy if exists "tasks_update_own" on public.tasks;
drop policy if exists "tasks_delete_own" on public.tasks;

create policy "tasks_select_own" on public.tasks
  for select to authenticated
  using (profile_id = (select auth.uid()));

create policy "tasks_insert_own" on public.tasks
  for insert to authenticated
  with check (
    profile_id = (select auth.uid())
    and (
      calendar_id is null
      or exists (
        select 1 from public.calendars c
        where c.id = calendar_id and c.profile_id = (select auth.uid())
      )
    )
  );

create policy "tasks_update_own" on public.tasks
  for update to authenticated
  using (profile_id = (select auth.uid()))
  with check (
    profile_id = (select auth.uid())
    and (
      calendar_id is null
      or exists (
        select 1 from public.calendars c
        where c.id = calendar_id and c.profile_id = (select auth.uid())
      )
    )
  );

create policy "tasks_delete_own" on public.tasks
  for delete to authenticated
  using (profile_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- pomodoro_sessions: owned rows only, and a session may only reference the owner's own task
-- ---------------------------------------------------------------------------
alter table public.pomodoro_sessions enable row level security;

drop policy if exists "sessions_select_own" on public.pomodoro_sessions;
drop policy if exists "sessions_insert_own" on public.pomodoro_sessions;
drop policy if exists "sessions_update_own" on public.pomodoro_sessions;
drop policy if exists "sessions_delete_own" on public.pomodoro_sessions;

create policy "sessions_select_own" on public.pomodoro_sessions
  for select to authenticated
  using (profile_id = (select auth.uid()));

create policy "sessions_insert_own" on public.pomodoro_sessions
  for insert to authenticated
  with check (
    profile_id = (select auth.uid())
    and (
      task_id is null
      or exists (
        select 1 from public.tasks t
        where t.id = task_id and t.profile_id = (select auth.uid())
      )
    )
  );

create policy "sessions_update_own" on public.pomodoro_sessions
  for update to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

create policy "sessions_delete_own" on public.pomodoro_sessions
  for delete to authenticated
  using (profile_id = (select auth.uid()));

-- Indexes that keep the ownership checks fast
create index if not exists tasks_profile_id_idx on public.tasks (profile_id);
create index if not exists calendars_profile_id_idx on public.calendars (profile_id);
create index if not exists pomodoro_sessions_profile_id_idx on public.pomodoro_sessions (profile_id);
