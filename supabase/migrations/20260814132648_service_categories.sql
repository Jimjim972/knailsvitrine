create table public.categories_prestations (
  code text primary key,
  nom text not null,
  ordre_affichage integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_prestations_code_check check (code ~ '^[a-z][a-z0-9_]{1,63}$'),
  constraint categories_prestations_nom_length_check check (char_length(btrim(nom)) between 2 and 80),
  constraint categories_prestations_ordre_affichage_check check (ordre_affichage >= 0)
);

create unique index categories_prestations_nom_unique_idx
on public.categories_prestations (lower(btrim(nom)));

create index categories_prestations_order_idx
on public.categories_prestations (ordre_affichage, created_at, code);

create trigger categories_prestations_set_updated_at
before update on public.categories_prestations
for each row execute function private.set_updated_at();

insert into public.categories_prestations (code, nom, ordre_affichage, created_at, updated_at)
values
  ('onglerie_manucure', 'Onglerie & Manucure', 0, '2026-08-11T00:00:00Z', '2026-08-11T00:00:00Z'),
  ('soins_corps', 'Soins du Corps', 1, '2026-08-11T00:00:01Z', '2026-08-11T00:00:01Z'),
  ('esthetique_visage', 'Esthétique & Visage', 2, '2026-08-11T00:00:02Z', '2026-08-11T00:00:02Z');

alter table public.prestations
  drop constraint prestations_categorie_check,
  add constraint prestations_categorie_fkey
    foreign key (categorie)
    references public.categories_prestations (code)
    on update restrict
    on delete restrict;

revoke all on table public.categories_prestations from public, anon, authenticated, service_role;
grant select on table public.categories_prestations to anon, authenticated;
grant insert on table public.categories_prestations to authenticated;

alter table public.categories_prestations enable row level security;

create policy categories_prestations_public_select
on public.categories_prestations
for select
to anon, authenticated
using (true);

create policy categories_prestations_admin_insert
on public.categories_prestations
for insert
to authenticated
with check ((select private.is_current_admin()));
