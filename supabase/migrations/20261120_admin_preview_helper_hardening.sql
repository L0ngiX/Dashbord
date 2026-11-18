-- Additional hardening for the admin-only application model.
-- Run after 20261119_admin_only_and_role_previews.sql.
-- Removes execute access to legacy profile/team helper functions that are no longer used by the UI.

begin;

revoke all on function public.can_manage_team(uuid) from public, anon, authenticated;
revoke all on function public.pcc_has_any_role(text[]) from public, anon, authenticated;

-- The client may call only the admin check and legacy wrappers that now return true for admins only.
grant execute on function public.pcc_is_site_admin() to authenticated;
grant execute on function public.app_is_admin() to authenticated;
grant execute on function public.app_can_manage_work() to authenticated;
grant execute on function public.can_create_project_task() to authenticated;
grant execute on function public.can_manage_task(uuid) to authenticated;

commit;
