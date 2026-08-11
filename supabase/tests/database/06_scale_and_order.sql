begin;
\ir 00_test_helpers.sql

select extensions.plan(8);

delete from public.prestations where id::text like '31000000-0000-4000-8000-00000000000%';

select tests.create_auth_user('80000000-0000-4000-8000-000000000001', 'scale@foundation.local', 'admin');
select tests.create_auth_session('81000000-0000-4000-8000-000000000001', '80000000-0000-4000-8000-000000000001');
select tests.set_request_context('authenticated', '80000000-0000-4000-8000-000000000001', '81000000-0000-4000-8000-000000000001', 'admin');

insert into public.prestations (id, nom, description, categorie, prix, type_prix, ordre_affichage, created_at)
select
  md5('foundation-service-' || g)::uuid,
  'Service ' || g,
  'Description ' || g,
  (array['onglerie_manucure', 'soins_corps', 'esthetique_visage'])[((g - 1) % 3) + 1],
  g::numeric(10,2),
  'fixed',
  g % 5,
  timestamptz '2026-01-01T00:00:00Z' + ((g % 3) || ' seconds')::interval
from generate_series(1, 40) as g;

insert into public.photos_galerie (id, storage_path, alt_text, variante_affichage, width, height, mime_type, size_bytes, ordre_affichage, created_at)
select
  md5('foundation-photo-' || g)::uuid,
  'photos/90000000-0000-4000-8000-' || lpad(g::text, 12, '0') || '.webp',
  'Photo ' || g,
  (array['featured', 'small', 'wide_small', 'wide_large', 'social'])[((g - 1) % 5) + 1],
  1,
  1,
  'image/webp',
  1,
  g % 7,
  timestamptz '2026-01-01T00:00:00Z' + ((g % 4) || ' seconds')::interval
from generate_series(1, 100) as g;

reset role;
select tests.set_request_context('anon');

select extensions.is((select count(*) from public.prestations), 40::bigint, 'internal.scale.prestations_count');
select extensions.is((select count(*) from public.photos_galerie), 100::bigint, 'internal.scale.photos_count');
select extensions.results_eq(
  $$select categorie, count(*) from public.prestations group by categorie order by categorie$$,
  $$values ('esthetique_visage'::text, 13::bigint), ('onglerie_manucure'::text, 14::bigint), ('soins_corps'::text, 13::bigint)$$,
  'internal.scale.three_categories'
);
select extensions.results_eq(
  $$select variante_affichage, count(*) from public.photos_galerie group by variante_affichage order by variante_affichage$$,
  $$values ('featured'::text, 20::bigint), ('small'::text, 20::bigint), ('social'::text, 20::bigint), ('wide_large'::text, 20::bigint), ('wide_small'::text, 20::bigint)$$,
  'internal.scale.five_variants'
);
select extensions.ok((select count(*) > count(distinct ordre_affichage) from public.prestations), 'internal.scale.prestations_duplicate_order');
select extensions.ok((select count(*) > count(distinct ordre_affichage) from public.photos_galerie), 'internal.scale.photos_duplicate_order');
select extensions.results_eq(
  $$select id from public.prestations order by ordre_affichage, created_at, id$$,
  $$select md5('foundation-service-' || g)::uuid from generate_series(1, 40) as g order by g % 5, timestamptz '2026-01-01T00:00:00Z' + ((g % 3) || ' seconds')::interval, md5('foundation-service-' || g)::uuid$$,
  'internal.scale.prestations_deterministic_order'
);
select extensions.results_eq(
  $$select id from public.photos_galerie order by ordre_affichage, created_at, id$$,
  $$select md5('foundation-photo-' || g)::uuid from generate_series(1, 100) as g order by g % 7, timestamptz '2026-01-01T00:00:00Z' + ((g % 4) || ' seconds')::interval, md5('foundation-photo-' || g)::uuid$$,
  'internal.scale.photos_deterministic_order'
);

reset role;
select * from extensions.finish();
rollback;
