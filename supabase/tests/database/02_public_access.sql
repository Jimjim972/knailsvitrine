begin;
\ir 00_test_helpers.sql

select extensions.plan(36);

delete from public.prestations where id::text like '31000000-0000-4000-8000-00000000000%';

select tests.create_auth_user('30000000-0000-4000-8000-000000000001', 'public-member@foundation.local');
select tests.create_auth_session('31000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001');

insert into public.prestations (id, nom, description, categorie, prix, type_prix, ordre_affichage, actif, created_at)
values
  ('10000000-0000-4000-8000-000000000001', 'Active B', 'D', 'onglerie_manucure', 2, 'fixed', 1, true, '2026-01-01T00:00:00Z'),
  ('10000000-0000-4000-8000-000000000002', 'Inactive', 'D', 'onglerie_manucure', 2, 'fixed', 0, false, '2026-01-01T00:00:00Z'),
  ('10000000-0000-4000-8000-000000000003', 'Active A', 'D', 'onglerie_manucure', 2, 'fixed', 1, true, '2026-01-01T00:00:00Z');

insert into public.photos_galerie (id, storage_path, alt_text, variante_affichage, width, height, mime_type, size_bytes, ordre_affichage, actif, created_at)
values
  ('20000000-0000-4000-8000-000000000001', 'photos/50000000-0000-4000-8000-000000000001.webp', 'Active B', 'featured', 1, 1, 'image/webp', 1, 1, true, '2026-01-01T00:00:00Z'),
  ('20000000-0000-4000-8000-000000000002', 'photos/50000000-0000-4000-8000-000000000002.webp', 'Inactive', 'featured', 1, 1, 'image/webp', 1, 0, false, '2026-01-01T00:00:00Z'),
  ('20000000-0000-4000-8000-000000000003', 'photos/50000000-0000-4000-8000-000000000003.webp', 'Active A', 'featured', 1, 1, 'image/webp', 1, 1, true, '2026-01-01T00:00:00Z');

insert into public.photos_galerie (id, storage_path, alt_text, variante_affichage, width, height, mime_type, size_bytes, ordre_affichage, actif, file_state, operation_kind, operation_id, pending_storage_path, pending_width, pending_height, pending_size_bytes, operation_started_at, repair_code, created_at)
values
  ('20000000-0000-4000-8000-000000000004', 'photos/50000000-0000-4000-8000-000000000004.webp', 'Pending', 'featured', 1, 1, 'image/webp', 1, 0, true, 'pending', 'replace', '51000000-0000-4000-8000-000000000004', 'photos/52000000-0000-4000-8000-000000000004.webp', 1, 1, 1, now(), null, '2026-01-01T00:00:00Z'),
  ('20000000-0000-4000-8000-000000000005', 'photos/50000000-0000-4000-8000-000000000005.webp', 'Repair', 'featured', 1, 1, 'image/webp', 1, 0, true, 'repair_required', 'replace', '51000000-0000-4000-8000-000000000005', null, null, null, null, now(), 'object_missing', '2026-01-01T00:00:00Z');

set local role anon;
select extensions.results_eq(
  $$select id from public.prestations order by ordre_affichage, created_at, id$$,
  $$values ('10000000-0000-4000-8000-000000000001'::uuid), ('10000000-0000-4000-8000-000000000003'::uuid)$$,
  'authorization.anon.prestations_active_ordered'
);
select extensions.is_empty(
  $$select id from public.prestations where id = '10000000-0000-4000-8000-000000000002'$$,
  'authorization.anon.prestations_inactive_direct'
);
select extensions.results_eq(
  $$select id from public.photos_galerie order by ordre_affichage, created_at, id$$,
  $$values ('20000000-0000-4000-8000-000000000001'::uuid), ('20000000-0000-4000-8000-000000000003'::uuid)$$,
  'authorization.anon.photos_active_ordered'
);
select extensions.is_empty(
  $$select id from public.photos_galerie where id = '20000000-0000-4000-8000-000000000002'$$,
  'authorization.anon.photos_inactive_direct'
);
select extensions.is_empty($$select id, storage_path from public.photos_galerie where id = '20000000-0000-4000-8000-000000000004'$$, 'authorization.anon.photos_pending_metadata_path_hidden');
select extensions.is_empty($$select id, storage_path from public.photos_galerie where id = '20000000-0000-4000-8000-000000000005'$$, 'authorization.anon.photos_repair_metadata_path_hidden');
reset role;

select extensions.ok(tests.mutation_is_blocked('anon', $$insert into public.prestations (id, nom, description, categorie, prix, type_prix) values ('32000000-0000-4000-8000-000000000001', 'Blocked', 'D', 'soins_corps', 1, 'fixed')$$), 'authorization.anon.service_insert_blocked');
select extensions.is((select count(*) from public.prestations where id = '32000000-0000-4000-8000-000000000001'), 0::bigint, 'authorization.anon.service_insert_no_residue');
select extensions.ok(tests.mutation_is_blocked('anon', $$update public.prestations set nom = 'Blocked anon service' where id = '10000000-0000-4000-8000-000000000001'$$), 'authorization.anon.service_update_blocked');
select extensions.is((select nom from public.prestations where id = '10000000-0000-4000-8000-000000000001'), 'Active B', 'authorization.anon.service_update_unchanged');
select extensions.ok(tests.mutation_is_blocked('anon', $$delete from public.prestations where id = '10000000-0000-4000-8000-000000000001'$$), 'authorization.anon.service_delete_blocked');
select extensions.is((select count(*) from public.prestations where id = '10000000-0000-4000-8000-000000000001'), 1::bigint, 'authorization.anon.service_delete_unchanged');
select extensions.ok(tests.mutation_is_blocked('anon', $$insert into public.photos_galerie (id, storage_path, alt_text, variante_affichage, width, height, mime_type, size_bytes) values ('33000000-0000-4000-8000-000000000001', 'photos/60000000-0000-4000-8000-000000000001.webp', 'Blocked', 'small', 1, 1, 'image/webp', 1)$$), 'authorization.anon.photo_insert_blocked');
select extensions.is((select count(*) from public.photos_galerie where id = '33000000-0000-4000-8000-000000000001'), 0::bigint, 'authorization.anon.photo_insert_no_residue');
select extensions.ok(tests.mutation_is_blocked('anon', $$update public.photos_galerie set alt_text = 'Blocked anon photo' where id = '20000000-0000-4000-8000-000000000001'$$), 'authorization.anon.photo_update_blocked');
select extensions.is((select alt_text from public.photos_galerie where id = '20000000-0000-4000-8000-000000000001'), 'Active B', 'authorization.anon.photo_update_unchanged');
select extensions.ok(tests.mutation_is_blocked('anon', $$delete from public.photos_galerie where id = '20000000-0000-4000-8000-000000000001'$$), 'authorization.anon.photo_delete_blocked');
select extensions.is((select count(*) from public.photos_galerie where id = '20000000-0000-4000-8000-000000000001'), 1::bigint, 'authorization.anon.photo_delete_unchanged');

select tests.set_request_context('authenticated', '30000000-0000-4000-8000-000000000001', '31000000-0000-4000-8000-000000000001');
select extensions.results_eq(
  $$select id from public.prestations order by ordre_affichage, created_at, id$$,
  $$values ('10000000-0000-4000-8000-000000000001'::uuid), ('10000000-0000-4000-8000-000000000003'::uuid)$$,
  'authorization.authenticated.prestations_active_ordered'
);
select extensions.is_empty($$select id from public.prestations where id = '10000000-0000-4000-8000-000000000002'$$, 'authorization.authenticated.prestations_inactive_direct');
select extensions.results_eq(
  $$select id from public.photos_galerie order by ordre_affichage, created_at, id$$,
  $$values ('20000000-0000-4000-8000-000000000001'::uuid), ('20000000-0000-4000-8000-000000000003'::uuid)$$,
  'authorization.authenticated.photos_active_ordered'
);
select extensions.is_empty($$select id from public.photos_galerie where id = '20000000-0000-4000-8000-000000000002'$$, 'authorization.authenticated.photos_inactive_direct');
select extensions.is_empty($$select id, storage_path from public.photos_galerie where id = '20000000-0000-4000-8000-000000000004'$$, 'authorization.authenticated.photos_pending_metadata_path_hidden');
select extensions.is_empty($$select id, storage_path from public.photos_galerie where id = '20000000-0000-4000-8000-000000000005'$$, 'authorization.authenticated.photos_repair_metadata_path_hidden');
reset role;

select extensions.ok(tests.mutation_is_blocked('authenticated', $$insert into public.prestations (id, nom, description, categorie, prix, type_prix) values ('32000000-0000-4000-8000-000000000002', 'Blocked', 'D', 'soins_corps', 1, 'fixed')$$), 'authorization.authenticated.service_insert_blocked');
select extensions.is((select count(*) from public.prestations where id = '32000000-0000-4000-8000-000000000002'), 0::bigint, 'authorization.authenticated.service_insert_no_residue');
select extensions.ok(tests.mutation_is_blocked('authenticated', $$update public.prestations set nom = 'Blocked member service' where id = '10000000-0000-4000-8000-000000000001'$$), 'authorization.authenticated.service_update_blocked');
select extensions.is((select nom from public.prestations where id = '10000000-0000-4000-8000-000000000001'), 'Active B', 'authorization.authenticated.service_update_unchanged');
select extensions.ok(tests.mutation_is_blocked('authenticated', $$delete from public.prestations where id = '10000000-0000-4000-8000-000000000001'$$), 'authorization.authenticated.service_delete_blocked');
select extensions.is((select count(*) from public.prestations where id = '10000000-0000-4000-8000-000000000001'), 1::bigint, 'authorization.authenticated.service_delete_unchanged');
select extensions.ok(tests.mutation_is_blocked('authenticated', $$insert into public.photos_galerie (id, storage_path, alt_text, variante_affichage, width, height, mime_type, size_bytes) values ('33000000-0000-4000-8000-000000000002', 'photos/60000000-0000-4000-8000-000000000002.webp', 'Blocked', 'small', 1, 1, 'image/webp', 1)$$), 'authorization.authenticated.photo_insert_blocked');
select extensions.is((select count(*) from public.photos_galerie where id = '33000000-0000-4000-8000-000000000002'), 0::bigint, 'authorization.authenticated.photo_insert_no_residue');
select extensions.ok(tests.mutation_is_blocked('authenticated', $$update public.photos_galerie set alt_text = 'Blocked member photo' where id = '20000000-0000-4000-8000-000000000001'$$), 'authorization.authenticated.photo_update_blocked');
select extensions.is((select alt_text from public.photos_galerie where id = '20000000-0000-4000-8000-000000000001'), 'Active B', 'authorization.authenticated.photo_update_unchanged');
select extensions.ok(tests.mutation_is_blocked('authenticated', $$delete from public.photos_galerie where id = '20000000-0000-4000-8000-000000000001'$$), 'authorization.authenticated.photo_delete_blocked');
select extensions.is((select count(*) from public.photos_galerie where id = '20000000-0000-4000-8000-000000000001'), 1::bigint, 'authorization.authenticated.photo_delete_unchanged');

select * from extensions.finish();
rollback;
