create schema if not exists private;

revoke all on schema private from public, anon, authenticated, service_role;

alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated, service_role;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated, service_role;
alter default privileges for role postgres in schema public revoke execute on functions from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema private revoke all on tables from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema private revoke all on sequences from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema private revoke execute on functions from public, anon, authenticated, service_role;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = clock_timestamp();
  return new;
end;
$$;

revoke all on function private.set_updated_at() from public, anon, authenticated, service_role;

create table public.prestations (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  description text not null,
  categorie text not null,
  prix numeric(10,2),
  type_prix text not null,
  duree_minutes integer,
  badge text,
  image_path text,
  ordre_affichage integer not null default 0,
  actif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint prestations_nom_length_check check (char_length(btrim(nom)) between 2 and 120),
  constraint prestations_description_length_check check (char_length(btrim(description)) between 1 and 1000),
  constraint prestations_categorie_check check (categorie in ('onglerie_manucure', 'soins_corps', 'esthetique_visage')),
  constraint prestations_type_prix_check check (type_prix in ('fixed', 'starting_at', 'quote')),
  constraint prestations_prix_nonnegative_check check (prix >= 0),
  constraint prestations_prix_matches_type_check check (
    (type_prix in ('fixed', 'starting_at') and prix is not null)
    or (type_prix = 'quote' and prix is null)
  ),
  constraint prestations_duree_minutes_check check (duree_minutes between 5 and 600),
  constraint prestations_badge_check check (badge is null or char_length(btrim(badge)) between 1 and 40),
  constraint prestations_image_path_check check (image_path is null or char_length(btrim(image_path)) > 0),
  constraint prestations_ordre_affichage_check check (ordre_affichage >= 0)
);

create table public.photos_galerie (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  alt_text text not null,
  titre text,
  libelle text,
  lien_externe text,
  variante_affichage text not null,
  width integer not null,
  height integer not null,
  mime_type text not null,
  size_bytes integer not null,
  ordre_affichage integer not null default 0,
  actif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint photos_galerie_storage_path_check check (
    storage_path ~ '^photos/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$'
  ),
  constraint photos_galerie_alt_text_length_check check (char_length(btrim(alt_text)) between 1 and 200),
  constraint photos_galerie_titre_check check (titre is null or char_length(btrim(titre)) > 0),
  constraint photos_galerie_libelle_check check (libelle is null or char_length(btrim(libelle)) > 0),
  constraint photos_galerie_lien_externe_https_check check (lien_externe is null or lien_externe like 'https://%'),
  constraint photos_galerie_variante_affichage_check check (
    variante_affichage in ('featured', 'small', 'wide_small', 'wide_large', 'social')
  ),
  constraint photos_galerie_width_check check (width > 0),
  constraint photos_galerie_height_check check (height > 0),
  constraint photos_galerie_mime_type_check check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  constraint photos_galerie_storage_mime_match_check check (
    (mime_type = 'image/jpeg' and storage_path ~ '\.(jpg|jpeg)$')
    or (mime_type = 'image/png' and storage_path ~ '\.png$')
    or (mime_type = 'image/webp' and storage_path ~ '\.webp$')
  ),
  constraint photos_galerie_size_bytes_check check (size_bytes between 1 and 8388608),
  constraint photos_galerie_ordre_affichage_check check (ordre_affichage >= 0)
);

create trigger prestations_set_updated_at
before update on public.prestations
for each row execute function private.set_updated_at();

create trigger photos_galerie_set_updated_at
before update on public.photos_galerie
for each row execute function private.set_updated_at();

create index prestations_public_category_order_idx
on public.prestations (categorie, ordre_affichage, created_at, id)
where actif = true;

create index photos_galerie_public_variant_order_idx
on public.photos_galerie (variante_affichage, ordre_affichage, created_at, id)
where actif = true;

revoke all on table public.prestations, public.photos_galerie from public, anon, authenticated, service_role;
grant select on table public.prestations, public.photos_galerie to anon, authenticated;

alter table public.prestations enable row level security;
alter table public.photos_galerie enable row level security;

create policy prestations_public_select
on public.prestations
for select
to anon, authenticated
using (actif = true);

create policy photos_galerie_public_select
on public.photos_galerie
for select
to anon, authenticated
using (actif = true);

create or replace function private.is_current_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
    and auth.uid() is not null
    and nullif(auth.jwt() ->> 'session_id', '') is not null
    and exists (
      select 1
      from auth.sessions
      where auth.sessions.id = (auth.jwt() ->> 'session_id')::uuid
        and auth.sessions.user_id = (select auth.uid())
        and (auth.sessions.not_after is null or auth.sessions.not_after > now())
    );
$$;

revoke all on function private.is_current_admin() from public, anon, authenticated, service_role;
grant usage on schema private to authenticated;
grant execute on function private.is_current_admin() to authenticated;

grant insert, update, delete on table public.prestations, public.photos_galerie to authenticated;

create policy prestations_admin_select
on public.prestations
for select
to authenticated
using ((select private.is_current_admin()));

create policy prestations_admin_insert
on public.prestations
for insert
to authenticated
with check ((select private.is_current_admin()));

create policy prestations_admin_update
on public.prestations
for update
to authenticated
using ((select private.is_current_admin()))
with check ((select private.is_current_admin()));

create policy prestations_admin_delete
on public.prestations
for delete
to authenticated
using ((select private.is_current_admin()));

create policy photos_galerie_admin_select
on public.photos_galerie
for select
to authenticated
using ((select private.is_current_admin()));

create policy photos_galerie_admin_insert
on public.photos_galerie
for insert
to authenticated
with check ((select private.is_current_admin()));

create policy photos_galerie_admin_update
on public.photos_galerie
for update
to authenticated
using ((select private.is_current_admin()))
with check ((select private.is_current_admin()));

create policy photos_galerie_admin_delete
on public.photos_galerie
for delete
to authenticated
using ((select private.is_current_admin()));

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
  and name ~ '^photos/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$'
  and (select private.is_current_admin())
);

create policy galerie_admin_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'galerie'
  and name ~ '^photos/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$'
  and (select private.is_current_admin())
)
with check (
  bucket_id = 'galerie'
  and name ~ '^photos/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$'
  and (select private.is_current_admin())
);

create policy galerie_admin_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'galerie'
  and name ~ '^photos/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$'
  and (select private.is_current_admin())
);
