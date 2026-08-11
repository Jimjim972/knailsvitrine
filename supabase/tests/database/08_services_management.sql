begin;
\ir 00_test_helpers.sql

select extensions.plan(20);

select extensions.col_type_is('public', 'prestations', 'prix', 'numeric', 'services.price.unconstrained_numeric');
select extensions.ok(exists (select 1 from pg_constraint where conrelid = 'public.prestations'::regclass and conname = 'prestations_prix_bounds_check'), 'services.price.bounds_constraint');
select extensions.ok(exists (select 1 from pg_constraint where conrelid = 'public.prestations'::regclass and conname = 'prestations_prix_scale_check'), 'services.price.scale_constraint');
select extensions.ok(not exists (select 1 from pg_constraint where conrelid = 'public.prestations'::regclass and conname = 'prestations_prix_nonnegative_check'), 'services.price.old_constraint_removed');

select extensions.lives_ok($$insert into public.prestations (nom, description, categorie, prix, type_prix) values ('Prix zéro', 'D', 'soins_corps', 0, 'fixed'), ('Prix centime', 'D', 'soins_corps', 0.01, 'starting_at'), ('Prix maximum', 'D', 'soins_corps', 99999999.99, 'fixed')$$, 'services.price.boundaries_accepted');
select extensions.throws_ok($$insert into public.prestations (nom, description, categorie, prix, type_prix) values ('Prix précis', 'D', 'soins_corps', 1.005, 'fixed')$$, '23514', null, 'services.price.excess_scale_rejected');
select extensions.throws_ok($$insert into public.prestations (nom, description, categorie, prix, type_prix) values ('Prix échelle explicite', 'D', 'soins_corps', 1.000, 'fixed')$$, '23514', null, 'services.price.trailing_zero_excess_scale_rejected');
select extensions.throws_ok($$insert into public.prestations (nom, description, categorie, prix, type_prix) values ('Prix haut', 'D', 'soins_corps', 100000000, 'fixed')$$, '23514', null, 'services.price.above_max_rejected');
select extensions.throws_ok($$insert into public.prestations (nom, description, categorie, prix, type_prix) values ('Prix bas', 'D', 'soins_corps', -0.01, 'fixed')$$, '23514', null, 'services.price.negative_rejected');
select extensions.lives_ok($$insert into public.prestations (nom, description, categorie, prix, type_prix, ordre_affichage) values ('Ordre A', 'D', 'soins_corps', 1, 'fixed', 7), ('Ordre B', 'D', 'soins_corps', 2, 'fixed', 7)$$, 'services.order.duplicates_allowed');

select extensions.is((select count(*) from public.prestations where id in (
  '31000000-0000-4000-8000-000000000001', '31000000-0000-4000-8000-000000000002',
  '31000000-0000-4000-8000-000000000003', '31000000-0000-4000-8000-000000000004',
  '31000000-0000-4000-8000-000000000005', '31000000-0000-4000-8000-000000000006',
  '31000000-0000-4000-8000-000000000007', '31000000-0000-4000-8000-000000000008'
)), 8::bigint, 'services.seed.eight_fixed_ids');
select extensions.results_eq(
  $$select categorie || '|' || ordre_affichage || '|' || nom || '|' || prix::text || '|' || coalesce(duree_minutes::text, '') || '|' || coalesce(badge, '') from public.prestations where id::text like '31000000-0000-4000-8000-00000000000%' order by created_at, id$$,
  $$values
    ('onglerie_manucure|0|Manucure Russe|45.00|45|'),
    ('onglerie_manucure|1|Pose Vernis Semi-Permanent|35.00|30|Populaire'),
    ('onglerie_manucure|2|Pose Complète Gel (Chablons)|75.00|90|'),
    ('soins_corps|0|Modelage Relaxant Sur-Mesure|85.00|60|'),
    ('soins_corps|1|Gommage Corps Éclat|50.00|40|'),
    ('esthetique_visage|0|Soin Signature "Glow"|95.00|75|'),
    ('esthetique_visage|1|Lifting Colombien (Visage)|120.00|60|Nouveau'),
    ('esthetique_visage|2|Beauté du Regard|65.00|60|')$$,
  'services.seed.snapshot'
);
select extensions.is((select count(*) from pg_policies where schemaname = 'public' and tablename = 'prestations' and cmd = 'SELECT'), 2::bigint, 'services.rls.two_select_policies');

insert into public.prestations (id, nom, description, categorie, prix, type_prix, actif) values
  ('32000000-0000-4000-8000-000000000001', 'Visible matrice', 'D', 'soins_corps', 1, 'fixed', true),
  ('32000000-0000-4000-8000-000000000002', 'Masquée matrice', 'D', 'soins_corps', 1, 'fixed', false);
select tests.create_auth_user('33000000-0000-4000-8000-000000000001', 'services-admin@foundation.local', 'admin');
select tests.create_auth_session('34000000-0000-4000-8000-000000000001', '33000000-0000-4000-8000-000000000001');
select tests.create_auth_user('33000000-0000-4000-8000-000000000002', 'services-member@foundation.local');
select tests.create_auth_session('34000000-0000-4000-8000-000000000002', '33000000-0000-4000-8000-000000000002');

select tests.set_request_context('anon');
select extensions.is((select count(*) from public.prestations where id::text like '32000000%'), 1::bigint, 'services.rls.anon_active_only');
reset role;
select tests.set_request_context('authenticated', '33000000-0000-4000-8000-000000000002', '34000000-0000-4000-8000-000000000002');
select extensions.is((select count(*) from public.prestations where id::text like '32000000%'), 1::bigint, 'services.rls.member_active_only');
reset role;
select extensions.ok(tests.mutation_is_blocked('authenticated', $$update public.prestations set nom = 'Refusée' where id = '32000000-0000-4000-8000-000000000001'$$), 'services.rls.member_mutation_denied');
select tests.set_request_context('authenticated', '33000000-0000-4000-8000-000000000001', '34000000-0000-4000-8000-000000000001', 'admin');
select extensions.is((select count(*) from public.prestations where id::text like '32000000%'), 2::bigint, 'services.rls.admin_all_rows');
select extensions.lives_ok($$update public.prestations set nom = 'Modifiée admin' where id = '32000000-0000-4000-8000-000000000002'$$, 'services.rls.admin_mutation_allowed');
reset role;
delete from auth.sessions where id = '34000000-0000-4000-8000-000000000001';
select tests.set_request_context('authenticated', '33000000-0000-4000-8000-000000000001', '34000000-0000-4000-8000-000000000001', 'admin');
select extensions.is((select count(*) from public.prestations where id::text like '32000000%'), 1::bigint, 'services.rls.revoked_active_only');
reset role;
select extensions.ok(tests.mutation_is_blocked('authenticated', $$delete from public.prestations where id = '32000000-0000-4000-8000-000000000001'$$), 'services.rls.revoked_mutation_denied');

select * from extensions.finish();
rollback;
