begin;
\ir 00_test_helpers.sql

select extensions.plan(19);

select extensions.is((select count(*) from storage.buckets where id = 'galerie'), 1::bigint, 'internal.storage.bucket_exists');
select extensions.is((select public from storage.buckets where id = 'galerie'), false, 'privilege.storage.bucket_private');
select extensions.is((select file_size_limit from storage.buckets where id = 'galerie'), 8388608::bigint, 'validation.storage.bucket_size');
select extensions.results_eq(
  $$select unnest(allowed_mime_types) from storage.buckets where id = 'galerie' order by 1$$,
  $$values ('image/jpeg'::text), ('image/png'::text), ('image/webp'::text)$$,
  'validation.storage.bucket_mime_types'
);

select extensions.is((select count(*) from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'galerie_admin_select' and cmd = 'SELECT'), 1::bigint, 'privilege.storage.select_policy');
select extensions.is((select count(*) from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'galerie_admin_insert' and cmd = 'INSERT'), 1::bigint, 'privilege.storage.insert_policy');
select extensions.is((select count(*) from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'galerie_admin_update' and cmd = 'UPDATE'), 1::bigint, 'privilege.storage.update_policy');
select extensions.is((select count(*) from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'galerie_admin_delete' and cmd = 'DELETE'), 1::bigint, 'privilege.storage.delete_policy');
select extensions.is((select count(*) from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'galerie_public_download' and cmd = 'SELECT'), 1::bigint, 'privilege.storage.public_download_policy');

select extensions.ok(
  (select qual like '%allow_any_operation%' and qual like '%object.get_authenticated_info%' and qual like '%object.get_authenticated%' and qual like '%file_state%' and qual like '%ready%' and qual like '%actif%' from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'galerie_public_download'),
  'authorization.storage.public_exact_object_get_active_ready_without_list'
);

select extensions.ok((select qual like '%is_current_admin%' and qual like '%bucket_id%' and qual like '%galerie%' and qual like '%name%' from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'galerie_admin_select'), 'authorization.storage.select_boundaries');
select extensions.ok((select with_check like '%is_current_admin%' and with_check like '%bucket_id%' and with_check like '%galerie%' and with_check like '%pending_storage_path%' and with_check like '%webp%' from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'galerie_admin_insert'), 'authorization.storage.insert_reserved_webp_boundaries');
select extensions.ok((select qual like '%is_current_admin%' and with_check like '%is_current_admin%' and qual like '%galerie%' and with_check like '%galerie%' from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'galerie_admin_update'), 'authorization.storage.update_using_and_check');
select extensions.ok((select qual like '%is_current_admin%' and qual like '%bucket_id%' and qual like '%galerie%' and qual like '%storage_path%' and qual like '%pending_storage_path%' and qual like '%cleanup_storage_path%' and qual like '%jpg%' and qual like '%jpeg%' and qual like '%png%' and qual like '%webp%' from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'galerie_admin_delete'), 'authorization.storage.delete_referenced_legacy_boundaries');

select extensions.ok(has_table_privilege('authenticated', 'storage.objects', 'insert'), 'privilege.storage.insert_component');
select extensions.ok(has_table_privilege('authenticated', 'storage.objects', 'select'), 'privilege.storage.select_component');
select extensions.ok(has_table_privilege('authenticated', 'storage.objects', 'update'), 'privilege.storage.update_component');
select extensions.ok(has_table_privilege('authenticated', 'storage.objects', 'delete'), 'privilege.storage.delete_component');
select extensions.ok(has_table_privilege('anon', 'storage.objects', 'select'), 'privilege.storage.anon_select_gate_for_object_get');

select * from extensions.finish();
rollback;
