begin;
\ir 00_test_helpers.sql

select extensions.plan(17);

select extensions.ok(to_regprocedure('public.is_current_admin()') is not null, 'authorization.rpc.exists');
select extensions.is((select provolatile from pg_proc where oid = to_regprocedure('public.is_current_admin()')), 's'::"char", 'authorization.rpc.stable');
select extensions.ok(not (select prosecdef from pg_proc where oid = to_regprocedure('public.is_current_admin()')), 'authorization.rpc.security_invoker');
select extensions.ok((select 'search_path=""' = any(proconfig) from pg_proc where oid = to_regprocedure('public.is_current_admin()')), 'authorization.rpc.empty_search_path');
select extensions.is((select prorettype from pg_proc where oid = to_regprocedure('public.is_current_admin()')), 'boolean'::regtype::oid, 'authorization.rpc.boolean_result');
select extensions.ok(not has_function_privilege('public', 'public.is_current_admin()', 'execute'), 'authorization.rpc.public_denied');
select extensions.ok(not has_function_privilege('anon', 'public.is_current_admin()', 'execute'), 'authorization.rpc.anon_denied');
select extensions.ok(not has_function_privilege('service_role', 'public.is_current_admin()', 'execute'), 'authorization.rpc.service_role_denied');
select extensions.ok(has_function_privilege('authenticated', 'public.is_current_admin()', 'execute'), 'authorization.rpc.authenticated_allowed');

select tests.create_auth_user('80000000-0000-4000-8000-000000000001', 'admin-rpc@foundation.local', 'admin');
select tests.create_auth_session('81000000-0000-4000-8000-000000000001', '80000000-0000-4000-8000-000000000001');
select tests.create_auth_user('80000000-0000-4000-8000-000000000002', 'member-rpc@foundation.local');
select tests.create_auth_session('81000000-0000-4000-8000-000000000002', '80000000-0000-4000-8000-000000000002');
select tests.create_auth_user('80000000-0000-4000-8000-000000000003', 'metadata-rpc@foundation.local', null, 'admin');
select tests.create_auth_session('81000000-0000-4000-8000-000000000003', '80000000-0000-4000-8000-000000000003');
select tests.create_auth_user('80000000-0000-4000-8000-000000000004', 'owner-rpc@foundation.local', 'admin');
select tests.create_auth_session('81000000-0000-4000-8000-000000000004', '80000000-0000-4000-8000-000000000004');
select tests.create_auth_user('80000000-0000-4000-8000-000000000005', 'expired-rpc@foundation.local', 'admin');
select tests.create_auth_session('81000000-0000-4000-8000-000000000005', '80000000-0000-4000-8000-000000000005');
update auth.sessions set not_after = clock_timestamp() - interval '1 minute' where id = '81000000-0000-4000-8000-000000000005';
select tests.create_auth_user('80000000-0000-4000-8000-000000000006', 'revoked-rpc@foundation.local', 'admin');
select tests.create_auth_session('81000000-0000-4000-8000-000000000006', '80000000-0000-4000-8000-000000000006');
delete from auth.sessions where id = '81000000-0000-4000-8000-000000000006';

select tests.set_request_context('authenticated', '80000000-0000-4000-8000-000000000001', '81000000-0000-4000-8000-000000000001', 'admin');
select extensions.is(public.is_current_admin(), true, 'authorization.rpc.current_admin_true');
reset role;

update auth.users set raw_app_meta_data = '{}'::jsonb where id = '80000000-0000-4000-8000-000000000001';
select tests.set_request_context('authenticated', '80000000-0000-4000-8000-000000000001', '81000000-0000-4000-8000-000000000001', 'admin');
select extensions.is(public.is_current_admin(), false, 'authorization.rpc.removed_role_overrides_stale_claim');
reset role;

select tests.set_request_context('authenticated', '80000000-0000-4000-8000-000000000002', '81000000-0000-4000-8000-000000000002');
select extensions.is(public.is_current_admin(), false, 'authorization.rpc.non_admin_false');
reset role;

select tests.set_request_context('authenticated', '80000000-0000-4000-8000-000000000003', '81000000-0000-4000-8000-000000000003', null, 'admin');
select extensions.is(public.is_current_admin(), false, 'authorization.rpc.user_metadata_ignored');
reset role;

select tests.set_request_context('authenticated', '80000000-0000-4000-8000-000000000001', '81000000-0000-4000-8000-000000000004', 'admin');
select extensions.is(public.is_current_admin(), false, 'authorization.rpc.wrong_owner_false');
reset role;

select tests.set_request_context('authenticated', '80000000-0000-4000-8000-000000000005', '81000000-0000-4000-8000-000000000005', 'admin');
select extensions.is(public.is_current_admin(), false, 'authorization.rpc.expired_false');
reset role;

select tests.set_request_context('authenticated', '80000000-0000-4000-8000-000000000006', '81000000-0000-4000-8000-000000000006', 'admin');
select extensions.is(public.is_current_admin(), false, 'authorization.rpc.revoked_false');
reset role;

set local role anon;
select extensions.throws_ok(
  $$select public.is_current_admin()$$,
  '42501', null, 'authorization.rpc.anon_call_rejected'
);
reset role;

select * from extensions.finish();
rollback;
