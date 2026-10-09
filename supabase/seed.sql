insert into
auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
values
(
  '00000000-0000-0000-0000-000000000000',
  'a1111111-1111-1111-1111-111111111111',
  'authenticated',
  'authenticated',
  'alex@example.com',
  crypt('password123', gen_salt('bf')),
  current_timestamp,
  current_timestamp,
  current_timestamp,
  '{"provider":"email","providers":["email"]}',
  '{}',
  current_timestamp,
  current_timestamp,
  '',
  '',
  '',
  ''
);

insert into
auth.identities (
  id,
  user_id,
  provider_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
values
(
  'a1111111-1111-1111-1111-111111111111',
  'a1111111-1111-1111-1111-111111111111',
  'a1111111-1111-1111-1111-111111111111',
  format('{"sub":"%s","email":"%s"}', 'a1111111-1111-1111-1111-111111111111', 'alex@example.com')::jsonb,
  'email',
  current_timestamp,
  current_timestamp,
  current_timestamp
);

insert into public.profiles (id) values
('a1111111-1111-1111-1111-111111111111');

insert into public.calendars (profile_id, name, description, ical_url) values
('a1111111-1111-1111-1111-111111111111', 'Work Calendar', 'My work meetings', 'https://example.com/work.ics'),
('a1111111-1111-1111-1111-111111111111', 'Personal', null, 'https://example.com/personal.ics');

insert into public.tasks (profile_id, calendar_id, external_id, title, description, is_complete, due_date) values
('a1111111-1111-1111-1111-111111111111', null, null, 'Setup Supabase local dev', 'Configure docker containers and run migration scripts.', true, now() - interval '1 day'),
('a1111111-1111-1111-1111-111111111111', 1, 'uid12345@example.com', 'Implement iCal parser', 'Fetch and parse remote .ics feeds for study sessions.', false, now() + interval '2 days');
