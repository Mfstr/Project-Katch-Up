insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
values
('00000000-0000-0000-0000-000000000000', 'a1111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'alex@example.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Alex Developer"}'),
('00000000-0000-0000-0000-000000000000', 'b2222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'sarah@example.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Sarah Designer"}');

insert into public.calendars (profile_id, name, description, ical_url) values
('a1111111-1111-1111-1111-111111111111', 'Work Calendar', 'My work meetings', 'https://example.com/work.ics'),
('a1111111-1111-1111-1111-111111111111', 'Personal', null, 'https://example.com/personal.ics');

insert into public.tasks (profile_id, calendar_id, external_id, title, description, is_complete, due_date) values
('a1111111-1111-1111-1111-111111111111', null, null, 'Setup Supabase local dev', 'Configure docker containers and run migration scripts.', true, now() - interval '1 day'),
('a1111111-1111-1111-1111-111111111111', 1, 'uid12345@example.com', 'Implement iCal parser', 'Fetch and parse remote .ics feeds for study sessions.', false, now() + interval '2 days'),
('b2222222-2222-2222-2222-222222222222', null, null, 'Finalize wireframes', 'Design new calendar sync modal in Figma.', true, now() - interval '2 days');

insert into public.pomodoro_sessions (profile_id, session_type, planned_duration_seconds, actual_duration_seconds, tasks_completed, is_interrupted, started_at, completed_at) values
('a1111111-1111-1111-1111-111111111111', 'FOCUS', 1500, 1500, 1, false, now() - interval '2 hours', now() - interval '95 minutes'),
('a1111111-1111-1111-1111-111111111111', 'SHORT_BREAK', 300, 300, 0, false, now() - interval '95 minutes', now() - interval '90 minutes');