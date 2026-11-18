-- Project Control Center: four fixed profile types and role-based permissions.
-- Run AFTER the existing schema.sql and multi-assignee migration.
-- Create the four Auth users first (see SETUP_ROLES_RU.md), then run this script.

begin;

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('admin','leader','member','viewer','visitor','owner','maintenance','design'));

-- Owner is the property owner and has full administrative control.
create or replace function public.app_is_admin()
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.profiles p
    where p.user_id = auth.uid() and p.role in ('admin','owner'));
$$;

-- Keep team roster management restricted to owner/admin and legacy team leaders.
create or replace function public.can_manage_team(target_team uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.profiles p
    where p.user_id = auth.uid()
      and (p.role in ('admin','owner') or (p.role='leader' and p.team_id=target_team)));
$$;

-- Maintenance and Design Studio can manage operational/project work,
-- but cannot administer project settings, groups, members, or user profiles.
create or replace function public.app_can_manage_work()
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.profiles p
    where p.user_id = auth.uid() and p.role in ('admin','owner','maintenance','design'));
$$;

create or replace function public.can_create_project_task()
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.profiles p
    where p.user_id = auth.uid() and p.role in ('admin','owner','leader','maintenance','design'));
$$;

create or replace function public.can_manage_task(target_task uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select public.app_can_manage_work()
    or exists (
      select 1 from public.tasks t
      where t.id=target_task and (
        t.created_by=auth.uid()
        or (t.team_id is not null and public.can_manage_team(t.team_id))
        or exists (
          select 1 from public.task_assignees ta
          join public.members m on m.id=ta.member_id
          where ta.task_id=t.id and m.team_id is not null
            and public.can_manage_team(m.team_id)
        )
      )
    );
$$;

revoke all on function public.app_can_manage_work() from public;
revoke all on function public.can_manage_task(uuid) from public;
revoke all on function public.can_create_project_task() from public;
grant execute on function public.app_can_manage_work() to authenticated;
grant execute on function public.can_manage_task(uuid) to authenticated;
grant execute on function public.can_create_project_task() to authenticated;

-- Issues: owner/admin and the two professional profiles can create/update/delete.
drop policy if exists "leaders manage own team issues" on public.issues;
drop policy if exists "work profiles manage issues" on public.issues;
create policy "work profiles manage issues" on public.issues for all to authenticated
  using (public.app_can_manage_work() or public.can_manage_team(team_id))
  with check (public.app_can_manage_work() or public.can_manage_team(team_id));

-- Upsert profile records for the four fixed username aliases.
-- These Auth users must already exist. Passwords are NOT stored in this table.
insert into public.profiles (user_id, display_name, role)
select u.id,
  case u.email
    when 'visitor@pcc-login.example.com' then 'Посетитель'
    when 'owner@pcc-login.example.com' then 'Собственник'
    when 'maintenance@pcc-login.example.com' then 'Эксплуатация и ремонт'
    when 'design@pcc-login.example.com' then 'Архитектура и дизайн'
  end,
  case u.email
    when 'visitor@pcc-login.example.com' then 'visitor'
    when 'owner@pcc-login.example.com' then 'owner'
    when 'maintenance@pcc-login.example.com' then 'maintenance'
    when 'design@pcc-login.example.com' then 'design'
  end
from auth.users u
where u.email in (
  'visitor@pcc-login.example.com',
  'owner@pcc-login.example.com',
  'maintenance@pcc-login.example.com',
  'design@pcc-login.example.com'
)
on conflict (user_id) do update set
  display_name=excluded.display_name,
  role=excluded.role;

commit;
