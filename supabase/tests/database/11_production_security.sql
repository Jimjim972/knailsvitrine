begin;
\ir 00_test_helpers.sql

select extensions.plan(29);

-- GRANT/Data API is a coarse gate. These assertions deliberately inspect it
-- separately from the row-level decisions exercised below.
select extensions.ok(has_schema_privilege('anon', 'public', 'usage'), 'production_security.grant.anon_public_schema_usage');
select extensions.ok(has_schema_privilege('authenticated', 'public', 'usage'), 'production_security.grant.authenticated_public_schema_usage');
select extensions.is(
  array(
    select (table_name || ':' || privilege_type)::text
    from information_schema.role_table_grants
    where grantee = 'anon'
      and table_schema = 'public'
      and table_name in ('categories_prestations', 'photos_galerie', 'prestations')
    order by 1
  ),
  array[
    'categories_prestations:SELECT',
    'photos_galerie:SELECT',
    'prestations:SELECT'
  ]::text[],
  'production_security.grant.anon_exact_select_surface'
);
select extensions.is(
  array(
    select (table_name || ':' || privilege_type)::text
    from information_schema.role_table_grants
    where grantee = 'authenticated'
      and table_schema = 'public'
      and table_name in ('categories_prestations', 'photos_galerie', 'prestations')
    order by 1
  ),
  array[
    'categories_prestations:DELETE', 'categories_prestations:INSERT', 'categories_prestations:SELECT', 'categories_prestations:UPDATE',
    'photos_galerie:DELETE', 'photos_galerie:INSERT', 'photos_galerie:SELECT', 'photos_galerie:UPDATE',
    'prestations:DELETE', 'prestations:INSERT', 'prestations:SELECT', 'prestations:UPDATE'
  ]::text[],
  'production_security.grant.authenticated_exact_crud_surface'
);
select extensions.is_empty(
  $$select 1 from information_schema.role_table_grants where grantee = 'PUBLIC' and table_schema = 'public' and table_name in ('categories_prestations', 'photos_galerie', 'prestations')$$,
  'production_security.grant.public_role_closed'
);
select extensions.is_empty(
  $$select 1 from information_schema.role_table_grants where grantee = 'service_role' and table_schema = 'public' and table_name in ('categories_prestations', 'photos_galerie', 'prestations')$$,
  'production_security.grant.service_role_not_used_as_bypass'
);
select extensions.is(
  array(
    select relname::text
    from pg_class
    where oid in ('public.categories_prestations'::regclass, 'public.photos_galerie'::regclass, 'public.prestations'::regclass)
      and relrowsecurity
    order by 1
  ),
  array['categories_prestations', 'photos_galerie', 'prestations']::text[],
  'production_security.rls.enabled_on_all_exposed_tables'
);
select extensions.is(
  array(
    select distinct tablename::text
    from pg_policies
    where schemaname = 'public'
      and tablename in ('categories_prestations', 'photos_galerie', 'prestations')
    order by 1
  ),
  array['categories_prestations', 'photos_galerie', 'prestations']::text[],
  'production_security.rls.explicit_policies_on_all_exposed_tables'
);
select extensions.ok(not has_function_privilege('anon', 'public.is_current_admin()', 'execute'), 'production_security.grant.admin_rpc_anon_denied');
select extensions.ok(has_function_privilege('authenticated', 'public.is_current_admin()', 'execute'), 'production_security.grant.admin_rpc_authenticated_gate');

select tests.create_auth_user('91000000-0000-4000-8000-000000000001', 'production-security-admin@foundation.local', 'admin');
select tests.create_auth_session('92000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000001');
select tests.create_auth_user('91000000-0000-4000-8000-000000000002', 'production-security-member@foundation.local');
select tests.create_auth_session('92000000-0000-4000-8000-000000000002', '91000000-0000-4000-8000-000000000002');
select tests.create_auth_user('91000000-0000-4000-8000-000000000003', 'production-security-spoof@foundation.local', null, 'admin');
select tests.create_auth_session('92000000-0000-4000-8000-000000000003', '91000000-0000-4000-8000-000000000003');
select tests.create_auth_user('91000000-0000-4000-8000-000000000004', 'production-security-no-session@foundation.local', 'admin');
select tests.create_auth_user('91000000-0000-4000-8000-000000000005', 'production-security-revoked@foundation.local', 'admin');
select tests.create_auth_session('92000000-0000-4000-8000-000000000005', '91000000-0000-4000-8000-000000000005');
select tests.create_auth_user('91000000-0000-4000-8000-000000000006', 'production-security-downgraded@foundation.local', 'admin');
select tests.create_auth_session('92000000-0000-4000-8000-000000000006', '91000000-0000-4000-8000-000000000006');

insert into public.prestations (id, nom, description, categorie, prix, type_prix, actif)
values
  ('93000000-0000-4000-8000-000000000001', 'Production active', 'D', 'soins_corps', 1, 'fixed', true),
  ('93000000-0000-4000-8000-000000000002', 'Production masquée', 'D', 'soins_corps', 2, 'fixed', false);

insert into public.photos_galerie (id, storage_path, alt_text, variante_affichage, width, height, mime_type, size_bytes, actif)
values
  ('94000000-0000-4000-8000-000000000001', 'photos/95000000-0000-4000-8000-000000000001.webp', 'Production active', 'small', 1, 1, 'image/webp', 1, true),
  ('94000000-0000-4000-8000-000000000002', 'photos/95000000-0000-4000-8000-000000000002.webp', 'Production masquée', 'small', 1, 1, 'image/webp', 1, false);

select tests.set_request_context('anon');
select extensions.is((select count(*) from public.prestations where id = '93000000-0000-4000-8000-000000000001'), 1::bigint, 'production_security.rls.anon_active_service_visible');
select extensions.is_empty($$select id from public.prestations where id = '93000000-0000-4000-8000-000000000002'$$, 'production_security.rls.anon_hidden_service_masked');
select extensions.is((select count(*) from public.photos_galerie where id = '94000000-0000-4000-8000-000000000001'), 1::bigint, 'production_security.rls.anon_active_photo_visible');
select extensions.is_empty($$select id from public.photos_galerie where id = '94000000-0000-4000-8000-000000000002'$$, 'production_security.rls.anon_hidden_photo_masked');

reset role;
select tests.set_request_context('authenticated', '91000000-0000-4000-8000-000000000002', '92000000-0000-4000-8000-000000000002');
select extensions.is((select count(*) from public.prestations where id = '93000000-0000-4000-8000-000000000001'), 1::bigint, 'production_security.rls.member_active_service_visible');
select extensions.is_empty($$select id from public.prestations where id = '93000000-0000-4000-8000-000000000002'$$, 'production_security.rls.member_hidden_service_masked');
select extensions.ok(has_table_privilege('authenticated', 'public.prestations', 'update'), 'production_security.grant.member_has_coarse_update_grant');
reset role;
select extensions.ok(
  tests.mutation_is_blocked('authenticated', $$update public.prestations set nom = 'RLS ne doit pas autoriser' where id = '93000000-0000-4000-8000-000000000001'$$),
  'production_security.rls.member_update_blocked_despite_grant'
);
select extensions.is((select nom from public.prestations where id = '93000000-0000-4000-8000-000000000001'), 'Production active', 'production_security.rls.member_update_no_residue');

select tests.set_request_context('authenticated', '91000000-0000-4000-8000-000000000001', '92000000-0000-4000-8000-000000000001', 'admin');
select extensions.is(public.is_current_admin(), true, 'production_security.authority.current_admin_true');
select extensions.is((select count(*) from public.prestations where id = '93000000-0000-4000-8000-000000000002'), 1::bigint, 'production_security.rls.admin_hidden_service_visible');
select extensions.is((select count(*) from public.photos_galerie where id = '94000000-0000-4000-8000-000000000002'), 1::bigint, 'production_security.rls.admin_hidden_photo_visible');
select extensions.lives_ok($$update public.prestations set nom = 'Production active administrée' where id = '93000000-0000-4000-8000-000000000001'$$, 'production_security.rls.admin_update_allowed');
select extensions.is((select nom from public.prestations where id = '93000000-0000-4000-8000-000000000001'), 'Production active administrée', 'production_security.rls.admin_update_persisted');

reset role;
select tests.set_request_context('authenticated', '91000000-0000-4000-8000-000000000003', '92000000-0000-4000-8000-000000000003', null, 'admin');
select extensions.is(public.is_current_admin(), false, 'production_security.authority.user_metadata_spoof_false');

reset role;
select tests.set_request_context('authenticated', '91000000-0000-4000-8000-000000000004', null, 'admin');
select extensions.is(public.is_current_admin(), false, 'production_security.authority.missing_session_false');

reset role;
select tests.set_request_context('authenticated', '91000000-0000-4000-8000-000000000004', '92000000-0000-4000-8000-000000000002', 'admin');
select extensions.is(public.is_current_admin(), false, 'production_security.authority.foreign_session_false');

reset role;
update auth.users
set raw_app_meta_data = jsonb_set(coalesce(raw_app_meta_data, '{}'::jsonb), '{role}', '"member"'::jsonb, true)
where id = '91000000-0000-4000-8000-000000000006';
select tests.set_request_context('authenticated', '91000000-0000-4000-8000-000000000006', '92000000-0000-4000-8000-000000000006', 'admin');
select extensions.is(public.is_current_admin(), false, 'production_security.authority.database_downgrade_beats_stale_claim');

reset role;
delete from auth.sessions where id = '92000000-0000-4000-8000-000000000005';
select tests.set_request_context('authenticated', '91000000-0000-4000-8000-000000000005', '92000000-0000-4000-8000-000000000005', 'admin');
select extensions.is(public.is_current_admin(), false, 'production_security.authority.deleted_session_false');

reset role;
select * from extensions.finish();
rollback;
