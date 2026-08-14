begin;
\ir 00_test_helpers.sql

select extensions.plan(18);

select extensions.lives_ok(
  $$insert into public.photos_galerie (storage_path, alt_text, variante_affichage, width, height, mime_type, size_bytes, file_state, operation_kind, operation_id, operation_started_at, repair_code) values ('photos/91000000-0000-4000-8000-000000000001.webp', 'Repair', 'small', 1, 1, 'image/webp', 1, 'repair_required', 'replace', gen_random_uuid(), now(), 'upload_unconfirmed')$$,
  'gallery.repair.upload_unconfirmed'
);
select extensions.lives_ok(
  $$insert into public.photos_galerie (storage_path, alt_text, variante_affichage, width, height, mime_type, size_bytes, file_state, operation_kind, operation_id, operation_started_at, repair_code) values ('photos/91000000-0000-4000-8000-000000000002.webp', 'Repair', 'small', 1, 1, 'image/webp', 1, 'repair_required', 'replace', gen_random_uuid(), now(), 'metadata_unconfirmed')$$,
  'gallery.repair.metadata_unconfirmed'
);
select extensions.lives_ok(
  $$insert into public.photos_galerie (storage_path, alt_text, variante_affichage, width, height, mime_type, size_bytes, file_state, operation_kind, operation_id, operation_started_at, repair_code) values ('photos/91000000-0000-4000-8000-000000000003.webp', 'Repair', 'small', 1, 1, 'image/webp', 1, 'repair_required', 'replace', gen_random_uuid(), now(), 'invalid_object_bytes')$$,
  'gallery.repair.invalid_object_bytes'
);
select extensions.lives_ok(
  $$insert into public.photos_galerie (storage_path, alt_text, variante_affichage, width, height, mime_type, size_bytes, file_state, operation_kind, operation_id, operation_started_at, repair_code) values ('photos/91000000-0000-4000-8000-000000000004.webp', 'Repair', 'small', 1, 1, 'image/webp', 1, 'repair_required', 'replace', gen_random_uuid(), now(), 'new_file_cleanup')$$,
  'gallery.repair.new_file_cleanup'
);
select extensions.lives_ok(
  $$insert into public.photos_galerie (storage_path, alt_text, variante_affichage, width, height, mime_type, size_bytes, file_state, operation_kind, operation_id, operation_started_at, repair_code) values ('photos/91000000-0000-4000-8000-000000000005.webp', 'Repair', 'small', 1, 1, 'image/webp', 1, 'repair_required', 'replace', gen_random_uuid(), now(), 'old_file_cleanup')$$,
  'gallery.repair.old_file_cleanup'
);
select extensions.lives_ok(
  $$insert into public.photos_galerie (storage_path, alt_text, variante_affichage, width, height, mime_type, size_bytes, file_state, operation_kind, operation_id, operation_started_at, repair_code) values ('photos/91000000-0000-4000-8000-000000000006.webp', 'Repair', 'small', 1, 1, 'image/webp', 1, 'repair_required', 'delete', gen_random_uuid(), now(), 'object_delete_unconfirmed')$$,
  'gallery.repair.object_delete_unconfirmed'
);
select extensions.lives_ok(
  $$insert into public.photos_galerie (storage_path, alt_text, variante_affichage, width, height, mime_type, size_bytes, file_state, operation_kind, operation_id, operation_started_at, repair_code) values ('photos/91000000-0000-4000-8000-000000000007.webp', 'Repair', 'small', 1, 1, 'image/webp', 1, 'repair_required', 'delete', gen_random_uuid(), now(), 'row_delete_unconfirmed')$$,
  'gallery.repair.row_delete_unconfirmed'
);
select extensions.lives_ok(
  $$insert into public.photos_galerie (storage_path, alt_text, variante_affichage, width, height, mime_type, size_bytes, file_state, operation_kind, operation_id, operation_started_at, repair_code) values ('photos/91000000-0000-4000-8000-000000000008.webp', 'Repair', 'small', 1, 1, 'image/webp', 1, 'repair_required', 'replace', gen_random_uuid(), now(), 'object_missing')$$,
  'gallery.repair.object_missing'
);
select extensions.lives_ok(
  $$insert into public.photos_galerie (storage_path, alt_text, variante_affichage, width, height, mime_type, size_bytes, file_state, operation_kind, operation_id, operation_started_at, repair_code) values ('photos/91000000-0000-4000-8000-000000000009.webp', 'Repair', 'small', 1, 1, 'image/webp', 1, 'repair_required', 'replace', gen_random_uuid(), now(), 'stale_pending_no_object')$$,
  'gallery.repair.stale_pending_no_object'
);
select extensions.lives_ok(
  $$insert into public.photos_galerie (storage_path, alt_text, variante_affichage, width, height, mime_type, size_bytes, file_state, operation_kind, operation_id, operation_started_at, repair_code) values ('photos/91000000-0000-4000-8000-000000000010.webp', 'Repair', 'small', 1, 1, 'image/webp', 1, 'repair_required', 'replace', gen_random_uuid(), now(), 'stale_pending_object_present')$$,
  'gallery.repair.stale_pending_object_present'
);

select extensions.throws_ok(
  $$insert into public.photos_galerie (storage_path, alt_text, variante_affichage, width, height, mime_type, size_bytes, repair_code) values ('photos/91000000-0000-4000-8000-000000000011.webp', 'Ready with repair', 'small', 1, 1, 'image/webp', 1, 'object_missing')$$,
  '23514', null, 'gallery.state.ready_rejects_repair_code'
);
select extensions.throws_ok(
  $$insert into public.photos_galerie (storage_path, alt_text, variante_affichage, width, height, mime_type, size_bytes, file_state, operation_kind, operation_id, operation_started_at, repair_code) values ('photos/91000000-0000-4000-8000-000000000012.webp', 'Pending with repair', 'small', 1, 1, 'image/webp', 1, 'pending', 'delete', gen_random_uuid(), now(), 'stale_pending_no_object')$$,
  '23514', null, 'gallery.state.pending_rejects_repair_code'
);
select extensions.throws_ok(
  $$insert into public.photos_galerie (storage_path, alt_text, variante_affichage, width, height, mime_type, size_bytes, file_state, operation_kind, operation_id, operation_started_at) values ('photos/91000000-0000-4000-8000-000000000013.webp', 'Repair without code', 'small', 1, 1, 'image/webp', 1, 'repair_required', 'replace', gen_random_uuid(), now())$$,
  '23514', null, 'gallery.state.repair_requires_code'
);
select extensions.throws_ok(
  $$insert into public.photos_galerie (storage_path, alt_text, variante_affichage, width, height, mime_type, size_bytes, file_state, operation_kind, operation_started_at, cleanup_storage_path) values ('photos/91000000-0000-4000-8000-000000000014.webp', 'Pending without id', 'small', 1, 1, 'image/webp', 1, 'pending', 'delete', now(), 'photos/91000000-0000-4000-8000-000000000014.webp')$$,
  '23514', null, 'gallery.state.pending_requires_operation_id'
);

select extensions.is((now() - interval '9 minutes 59 seconds') <= now() - interval '10 minutes', false, 'gallery.stale.before_threshold_not_eligible');
select extensions.is((now() - interval '10 minutes') <= now() - interval '10 minutes', true, 'gallery.stale.at_threshold_eligible');
select extensions.is((now() - interval '11 minutes') <= now() - interval '10 minutes', true, 'gallery.stale.after_threshold_eligible');
select extensions.results_eq(
  $$select case when object_present then 'stale_pending_object_present' else 'stale_pending_no_object' end from (values (false), (true)) states(object_present) order by object_present$$,
  $$values ('stale_pending_no_object'::text), ('stale_pending_object_present'::text)$$,
  'gallery.stale.presence_selects_exact_closed_code'
);

select * from extensions.finish();
rollback;
