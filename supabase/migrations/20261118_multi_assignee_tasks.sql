-- Project Control Center: multi-assignee tasks + point allocation.
-- Apply ONCE in Supabase Dashboard > SQL Editor after the current schema.sql.
-- Existing tasks and single assignees are preserved and migrated into task_assignees.

begin;

-- Keep legacy team_id / assignee_id columns for compatibility with older clients,
-- but the new app uses task_assignees as the source of truth.
alter table public.tasks
  add column if not exists allocation_mode text not null default 'split';

alter table public.tasks
  add column if not exists created_by uuid references auth.users(id) on delete set null;

-- Ensure valid allocation modes (drop first so this migration is re-runnable).
alter table public.tasks drop constraint if exists tasks_allocation_mode_check;
alter table public.tasks
  add constraint tasks_allocation_mode_check
  check (allocation_mode in ('split','full'));

create table if not exists public.task_assignees (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint task_assignees_task_member_unique unique (task_id, member_id)
);

create index if not exists task_assignees_task_id_idx on public.task_assignees(task_id);
create index if not exists task_assignees_member_id_idx on public.task_assignees(member_id);

-- Migrate all existing one-person assignments without duplicating rows.
insert into public.task_assignees (task_id, member_id)
select t.id, t.assignee_id
from public.tasks t
where t.assignee_id is not null
on conflict (task_id, member_id) do nothing;

-- Permission helper: an admin, task creator, or leader of any group represented
-- among this task's assignees can manage the task and its assignment list.
create or replace function public.can_manage_task(target_task uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.app_is_admin()
    or exists (
      select 1
      from public.tasks t
      where t.id = target_task
        and (
          t.created_by = auth.uid()
          or (t.team_id is not null and public.can_manage_team(t.team_id))
          or exists (
            select 1
            from public.task_assignees ta
            join public.members m on m.id = ta.member_id
            where ta.task_id = t.id
              and m.team_id is not null
              and public.can_manage_team(m.team_id)
          )
        )
    );
$$;

create or replace function public.can_create_project_task()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.role in ('admin','leader')
  );
$$;

revoke all on function public.can_manage_task(uuid) from public;
revoke all on function public.can_create_project_task() from public;
grant execute on function public.can_manage_task(uuid) to authenticated;
grant execute on function public.can_create_project_task() to authenticated;

-- Public visitors may read assignment names/relationships; only authenticated
-- users with task-level permission may add/remove them.
alter table public.task_assignees enable row level security;
revoke all on public.task_assignees from anon, authenticated;
grant select on public.task_assignees to anon, authenticated;
grant insert, delete on public.task_assignees to authenticated;

drop policy if exists "public can read task assignees" on public.task_assignees;
drop policy if exists "task collaborators manage assignees" on public.task_assignees;
create policy "public can read task assignees"
  on public.task_assignees for select to anon, authenticated
  using (true);
create policy "task collaborators manage assignees"
  on public.task_assignees for all to authenticated
  using (public.can_manage_task(task_id))
  with check (public.can_manage_task(task_id));

-- Replace old team-pinned task write policy with task collaboration permissions.
drop policy if exists "leaders manage own team tasks" on public.tasks;
drop policy if exists "admins and leaders create tasks" on public.tasks;
drop policy if exists "task collaborators update tasks" on public.tasks;
drop policy if exists "task collaborators delete tasks" on public.tasks;

create policy "admins and leaders create tasks"
  on public.tasks for insert to authenticated
  with check (
    created_by = auth.uid()
    and public.can_create_project_task()
  );

create policy "task collaborators update tasks"
  on public.tasks for update to authenticated
  using (public.can_manage_task(id))
  with check (public.can_manage_task(id));

create policy "task collaborators delete tasks"
  on public.tasks for delete to authenticated
  using (public.can_manage_task(id));

-- Include the new relationship table in Supabase Realtime so all open dashboards
-- receive assignment changes immediately.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'task_assignees'
     ) then
    alter publication supabase_realtime add table public.task_assignees;
  end if;
end $$;

commit;
