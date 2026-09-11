-- 1. Drop trigger and handler
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- 2. Drop application tables (respecting foreign key order)
drop table if exists public.calendar cascade;
drop table if exists public.pomodoro_sessions cascade;
drop table if exists public.tasks cascade;
drop table if exists public.profiles cascade;

-- 3. Drop mock auth dependencies (if fully tearing down local container)
drop table if exists auth.users cascade;
drop function if exists auth.uid();
drop schema if exists auth cascade;