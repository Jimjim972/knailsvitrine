alter table public.prestations
  alter column prix type numeric using prix::numeric;

alter table public.prestations
  drop constraint prestations_prix_nonnegative_check;

alter table public.prestations
  add constraint prestations_prix_bounds_check
    check (prix is null or prix between 0 and 99999999.99),
  add constraint prestations_prix_scale_check
    check (prix is null or prix = trunc(prix, 2));

drop policy prestations_public_select on public.prestations;
drop policy prestations_admin_select on public.prestations;

create policy prestations_anon_select
on public.prestations
for select
to anon
using (actif = true);

create policy prestations_authenticated_select
on public.prestations
for select
to authenticated
using (actif = true or (select private.is_current_admin()));

insert into public.prestations (
  id, nom, description, categorie, prix, type_prix, duree_minutes,
  badge, image_path, ordre_affichage, actif, created_at, updated_at
)
values
  (
    '31000000-0000-4000-8000-000000000001',
    'Manucure Russe',
    'Préparation méticuleuse de l''ongle et des cuticules pour un rendu net et une repousse retardée.',
    'onglerie_manucure', 45.00, 'fixed', 45, null, null, 0, true,
    '2026-08-11T00:00:01Z', '2026-08-11T00:00:01Z'
  ),
  (
    '31000000-0000-4000-8000-000000000002',
    'Pose Vernis Semi-Permanent',
    'Couleur éclatante et tenue impeccable jusqu''à 3 semaines. Large choix de teintes premium.',
    'onglerie_manucure', 35.00, 'fixed', 30, 'Populaire', null, 1, true,
    '2026-08-11T00:00:02Z', '2026-08-11T00:00:02Z'
  ),
  (
    '31000000-0000-4000-8000-000000000003',
    'Pose Complète Gel (Chablons)',
    'Rallongement sur-mesure pour une forme parfaite et une solidité optimale.',
    'onglerie_manucure', 75.00, 'fixed', 90, null, null, 2, true,
    '2026-08-11T00:00:03Z', '2026-08-11T00:00:03Z'
  ),
  (
    '31000000-0000-4000-8000-000000000004',
    'Modelage Relaxant Sur-Mesure',
    'Massage profond aux huiles précieuses pour dénouer les tensions et apaiser l''esprit.',
    'soins_corps', 85.00, 'fixed', 60, null, null, 0, true,
    '2026-08-11T00:00:04Z', '2026-08-11T00:00:04Z'
  ),
  (
    '31000000-0000-4000-8000-000000000005',
    'Gommage Corps Éclat',
    'Exfoliation douce pour une peau soyeuse, lumineuse et parfaitement hydratée.',
    'soins_corps', 50.00, 'fixed', 40, null, null, 1, true,
    '2026-08-11T00:00:05Z', '2026-08-11T00:00:05Z'
  ),
  (
    '31000000-0000-4000-8000-000000000006',
    'Soin Signature "Glow"',
    'Soin complet hydratant et illuminateur. Nettoyage profond, modelage et masque spécifique.',
    'esthetique_visage', 95.00, 'fixed', 75, null, null, 0, true,
    '2026-08-11T00:00:06Z', '2026-08-11T00:00:06Z'
  ),
  (
    '31000000-0000-4000-8000-000000000007',
    'Lifting Colombien (Visage)',
    'Technique non invasive pour raffermir, lisser les ridules et redessiner l''ovale du visage.',
    'esthetique_visage', 120.00, 'fixed', 60, 'Nouveau', null, 1, true,
    '2026-08-11T00:00:07Z', '2026-08-11T00:00:07Z'
  ),
  (
    '31000000-0000-4000-8000-000000000008',
    'Beauté du Regard',
    'Rehaussement et teinture pour un regard intensifié naturellement, sans mascara.',
    'esthetique_visage', 65.00, 'fixed', 60, null, null, 2, true,
    '2026-08-11T00:00:08Z', '2026-08-11T00:00:08Z'
  );
