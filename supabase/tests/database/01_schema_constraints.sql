begin;
\ir 00_test_helpers.sql

select extensions.plan(80);

select extensions.has_table('public', 'prestations', 'internal.schema.prestations_table');
select extensions.has_table('public', 'photos_galerie', 'internal.schema.photos_table');

select extensions.col_type_is('public', 'prestations', 'id', 'uuid', 'validation.prestations.id_type');
select extensions.col_type_is('public', 'prestations', 'prix', 'numeric', 'validation.prestations.price_exact');
select extensions.col_type_is('public', 'prestations', 'created_at', 'timestamp with time zone', 'validation.prestations.created_at_type');
select extensions.col_type_is('public', 'photos_galerie', 'storage_path', 'text', 'validation.photos.storage_path_type');
select extensions.col_type_is('public', 'photos_galerie', 'size_bytes', 'integer', 'validation.photos.size_type');
select extensions.col_type_is('public', 'photos_galerie', 'updated_at', 'timestamp with time zone', 'validation.photos.updated_at_type');

select extensions.col_default_is('public', 'prestations', 'ordre_affichage', '0', 'validation.prestations.order_default');
select extensions.col_default_is('public', 'prestations', 'actif', 'true', 'validation.prestations.active_default');
select extensions.col_default_is('public', 'photos_galerie', 'ordre_affichage', '0', 'validation.photos.order_default');
select extensions.col_default_is('public', 'photos_galerie', 'actif', 'true', 'validation.photos.active_default');

select extensions.ok(to_regclass('public.prestations') is not null and exists (select 1 from pg_constraint where conrelid = to_regclass('public.prestations') and conname = 'prestations_nom_length_check'), 'validation.prestations.name_constraint');
select extensions.ok(to_regclass('public.prestations') is not null and exists (select 1 from pg_constraint where conrelid = to_regclass('public.prestations') and conname = 'prestations_description_length_check'), 'validation.prestations.description_constraint');
select extensions.ok(to_regclass('public.prestations') is not null and exists (select 1 from pg_constraint where conrelid = to_regclass('public.prestations') and conname = 'prestations_categorie_check'), 'validation.prestations.category_constraint');
select extensions.ok(to_regclass('public.prestations') is not null and exists (select 1 from pg_constraint where conrelid = to_regclass('public.prestations') and conname = 'prestations_type_prix_check'), 'validation.prestations.price_type_constraint');
select extensions.ok(to_regclass('public.prestations') is not null and exists (select 1 from pg_constraint where conrelid = to_regclass('public.prestations') and conname = 'prestations_prix_bounds_check'), 'validation.prestations.price_bounds_constraint');
select extensions.ok(to_regclass('public.prestations') is not null and exists (select 1 from pg_constraint where conrelid = to_regclass('public.prestations') and conname = 'prestations_prix_matches_type_check'), 'validation.prestations.price_coupling_constraint');
select extensions.ok(to_regclass('public.prestations') is not null and exists (select 1 from pg_constraint where conrelid = to_regclass('public.prestations') and conname = 'prestations_duree_minutes_check'), 'validation.prestations.duration_constraint');
select extensions.ok(to_regclass('public.prestations') is not null and exists (select 1 from pg_constraint where conrelid = to_regclass('public.prestations') and conname = 'prestations_badge_check'), 'validation.prestations.badge_constraint');
select extensions.ok(to_regclass('public.prestations') is not null and exists (select 1 from pg_constraint where conrelid = to_regclass('public.prestations') and conname = 'prestations_image_path_check'), 'validation.prestations.image_path_constraint');
select extensions.ok(to_regclass('public.prestations') is not null and exists (select 1 from pg_constraint where conrelid = to_regclass('public.prestations') and conname = 'prestations_ordre_affichage_check'), 'validation.prestations.order_constraint');
select extensions.ok(to_regclass('public.photos_galerie') is not null and exists (select 1 from pg_constraint where conrelid = to_regclass('public.photos_galerie') and conname = 'photos_galerie_storage_path_check'), 'validation.photos.path_constraint');
select extensions.ok(to_regclass('public.photos_galerie') is not null and exists (select 1 from pg_constraint where conrelid = to_regclass('public.photos_galerie') and conname = 'photos_galerie_alt_text_length_check'), 'validation.photos.alt_constraint');
select extensions.ok(to_regclass('public.photos_galerie') is not null and exists (select 1 from pg_constraint where conrelid = to_regclass('public.photos_galerie') and conname = 'photos_galerie_titre_check'), 'validation.photos.title_constraint');
select extensions.ok(to_regclass('public.photos_galerie') is not null and exists (select 1 from pg_constraint where conrelid = to_regclass('public.photos_galerie') and conname = 'photos_galerie_libelle_check'), 'validation.photos.label_constraint');
select extensions.ok(to_regclass('public.photos_galerie') is not null and exists (select 1 from pg_constraint where conrelid = to_regclass('public.photos_galerie') and conname = 'photos_galerie_lien_externe_https_check'), 'validation.photos.external_link_constraint');
select extensions.ok(to_regclass('public.photos_galerie') is not null and exists (select 1 from pg_constraint where conrelid = to_regclass('public.photos_galerie') and conname = 'photos_galerie_variante_affichage_check'), 'validation.photos.variant_constraint');
select extensions.ok(to_regclass('public.photos_galerie') is not null and exists (select 1 from pg_constraint where conrelid = to_regclass('public.photos_galerie') and conname = 'photos_galerie_width_check'), 'validation.photos.width_constraint');
select extensions.ok(to_regclass('public.photos_galerie') is not null and exists (select 1 from pg_constraint where conrelid = to_regclass('public.photos_galerie') and conname = 'photos_galerie_height_check'), 'validation.photos.height_constraint');
select extensions.ok(to_regclass('public.photos_galerie') is not null and exists (select 1 from pg_constraint where conrelid = to_regclass('public.photos_galerie') and conname = 'photos_galerie_mime_type_check'), 'validation.photos.mime_constraint');
select extensions.ok(to_regclass('public.photos_galerie') is not null and exists (select 1 from pg_constraint where conrelid = to_regclass('public.photos_galerie') and conname = 'photos_galerie_storage_mime_match_check'), 'validation.photos.mime_match_constraint');
select extensions.ok(to_regclass('public.photos_galerie') is not null and exists (select 1 from pg_constraint where conrelid = to_regclass('public.photos_galerie') and conname = 'photos_galerie_size_bytes_check'), 'validation.photos.size_constraint');
select extensions.ok(to_regclass('public.photos_galerie') is not null and exists (select 1 from pg_constraint where conrelid = to_regclass('public.photos_galerie') and conname = 'photos_galerie_ordre_affichage_check'), 'validation.photos.order_constraint');

select extensions.lives_ok(
  $$insert into public.prestations (nom, description, categorie, prix, type_prix, duree_minutes, badge, image_path)
    values ('AB', 'D', 'onglerie_manucure', 99999999.99, 'fixed', 5, 'B', 'services/a.webp')$$,
  'validation.prestations.lower_and_upper_bounds'
);
select extensions.lives_ok(
  $$insert into public.prestations (nom, description, categorie, prix, type_prix, duree_minutes)
    values ('Sur devis', 'D', 'soins_corps', null, 'quote', 600)$$,
  'validation.prestations.quote_without_price'
);
select extensions.throws_ok(
  $$insert into public.prestations (nom, description, categorie, prix, type_prix) values ('A', 'D', 'esthetique_visage', 1, 'fixed')$$,
  '23514', null, 'validation.prestations.name_too_short'
);
select extensions.throws_ok(
  $$insert into public.prestations (nom, description, categorie, prix, type_prix) values ('Prix absent', 'D', 'esthetique_visage', null, 'fixed')$$,
  '23514', null, 'validation.prestations.fixed_requires_price'
);
select extensions.throws_ok(
  $$insert into public.prestations (nom, description, categorie, prix, type_prix) values ('Prix devis', 'D', 'esthetique_visage', 1, 'quote')$$,
  '23514', null, 'validation.prestations.quote_rejects_price'
);
select extensions.throws_ok(
  $$insert into public.prestations (nom, description, categorie, prix, type_prix, duree_minutes) values ('Durée', 'D', 'esthetique_visage', 1, 'fixed', 601)$$,
  '23514', null, 'validation.prestations.duration_too_long'
);
select extensions.lives_ok(
  $$insert into public.prestations (nom, description, categorie, prix, type_prix, badge, actif)
    values (repeat('N', 120), repeat('D', 1000), 'esthetique_visage', 1, 'fixed', repeat('B', 40), false)$$,
  'validation.prestations.upper_text_boundaries_and_inactive'
);
select extensions.throws_ok(
  $$insert into public.prestations (nom, description, categorie, prix, type_prix) values (repeat('N', 121), 'D', 'esthetique_visage', 1, 'fixed')$$,
  '23514', null, 'validation.prestations.name_too_long'
);
select extensions.throws_ok(
  $$insert into public.prestations (nom, description, categorie, prix, type_prix) values ('Description vide', ' ', 'esthetique_visage', 1, 'fixed')$$,
  '23514', null, 'validation.prestations.description_blank'
);
select extensions.throws_ok(
  $$insert into public.prestations (nom, description, categorie, prix, type_prix) values ('Description longue', repeat('D', 1001), 'esthetique_visage', 1, 'fixed')$$,
  '23514', null, 'validation.prestations.description_too_long'
);
select extensions.lives_ok(
  $$insert into public.prestations (nom, description, categorie, prix, type_prix)
    values ('Catégorie ongles', 'D', 'onglerie_manucure', 1, 'fixed'),
      ('Catégorie corps', 'D', 'soins_corps', 1, 'fixed'),
      ('Catégorie visage', 'D', 'esthetique_visage', 1, 'fixed')$$,
  'validation.prestations.allowed_categories'
);
select extensions.throws_ok(
  $$insert into public.prestations (nom, description, categorie, prix, type_prix) values ('Catégorie invalide', 'D', 'autre', 1, 'fixed')$$,
  '23514', null, 'validation.prestations.category_invalid'
);
select extensions.lives_ok(
  $$insert into public.prestations (nom, description, categorie, prix, type_prix) values ('À partir de zéro', 'D', 'soins_corps', 0, 'starting_at')$$,
  'validation.prestations.starting_at_with_zero_price'
);
select extensions.throws_ok(
  $$insert into public.prestations (nom, description, categorie, prix, type_prix) values ('Type invalide', 'D', 'soins_corps', 1, 'variable')$$,
  '23514', null, 'validation.prestations.price_type_invalid'
);
select extensions.throws_ok(
  $$insert into public.prestations (nom, description, categorie, prix, type_prix) values ('À partir absent', 'D', 'soins_corps', null, 'starting_at')$$,
  '23514', null, 'validation.prestations.starting_at_requires_price'
);
select extensions.throws_ok(
  $$insert into public.prestations (nom, description, categorie, prix, type_prix) values ('Prix négatif', 'D', 'soins_corps', -0.01, 'fixed')$$,
  '23514', null, 'validation.prestations.price_negative'
);
select extensions.throws_ok(
  $$insert into public.prestations (nom, description, categorie, prix, type_prix) values ('Prix débordant', 'D', 'soins_corps', 100000000.00, 'fixed')$$,
  '23514', null, 'validation.prestations.price_above_numeric_maximum'
);
select extensions.throws_ok(
  $$insert into public.prestations (nom, description, categorie, prix, type_prix, duree_minutes) values ('Durée basse', 'D', 'soins_corps', 1, 'fixed', 4)$$,
  '23514', null, 'validation.prestations.duration_too_short'
);
select extensions.throws_ok(
  $$insert into public.prestations (nom, description, categorie, prix, type_prix, badge) values ('Badge vide', 'D', 'soins_corps', 1, 'fixed', ' ')$$,
  '23514', null, 'validation.prestations.badge_blank'
);
select extensions.throws_ok(
  $$insert into public.prestations (nom, description, categorie, prix, type_prix, badge) values ('Badge long', 'D', 'soins_corps', 1, 'fixed', repeat('B', 41))$$,
  '23514', null, 'validation.prestations.badge_too_long'
);
select extensions.throws_ok(
  $$insert into public.prestations (nom, description, categorie, prix, type_prix, image_path) values ('Image vide', 'D', 'soins_corps', 1, 'fixed', ' ')$$,
  '23514', null, 'validation.prestations.image_path_blank'
);
select extensions.throws_ok(
  $$insert into public.prestations (nom, description, categorie, prix, type_prix, ordre_affichage) values ('Ordre négatif', 'D', 'soins_corps', 1, 'fixed', -1)$$,
  '23514', null, 'validation.prestations.order_negative'
);
select extensions.throws_ok(
  $$insert into public.prestations (nom, description, categorie, prix, type_prix, actif) values ('Statut absent', 'D', 'soins_corps', 1, 'fixed', null)$$,
  '23502', null, 'validation.prestations.active_required'
);

select extensions.lives_ok(
  $$insert into public.photos_galerie (storage_path, alt_text, variante_affichage, width, height, mime_type, size_bytes, titre, libelle, lien_externe)
    values ('photos/11111111-1111-4111-8111-111111111111.webp', 'A', 'featured', 1, 1, 'image/webp', 8388608, 'T', 'L', 'https://example.com')$$,
  'validation.photos.valid_boundaries'
);
select extensions.throws_ok(
  $$insert into public.photos_galerie (storage_path, alt_text, variante_affichage, width, height, mime_type, size_bytes)
    values ('photos/AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA.webp', 'A', 'small', 1, 1, 'image/webp', 1)$$,
  '23514', null, 'validation.photos.lowercase_uuid_required'
);
select extensions.throws_ok(
  $$insert into public.photos_galerie (storage_path, alt_text, variante_affichage, width, height, mime_type, size_bytes)
    values ('photos/22222222-2222-4222-8222-222222222222.png', 'A', 'wide_small', 1, 1, 'image/jpeg', 1)$$,
  '23514', null, 'validation.photos.extension_matches_mime'
);
select extensions.throws_ok(
  $$insert into public.photos_galerie (storage_path, alt_text, variante_affichage, width, height, mime_type, size_bytes)
    values ('photos/33333333-3333-4333-8333-333333333333.jpg', 'A', 'wide_large', 1, 1, 'image/jpeg', 8388609)$$,
  '23514', null, 'validation.photos.size_too_large'
);
select extensions.throws_ok(
  $$insert into public.photos_galerie (storage_path, alt_text, variante_affichage, width, height, mime_type, size_bytes, lien_externe)
    values ('photos/44444444-4444-4444-8444-444444444444.jpg', 'A', 'social', 1, 1, 'image/jpeg', 1, 'http://example.com')$$,
  '23514', null, 'validation.photos.external_link_https'
);
select extensions.throws_ok(
  $$insert into public.photos_galerie (storage_path, alt_text, variante_affichage, width, height, mime_type, size_bytes)
    values ('photos/11111111-1111-4111-8111-111111111111.webp', 'Duplicate', 'featured', 1, 1, 'image/webp', 1)$$,
  '23505', null, 'validation.photos.path_unique'
);
select extensions.lives_ok(
  $$insert into public.photos_galerie (storage_path, alt_text, titre, libelle, lien_externe, variante_affichage, width, height, mime_type, size_bytes, ordre_affichage, actif)
    values
      ('photos/55555555-5555-4555-8555-555555555551.jpg', repeat('A', 200), null, null, null, 'small', 1, 1, 'image/jpeg', 1, 0, false),
      ('photos/55555555-5555-4555-8555-555555555552.jpeg', 'A', 'T', 'L', 'https://example.com', 'wide_small', 1, 1, 'image/jpeg', 1, 0, true),
      ('photos/55555555-5555-4555-8555-555555555553.png', 'A', 'T', 'L', 'https://example.com', 'wide_large', 1, 1, 'image/png', 1, 0, true),
      ('photos/55555555-5555-4555-8555-555555555554.webp', 'A', 'T', 'L', 'https://example.com', 'social', 1, 1, 'image/webp', 1, 0, true)$$,
  'validation.photos.allowed_paths_mimes_variants_and_boundaries'
);
select extensions.throws_ok(
  $$insert into public.photos_galerie (storage_path, alt_text, variante_affichage, width, height, mime_type, size_bytes) values ('other/66666666-6666-4666-8666-666666666601.webp', 'A', 'featured', 1, 1, 'image/webp', 1)$$,
  '23514', null, 'validation.photos.path_wrong_prefix'
);
select extensions.throws_ok(
  $$insert into public.photos_galerie (storage_path, alt_text, variante_affichage, width, height, mime_type, size_bytes) values ('photos/nested/66666666-6666-4666-8666-666666666602.webp', 'A', 'featured', 1, 1, 'image/webp', 1)$$,
  '23514', null, 'validation.photos.path_nested'
);
select extensions.throws_ok(
  $$insert into public.photos_galerie (storage_path, alt_text, variante_affichage, width, height, mime_type, size_bytes) values ('photos/not-a-uuid.webp', 'A', 'featured', 1, 1, 'image/webp', 1)$$,
  '23514', null, 'validation.photos.path_uuid_required'
);
select extensions.throws_ok(
  $$insert into public.photos_galerie (storage_path, alt_text, variante_affichage, width, height, mime_type, size_bytes) values ('photos/66666666-6666-1666-8666-666666666604.webp', 'A', 'featured', 1, 1, 'image/webp', 1)$$,
  '23514', null, 'validation.photos.path_uuid_v4_required'
);
select extensions.throws_ok(
  $$insert into public.photos_galerie (storage_path, alt_text, variante_affichage, width, height, mime_type, size_bytes) values ('photos/66666666-6666-4666-8666-666666666605.gif', 'A', 'featured', 1, 1, 'image/webp', 1)$$,
  '23514', null, 'validation.photos.path_extension_invalid'
);
select extensions.throws_ok(
  $$insert into public.photos_galerie (storage_path, alt_text, variante_affichage, width, height, mime_type, size_bytes) values ('photos/66666666-6666-4666-8666-666666666606.webp', ' ', 'featured', 1, 1, 'image/webp', 1)$$,
  '23514', null, 'validation.photos.alt_blank'
);
select extensions.throws_ok(
  $$insert into public.photos_galerie (storage_path, alt_text, variante_affichage, width, height, mime_type, size_bytes) values ('photos/66666666-6666-4666-8666-666666666607.webp', repeat('A', 201), 'featured', 1, 1, 'image/webp', 1)$$,
  '23514', null, 'validation.photos.alt_too_long'
);
select extensions.throws_ok(
  $$insert into public.photos_galerie (storage_path, alt_text, titre, variante_affichage, width, height, mime_type, size_bytes) values ('photos/66666666-6666-4666-8666-666666666608.webp', 'A', ' ', 'featured', 1, 1, 'image/webp', 1)$$,
  '23514', null, 'validation.photos.title_blank'
);
select extensions.throws_ok(
  $$insert into public.photos_galerie (storage_path, alt_text, libelle, variante_affichage, width, height, mime_type, size_bytes) values ('photos/66666666-6666-4666-8666-666666666609.webp', 'A', ' ', 'featured', 1, 1, 'image/webp', 1)$$,
  '23514', null, 'validation.photos.label_blank'
);
select extensions.throws_ok(
  $$insert into public.photos_galerie (storage_path, alt_text, variante_affichage, width, height, mime_type, size_bytes) values ('photos/66666666-6666-4666-8666-666666666610.webp', 'A', 'portrait', 1, 1, 'image/webp', 1)$$,
  '23514', null, 'validation.photos.variant_invalid'
);
select extensions.throws_ok(
  $$insert into public.photos_galerie (storage_path, alt_text, variante_affichage, width, height, mime_type, size_bytes) values ('photos/66666666-6666-4666-8666-666666666611.webp', 'A', 'featured', 0, 1, 'image/webp', 1)$$,
  '23514', null, 'validation.photos.width_not_positive'
);
select extensions.throws_ok(
  $$insert into public.photos_galerie (storage_path, alt_text, variante_affichage, width, height, mime_type, size_bytes) values ('photos/66666666-6666-4666-8666-666666666612.webp', 'A', 'featured', 1, 0, 'image/webp', 1)$$,
  '23514', null, 'validation.photos.height_not_positive'
);
select extensions.throws_ok(
  $$insert into public.photos_galerie (storage_path, alt_text, variante_affichage, width, height, mime_type, size_bytes) values ('photos/66666666-6666-4666-8666-666666666613.webp', 'A', 'featured', 1, 1, 'image/gif', 1)$$,
  '23514', null, 'validation.photos.mime_invalid'
);
select extensions.throws_ok(
  $$insert into public.photos_galerie (storage_path, alt_text, variante_affichage, width, height, mime_type, size_bytes) values ('photos/66666666-6666-4666-8666-666666666614.webp', 'A', 'featured', 1, 1, 'image/webp', 0)$$,
  '23514', null, 'validation.photos.size_zero'
);
select extensions.throws_ok(
  $$insert into public.photos_galerie (storage_path, alt_text, variante_affichage, width, height, mime_type, size_bytes, ordre_affichage) values ('photos/66666666-6666-4666-8666-666666666615.webp', 'A', 'featured', 1, 1, 'image/webp', 1, -1)$$,
  '23514', null, 'validation.photos.order_negative'
);
select extensions.throws_ok(
  $$insert into public.photos_galerie (storage_path, alt_text, variante_affichage, width, height, mime_type, size_bytes, actif) values ('photos/66666666-6666-4666-8666-666666666616.webp', 'A', 'featured', 1, 1, 'image/webp', 1, null)$$,
  '23502', null, 'validation.photos.active_required'
);

select * from extensions.finish();
rollback;
