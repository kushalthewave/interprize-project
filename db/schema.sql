-- Beat The Hazard — database schema.
--
-- Run this once in the Supabase SQL editor (Database → SQL editor → New query).
-- It creates the tables, turns on row level security, and writes the policies
-- that decide who can read what.
--
-- The rules in one sentence: a trainee can write and read their own rows and
-- nothing else; an admin can read everything and write nothing. The game ships
-- the public "anon" key, so these policies are the only thing protecting the
-- data: they are enforced by the database, not by the page.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Accounts
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text        not null default '',
  email       text,
  role        text        not null default 'trainee'
                check (role in ('trainee', 'admin')),
  avatar      text,
  created_at  timestamptz not null default now(),
  last_seen   timestamptz
);

comment on table public.profiles is
  'One row per account. Created automatically when someone signs up.';

-- A new sign up gets a profile without the game having to ask for one.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Sign ins
--
-- Deliberately coarse: a label like "Windows, Chrome" and a timestamp, never
-- a fingerprint or an IP address. Enough for "where have I signed in from",
-- not enough to track a person.
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.login_events (
  id        bigserial   primary key,
  user_id   uuid        not null references public.profiles (id) on delete cascade,
  device    text,                      -- 'Windows, Chrome'
  at        timestamptz not null default now()
);

create index if not exists login_events_user_at
  on public.login_events (user_id, at desc);

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Finished rounds
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.sessions (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null references public.profiles (id) on delete cascade,
  -- The id the browser gave this round, so a retry after a dropped
  -- connection cannot store the same round twice.
  client_round_id  text        not null,
  mode             text        not null check (mode in ('train', 'test')),
  environment      text        not null,
  difficulty       text        not null check (difficulty in ('simple', 'mid', 'hard', 'train')),
  score            integer     not null default 0,
  rank             text,
  correct          integer     not null default 0,
  wrong            integer     not null default 0,
  total_hazards    integer     not null default 0,
  accuracy         numeric(5, 2),
  best_combo       integer     not null default 0,
  avg_reaction_s   numeric(6, 2),
  duration_s       numeric(8, 2),
  app_version      text,
  played_at        timestamptz not null default now(),
  unique (user_id, client_round_id)
);

create index if not exists sessions_user_played
  on public.sessions (user_id, played_at desc);

-- ─────────────────────────────────────────────────────────────────────────
-- 4. What happened to each hazard in that round
--
-- This is the table a safety officer actually wants: it answers "which
-- hazards does everybody miss".
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.session_hazards (
  id          bigserial primary key,
  session_id  uuid      not null references public.sessions (id) on delete cascade,
  user_id     uuid      not null references public.profiles (id) on delete cascade,
  hazard_id   text      not null,
  category    text,
  severity    text check (severity in ('major', 'minor')),
  status      text      not null check (status in ('found', 'missed', 'wrong_flag')),
  seconds     numeric(6, 2),
  points      integer   not null default 0
);

create index if not exists session_hazards_session on public.session_hazards (session_id);
create index if not exists session_hazards_hazard  on public.session_hazards (hazard_id, status);

-- ─────────────────────────────────────────────────────────────────────────
-- 5. Who is an admin
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- 6. Row level security
-- ─────────────────────────────────────────────────────────────────────────
alter table public.profiles       enable row level security;
alter table public.login_events   enable row level security;
alter table public.sessions       enable row level security;
alter table public.session_hazards enable row level security;

-- Profiles: read and update your own; an admin reads all.
drop policy if exists profiles_select_own   on public.profiles;
drop policy if exists profiles_select_admin on public.profiles;
drop policy if exists profiles_update_own   on public.profiles;
drop policy if exists profiles_delete_own   on public.profiles;

create policy profiles_select_own on public.profiles
  for select using (id = auth.uid());
create policy profiles_select_admin on public.profiles
  for select using (public.is_admin());
create policy profiles_update_own on public.profiles
  for update using (id = auth.uid())
  -- A trainee cannot promote themselves: the role has to stay what it was.
  with check (id = auth.uid() and role = (select role from public.profiles p where p.id = auth.uid()));
create policy profiles_delete_own on public.profiles
  for delete using (id = auth.uid());

-- Sign ins: write and read your own; an admin reads all.
drop policy if exists login_insert_own  on public.login_events;
drop policy if exists login_select_own  on public.login_events;
drop policy if exists login_select_admin on public.login_events;

create policy login_insert_own on public.login_events
  for insert with check (user_id = auth.uid());
create policy login_select_own on public.login_events
  for select using (user_id = auth.uid());
create policy login_select_admin on public.login_events
  for select using (public.is_admin());

-- Rounds: write and read your own, delete your own; an admin reads all.
drop policy if exists sessions_insert_own  on public.sessions;
drop policy if exists sessions_select_own  on public.sessions;
drop policy if exists sessions_select_admin on public.sessions;
drop policy if exists sessions_delete_own  on public.sessions;

create policy sessions_insert_own on public.sessions
  for insert with check (user_id = auth.uid());
create policy sessions_select_own on public.sessions
  for select using (user_id = auth.uid());
create policy sessions_select_admin on public.sessions
  for select using (public.is_admin());
create policy sessions_delete_own on public.sessions
  for delete using (user_id = auth.uid());

-- Per hazard rows follow their round.
drop policy if exists hazards_insert_own  on public.session_hazards;
drop policy if exists hazards_select_own  on public.session_hazards;
drop policy if exists hazards_select_admin on public.session_hazards;
drop policy if exists hazards_delete_own  on public.session_hazards;

create policy hazards_insert_own on public.session_hazards
  for insert with check (user_id = auth.uid());
create policy hazards_select_own on public.session_hazards
  for select using (user_id = auth.uid());
create policy hazards_select_admin on public.session_hazards
  for select using (public.is_admin());
create policy hazards_delete_own on public.session_hazards
  for delete using (user_id = auth.uid());

-- Nobody can change a round after it is stored: there is no update policy on
-- sessions or session_hazards, so a stored result cannot be edited, only
-- deleted by the person it belongs to.

-- ─────────────────────────────────────────────────────────────────────────
-- 7. Views for the admin page
-- ─────────────────────────────────────────────────────────────────────────
create or replace view public.admin_overview as
  select
    p.id,
    p.name,
    p.email,
    p.role,
    p.created_at,
    p.last_seen,
    count(distinct s.id)                            as rounds_played,
    coalesce(max(s.score), 0)                       as best_score,
    coalesce(round(avg(s.score)), 0)                as average_score,
    max(s.played_at)                                as last_played,
    count(distinct l.id)                            as sign_ins
  from public.profiles p
  left join public.sessions s     on s.user_id = p.id
  left join public.login_events l on l.user_id = p.id
  group by p.id;

create or replace view public.hazard_misses as
  select
    hazard_id,
    category,
    severity,
    count(*) filter (where status = 'missed')     as missed,
    count(*) filter (where status = 'found')      as found,
    count(*) filter (where status = 'wrong_flag') as wrongly_flagged,
    round(
      100.0 * count(*) filter (where status = 'missed')
      / nullif(count(*) filter (where status in ('found', 'missed')), 0)
    , 1)                                          as miss_rate_percent
  from public.session_hazards
  group by hazard_id, category, severity;

-- Views run with the caller's permissions, so the policies above still apply:
-- a trainee sees only their own rows through them, an admin sees everyone.
alter view public.admin_overview set (security_invoker = on);
alter view public.hazard_misses  set (security_invoker = on);

-- ─────────────────────────────────────────────────────────────────────────
-- 8. After creating the admin user in Authentication → Users, run this once:
--
--   update public.profiles set role = 'admin' where email = 'kushaln717@gmail.com';
--
-- ─────────────────────────────────────────────────────────────────────────
