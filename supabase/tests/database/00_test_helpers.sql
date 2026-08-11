create extension if not exists pgtap with schema extensions;

create schema if not exists tests;
revoke all on schema tests from public, anon, authenticated;

create or replace function tests.set_request_context(
  database_role text,
  user_id uuid default null,
  session_id uuid default null,
  app_role text default null,
  user_metadata_role text default null
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  claims jsonb;
begin
  claims := jsonb_strip_nulls(jsonb_build_object(
    'role', database_role,
    'sub', user_id,
    'session_id', session_id,
    'app_metadata', case when app_role is null then null else jsonb_build_object('role', app_role) end,
    'user_metadata', case when user_metadata_role is null then null else jsonb_build_object('role', user_metadata_role) end
  ));

  perform set_config('request.jwt.claims', claims::text, true);
  execute format('set local role %I', database_role);
end;
$$;

create or replace function tests.reset_request_context()
returns void
language plpgsql
set search_path = ''
as $$
begin
  reset role;
  perform set_config('request.jwt.claims', '{}', true);
end;
$$;

create or replace function tests.create_auth_user(
  user_id uuid,
  email_address text,
  app_role text default null,
  user_metadata_role text default null
)
returns void
language sql
set search_path = ''
as $$
  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    is_sso_user,
    is_anonymous
  )
  values (
    '00000000-0000-0000-0000-000000000000',
    user_id,
    'authenticated',
    'authenticated',
    email_address,
    extensions.crypt('local-foundation-fixture', extensions.gen_salt('bf')),
    clock_timestamp(),
    jsonb_strip_nulls(jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'), 'role', app_role)),
    jsonb_strip_nulls(jsonb_build_object('role', user_metadata_role)),
    clock_timestamp(),
    clock_timestamp(),
    false,
    false
  );
$$;

create or replace function tests.create_auth_session(
  session_id uuid,
  user_id uuid
)
returns void
language sql
set search_path = ''
as $$
  insert into auth.sessions (
    id,
    user_id,
    created_at,
    updated_at,
    aal,
    not_after,
    refreshed_at
  )
  values (
    session_id,
    user_id,
    clock_timestamp(),
    clock_timestamp(),
    'aal1',
    clock_timestamp() + interval '1 hour',
    clock_timestamp()
  );
$$;

create or replace function tests.finish_foundation_test()
returns setof text
language plpgsql
set search_path = ''
as $$
begin
  reset role;
  perform set_config('request.jwt.claims', '{}', true);
  return query select * from extensions.finish();
end;
$$;

create or replace function tests.mutation_is_blocked(database_role text, statement text)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  affected_rows integer;
begin
  execute format('set local role %I', database_role);
  begin
    execute statement;
    get diagnostics affected_rows = row_count;
    reset role;
    return affected_rows = 0;
  exception
    when insufficient_privilege or insufficient_resources then
      reset role;
      return true;
    when check_violation or unique_violation then
      reset role;
      return false;
  end;
end;
$$;
