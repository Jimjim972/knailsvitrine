alter table public.photos_galerie
  add column file_state text not null default 'ready',
  add column operation_kind text,
  add column operation_id uuid,
  add column pending_storage_path text,
  add column pending_width integer,
  add column pending_height integer,
  add column pending_size_bytes integer,
  add column cleanup_storage_path text,
  add column operation_started_at timestamp with time zone,
  add column repair_code text;

alter table public.photos_galerie
  drop constraint photos_galerie_titre_check,
  add constraint photos_galerie_titre_check check (
    titre is null or (char_length(btrim(titre)) between 1 and 120)
  ),
  drop constraint photos_galerie_libelle_check,
  add constraint photos_galerie_libelle_check check (
    libelle is null or (char_length(btrim(libelle)) between 1 and 40)
  ),
  drop constraint photos_galerie_width_check,
  add constraint photos_galerie_width_check check (width between 1 and 8192),
  drop constraint photos_galerie_height_check,
  add constraint photos_galerie_height_check check (height between 1 and 8192),
  drop constraint photos_galerie_size_bytes_check,
  add constraint photos_galerie_size_bytes_check check (size_bytes between 1 and 1048576),
  add constraint photos_galerie_file_state_check check (
    file_state in ('ready', 'pending', 'repair_required')
  ),
  add constraint photos_galerie_operation_kind_check check (
    operation_kind is null or operation_kind in ('create', 'replace', 'delete')
  ),
  add constraint photos_galerie_repair_code_check check (
    repair_code is null or repair_code in (
      'upload_unconfirmed',
      'metadata_unconfirmed',
      'invalid_object_bytes',
      'new_file_cleanup',
      'old_file_cleanup',
      'object_delete_unconfirmed',
      'row_delete_unconfirmed',
      'object_missing',
      'stale_pending_no_object',
      'stale_pending_object_present'
    )
  ),
  add constraint photos_galerie_pending_storage_path_check check (
    pending_storage_path is null or pending_storage_path ~
      '^photos/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.webp$'
  ),
  add constraint photos_galerie_cleanup_storage_path_check check (
    cleanup_storage_path is null or cleanup_storage_path ~
      '^photos/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$'
  ),
  add constraint photos_galerie_pending_dimensions_check check (
    (pending_width is null and pending_height is null and pending_size_bytes is null)
    or (
      pending_width between 1 and 1600
      and pending_height between 1 and 1600
      and pending_size_bytes between 1 and 1048576
    )
  ),
  add constraint photos_galerie_operation_state_check check (
    (
      file_state = 'ready'
      and operation_kind is null
      and operation_id is null
      and pending_storage_path is null
      and pending_width is null
      and pending_height is null
      and pending_size_bytes is null
      and cleanup_storage_path is null
      and operation_started_at is null
      and repair_code is null
    )
    or (
      file_state = 'pending'
      and operation_kind is not null
      and operation_id is not null
      and operation_started_at is not null
      and repair_code is null
    )
    or (
      file_state = 'repair_required'
      and operation_kind is not null
      and operation_id is not null
      and operation_started_at is not null
      and repair_code is not null
    )
  ),
  add constraint photos_galerie_operation_payload_check check (
    file_state = 'ready'
    or (
      operation_kind in ('create', 'replace')
      and (
        (pending_storage_path is null and pending_width is null and pending_height is null and pending_size_bytes is null)
        or (pending_storage_path is not null and pending_width is not null and pending_height is not null and pending_size_bytes is not null)
      )
      and not (file_state = 'pending' and pending_storage_path is null)
    )
    or (
      operation_kind = 'delete'
      and pending_storage_path is null
      and pending_width is null
      and pending_height is null
      and pending_size_bytes is null
      and (file_state = 'repair_required' or cleanup_storage_path = storage_path)
    )
  ),
  add constraint photos_galerie_object_missing_check check (
    repair_code is distinct from 'object_missing'
    or (
      file_state = 'repair_required'
      and operation_kind = 'replace'
      and pending_storage_path is null
      and pending_width is null
      and pending_height is null
      and pending_size_bytes is null
    )
  );

drop index public.photos_galerie_public_variant_order_idx;
create index photos_galerie_public_variant_order_idx
on public.photos_galerie (variante_affichage, ordre_affichage, created_at, id)
where actif = true and file_state = 'ready';

drop policy photos_galerie_public_select on public.photos_galerie;
create policy photos_galerie_public_select
on public.photos_galerie
for select
to anon, authenticated
using (actif = true and file_state = 'ready');

drop policy galerie_admin_select on storage.objects;
drop policy galerie_admin_insert on storage.objects;
drop policy galerie_admin_update on storage.objects;
drop policy galerie_admin_delete on storage.objects;

create policy galerie_public_download
on storage.objects
for select
to anon, authenticated
using (
  bucket_id = 'galerie'
  and storage.allow_any_operation(array[
    'object.get_authenticated_info',
    'object.get_authenticated'
  ])
  and exists (
    select 1
    from public.photos_galerie photo
    where photo.storage_path = storage.objects.name
      and photo.actif = true
      and photo.file_state = 'ready'
  )
);

create policy galerie_admin_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'galerie'
  and name ~ '^photos/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$'
  and (select private.is_current_admin())
);

create policy galerie_admin_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'galerie'
  and name ~ '^photos/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.webp$'
  and (select private.is_current_admin())
  and exists (
    select 1
    from public.photos_galerie photo
    where photo.pending_storage_path = storage.objects.name
      and photo.file_state in ('pending', 'repair_required')
  )
);

create policy galerie_admin_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'galerie'
  and (select private.is_current_admin())
  and exists (
    select 1
    from public.photos_galerie photo
    where storage.objects.name in (
      photo.storage_path,
      photo.pending_storage_path,
      photo.cleanup_storage_path
    )
  )
)
with check (
  bucket_id = 'galerie'
  and name ~ '^photos/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.webp$'
  and (select private.is_current_admin())
  and exists (
    select 1
    from public.photos_galerie photo
    where photo.pending_storage_path = storage.objects.name
      and photo.file_state in ('pending', 'repair_required')
  )
);

create policy galerie_admin_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'galerie'
  and name ~ '^photos/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$'
  and (select private.is_current_admin())
  and exists (
    select 1
    from public.photos_galerie photo
    where storage.objects.name in (
      photo.storage_path,
      photo.pending_storage_path,
      photo.cleanup_storage_path
    )
  )
);

revoke all on table public.photos_galerie from public, anon, authenticated, service_role;
grant select on table public.photos_galerie to anon, authenticated;
grant insert, update, delete on table public.photos_galerie to authenticated;
