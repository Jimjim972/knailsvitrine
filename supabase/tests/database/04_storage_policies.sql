begin;
\ir 00_test_helpers.sql

select extensions.plan(14);

select extensions.is((select count(*) from storage.buckets where id = 'galerie'), 1::bigint, 'internal.storage.bucket_exists');
select extensions.is((select public from storage.buckets where id = 'galerie'), true, 'privilege.storage.bucket_public');
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

select extensions.ok((select qual like '%is_current_admin%' and qual like '%bucket_id%' and qual like '%galerie%' and qual like '%name%' from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'galerie_admin_select'), 'authorization.storage.select_boundaries');
select extensions.ok((select with_check like '%is_current_admin%' and with_check like '%bucket_id%' and with_check like '%galerie%' and with_check like '%name%' from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'galerie_admin_insert'), 'authorization.storage.insert_boundaries');
select extensions.ok((select qual like '%is_current_admin%' and with_check like '%is_current_admin%' and qual like '%galerie%' and with_check like '%galerie%' from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'galerie_admin_update'), 'authorization.storage.update_using_and_check');
select extensions.ok((select qual like '%is_current_admin%' and qual like '%bucket_id%' and qual like '%galerie%' and qual like '%name%' from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'galerie_admin_delete'), 'authorization.storage.delete_boundaries');

select extensions.ok(has_table_privilege('authenticated', 'storage.objects', 'insert,select,update'), 'privilege.storage.upsert_components');
select extensions.ok(has_table_privilege('authenticated', 'storage.objects', 'delete'), 'privilege.storage.delete_component');

select * from extensions.finish();
rollback;
