begin;
\ir 00_test_helpers.sql

select extensions.plan(29);

select extensions.results_eq(
  $$select tablename from pg_tables where schemaname = 'public' and tablename in ('prestations', 'photos_galerie') order by 1$$,
  $$values ('photos_galerie'::name), ('prestations'::name)$$,
  'internal.inventory.tables'
);
select extensions.results_eq(
  $$select conname from pg_constraint where conrelid = 'public.prestations'::regclass order by 1$$,
  $$values
    ('prestations_badge_check'::name), ('prestations_categorie_fkey'::name), ('prestations_description_length_check'::name),
    ('prestations_duree_minutes_check'::name), ('prestations_image_path_check'::name), ('prestations_nom_length_check'::name),
    ('prestations_ordre_affichage_check'::name), ('prestations_pkey'::name), ('prestations_prix_bounds_check'::name),
    ('prestations_prix_matches_type_check'::name), ('prestations_prix_scale_check'::name), ('prestations_type_prix_check'::name)$$,
  'validation.inventory.prestations_constraints'
);
select extensions.results_eq(
  $$select conname from pg_constraint where conrelid = 'public.photos_galerie'::regclass order by 1$$,
  $$values
    ('photos_galerie_alt_text_length_check'::name), ('photos_galerie_cleanup_storage_path_check'::name),
    ('photos_galerie_file_state_check'::name), ('photos_galerie_height_check'::name), ('photos_galerie_libelle_check'::name),
    ('photos_galerie_lien_externe_https_check'::name), ('photos_galerie_mime_type_check'::name),
    ('photos_galerie_object_missing_check'::name), ('photos_galerie_operation_kind_check'::name),
    ('photos_galerie_operation_payload_check'::name), ('photos_galerie_operation_state_check'::name),
    ('photos_galerie_ordre_affichage_check'::name), ('photos_galerie_pending_dimensions_check'::name),
    ('photos_galerie_pending_storage_path_check'::name), ('photos_galerie_pkey'::name),
    ('photos_galerie_repair_code_check'::name), ('photos_galerie_size_bytes_check'::name),
    ('photos_galerie_storage_mime_match_check'::name), ('photos_galerie_storage_path_check'::name),
    ('photos_galerie_storage_path_key'::name), ('photos_galerie_titre_check'::name),
    ('photos_galerie_variante_affichage_check'::name), ('photos_galerie_width_check'::name)$$,
  'validation.inventory.photos_constraints'
);
select extensions.results_eq(
  $$select tgname from pg_trigger where tgrelid in ('public.prestations'::regclass, 'public.photos_galerie'::regclass) and not tgisinternal order by 1$$,
  $$values ('photos_galerie_set_updated_at'::name), ('prestations_set_updated_at'::name)$$,
  'internal.inventory.triggers'
);
select extensions.results_eq(
  $$select indexname from pg_indexes where schemaname = 'public' and indexname like '%_public_%_order_idx' order by 1$$,
  $$values ('photos_galerie_public_variant_order_idx'::name), ('prestations_public_category_order_idx'::name)$$,
  'internal.inventory.partial_indexes'
);
select extensions.ok(
  (select indexdef like '%actif%' and indexdef like '%file_state%' and indexdef like '%ready%' from pg_indexes where schemaname = 'public' and indexname = 'photos_galerie_public_variant_order_idx'),
  'internal.inventory.photos_public_index_active_ready'
);
select extensions.ok((select relrowsecurity from pg_class where oid = 'public.prestations'::regclass), 'authorization.inventory.prestations_rls');
select extensions.ok((select relrowsecurity from pg_class where oid = 'public.photos_galerie'::regclass), 'authorization.inventory.photos_rls');
select extensions.is((select count(*) from pg_policies where schemaname = 'public' and tablename = 'prestations'), 5::bigint, 'authorization.inventory.prestations_policies');
select extensions.is((select count(*) from pg_policies where schemaname = 'public' and tablename = 'photos_galerie'), 5::bigint, 'authorization.inventory.photos_policies');
select extensions.is((select count(*) from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname like 'galerie_admin_%'), 4::bigint, 'authorization.inventory.storage_policies');
select extensions.is((select count(*) from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'galerie_public_download'), 1::bigint, 'authorization.inventory.storage_public_download_policy');

select extensions.is(
  array(select (table_name || ':' || privilege_type)::text from information_schema.role_table_grants where grantee = 'anon' and table_schema = 'public' and table_name in ('prestations', 'photos_galerie') order by 1),
  array['photos_galerie:SELECT', 'prestations:SELECT']::text[],
  'privilege.inventory.anon_grants'
);
select extensions.is(
  array(select (table_name || ':' || privilege_type)::text from information_schema.role_table_grants where grantee = 'authenticated' and table_schema = 'public' and table_name in ('prestations', 'photos_galerie') order by 1),
  array[
    'photos_galerie:DELETE', 'photos_galerie:INSERT', 'photos_galerie:SELECT', 'photos_galerie:UPDATE',
    'prestations:DELETE', 'prestations:INSERT', 'prestations:SELECT', 'prestations:UPDATE'
  ]::text[],
  'privilege.inventory.authenticated_grants'
);
select extensions.is_empty(
  $$select privilege_type from information_schema.role_table_grants where grantee = 'service_role' and table_schema = 'public' and table_name in ('prestations', 'photos_galerie')$$,
  'privilege.inventory.service_role_no_table_grant'
);
select extensions.ok((select prosecdef from pg_proc where oid = 'private.is_current_admin()'::regprocedure), 'privilege.inventory.admin_helper_definer');
select extensions.ok((select 'search_path=""' = any(proconfig) from pg_proc where oid = 'private.is_current_admin()'::regprocedure), 'privilege.inventory.admin_helper_empty_search_path');
select extensions.ok(not has_function_privilege('anon', 'private.is_current_admin()', 'execute'), 'privilege.inventory.admin_helper_anon_denied');
select extensions.ok(has_function_privilege('authenticated', 'private.is_current_admin()', 'execute'), 'privilege.inventory.admin_helper_authenticated');
select extensions.ok(not has_schema_privilege('anon', 'private', 'usage'), 'privilege.inventory.private_anon_denied');
select extensions.ok(has_schema_privilege('authenticated', 'private', 'usage'), 'privilege.inventory.private_authenticated_usage');
select extensions.ok(to_regprocedure('public.is_current_admin()') is not null, 'authorization.inventory.admin_rpc_exists');
select extensions.ok(not (select prosecdef from pg_proc where oid = 'public.is_current_admin()'::regprocedure), 'privilege.inventory.admin_rpc_invoker');
select extensions.is((select provolatile from pg_proc where oid = 'public.is_current_admin()'::regprocedure), 's'::"char", 'authorization.inventory.admin_rpc_stable');
select extensions.ok((select 'search_path=""' = any(proconfig) from pg_proc where oid = 'public.is_current_admin()'::regprocedure), 'privilege.inventory.admin_rpc_empty_search_path');
select extensions.is(
  array(select grantee::text from information_schema.routine_privileges where routine_schema = 'public' and routine_name = 'is_current_admin' and privilege_type = 'EXECUTE' and grantee in ('PUBLIC', 'anon', 'authenticated', 'service_role') order by 1),
  array['authenticated']::text[],
  'privilege.inventory.admin_rpc_authenticated_only'
);

select extensions.is_empty(
  $$select 1 from pg_default_acl d join pg_namespace n on n.oid = d.defaclnamespace cross join lateral aclexplode(d.defaclacl) a join pg_roles r on r.oid = a.grantee where d.defaclrole = 'postgres'::regrole and n.nspname in ('public', 'private') and d.defaclobjtype = 'r' and r.rolname in ('anon', 'authenticated', 'service_role')$$,
  'privilege.inventory.future_tables_closed'
);
select extensions.is_empty(
  $$select 1 from pg_default_acl d join pg_namespace n on n.oid = d.defaclnamespace cross join lateral aclexplode(d.defaclacl) a join pg_roles r on r.oid = a.grantee where d.defaclrole = 'postgres'::regrole and n.nspname in ('public', 'private') and d.defaclobjtype = 'S' and r.rolname in ('anon', 'authenticated', 'service_role')$$,
  'privilege.inventory.future_sequences_closed'
);
select extensions.is_empty(
  $$select 1 from pg_default_acl d join pg_namespace n on n.oid = d.defaclnamespace cross join lateral aclexplode(d.defaclacl) a where d.defaclrole = 'postgres'::regrole and n.nspname in ('public', 'private') and d.defaclobjtype = 'f' and a.grantee = 0 and a.privilege_type = 'EXECUTE'$$,
  'privilege.inventory.future_function_public_execute_closed'
);

select * from extensions.finish();
rollback;
