# Quickstart de validation: Gestion de la galerie

## 1. Prérequis

- Node.js 22 ; Docker actif ; dépendances installées avec le lockfile, dont `sharp@0.35.3` épinglé exactement en devDependency pour le seul bootstrap.
- Supabase CLI 2.112.0 disponible via `npx`.
- Aucune liaison Supabase distante sous `supabase/.temp/project-ref` pour les contrôles destructifs locaux.
- Variables locales fournies par `npx supabase status`; aucun secret `service_role` dans `.env` client.
- Lire [data-model.md](./data-model.md) et les contrats [image](./contracts/image-pipeline.md), [actions](./contracts/gallery-actions.md) et [vérification](./contracts/verification.md).

## 2. Préparer la migration pendant l'implémentation

Découvrir la syntaxe installée puis créer le fichier avec la CLI :

```bash
npx supabase migration new --help
npx supabase migration new gallery_management
```

La migration doit étendre la table, remplacer politiques/index, resserrer les politiques Storage sur les réservations et ajouter la lecture privée par opération sans autoriser la liste. Elle ne modifie jamais directement le schéma interne Storage et ne crée aucune ligne `ready` pour un objet absent. `supabase/config.toml` déclare le bucket privé local ; `scripts/configure-gallery-bucket.mjs --local` refuse toute cible non loopback et vérifie cet état avec les credentials éphémères de la CLI. Pour une cible hébergée explicitement autorisée, créer une clé Supabase dédiée `sb_secret_...`, puis injecter seulement dans le processus du script `SUPABASE_GALLERY_CONFIG_URL`, `SUPABASE_GALLERY_CONFIG_PROJECT_REF` et `SUPABASE_GALLERY_CONFIG_SECRET_KEY` tels que documentés dans `.env.gallery-config.example`. Le script applique et relit `private`, 8 Mio et les MIME par l'API Storage. Une clé JWT historique `service_role`, une URL/référence discordante ou une postcondition incomplète sont refusées. Révoquer la clé dédiée juste après la vérification et confirmer qu'elle ne fonctionne plus ; aucune de ces variables ne va dans `.env.local`, Next.js, Netlify ou le bootstrap CRUD. Le bootstrap exige ensuite le flag et utilise une session admin normale. Vérifier les diffs avant toute application.

## 3. Réinitialiser la pile locale

```bash
npm run supabase:reset
npm run supabase:test:db
npm run supabase:test:storage
npm run supabase:lint
npm run supabase:advisors
```

Résultat attendu : toutes les migrations et matrices pgTAP passent ; le bucket est privé ; anon ne télécharge que l'objet d'une ligne active/`ready` et ne peut pas lister ; non-admin/révoqué ne gagnent aucun droit ; l'admin courant peut exécuter les chemins réservés.

Avant les tests E2E de reprise initiale, exécuter le bootstrap local prévu par l'implémentation :

```bash
node scripts/bootstrap-gallery.mjs --local
```

Il doit refuser toute cible liée/distante en mode `--local`, vérifier `sharp@0.35.3` dans `package.json` et `package-lock.json`, refuser tout import hors `scripts/bootstrap-gallery.mjs`, vérifier les SHA-256 des neuf JPEG sources, produire neuf WebP sRGB sans métadonnées, vérifier les hashes/RIFF de sortie, créer exactement neuf paires ligne-objet et produire le même résultat sans duplication lors d'une seconde exécution. La fidélité exige SSIM >=0,97 entre chaque sortie et sa source opaque orientée/sRGB aux dimensions exactes de sortie, sur luminance sRGB 8 bits `Y=0,299R+0,587G+0,114B`, fenêtre gaussienne 11×11 sigma 1,5, `K1=0,01`, `K2=0,03`, `L=255`, bords réfléchis et moyenne de tous les pixels.

## 4. Régénérer les types

```bash
npm run supabase:types:generate
npm run supabase:types:check
```

Vérifier que `photos_galerie` expose les colonnes d'opération avec les nullabilités prévues et qu'aucune dérive non commitée ne reste.

## 5. Contrôler la chaîne d'image

```bash
npm run test:unit
```

Les fixtures doivent inclure exactement F01–F20 de SC-003, des JPEG orientés, bornes de dimensions, chunks EXIF/ICC/XMP, une fixture RGBA non redimensionnée de 25 coordonnées/alphas 8 bits, une fixture RGBA 2 000 × 1 000 redimensionnée en 1 600 × 800 avec gradient analytique sur 25 positions, et un corpus opaque versionné de trois images sRGB et trois Display-P3 avec, par image, 25 coordonnées `(u,v)` dans `[0,1]²` et leurs triplets sRGB 8 bits. Pour l'alpha non redimensionné, l'aperçu exact et le WebP finalisé conservent 0/255 exactement et chaque valeur intermédiaire à ±1 ; pour le chemin redimensionné, les extrémités restent exactes et les intermédiaires suivent `arrondi(255 × u)` à ±3. Pour la couleur, la coordonnée sélectionne le pixel borné `floor(u×(largeur−1)+0,5), floor(v×(hauteur−1)+0,5)` ; référence et sortie passent de sRGB à Lab D65/2° sans adaptation D50 puis par CIEDE2000. Playwright exécute les 150 comparaisons couleur avec médiane <=2 et P95 au rang 143 <=5. Le Blob accepté est toujours un WebP fixe valide, <=1 Mio, qualité autorisée, sans métadonnée et sans agrandissement. Les tests Node couvrent les fonctions pures et adaptateurs injectés ; la matrice serveur prouve aussi qu'un objet mensonger téléversé avec MIME/chemin WebP ne devient pas `ready`.

## 6. Lancer les contrôles applicatifs

```bash
npm run lint
npm run typecheck
npm run build
npm run test:e2e:auth
npm run test:e2e:services
npm run test:e2e:gallery
npm run test:e2e:gallery:scenarios
npm run scan:build-secrets
```

`npm run gallery:check` orchestre la séquence pertinente, refuse une cible non-loopback/liée, retourne un code non nul au premier échec logique et produit uniquement des diagnostics expurgés. Il couvre aussi la simulation déterministe des douze interruptions et l'endurance 30/20/20 via `test:e2e:gallery:scenarios`.

## 7. Scénario manuel de bout en bout

1. Se connecter comme administrateur et ouvrir `/admin/galerie`.
2. Vérifier les neuf photos reprises, leurs variantes/ordres, leurs dimensions à un pixel près et leur SSIM >=0,97 selon le protocole déterministe du bootstrap décrit plus haut.
3. Ajouter successivement un JPEG orienté, la fixture PNG RGBA et un WebP fixe ; inspecter aperçu, alpha selon les 25 références, format, dimensions, poids et absence de métadonnées, puis confirmer le refus d'un APNG et d'un WebP animé.
4. Modifier texte/variante/ordre, masquer puis réactiver ; vérifier chaque nouvel état au premier rendu administratif post-réponse sans actualisation manuelle, puis `/galerie` sur une nouvelle consultation sous cinq secondes.
5. Remplacer un fichier et confirmer que l'ancien objet disparaît.
6. Annuler une suppression, puis la confirmer ; vérifier ligne et objet.
7. Simuler C1–C4, R1–R5 et D1–D3 puis recharger : les dix états non convergés doivent rester non publics et récupérables sans toucher une autre photo ; C4 et D3 doivent confirmer idempotemment la convergence déjà obtenue.
8. Tester principale seule, sociale seule et toutes deux vides.
9. Créer des `pending` âgés de 9 min 59 s, 10 min et 11 min, puis vérifier la réconciliation bornée à l'entrée de la liste.
10. Retirer un objet de contrôle, vérifier le repli public, puis l'audit administratif `object_missing` et l'invalidation publique.
11. Charger 201 photos et vérifier les pages 100/100/1 sans perte ni duplication.
12. Mesurer le lazy dans un contexte neuf sans cache, Service Worker ni bridage réseau, observateur avant navigation et viewport 320×800 : deux secondes depuis `load` sans requête pour l'image identifiable dont le bord supérieur est à 2 400 px sous le bord inférieur initial, puis requête sous deux secondes après la fin du défilement qui le place à 800 px. Avec neuf fixtures de 1 Mio, prolonger l'observation à cinq secondes sans défilement et vérifier au plus deux demandes/2 Mio.
13. Copier l'URL applicative d'une photo de contrôle et vérifier 200. Masquer la photo puis vérifier que la première nouvelle demande à cette même URL retourne 404 alors que l'objet privé existe encore ; répéter pour `pending`, `repair_required` et suppression. Vérifier aussi qu'anon ne peut pas lister le bucket.

## 8. Responsive et accessibilité

- Contrôler 320, 375, 768, 1 024 et 1 440 px sans débordement.
- Réaliser liste, création, édition, remplacement, réparation et suppression au clavier.
- Vérifier focus visible, cibles 44 px, erreurs associées, annonces pending/succès/erreur et dialogue titré.
- Sur Safari mobile réel, traiter une photo caméra orientée, une transparence, une photo Display-P3 et une image proche des limites ; faire un smoke Firefox et technologie d'assistance disponible.
- Mesurer une somme `layout-shift` de 0 attribuable aux conteneurs de galerie et ΔE2000 médian <=2/P95 <=5 sur les fixtures sRGB/P3.
- Rejouer le protocole lazy de l'étape 12 dans un contexte isolé neuf ; ne pas réutiliser le cache ou le Service Worker d'une vérification précédente.
- Formaliser d'abord `usability-test-protocol.md` avec données de départ, consignes, chronométrage, première tentative et grille anonymisée, puis le faire exécuter à un utilisateur cible non technique sans aide et consigner réussite/échec par tâche.

## 9. Preview autorisée

Avant une preview Netlify, vérifier explicitement le projet Supabase de test et sauvegarder/exporter les données utiles. Appliquer seulement la migration revue, configurer/vérifier le bucket privé par le script d'infrastructure avec sa clé `sb_secret_...` dédiée, révoquer cette clé et prouver son absence de Netlify, exécuter le bootstrap sous session admin normale, vérifier les neuf paires avant la bascule du frontend, puis contrôler handlers même origine `private, no-store`, révocation immédiate, cache de métadonnées `galerie`, réponses admin privées et journaux expurgés. Une consultation complète des neuf fixtures de 1 Mio doit rester à neuf invocations/9 Mio sans doublon ; consigner l'extrapolation fixe de 1 000 consultations à 9 000 invocations/9 000 Mio et sa comparaison aux quotas Netlify officiels en vigueur.

Ce guide n'autorise aucun push de configuration, migration de production, seed distant ni déploiement.
