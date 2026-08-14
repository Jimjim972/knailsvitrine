grant update, delete on table public.categories_prestations to authenticated;

create policy categories_prestations_admin_update
on public.categories_prestations
for update
to authenticated
using ((select private.is_current_admin()))
with check ((select private.is_current_admin()));

create policy categories_prestations_admin_delete
on public.categories_prestations
for delete
to authenticated
using ((select private.is_current_admin()));
