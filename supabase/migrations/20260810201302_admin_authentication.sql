create or replace function private.is_current_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    auth.uid() is not null
    and nullif(auth.jwt() ->> 'session_id', '') is not null
    and exists (
      select 1
      from auth.users
      join auth.sessions on auth.sessions.user_id = auth.users.id
      where auth.users.id = (select auth.uid())
        and coalesce(auth.users.raw_app_meta_data ->> 'role', '') = 'admin'
        and auth.sessions.id = (auth.jwt() ->> 'session_id')::uuid
        and (auth.sessions.not_after is null or auth.sessions.not_after > now())
    );
$$;

create or replace function public.is_current_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.is_current_admin();
$$;

revoke all on function public.is_current_admin() from public, anon, authenticated, service_role;
grant execute on function public.is_current_admin() to authenticated;
