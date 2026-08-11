alter table public.prestations
  drop constraint prestations_prix_scale_check;

alter table public.prestations
  add constraint prestations_prix_scale_check
    check (prix is null or scale(prix) <= 2);
