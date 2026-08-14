begin;
\ir 00_test_helpers.sql

select extensions.plan(27);

select extensions.has_table('public', 'categories_prestations', 'categories.schema.table');
select extensions.col_type_is('public', 'categories_prestations', 'code', 'text', 'categories.schema.code_text');
select extensions.col_type_is('public', 'categories_prestations', 'nom', 'text', 'categories.schema.name_text');
select extensions.col_default_is('public', 'categories_prestations', 'ordre_affichage', '0', 'categories.schema.order_default');
select extensions.results_eq(
  $$select code, nom, ordre_affichage from public.categories_prestations order by ordre_affichage, created_at, code$$,
  $$values
    ('onglerie_manucure'::text, 'Onglerie & Manucure'::text, 0),
    ('soins_corps'::text, 'Soins du Corps'::text, 1),
    ('esthetique_visage'::text, 'Esthétique & Visage'::text, 2)$$,
  'categories.seed.initial_three'
);
select extensions.ok(exists (select 1 from pg_constraint where conrelid = 'public.categories_prestations'::regclass and conname = 'categories_prestations_code_check'), 'categories.schema.code_constraint');
select extensions.ok(exists (select 1 from pg_constraint where conrelid = 'public.categories_prestations'::regclass and conname = 'categories_prestations_nom_length_check'), 'categories.schema.name_constraint');
select extensions.ok(exists (select 1 from pg_constraint where conrelid = 'public.categories_prestations'::regclass and conname = 'categories_prestations_ordre_affichage_check'), 'categories.schema.order_constraint');
select extensions.ok(exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'categories_prestations_nom_unique_idx'), 'categories.schema.case_insensitive_name_unique');
select extensions.ok(exists (select 1 from pg_constraint where conrelid = 'public.prestations'::regclass and conname = 'prestations_categorie_fkey'), 'categories.schema.service_foreign_key');
select extensions.ok((select relrowsecurity from pg_class where oid = 'public.categories_prestations'::regclass), 'categories.rls.enabled');
select extensions.is((select count(*) from pg_policies where schemaname = 'public' and tablename = 'categories_prestations'), 2::bigint, 'categories.rls.two_policies');
select extensions.is(
  array(select privilege_type::text from information_schema.role_table_grants where grantee = 'anon' and table_schema = 'public' and table_name = 'categories_prestations' order by 1),
  array['SELECT']::text[],
  'categories.grants.anon_select_only'
);
select extensions.is(
  array(select privilege_type::text from information_schema.role_table_grants where grantee = 'authenticated' and table_schema = 'public' and table_name = 'categories_prestations' order by 1),
  array['INSERT', 'SELECT']::text[],
  'categories.grants.authenticated_select_insert'
);
select extensions.is_empty(
  $$select privilege_type from information_schema.role_table_grants where grantee = 'service_role' and table_schema = 'public' and table_name = 'categories_prestations'$$,
  'categories.grants.service_role_none'
);

select tests.create_auth_user('35000000-0000-4000-8000-000000000001', 'category-admin@foundation.local', 'admin');
select tests.create_auth_session('36000000-0000-4000-8000-000000000001', '35000000-0000-4000-8000-000000000001');
select tests.create_auth_user('35000000-0000-4000-8000-000000000002', 'category-member@foundation.local');
select tests.create_auth_session('36000000-0000-4000-8000-000000000002', '35000000-0000-4000-8000-000000000002');

select tests.set_request_context('anon');
select extensions.is((select count(*) from public.categories_prestations), 3::bigint, 'categories.rls.anon_reads_categories');
reset role;
select extensions.ok(tests.mutation_is_blocked('anon', $$insert into public.categories_prestations (code, nom) values ('category_anon', 'Anonyme')$$), 'categories.rls.anon_insert_blocked');
select tests.set_request_context('authenticated', '35000000-0000-4000-8000-000000000002', '36000000-0000-4000-8000-000000000002');
reset role;
select extensions.ok(tests.mutation_is_blocked('authenticated', $$insert into public.categories_prestations (code, nom) values ('category_member', 'Membre')$$), 'categories.rls.member_insert_blocked');

select tests.set_request_context('authenticated', '35000000-0000-4000-8000-000000000001', '36000000-0000-4000-8000-000000000001', 'admin');
select extensions.lives_ok($$insert into public.categories_prestations (code, nom, ordre_affichage) values ('category_massages', 'Massages', 4)$$, 'categories.rls.admin_insert_allowed');
select extensions.is((select count(*) from public.categories_prestations where code = 'category_massages'), 1::bigint, 'categories.rls.admin_insert_visible');
select extensions.lives_ok($$insert into public.prestations (nom, description, categorie, prix, type_prix) values ('Massage test', 'D', 'category_massages', 50, 'fixed')$$, 'categories.fk.dynamic_category_accepted');
select extensions.throws_ok($$insert into public.prestations (nom, description, categorie, prix, type_prix) values ('Invalide', 'D', 'category_absente', 50, 'fixed')$$, '23503', null, 'categories.fk.unknown_category_rejected');
select extensions.throws_ok($$insert into public.categories_prestations (code, nom) values ('category_duplicate', '  massages  ')$$, '23505', null, 'categories.schema.duplicate_name_rejected');
select extensions.throws_ok($$update public.categories_prestations set nom = 'Renommée' where code = 'category_massages'$$, '42501', null, 'categories.rls.admin_update_not_in_scope');
select extensions.throws_ok($$delete from public.categories_prestations where code = 'category_massages'$$, '42501', null, 'categories.rls.admin_delete_not_in_scope');
reset role;

select extensions.ok(exists (select 1 from pg_trigger where tgrelid = 'public.categories_prestations'::regclass and tgname = 'categories_prestations_set_updated_at' and not tgisinternal), 'categories.schema.updated_at_trigger');
select extensions.ok(exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'categories_prestations_order_idx'), 'categories.schema.order_index');

select * from extensions.finish();
rollback;
