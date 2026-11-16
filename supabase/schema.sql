-- Project Control Center: schema + basic public-read / authenticated-write security.
-- Run this file in Supabase Dashboard > SQL Editor.
-- No service_role key belongs in the browser config.

create extension if not exists pgcrypto;

create table if not exists public.project_settings (
  id integer primary key check (id = 1),
  title text not null default 'Project Alpha',
  subtitle text not null default 'Единая панель прогресса, команд и результатов',
  progress_mode text not null default 'auto' check (progress_mode in ('auto','manual')),
  manual_progress integer not null default 0 check (manual_progress between 0 and 100),
  updated_at timestamptz not null default now()
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null default '#b5ef23',
  progress_mode text not null default 'auto' check (progress_mode in ('auto','manual')),
  manual_progress integer not null default 0 check (manual_progress between 0 and 100),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  team_id uuid references public.teams(id) on delete set null,
  role text not null default 'Member' check (role in ('Leader','Member')),
  progress_mode text not null default 'auto' check (progress_mode in ('auto','manual')),
  manual_progress integer not null default 0 check (manual_progress between 0 and 100),
  created_at timestamptz not null default now()
);

alter table public.members add column if not exists progress_mode text not null default 'auto' check (progress_mode in ('auto','manual'));
alter table public.members add column if not exists manual_progress integer not null default 0 check (manual_progress between 0 and 100);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  team_id uuid references public.teams(id) on delete set null,
  assignee_id uuid references public.members(id) on delete set null,
  due_date date,
  status text not null default 'To Do' check (status in ('To Do','In Progress','Done')),
  weight numeric(8,2) not null default 1 check (weight > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.issues (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  team_id uuid references public.teams(id) on delete set null,
  priority text not null default 'Medium' check (priority in ('Low','Medium','High')),
  status text not null default 'Open' check (status in ('Open','In Progress','Resolved')),
  resolution text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role text not null default 'viewer' check (role in ('admin','leader','member','viewer')),
  team_id uuid references public.teams(id) on delete set null,
  member_id uuid references public.members(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  actor_name text not null default 'Участник',
  action text not null,
  target text not null,
  created_at timestamptz not null default now()
);

insert into public.project_settings (id) values (1) on conflict (id) do nothing;

-- Helper functions read profiles as their owner, preventing RLS recursion.
create or replace function public.app_is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid() and p.role = 'admin'
  );
$$;

create or replace function public.can_manage_team(target_team uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and (p.role = 'admin' or (p.role = 'leader' and p.team_id = target_team))
  );
$$;

alter table public.project_settings enable row level security;
alter table public.teams enable row level security;
alter table public.members enable row level security;
alter table public.tasks enable row level security;
alter table public.issues enable row level security;
alter table public.profiles enable row level security;
alter table public.activity_log enable row level security;

-- Explicit grants: anonymous visitors can read project information, never write it.
revoke all on public.project_settings, public.teams, public.members, public.tasks, public.issues, public.activity_log from anon, authenticated;
revoke all on public.profiles from anon, authenticated;
grant select on public.project_settings, public.teams, public.members, public.tasks, public.issues, public.activity_log to anon, authenticated;
grant insert, update, delete on public.project_settings, public.teams, public.members, public.tasks, public.issues to authenticated;
grant insert on public.activity_log to authenticated;
grant select on public.profiles to authenticated;
grant execute on function public.app_is_admin() to authenticated;
grant execute on function public.can_manage_team(uuid) to authenticated;

-- Remove previous policies when re-running this script.
drop policy if exists "public can read project settings" on public.project_settings;
drop policy if exists "admins manage project settings" on public.project_settings;
drop policy if exists "public can read teams" on public.teams;
drop policy if exists "admins manage teams" on public.teams;
drop policy if exists "public can read members" on public.members;
drop policy if exists "leaders manage own team members" on public.members;
drop policy if exists "public can read tasks" on public.tasks;
drop policy if exists "leaders manage own team tasks" on public.tasks;
drop policy if exists "public can read issues" on public.issues;
drop policy if exists "leaders manage own team issues" on public.issues;
drop policy if exists "users read own profile admins read all" on public.profiles;
drop policy if exists "admins manage profiles" on public.profiles;
drop policy if exists "public can read activity" on public.activity_log;
drop policy if exists "authenticated users add activity" on public.activity_log;
drop policy if exists "admins delete activity" on public.activity_log;

create policy "public can read project settings" on public.project_settings for select to anon, authenticated using (true);
create policy "admins manage project settings" on public.project_settings for all to authenticated using (public.app_is_admin()) with check (public.app_is_admin());

create policy "public can read teams" on public.teams for select to anon, authenticated using (true);
create policy "admins manage teams" on public.teams for all to authenticated using (public.app_is_admin()) with check (public.app_is_admin());

create policy "public can read members" on public.members for select to anon, authenticated using (true);
create policy "leaders manage own team members" on public.members for all to authenticated using (public.can_manage_team(team_id)) with check (public.can_manage_team(team_id));

create policy "public can read tasks" on public.tasks for select to anon, authenticated using (true);
create policy "leaders manage own team tasks" on public.tasks for all to authenticated using (public.can_manage_team(team_id)) with check (public.can_manage_team(team_id));

create policy "public can read issues" on public.issues for select to anon, authenticated using (true);
create policy "leaders manage own team issues" on public.issues for all to authenticated using (public.can_manage_team(team_id)) with check (public.can_manage_team(team_id));

create policy "users read own profile admins read all" on public.profiles for select to authenticated using (user_id = auth.uid() or public.app_is_admin());
create policy "admins manage profiles" on public.profiles for all to authenticated using (public.app_is_admin()) with check (public.app_is_admin());

create policy "public can read activity" on public.activity_log for select to anon, authenticated using (true);
create policy "authenticated users add activity" on public.activity_log for insert to authenticated with check (auth.uid() is not null);
create policy "admins delete activity" on public.activity_log for delete to authenticated using (public.app_is_admin());

-- Note: this starter schema deliberately makes the dashboard public-read, while writes
-- require a signed-in admin or leader assigned to the relevant team. Add stricter policies
-- or column-level grants before storing sensitive or personally identifiable information.


-- Enable Supabase Realtime for the public project dashboard.
-- This block is safe to re-run and skips tables already in the publication.
do $$
declare
  tbl text;
begin
  foreach tbl in array array['project_settings','teams','members','tasks','issues','activity_log'] loop
    if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
      and not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = tbl
      ) then
      execute format('alter publication supabase_realtime add table public.%I', tbl);
    end if;
  end loop;
end $$;
