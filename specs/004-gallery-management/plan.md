# Implementation Plan: Gestion de la galerie

**Branch**: `004-gallery-management` *(contexte Spec Kit ; branche Git de travail actuelle inchangée)* | **Date**: 2026-08-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-gallery-management/spec.md`

## Summary

Remplacer les neuf images statiques de `/galerie` par `public.photos_galerie` et livrer sous `/admin/galerie` les parcours unitaires de consultation, ajout, modification, visibilité, remplacement, suppression et réparation. Le navigateur inspecte chaque JPEG/PNG/WebP, applique l'orientation et la conversion sRGB, conserve la transparence, redimensionne sans agrandir, encode un WebP aux qualités 0,85/0,80/0,75 et retire les métadonnées avant un envoi direct vers le bucket privé `galerie`. Avant `ready`, la Server Action refuse les métadonnées Storage hors bornes, télécharge seulement le WebP final de 1 Mio maximum et revalide ses octets RIFF, ses dimensions et l'absence de métadonnées ; l'original de 8 Mio ne transite jamais par Netlify.

Une migration CLI étend la table existante par une machine d'état `ready|pending|repair_required`, durcit les limites textuelles et le plafond final de 1 Mio, limite la lecture publique aux lignes actives et cohérentes et autorise uniquement l'opération Storage de téléchargement d'un chemin encore référencé par une telle ligne. Deux Route Handlers même origine servent les octets : le public relit l'ID, l'état et le chemin sous RLS à chaque requête ; l'administratif réautorise la session avant la miniature. Ils répondent `private, no-store`, ne divulguent jamais le chemin Storage et n'utilisent aucun lien signé durable. Un configurateur d'infrastructure fail-closed rend et vérifie le bucket privé via l'API Storage avec un credential privilégié fourni uniquement à ce script et une cible explicitement autorisée. Un bootstrap idempotent séparé utilise `sharp` épinglé comme outil de développement uniquement pour convertir les neuf JPEG connus en WebP déterministes, exige ce bucket privé, contrôle un manifeste SHA-256, puis réserve, téléverse, revalide et finalise ces objets sous une session administrateur normale. Les Server Actions réautorisées et les étapes PostgreSQL/Storage utilisent des compensations idempotentes, réconcilient les `pending` âgés d'au moins 10 minutes et marquent les objets confirmés absents. La lecture publique des métadonnées porte le tag Cache Components `galerie`; les octets, l'administration et les décisions de session ne sont jamais mis en cache partagé.

## Technical Context

**Language/Version**: TypeScript strict 5.9.x, SQL PostgreSQL 17/Supabase, Node.js 22 LTS, APIs Web modernes Canvas/ImageBitmap

**Primary Dependencies**: Next.js 16.3.0, React 19.2.8, `@supabase/supabase-js` 2.112.2, `@supabase/ssr` 0.12.4, Zod 4.4.3 ; aucune bibliothèque d'image dans le client ou le runtime applicatif ; `sharp` 0.35.3 épinglé exactement en devDependency et dans le lockfile uniquement pour produire les neuf WebP du bootstrap ; Supabase CLI 2.112.0, Playwright 1.62.1 et `@axe-core/playwright` 4.12.1 pour les contrôles

**Storage**: Table existante `public.photos_galerie` étendue par l'état d'opération et les chemins de compensation ; bucket privé `galerie`, objets canoniques `photos/<uuid-v4>.webp` pour les nouveaux fichiers, lecture contrôlée des JPEG/PNG hérités et bootstrap applicatif idempotent des neuf assets initiaux

**Testing**: pgTAP via Supabase CLI, `node:test` pour validation/inspection/RIFF/orchestration pure avec adaptateurs injectés, corpus exact F01–F20 incluant APNG/WebP animé, deux fixtures RGBA de 25 positions couvrant sans redimensionnement (±1) et redimensionnement (±3), SSIM déterministe des neuf sorties bootstrap sur luminance sRGB 8 bits avec fenêtre gaussienne 11 × 11, corpus colorimétrique versionné de six images et 150 échantillons CIEDE2000 en Lab D65/2°, Playwright Chromium/WebKit pour les pixels Canvas réels, protocole lazy en contexte isolé sans cache ni Service Worker, tests Storage avec rôles/opérations réels et révocation de la même URL applicative après masquage, tests de contrats HTTP publics/admin, matrice de contournement serveur, 12 scénarios d'interruption nommés C1–C4/R1–R5/D1–D3, Axe, test utilisateur standardisé, contrôle manuel Safari mobile/Firefox/technologie d'assistance, ESLint, `tsc --noEmit`, build Next.js, types générés, advisors et scan de secrets

**Target Platform**: Netlify avec l'adaptateur Next.js courant, Supabase PostgreSQL/Auth/Storage hébergé, navigateurs modernes desktop et mobile ; pile locale Supabase sous Docker pour migrations et tests

**Project Type**: Application web Next.js App Router unique avec PostgreSQL/Auth/Storage gérés par Supabase

**Performance Goals**: ajout complet par une personne non technique en moins de 3 minutes ; état administratif correct dès le premier rendu suivant la réponse de mutation sans actualisation manuelle et projection publique mise à jour en moins de 5 secondes après mutation confirmée ; somme des `layout-shift` attribuables aux images égale à 0 ; aucune requête initiale pour une image différée située à au moins trois hauteurs de viewport sous le pli, puis requête sous deux secondes à une hauteur de viewport ; avec neuf objets de 1 Mio, au plus deux requêtes/2 Mio avant le premier défilement et au plus neuf invocations/9 Mio pour une consultation complète, soit un budget mensuel de contrôle de 9 000 invocations/9 000 Mio pour 1 000 consultations ; conversion colorimétrique de 150 échantillons avec ΔE2000 médian <=2 et P95 <=5 ; fidélité des neuf sorties bootstrap avec SSIM >=0,97 ; traitement borné à une image et au plus 15 encodages ; ordre stable de 100 photos sur 20 actualisations ; pages administratives stables de 100 éléments à partir de la 101e photo

**Constraints**: entrée fixe JPEG/PNG/WebP de 1 octet à 8 Mio, APNG/WebP animé refusés, 25 000 000 pixels et 8 192 px par côté au maximum ; sortie WebP de 1 Mio maximum, côté long initial au plus 1 600 px et jamais sous 1 200 px sauf original plus petit ; qualités fermées 0,85/0,80/0,75 ; alpha conservé selon les deux oracles RGBA, pixels sRGB, zéro métadonnée ; projection et lecture d'octets publiques limitées à `actif=true AND file_state='ready'`, bucket privé, réponse image `private, no-store`, aucun lien signé durable ni chemin Storage exposé ; aucune clé privilégiée dans le runtime ou le navigateur, aucun cache admin/session/octet ; aucun original ne transite par Netlify mais le WebP final <=1 Mio transite une fois pour validation puis à chaque lecture publique autorisée ; `pending` est réconcilié après 10 minutes ; design public inchangé

**Scale/Scope**: un administrateur, neuf images reprises, quelques dizaines à quelques centaines de photos, cinq variantes fermées, quatre routes administratives concernées (`/admin`, liste, création et modification), actions de réservation/finalisation/métadonnées/visibilité/remplacement/suppression/réparation et un tag de cache public

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Evidence |
| --- | --- | --- |
| Périmètre MVP | PASS | Le plan couvre uniquement la galerie publique et son CRUD unitaire ; albums, lot, édition avancée, réseau social, réservation et paiement restent exclus. |
| Sources de vérité | PASS | `doc/spec.md`, `doc/design.md`, `doc/architecture.md`, `doc/infra.md`, les guides Next.js 16.3 installés et la documentation/changelog Supabase actuels ont été consultés. |
| Fidélité visuelle et accessibilité | PASS | Les cinq variantes, grilles, tokens, typographies, transitions, breakpoints, focus, annonces et cibles tactiles documentés sont conservés. |
| Architecture Next.js côté serveur | PASS | Pages/listes restent Server Components ; seule la préparation/aperçu/upload et les contrôles interactifs sont clients ; les mutations sont des Server Actions. |
| Sécurité Supabase en profondeur | PASS | Le bucket privé, le prédicat administrateur courant, les GRANT explicites, RLS table/Storage bornée aux opérations de téléchargement et les chemins UUID se cumulent ; aucune `service_role` n'est ajoutée. |
| Intégrité et reproductibilité | PASS | Une migration CLI ajoute contraintes, état réparable, politiques/index ; conformément au principe VI v1.1.0, le bucket géré par Supabase est configuré par un script API versionné, idempotent et fail-closed, tandis que le bootstrap borné coordonne les neuf lignes/objets sans SQL direct sur `storage.objects`. |
| Cache et confidentialité | PASS | Seules les métadonnées publiques cohérentes reçoivent `use cache`; les octets sont réautorisés à chaque requête et servis `private, no-store`; admin, session et opérations à réparer restent hors cache partagé. |
| Vérification | PASS | La matrice couvre formats, dimensions, encodage, métadonnées, rôles, opérations partielles, cache, responsive, accessibilité et preview Netlify. |
| Documentation synchronisée | PASS | `doc/spec.md`, `doc/design.md`, `doc/architecture.md` et `doc/infra.md` sont alignés sur WebP, sRGB, état de réparation et limites. |

## Project Structure

### Documentation (this feature)

```text
specs/004-gallery-management/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── usability-test-protocol.md # Produit et exécuté pendant la validation
├── contracts/
│   ├── gallery-data.md
│   ├── gallery-actions.md
│   ├── image-pipeline.md
│   ├── admin-gallery-ui.md
│   └── verification.md
└── tasks.md                 # Produit ensuite par $speckit-tasks
```

### Source Code (repository root)

```text
.
├── .env.gallery-config.example
├── next.config.ts
├── app/
│   ├── api/
│   │   ├── gallery-images/[id]/route.ts
│   │   └── admin/gallery-images/[id]/route.ts
│   ├── globals.css
│   ├── (public)/galerie/
│   │   ├── page.tsx
│   │   ├── loading.tsx
│   │   └── error.tsx
│   └── (admin)/admin/(protected)/
│       ├── layout.tsx
│       ├── page.tsx
│       └── galerie/
│           ├── page.tsx
│           ├── loading.tsx
│           ├── error.tsx
│           ├── nouvelle/page.tsx
│           ├── [id]/modifier/page.tsx
│           ├── _actions/gallery-actions.ts
│           └── _components/
│               ├── gallery-form.tsx
│               ├── gallery-list.tsx
│               ├── image-preparation.tsx
│               ├── pending-operation-reconciler.tsx
│               ├── gallery-visibility-form.tsx
│               ├── delete-gallery-photo-dialog.tsx
│               └── repair-gallery-photo-form.tsx
├── components/
│   ├── gallery-image.tsx
│   ├── gallery-grid.tsx
│   └── social-gallery.tsx
├── lib/
│   ├── data/gallery.ts
│   ├── gallery/
│   │   ├── constants.ts
│   │   ├── types.ts
│   │   ├── query-contract.ts
│   │   ├── mappers.ts
│   │   ├── action-core.ts
│   │   ├── file-operation-core.ts
│   │   ├── image-inspection.ts
│   │   ├── image-processing.ts
│   │   ├── webp-riff.ts
│   │   ├── published-image-validation.ts
│   │   ├── diagnostics.ts
│   │   ├── image-delivery.ts
│   │   └── e2e-scenario.ts
│   └── validations/gallery.ts
├── supabase/
│   ├── migrations/<cli-timestamp>_gallery_management.sql
│   └── tests/database/09_gallery_management.sql
├── tests/
│   ├── unit/gallery/
│   └── gallery-management/
├── scripts/
│   ├── configure-gallery-bucket.mjs
│   ├── check-gallery-management.mjs
│   ├── bootstrap-gallery-data.mjs
│   ├── bootstrap-gallery.mjs
│   ├── check-gallery-bootstrap.mjs
│   └── run-gallery-scenario-tests.mjs
└── specs/004-gallery-management/
    ├── usability-test-protocol.md
    └── validation-report.md
```

**Structure Decision**: Conserver l'application unique et les groupes de routes existants. La galerie publique garde sa composition et délègue seulement ses données à des composants réutilisables. La liste admin reste serveur ; le formulaire client imbriqué possède la sélection, l'aperçu et l'envoi Storage. Les inspections binaires, la transformation d'image et l'orchestration sont des modules purs testables sous `lib/gallery/`, sans client Supabase ni secret.

**Infrastructure Configuration Boundary**: En `--local`, le configurateur refuse toute cible non loopback et vérifie la configuration issue de `supabase/config.toml` avec les credentials éphémères de la CLI. Pour une cible hébergée, il exige `SUPABASE_GALLERY_CONFIG_URL`, `SUPABASE_GALLERY_CONFIG_PROJECT_REF` et une clé Supabase dédiée au format `sb_secret_...` dans `SUPABASE_GALLERY_CONFIG_SECRET_KEY`, jamais la clé JWT historique `service_role`. La clé possède les privilèges élevés documentés par Supabase : elle est créée pour cette maintenance ponctuelle, injectée dans le seul processus du script, jamais chargée par Next.js, Netlify, le bootstrap CRUD ou le navigateur, puis révoquée après vérification de la postcondition. Le script refuse une URL/référence distante non explicitement concordante, masque la valeur dans toute sortie et ne considère la configuration réussie qu'après relecture du bucket privé, de la limite 8 Mio et des MIME autorisés.

**Data Boundaries**: `getPublicGalleryPhotos()` utilise le client anonyme sans cookies, sélectionne des colonnes explicites, filtre exactement `actif=true AND file_state='ready'`, transforme chaque ID en URL même origine `/api/gallery-images/<id>`, trie par section/ordre/date/ID et porte `use cache`, `cacheLife("days")`, `cacheTag("galerie")`. Ni `storage_path` ni URL Storage n'entrent dans le DTO ou le cache public. Les lectures admin utilisent le client SSR après `requireAdminPage()`, sélectionnent toutes les lignes et tous les états utiles, et ne sont jamais cachées.

**Image Boundary**: Le navigateur effectue un préflight binaire défensif qui refuse notamment APNG et WebP animé, un décodage orienté, un dessin sur Canvas sRGB avec alpha, une boucle dimension/qualité bornée, une exportation WebP vérifiée et une sanitation RIFF retirant `ICCP`, `EXIF`, `XMP ` et tout bloc inconnu. L'aperçu utilise exactement le Blob final qui sera envoyé. Une fixture RGBA non redimensionnée versionne 25 coordonnées (0/255 exacts, intermédiaires ±1) et une fixture 2 000 × 1 000 redimensionnée en 1 600 × 800 versionne 25 positions d'un gradient alpha analytique (extrémités exactes, intermédiaires ±3). La finalisation consulte d'abord les métadonnées Storage, refuse sans téléchargement tout objet hors MIME/poids, puis télécharge le chemin réservé exact avec le client SSR administrateur et passe ses octets au validateur RIFF pur partagé. Seul un objet concordant peut devenir `ready`.

**Mutation Boundaries**: Les opérations suivent `requireAdminAction()` → Zod → mutation ciblée sous RLS → vérification de l'état/`operation_id` → appel Storage direct côté navigateur lorsque requis → téléchargement/validation serveur du WebP final → finalisation/compensation → `updateTag("galerie")` dès que la projection publique change. La politique Storage INSERT exige un WebP correspondant à une réservation `pending` existante ; DELETE exige que le chemin soit encore référencé comme courant, en attente ou à nettoyer. Create, replace et delete utilisent des chemins nouveaux ou exacts, jamais un nom fourni ni un upsert du fichier courant.

**Repair Boundary**: L'état `pending` masque la ligne avant toute étape pouvant désynchroniser les ressources. À l'entrée dans la liste, un Client Component minimal appelle une Server Action réautorisée qui inspecte les seuls `pending` âgés d'au moins 10 minutes et les convertit en `repair_required/stale_pending_object_present` ou `repair_required/stale_pending_no_object` selon l'inspection, sans suppression automatique. Une miniature admin en erreur peut appeler l'audit ciblé du chemin relu côté serveur et produire une enveloppe `replace` idempotente `object_missing` sans nouveau chemin ; le remplacement doit encore réserver explicitement son WebP, et la suppression démarre sa propre opération. L'image publique utilise un petit composant client qui retire seulement la carte cassée de la vue courante. Les reprises vérifient l'identifiant d'opération et restent idempotentes.

**Interruption Boundary**: La campagne injecte exactement C1–C4 pour la création, R1–R5 pour le remplacement et D1–D3 pour la suppression aux points contractualisés par SC-006. Chaque fixture fixe l'état de la ligne, la présence des chemins courant/réservé/à nettoyer, l'identifiant d'opération et le résultat après rechargement puis reprise. C4 et D3 prouvent la répétition idempotente après convergence ; les dix autres cas prouvent le masquage public et une compensation limitée aux chemins persistés de l'opération.

**Bootstrap Boundary**: `sharp` 0.35.3 est épinglé exactement dans `package.json` et `package-lock.json` comme outil Node de développement, jamais importé hors `scripts/bootstrap-gallery.mjs` ni par `app/`, `components/` ou `lib/` runtime ; un contrôle automatisé échoue sur toute dérive de version ou d'import. Le script lit uniquement les neuf chemins fermés, vérifie leurs SHA-256 d'entrée, applique orientation/sRGB/WebP sans métadonnées, puis compare chaque sortie à la source opaque orientée, convertie en sRGB et redimensionnée aux dimensions exactes de sortie. Le SSIM >=0,97 est calculé sur `Y=0,299R+0,587G+0,114B` en sRGB 8 bits non linéaire, avec fenêtre gaussienne 11 × 11, sigma 1,5, `K1=0,01`, `K2=0,03`, `L=255`, extension réfléchie et moyenne de toutes les fenêtres centrées sur les pixels de sortie. Le script valide ensuite dimensions, SHA-256 et octets de sortie, puis utilise le client Supabase authentifié administrateur et la même saga de réservation/upload/validation/finalisation. Une divergence arrête le script sans écrasement.

**Color Verification Boundary**: Le manifeste opaque versionne, pour chacune des trois images sRGB et trois Display-P3, 25 coordonnées normalisées `(u,v)` dans `[0,1]²` et leurs triplets sRGB 8 bits attendus. La coordonnée sélectionne le pixel borné `floor(u×(largeur−1)+0,5), floor(v×(hauteur−1)+0,5)`. Les pixels de l'aperçu et du WebP finalisé sont convertis de sRGB vers CIE Lab D65, observateur 2°, sans adaptation D50, puis comparés par CIEDE2000 ; la médiane et le P95 par rang le plus proche, rang 143 sur 150 en base 1, doivent respecter respectivement 2 et 5.

**Public Image Delivery**: Le bucket `galerie` est privé. `GET /api/gallery-images/[id]` valide le paramètre asynchrone avec le schéma Zod UUID partagé, utilise un client anonyme sans cookies, relit la ligne active et `ready`, obtient uniquement son chemin serveur, puis télécharge l'objet privé avec l'option fetch `cache:'no-store'` sous une politique Storage SELECT limitée par `storage.allow_any_operation(array['object.get_authenticated_info', 'object.get_authenticated'])` et par l'existence de cette ligne publique. Il revalide donc le contexte public anonyme, pas une identité inexistante. Une demande de liste anonyme reste refusée. `GET /api/admin/gallery-images/[id]` applique le même schéma UUID, réautorise la session courante, relit la ligne et sert la miniature de tous les états administrables. Les deux handlers transmettent le Blob sans transformation avec type contrôlé, `Content-Disposition:inline`, `X-Content-Type-Options:nosniff` et `Cache-Control:private, no-store`; 404 masque cible, état et objet absents, et aucune réponse ne contient le chemin Storage. Les liens signés sont exclus car leur durée pourrait dépasser un masquage. `next/image` utilise ces URLs même origine avec dimensions/`sizes` explicites et `unoptimized`; aucun `remotePatterns` Supabase n'est requis pour la galerie. Le premier écran seul peut être eager ; les autres images sont lazy sans priorité. Le contrôle réseau conserve le protocole SC-012, applique le budget SC-026 et teste en plus que la même URL retourne 404 dès la première requête après masquage, passage `pending|repair_required` ou suppression.

## Phase 0: Research

[research.md](./research.md) fixe les décisions Next.js, Supabase, encodage, état réparable, migration, cache et vérification. Aucune incertitude technique ne reste ouverte ; la conversion sRGB est nécessaire pour retirer les profils sans altérer les couleurs.

## Phase 1: Design & Contracts

- [data-model.md](./data-model.md) décrit `photos_galerie`, la machine d'état, les chemins de compensation, DTO et transitions.
- [contracts/gallery-data.md](./contracts/gallery-data.md) fixe les lectures publiques/administratives, colonnes, ordre, URL et cache.
- [contracts/gallery-actions.md](./contracts/gallery-actions.md) fixe les opérations de réservation, finalisation, modification, visibilité, remplacement, suppression et réparation.
- [contracts/image-pipeline.md](./contracts/image-pipeline.md) fixe les signatures, bornes, orientation, sRGB, alpha, boucle WebP et sanitation.
- [contracts/admin-gallery-ui.md](./contracts/admin-gallery-ui.md) fixe les routes, états, aperçu, dialogues et responsive/accessibilité.
- [contracts/verification.md](./contracts/verification.md) relie les exigences aux contrôles pgTAP, unitaires, Storage, Playwright, Netlify et manuels.
- [quickstart.md](./quickstart.md) fournit la validation reproductible locale et les gates de déploiement.

### Post-design Constitution Re-check

| Gate | Status | Design confirmation |
| --- | --- | --- |
| Périmètre MVP | PASS | Les contrats ne couvrent que les cinq histoires de galerie et excluent explicitement lot, retouche, réseau social et backend séparé. |
| Sécurité en profondeur | PASS | Bucket privé, handlers HTTP réautorisés, garde serveur, prédicat courant, GRANT, RLS par opération, chemin réservé, type WebP, état masqué et vérification de résultat se cumulent. |
| Next.js 16 | PASS | Server/Client boundaries, `useActionState`, Cache Components, `updateTag`, APIs de requête asynchrones, Suspense et `error.tsx` suivent les guides installés. |
| Intégrité et reproductibilité | PASS | Migration CLI pour SQL/RLS/GRANT, configurateur API Storage versionné conforme au principe VI v1.1.0, machine d'état contrainte, compensation idempotente, bootstrap déterministe et tests rôles/Storage sont contractualisés. |
| Design et accessibilité | PASS | La grille publique et les tokens restent inchangés ; liste mobile, labels, focus, annonces, aperçu et confirmations respectent `doc/design.md`. |
| Erreurs et confidentialité | PASS | Les états fermés distinguent validation/session/réseau/quota/interne/réparation sans révéler d'erreur brute ni faux succès. |
| Cache et déploiement | PASS | Seules les métadonnées de la projection anonyme `actif=true AND file_state='ready'` sont partagées ; les téléchargements amont et réponses d'octets sont `no-store`; chaque masquage expire immédiatement `galerie`; la preview vérifie Netlify/CDN. |
| Documentation synchronisée | PASS | Les quatre documents maîtres reflètent les décisions structurantes du plan. |

## Complexity Tracking

Aucune violation de la constitution ne nécessite de dérogation. Les colonnes d'opération supplémentaires remplacent une table d'historique plus complexe et constituent le minimum permettant une reprise durable et testable entre PostgreSQL et Storage. Les deux Route Handlers et le configurateur isolé sont la complexité minimale pour réautoriser chaque octet sans backend séparé ni secret dans le runtime. La dépendance `sharp` est limitée aux scripts de bootstrap reproductibles : elle résout le besoin ponctuel de convertir les neuf JPEG initiaux sans agrandir le bundle ni le runtime applicatif.
