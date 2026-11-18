-- Strict access model for the Turgenev House digital passport.
-- Run once in Supabase SQL Editor AFTER all previous migrations.
-- The four role profiles are now UI previews only. Only profiles.role='admin' can read/write private data.

begin;

create or replace function public.pcc_is_site_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid() and p.role = 'admin'
  );
$$;

revoke all on function public.pcc_is_site_admin() from public, anon;
grant execute on function public.pcc_is_site_admin() to authenticated;

-- Keep legacy helper names safe in case an older policy/function still calls them.
create or replace function public.app_is_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select public.pcc_is_site_admin(); $$;
create or replace function public.app_can_manage_work()
returns boolean language sql stable security definer set search_path = public
as $$ select public.pcc_is_site_admin(); $$;
create or replace function public.can_create_project_task()
returns boolean language sql stable security definer set search_path = public
as $$ select public.pcc_is_site_admin(); $$;
create or replace function public.can_manage_task(target_task uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select public.pcc_is_site_admin(); $$;

revoke all on function public.app_is_admin() from public, anon;
revoke all on function public.app_can_manage_work() from public, anon;
revoke all on function public.can_create_project_task() from public, anon;
revoke all on function public.can_manage_task(uuid) from public, anon;
grant execute on function public.app_is_admin() to authenticated;
grant execute on function public.app_can_manage_work() to authenticated;
grant execute on function public.can_create_project_task() to authenticated;
grant execute on function public.can_manage_task(uuid) to authenticated;
revoke all on function public.can_manage_team(uuid) from public, anon;
revoke all on function public.pcc_has_any_role(text[]) from public, anon, authenticated;

-- Remove every older policy on these application tables to avoid permissive-policy OR behaviour.
do $$
declare r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname='public'
      and tablename = any(array[
        'profiles','project_settings','teams','members','tasks','task_assignees','issues','activity_log',
        'building_systems','building_issues','building_measurements','building_documents'
      ])
  loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- Enable RLS and remove direct anonymous privileges on all non-public project data.
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','project_settings','teams','members','tasks','task_assignees','issues','activity_log',
    'building_systems','building_issues','building_measurements','building_documents'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from public, anon', t);
    execute format('revoke all on table public.%I from authenticated', t);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', t);
  end loop;
end $$;

-- A signed-in admin can read/update their own profile; only an admin can manage profiles.
create policy "profiles self read or admin read" on public.profiles
  for select to authenticated
  using (user_id = auth.uid() or public.pcc_is_site_admin());
create policy "profiles admin manage" on public.profiles
  for all to authenticated
  using (public.pcc_is_site_admin())
  with check (public.pcc_is_site_admin());

-- All operational/project tables are private and editable only by a real admin account.
create policy "project settings admin only" on public.project_settings
  for all to authenticated using (public.pcc_is_site_admin()) with check (public.pcc_is_site_admin());
create policy "teams admin only" on public.teams
  for all to authenticated using (public.pcc_is_site_admin()) with check (public.pcc_is_site_admin());
create policy "members admin only" on public.members
  for all to authenticated using (public.pcc_is_site_admin()) with check (public.pcc_is_site_admin());
create policy "tasks admin only" on public.tasks
  for all to authenticated using (public.pcc_is_site_admin()) with check (public.pcc_is_site_admin());
create policy "task assignees admin only" on public.task_assignees
  for all to authenticated using (public.pcc_is_site_admin()) with check (public.pcc_is_site_admin());
create policy "project issues admin only" on public.issues
  for all to authenticated using (public.pcc_is_site_admin()) with check (public.pcc_is_site_admin());
create policy "activity log admin only" on public.activity_log
  for all to authenticated using (public.pcc_is_site_admin()) with check (public.pcc_is_site_admin());
create policy "building systems admin only" on public.building_systems
  for all to authenticated using (public.pcc_is_site_admin()) with check (public.pcc_is_site_admin());
create policy "building issues admin only" on public.building_issues
  for all to authenticated using (public.pcc_is_site_admin()) with check (public.pcc_is_site_admin());
create policy "building measurements admin only" on public.building_measurements
  for all to authenticated using (public.pcc_is_site_admin()) with check (public.pcc_is_site_admin());
create policy "building documents admin only" on public.building_documents
  for all to authenticated using (public.pcc_is_site_admin()) with check (public.pcc_is_site_admin());

-- Remove old profile-type accounts from login use by the application. Their rows may remain for audit,
-- but the client rejects every signed-in account whose profile role is not exactly 'admin'.

commit;
