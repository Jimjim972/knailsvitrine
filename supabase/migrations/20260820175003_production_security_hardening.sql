drop policy if exists photos_galerie_public_select on public.photos_galerie;
drop policy if exists photos_galerie_admin_select on public.photos_galerie;

create policy photos_galerie_public_select
on public.photos_galerie
for select
to anon
using (actif = true and file_state = 'ready');

create policy photos_galerie_authenticated_select
on public.photos_galerie
for select
to authenticated
using (
  (actif = true and file_state = 'ready')
  or (select private.is_current_admin())
);
