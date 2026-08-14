begin;
\ir 00_test_helpers.sql

select extensions.plan(73);

select tests.create_auth_user('70000000-0000-4000-8000-000000000001', 'admin@foundation.local', 'admin');
select tests.create_auth_session('71000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000001');
select tests.create_auth_user('70000000-0000-4000-8000-000000000002', 'member@foundation.local');
select tests.create_auth_session('71000000-0000-4000-8000-000000000002', '70000000-0000-4000-8000-000000000002');
select tests.create_auth_user('70000000-0000-4000-8000-000000000003', 'metadata@foundation.local', null, 'admin');
select tests.create_auth_session('71000000-0000-4000-8000-000000000003', '70000000-0000-4000-8000-000000000003');

insert into public.prestations (id, nom, description, categorie, prix, type_prix, actif)
values
  ('72000000-0000-4000-8000-000000000000', 'Active service', 'D', 'soins_corps', 1, 'fixed', true),
  ('72000000-0000-4000-8000-000000000001', 'Hidden service', 'D', 'soins_corps', 1, 'fixed', false);
insert into public.photos_galerie (id, storage_path, alt_text, variante_affichage, width, height, mime_type, size_bytes, actif)
values
  ('73000000-0000-4000-8000-000000000000', 'photos/74000000-0000-4000-8000-000000000000.webp', 'Active photo', 'small', 1, 1, 'image/webp', 1, true),
  ('73000000-0000-4000-8000-000000000001', 'photos/74000000-0000-4000-8000-000000000001.webp', 'Hidden photo', 'small', 1, 1, 'image/webp', 1, false);
insert into public.photos_galerie (id, storage_path, alt_text, variante_affichage, width, height, mime_type, size_bytes, actif, file_state, operation_kind, operation_id, operation_started_at, repair_code)
values
  ('73000000-0000-4000-8000-000000000010', 'photos/74000000-0000-4000-8000-000000000010.webp', 'Pending photo', 'small', 1, 1, 'image/webp', 1, true, 'pending', 'delete', '75000000-0000-4000-8000-000000000010', now(), null),
  ('73000000-0000-4000-8000-000000000011', 'photos/74000000-0000-4000-8000-000000000011.webp', 'Repair photo', 'small', 1, 1, 'image/webp', 1, true, 'repair_required', 'replace', '75000000-0000-4000-8000-000000000011', now(), 'object_missing');

select tests.set_request_context('authenticated', '70000000-0000-4000-8000-000000000002', '71000000-0000-4000-8000-000000000002');
select extensions.is((select count(*) from public.prestations where id = '72000000-0000-4000-8000-000000000000'), 1::bigint, 'authorization.non_admin.active_service');
select extensions.is((select count(*) from public.photos_galerie where id = '73000000-0000-4000-8000-000000000000'), 1::bigint, 'authorization.non_admin.active_photo');
select extensions.is_empty($$select id from public.prestations where id = '72000000-0000-4000-8000-000000000001'$$, 'authorization.non_admin.hidden_service');
select extensions.is_empty($$select id from public.photos_galerie where id = '73000000-0000-4000-8000-000000000001'$$, 'authorization.non_admin.hidden_photo');
select extensions.is_empty($$select id from public.photos_galerie where id = '73000000-0000-4000-8000-000000000010'$$, 'authorization.non_admin.pending_photo');
select extensions.is_empty($$select id from public.photos_galerie where id = '73000000-0000-4000-8000-000000000011'$$, 'authorization.non_admin.repair_photo');
reset role;
select extensions.ok(tests.mutation_is_blocked('authenticated', $$insert into public.prestations (nom, description, categorie, prix, type_prix) values ('Denied', 'D', 'soins_corps', 1, 'fixed')$$), 'authorization.non_admin.insert');
select extensions.ok(tests.mutation_is_blocked('authenticated', $$update public.prestations set nom = 'Denied' where id = '72000000-0000-4000-8000-000000000001'$$), 'authorization.non_admin.update_service');
select extensions.ok(tests.mutation_is_blocked('authenticated', $$delete from public.prestations where id = '72000000-0000-4000-8000-000000000001'$$), 'authorization.non_admin.delete_service');
select extensions.ok(tests.mutation_is_blocked('authenticated', $$insert into public.photos_galerie (storage_path, alt_text, variante_affichage, width, height, mime_type, size_bytes) values ('photos/74100000-0000-4000-8000-000000000001.webp', 'Denied', 'small', 1, 1, 'image/webp', 1)$$), 'authorization.non_admin.insert_photo');
select extensions.ok(tests.mutation_is_blocked('authenticated', $$update public.photos_galerie set alt_text = 'Denied' where id = '73000000-0000-4000-8000-000000000001'$$), 'authorization.non_admin.update_photo');
select extensions.ok(tests.mutation_is_blocked('authenticated', $$delete from public.photos_galerie where id = '73000000-0000-4000-8000-000000000001'$$), 'authorization.non_admin.delete_photo');

select tests.set_request_context('authenticated', '70000000-0000-4000-8000-000000000003', '71000000-0000-4000-8000-000000000003', null, 'admin');
select extensions.is((select count(*) from public.prestations where id = '72000000-0000-4000-8000-000000000000'), 1::bigint, 'authorization.user_metadata.active_service');
select extensions.is((select count(*) from public.photos_galerie where id = '73000000-0000-4000-8000-000000000000'), 1::bigint, 'authorization.user_metadata.active_photo');
select extensions.is_empty($$select id from public.prestations where id = '72000000-0000-4000-8000-000000000001'$$, 'authorization.user_metadata.ignored');
select extensions.is_empty($$select id from public.photos_galerie where id = '73000000-0000-4000-8000-000000000001'$$, 'authorization.user_metadata.hidden_photo');
reset role;
select extensions.ok(tests.mutation_is_blocked('authenticated', $$insert into public.prestations (nom, description, categorie, prix, type_prix) values ('Metadata denied', 'D', 'soins_corps', 1, 'fixed')$$), 'authorization.user_metadata.insert_service_denied');
select extensions.ok(tests.mutation_is_blocked('authenticated', $$update public.prestations set nom = 'Metadata denied' where id = '72000000-0000-4000-8000-000000000001'$$), 'authorization.user_metadata.update_service_denied');
select extensions.ok(tests.mutation_is_blocked('authenticated', $$delete from public.prestations where id = '72000000-0000-4000-8000-000000000001'$$), 'authorization.user_metadata.delete_service_denied');
select extensions.ok(tests.mutation_is_blocked('authenticated', $$insert into public.photos_galerie (storage_path, alt_text, variante_affichage, width, height, mime_type, size_bytes) values ('photos/74200000-0000-4000-8000-000000000001.webp', 'Metadata denied', 'small', 1, 1, 'image/webp', 1)$$), 'authorization.user_metadata.insert_photo_denied');
select extensions.ok(tests.mutation_is_blocked('authenticated', $$update public.photos_galerie set alt_text = 'Metadata denied' where id = '73000000-0000-4000-8000-000000000001'$$), 'authorization.user_metadata.update_photo_denied');
select extensions.ok(tests.mutation_is_blocked('authenticated', $$delete from public.photos_galerie where id = '73000000-0000-4000-8000-000000000001'$$), 'authorization.user_metadata.delete_denied');

select tests.set_request_context('authenticated', '70000000-0000-4000-8000-000000000001', '71000000-0000-4000-8000-000000000001', 'admin');
select extensions.is((select count(*) from public.prestations where id = '72000000-0000-4000-8000-000000000000'), 1::bigint, 'authorization.admin.read_active_service');
select extensions.is((select count(*) from public.photos_galerie where id = '73000000-0000-4000-8000-000000000000'), 1::bigint, 'authorization.admin.read_active_photo');
select extensions.is((select count(*) from public.prestations where id = '72000000-0000-4000-8000-000000000001'), 1::bigint, 'authorization.admin.read_hidden_service');
select extensions.is((select count(*) from public.photos_galerie where id = '73000000-0000-4000-8000-000000000001'), 1::bigint, 'authorization.admin.read_hidden_photo');
select extensions.is((select count(*) from public.photos_galerie where id = '73000000-0000-4000-8000-000000000010'), 1::bigint, 'authorization.admin.read_pending_photo');
select extensions.is((select count(*) from public.photos_galerie where id = '73000000-0000-4000-8000-000000000011'), 1::bigint, 'authorization.admin.read_repair_photo');
select extensions.lives_ok($$insert into public.prestations (id, nom, description, categorie, prix, type_prix) values ('72000000-0000-4000-8000-000000000002', 'Created', 'D', 'esthetique_visage', 2, 'fixed')$$, 'authorization.admin.insert_service');
select extensions.lives_ok($$insert into public.photos_galerie (id, storage_path, alt_text, variante_affichage, width, height, mime_type, size_bytes) values ('73000000-0000-4000-8000-000000000002', 'photos/74000000-0000-4000-8000-000000000002.png', 'Created', 'social', 1, 1, 'image/png', 1)$$, 'authorization.admin.insert_photo');
select pg_sleep(0.01);
select extensions.lives_ok($$update public.prestations set nom = 'Updated', actif = false, updated_at = '2000-01-01T00:00:00Z' where id = '72000000-0000-4000-8000-000000000002'$$, 'authorization.admin.update_service');
select extensions.ok((select updated_at > created_at and updated_at > '2026-01-01T00:00:00Z' from public.prestations where id = '72000000-0000-4000-8000-000000000002'), 'authorization.admin.updated_at_server_owned');
select extensions.lives_ok($$update public.photos_galerie set alt_text = 'Updated', actif = false, updated_at = '2000-01-01T00:00:00Z' where id = '73000000-0000-4000-8000-000000000002'$$, 'authorization.admin.update_photo');
select extensions.ok((select updated_at > created_at and updated_at > '2026-01-01T00:00:00Z' from public.photos_galerie where id = '73000000-0000-4000-8000-000000000002'), 'authorization.admin.photo_updated_at_server_owned');
reset role;

select tests.set_request_context('anon');
select extensions.is_empty($$select id from public.prestations where id = '72000000-0000-4000-8000-000000000002'$$, 'authorization.admin.masked_service_hidden_publicly');
select extensions.is_empty($$select id from public.photos_galerie where id = '73000000-0000-4000-8000-000000000002'$$, 'authorization.admin.masked_photo_hidden_publicly');
reset role;

select tests.set_request_context('authenticated', '70000000-0000-4000-8000-000000000001', '71000000-0000-4000-8000-000000000001', 'admin');
select extensions.lives_ok($$delete from public.prestations where id = '72000000-0000-4000-8000-000000000002'$$, 'authorization.admin.delete_service');
select extensions.lives_ok($$delete from public.photos_galerie where id = '73000000-0000-4000-8000-000000000002'$$, 'authorization.admin.delete_photo');
reset role;

update auth.users
set raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}'::jsonb
where id = '70000000-0000-4000-8000-000000000002';

select tests.set_request_context('authenticated', '70000000-0000-4000-8000-000000000002', '71000000-0000-4000-8000-000000000002');
select extensions.is((select count(*) from public.prestations where id = '72000000-0000-4000-8000-000000000000'), 1::bigint, 'authorization.promotion.old_claim_active_service');
select extensions.is((select count(*) from public.photos_galerie where id = '73000000-0000-4000-8000-000000000000'), 1::bigint, 'authorization.promotion.old_claim_active_photo');
select extensions.is((select count(*) from public.prestations where id = '72000000-0000-4000-8000-000000000001'), 1::bigint, 'authorization.promotion.current_role_service_allowed_without_refreshed_claim');
select extensions.is((select count(*) from public.photos_galerie where id = '73000000-0000-4000-8000-000000000001'), 1::bigint, 'authorization.promotion.current_role_photo_allowed_without_refreshed_claim');
select extensions.lives_ok($$insert into public.prestations (id, nom, description, categorie, prix, type_prix) values ('72000000-0000-4000-8000-000000000004', 'Current role created', 'D', 'soins_corps', 1, 'fixed')$$, 'authorization.promotion.current_role_insert_service_allowed');
select extensions.lives_ok($$update public.prestations set nom = 'Current role updated' where id = '72000000-0000-4000-8000-000000000004'$$, 'authorization.promotion.current_role_update_service_allowed');
select extensions.lives_ok($$delete from public.prestations where id = '72000000-0000-4000-8000-000000000004'$$, 'authorization.promotion.current_role_delete_service_allowed');
select extensions.lives_ok($$insert into public.photos_galerie (id, storage_path, alt_text, variante_affichage, width, height, mime_type, size_bytes) values ('73000000-0000-4000-8000-000000000004', 'photos/74300000-0000-4000-8000-000000000004.webp', 'Current role created', 'small', 1, 1, 'image/webp', 1)$$, 'authorization.promotion.current_role_insert_photo_allowed');
select extensions.lives_ok($$update public.photos_galerie set alt_text = 'Current role updated' where id = '73000000-0000-4000-8000-000000000004'$$, 'authorization.promotion.current_role_update_photo_allowed');
select extensions.lives_ok($$delete from public.photos_galerie where id = '73000000-0000-4000-8000-000000000004'$$, 'authorization.promotion.current_role_delete_photo_allowed');
reset role;

select tests.set_request_context('authenticated', '70000000-0000-4000-8000-000000000002', '71000000-0000-4000-8000-000000000002', 'admin');
select extensions.is((select count(*) from public.prestations where id = '72000000-0000-4000-8000-000000000000'), 1::bigint, 'authorization.promotion.refreshed_claim_active_service');
select extensions.is((select count(*) from public.photos_galerie where id = '73000000-0000-4000-8000-000000000000'), 1::bigint, 'authorization.promotion.refreshed_claim_active_photo');
select extensions.is((select count(*) from public.prestations where id = '72000000-0000-4000-8000-000000000001'), 1::bigint, 'authorization.promotion.refreshed_claim_allowed');
select extensions.is((select count(*) from public.photos_galerie where id = '73000000-0000-4000-8000-000000000001'), 1::bigint, 'authorization.promotion.refreshed_claim_hidden_photo_allowed');
select extensions.lives_ok($$insert into public.prestations (id, nom, description, categorie, prix, type_prix) values ('72000000-0000-4000-8000-000000000003', 'Promoted created', 'D', 'esthetique_visage', 2, 'fixed')$$, 'authorization.promotion.refreshed_claim_insert_service');
select extensions.lives_ok($$insert into public.photos_galerie (id, storage_path, alt_text, variante_affichage, width, height, mime_type, size_bytes) values ('73000000-0000-4000-8000-000000000003', 'photos/74000000-0000-4000-8000-000000000003.png', 'Promoted created', 'social', 1, 1, 'image/png', 1)$$, 'authorization.promotion.refreshed_claim_insert_photo');
select extensions.lives_ok($$update public.prestations set nom = 'Promoted updated' where id = '72000000-0000-4000-8000-000000000003'$$, 'authorization.promotion.refreshed_claim_update_service');
select extensions.lives_ok($$update public.photos_galerie set alt_text = 'Promoted updated' where id = '73000000-0000-4000-8000-000000000003'$$, 'authorization.promotion.refreshed_claim_update_photo');
select extensions.lives_ok($$delete from public.prestations where id = '72000000-0000-4000-8000-000000000003'$$, 'authorization.promotion.refreshed_claim_delete_service');
select extensions.lives_ok($$delete from public.photos_galerie where id = '73000000-0000-4000-8000-000000000003'$$, 'authorization.promotion.refreshed_claim_delete_photo');
reset role;

delete from auth.sessions where id = '71000000-0000-4000-8000-000000000001';
select tests.set_request_context('authenticated', '70000000-0000-4000-8000-000000000001', '71000000-0000-4000-8000-000000000001', 'admin');
select extensions.is((select count(*) from public.prestations where id = '72000000-0000-4000-8000-000000000000'), 1::bigint, 'authorization.revoked.read_active_service');
select extensions.is((select count(*) from public.photos_galerie where id = '73000000-0000-4000-8000-000000000000'), 1::bigint, 'authorization.revoked.read_active_photo');
select extensions.is_empty($$select id from public.prestations where id = '72000000-0000-4000-8000-000000000001'$$, 'authorization.revoked.read_hidden_denied');
select extensions.is_empty($$select id from public.photos_galerie where id = '73000000-0000-4000-8000-000000000001'$$, 'authorization.revoked.read_hidden_photo_denied');
select extensions.is_empty($$select id from public.photos_galerie where id = '73000000-0000-4000-8000-000000000010'$$, 'authorization.revoked.read_pending_photo_denied');
select extensions.is_empty($$select id from public.photos_galerie where id = '73000000-0000-4000-8000-000000000011'$$, 'authorization.revoked.read_repair_photo_denied');
reset role;
select extensions.ok(tests.mutation_is_blocked('authenticated', $$insert into public.prestations (nom, description, categorie, prix, type_prix) values ('Revoked denied', 'D', 'soins_corps', 1, 'fixed')$$), 'authorization.revoked.insert_service_denied');
select extensions.ok(tests.mutation_is_blocked('authenticated', $$update public.prestations set nom = 'Revoked denied' where id = '72000000-0000-4000-8000-000000000001'$$), 'authorization.revoked.update_service_denied');
select extensions.ok(tests.mutation_is_blocked('authenticated', $$delete from public.prestations where id = '72000000-0000-4000-8000-000000000001'$$), 'authorization.revoked.delete_denied');
select extensions.ok(tests.mutation_is_blocked('authenticated', $$insert into public.photos_galerie (storage_path, alt_text, variante_affichage, width, height, mime_type, size_bytes) values ('photos/74400000-0000-4000-8000-000000000001.webp', 'Revoked denied', 'small', 1, 1, 'image/webp', 1)$$), 'authorization.revoked.insert_photo_denied');
select extensions.ok(tests.mutation_is_blocked('authenticated', $$update public.photos_galerie set alt_text = 'Revoked denied' where id = '73000000-0000-4000-8000-000000000001'$$), 'authorization.revoked.update_photo_denied');
select extensions.ok(tests.mutation_is_blocked('authenticated', $$delete from public.photos_galerie where id = '73000000-0000-4000-8000-000000000001'$$), 'authorization.revoked.delete_photo_denied');

select extensions.ok(not has_function_privilege('anon', 'private.is_current_admin()', 'execute'), 'privilege.admin_helper.anon_denied');
select extensions.ok(has_function_privilege('authenticated', 'private.is_current_admin()', 'execute'), 'privilege.admin_helper.authenticated_execute');
select extensions.ok(not has_schema_privilege('anon', 'private', 'usage'), 'privilege.private_schema.anon_denied');

select * from extensions.finish();
rollback;
