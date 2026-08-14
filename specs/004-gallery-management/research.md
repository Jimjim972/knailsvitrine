# Research: Gestion de la galerie

## Decision 1: réutiliser la fondation Supabase existante

**Decision**: Conserver `public.photos_galerie`, le bucket `galerie` en le configurant privé, les chemins `photos/<uuid-v4>.<extension>`, le client publiable, les politiques séparées et `private.is_current_admin()`. Ajouter les contraintes, états et politiques nécessaires à 004 dans une migration créée par `npx supabase migration new gallery_management`; coordonner séparément les neuf objets et lignes initiaux avec un bootstrap idempotent utilisant une session admin et une cible vérifiées. La configuration du bucket passe par `supabase/config.toml` en local et par un script API fail-closed avec une clé Supabase dédiée `sb_secret_...`, injectée ponctuellement puis révoquée, pour une cible hébergée dont URL et référence concordent explicitement, jamais par une écriture SQL dans le schéma Storage, une clé JWT historique `service_role` ou le runtime applicatif.

**Rationale**: Les fonctionnalités 001/002 fournissent déjà table, trigger, index, GRANT, RLS, Storage, session courante et clients SSR/navigateur. Le changelog Supabase du 28 avril 2026 impose de considérer l'exposition Data API et les GRANT séparément ; la fondation utilise déjà des GRANT explicites et n'active pas l'auto-exposition.

**Alternatives considered**:

- Nouvelle table ou nouveau bucket : rejetés, le bucket existant peut être rendu privé sans déplacer les objets.
- Clé `service_role` pour simplifier le CRUD : rejetée, elle contournerait RLS et ne peut pas atteindre le navigateur.
- Rôle lu uniquement depuis le JWT : rejeté, le claim peut rester ancien ; le prédicat courant relit `auth.users` et `auth.sessions`.
- Insertion SQL de neuf lignes `ready` dans la migration : rejetée, SQL ne téléverse pas les octets Storage et créerait temporairement des références cassées.

## Decision 2: persister une machine d'état de fichier sur la photo

**Decision**: Ajouter à `photos_galerie` `file_state`, `operation_kind`, `operation_id`, `pending_storage_path`, `cleanup_storage_path`, `operation_started_at` et `repair_code`. Les valeurs sont fermées et contraintes : `ready` ne conserve aucune opération ; `pending` et `repair_required` possèdent une opération/id/date et uniquement les chemins compatibles avec le type d'opération. Les anciens enregistrements deviennent `ready`.

**Rationale**: PostgreSQL et Storage ne partagent pas de transaction. La spécification exige qu'un rechargement retrouve une opération partielle masquée et réparable. Les colonnes conservent le minimum nécessaire à une compensation idempotente sans introduire une table d'historique hors MVP.

**Alternatives considered**:

- Simple booléen `needs_repair` : rejeté, il n'indique ni l'étape ni les chemins sûrs à reprendre.
- Table d'opérations séparée : rejetée pour le MVP ; elle devient utile seulement pour un historique ou plusieurs opérations concurrentes.
- Écrire dans `storage.objects` : rejeté, Supabase demande de traiter le schéma Storage en lecture seule et d'utiliser l'API pour les objets.

## Decision 3: limiter la projection publique à une paire cohérente

**Decision**: La politique publique, le filtre applicatif et l'index partiel utilisent `actif = true AND file_state = 'ready'`. L'administrateur voit tous les états sous sa politique additionnelle. Le bucket est privé. Une politique Storage SELECT anonyme autorise seulement les opérations `object.get_authenticated_info` et `object.get_authenticated`, pour un chemin encore référencé par une ligne active et `ready`; la liste reste interdite. Les pages ne reçoivent jamais ce chemin : un Route Handler même origine relit la ligne et télécharge l'objet à chaque demande.

**Rationale**: Le double filtre évite qu'une erreur applicative expose une ligne non cohérente et RLS demeure la barrière de données et d'octets. Supabase documente qu'un bucket public contourne le contrôle d'accès au téléchargement ; il ne peut donc pas satisfaire la révocation immédiate exigée lors d'un masquage. Le bucket privé, la politique par opération et la relecture d'état rendent la même adresse applicative inutilisable dès le changement.

**Alternatives considered**:

- Bucket public : rejeté, une URL connue continuerait à servir un objet masqué.
- URLs signées : rejetées, une URL déjà émise resterait valide pendant son TTL et contredirait la révocation à la première requête suivant le masquage.
- Filtre seulement dans React : rejeté, il ne protège pas un appel Data API direct.

## Decision 4: utiliser une saga compensatoire idempotente

**Decision**: Réserver côté serveur un `operation_id` et les chemins exacts, masquer la ligne avant l'étape Storage, transférer directement depuis le navigateur, puis finaliser côté serveur. Le remplacement utilise un nouveau chemin et retire ensuite l'ancien ; la suppression retire d'abord l'objet puis la ligne. Toute étape partielle conserve `repair_required`. Une reprise compare l'`operation_id`, inspecte le chemin réservé, accepte qu'un objet soit déjà absent lors d'un nettoyage et ne lit jamais un chemin libre fourni par le client.

**Rationale**: Il n'existe pas de transaction atomique entre Postgres et l'API Storage. L'ordre et les compensations rendent chaque interruption observable, masquée et récupérable sans annoncer de faux succès.

**Alternatives considered**:

- Supprimer la ligne avant l'objet : rejeté, le chemin de nettoyage serait perdu.
- Écraser l'objet courant avec `upsert` : rejeté, Supabase recommande un nouveau chemin pour éviter le contenu CDN périmé ; un upsert exige aussi SELECT+INSERT+UPDATE.
- RPC privilégiée réalisant tout : rejetée, elle ne peut pas rendre l'opération Storage atomique.

## Decision 5: envoyer directement un WebP réservé

**Decision**: La Server Action réserve `photos/<uuid-v4>.webp`. Le navigateur envoie le Blob final avec la session admin, `contentType: image/webp` et `upsert:false`. La finalisation refuse d'abord les métadonnées Storage hors MIME/poids, télécharge ensuite l'objet réservé de 1 Mio maximum avec la session admin et valide ses octets RIFF/dimensions/chunks avant `ready`. Les politiques INSERT des nouveaux objets se resserrent sur `.webp`; SELECT/DELETE gardent JPEG/PNG/WebP pour les données héritées.

**Rationale**: Le fichier final est inférieur à 1 Mio, donc l'upload standard Supabase est largement sous le seuil conseillé de 6 Mo. L'original de 8 Mio ne traverse pas Netlify ; la relecture unique du WebP final restaure une frontière d'intégrité serveur compatible avec FR-010 et la constitution.

**Alternatives considered**:

- Fichier dans une Server Action : rejeté, cela traverse Netlify et élargit la limite de corps sans bénéfice.
- TUS resumable : rejeté, inutile pour des sorties de 1 Mio maximum.

## Decision 6: employer une chaîne d'image native et bornée

**Decision**: Utiliser un module client sans dépendance runtime : préflight `ArrayBuffer`, décodage `createImageBitmap` avec orientation de la source, repli `HTMLImageElement`, Canvas 2D sRGB avec alpha, export `toBlob('image/webp', qualité)` et sanitation RIFF interne. Une génération/token annule les résultats obsolètes ; une seule image et un seul encodage sont actifs. Le parseur/validateur RIFF reste pur afin d'être réutilisé par la finalisation serveur.

**Rationale**: Les navigateurs cibles prennent en charge Canvas, ImageBitmap et WebP. `sharp` est une dépendance transitive serveur de Next.js et ne convient pas au navigateur. Les bibliothèques examinées n'apportent pas simultanément la séquence exacte de qualités, l'orientation, sRGB, le contrôle RIFF et la suppression vérifiée des métadonnées.

**Alternatives considered**:

- `sharp` sur Netlify : rejeté, déterministe mais contraire au flux direct et plus coûteux.
- `browser-image-compression` : rejeté, son algorithme ne garantit pas la séquence qualité/dimension imposée ni les chunks finaux.
- `pica` : rejeté à ce stade ; à reconsidérer seulement si des fixtures visuelles montrent une qualité de redimensionnement native insuffisante.

## Decision 7: inspecter le conteneur avant décodage

**Decision**: Vérifier la taille du fichier, la signature et la structure bornée de JPEG, PNG ou WebP, extraire les dimensions sans décodage complet, refuser PNG/WebP animés, troncatures et incohérences MIME/signature, puis appliquer les plafonds 8 192 px et 25 000 000 pixels. Le décodage doit confirmer des dimensions égales ou échangées par l'orientation.

**Rationale**: `File.type` et l'extension sont déclaratifs. Le préflight limite les bombes de décompression et permet le refus demandé avant allocation d'environ quatre octets ou plus par pixel.

**Alternatives considered**:

- Faire confiance à `accept`/MIME : rejeté, contournable.
- Décoder puis vérifier : rejeté, trop tard pour les limites de mémoire.

## Decision 8: convertir en sRGB puis retirer tous les chunks annexes

**Decision**: Dessiner la source profilée dans un Canvas demandé en sRGB, conserver un fond transparent, puis retirer du WebP généré `ICCP`, `EXIF`, `XMP ` et tout chunk non nécessaire. Nettoyer les flags correspondants de `VP8X`, recalculer tailles/padding RIFF et revalider le fichier. Sans ICC, le WebP final est interprété sRGB.

**Rationale**: Supprimer un profil sans convertir les pixels peut changer les couleurs ; conserver le profil contredirait l'exigence de zéro métadonnée. Canvas effectue la conversion vers son espace de destination, puis la sanitation garantit le résultat inspectable.

**Alternatives considered**:

- Conserver ICC : rejeté par FR-037.
- Supprimer ICC sans conversion : rejeté pour les dérives de peau et de vernis.
- Refuser Display-P3 : rejeté, inutilement restrictif pour les photos iPhone.

La conservation alpha est vérifiée indépendamment de la couleur par deux fixtures RGBA versionnées. La première, non redimensionnée, contient 25 coordonnées et leurs valeurs alpha 8 bits : 0/255 restent exacts et les intermédiaires tolèrent ±1. La seconde mesure 2 000 × 1 000, porte un gradient alpha horizontal analytique et est redimensionnée en 1 600 × 800 ; ses 25 positions normalisées attendent `arrondi(255 × u)`, avec extrémités exactes et intermédiaires à ±3. Ces oracles couvrent les deux branches sans réduire « alpha conservé » à une appréciation visuelle.

## Decision 9: fixer une recherche dimension/qualité déterministe

**Decision**: Commencer au côté long `min(original, 1600)`, essayer 0,85, 0,80 puis 0,75, puis réduire le côté long par pas de 100 px jusqu'à 1 200 px et recommencer. Un original inférieur à 1 200 px n'a qu'une dimension candidate. Accepter le premier Blob vérifié de 1 048 576 octets maximum ; sinon refuser. Le maximum est de 15 encodages.

**Rationale**: La qualité Canvas est un indice propre au navigateur ; seul le nombre d'octets produit est normatif. La séquence fixe rend les tests et les coûts CPU/mémoire bornés.

**Alternatives considered**:

- Recherche binaire continue : rejetée, elle crée plus de variantes difficiles à accepter et ne suit pas la clarification.
- Descendre sous 0,75 ou 1 200 px : rejeté par les décisions utilisateur.

## Decision 10: séparer cache public et administration

**Decision**: `getPublicGalleryPhotos()` utilise le client anonyme sans cookies, `use cache`, `cacheLife('days')` et `cacheTag('galerie')`. Les lectures admin restent SSR par requête sans cache. Chaque succès public et chaque masquage de sécurité confirmé appellent `updateTag('galerie')`; une opération partielle qui passe à réparer invalide aussi le tag sans annoncer un succès utilisateur.

**Rationale**: Next.js 16.3 distingue `updateTag`, immédiatement cohérent après Server Action, de `revalidateTag`, stale-while-revalidate. Le cache ne doit contenir aucune ligne masquée, état de réparation ou session.

**Alternatives considered**:

- Même tag que les prestations : rejeté, les domaines évoluent indépendamment.
- `refresh()` seul : rejeté, il ne périme pas la donnée cachée.
- Cache SSR admin : rejeté, risque de fuite et de session périmée.

## Decision 11: servir les images privées par contrats HTTP réautorisés

**Decision**: Utiliser `next/image` avec une URL même origine construite uniquement depuis l'ID (`/api/gallery-images/<id>`), `width`/`height` ou parent dimensionné avec `fill`, `sizes` exact, alt obligatoire et `unoptimized`. Le Route Handler public valide l'UUID asynchrone, relit la ligne active/`ready` avec un client anonyme, télécharge le chemin privé sous RLS et répond avec type contrôlé, `Content-Disposition:inline`, `X-Content-Type-Options:nosniff` et `Cache-Control:private, no-store`; cible, état ou objet absents produisent le même 404 sûr. Un handler administratif séparé exige la session courante et sert les miniatures de tous les états. Seules les images du premier écran peuvent être eager.

**Rationale**: Les fichiers sont déjà redimensionnés/compressés, donc `unoptimized` évite un second encodage. Le transit via le handler ajoute un coût Netlify borné à 1 Mio par lecture, mais c'est la solution la plus simple qui réautorise réellement chaque demande sans secret privilégié ni lien survivant à un masquage. Une URL même origine ne requiert pas `remotePatterns`.

**Alternatives considered**:

- Optimisation Next pour chaque fichier : rejetée, elle réencode inutilement et son fetch interne ne propage pas les en-têtes d'authentification.
- URL Storage privée exposée au client : rejetée, elle révèle le chemin et exige une politique publique plus difficile à borner.
- `<img>` persistant : rejeté, il perd les garde-fous intégrés de dimension/lazy loading ; il reste approprié uniquement pour l'aperçu `blob:` temporaire.

## Decision 12: vérifier par couches et sur les navigateurs cibles

La campagne couvre aussi le corpus exact F01–F20, les deux oracles alpha RGBA de 25 positions et la frontière du bucket privé : le téléchargement et la même URL applicative fonctionnent seulement pour une ligne active/`ready`, puis sont refusés dès son masquage, son passage non `ready` ou sa suppression ; la liste Storage anonyme reste refusée.

**Decision**: Étendre pgTAP pour contraintes/GRANT/RLS/index et opérations Storage, le script Storage pour rôles/chemins/bucket privé, `node:test` pour parsers/RIFF/états/actions/handlers avec adaptateurs injectés, Playwright Chromium/WebKit pour Canvas réel, parcours, révocation de la même URL et pannes, puis contrôler Safari mobile réel avec JPEG orienté, PNG transparent, image P3 et limite mémoire. La fidélité du bootstrap exige dimensions à un pixel près et SSIM >=0,97 entre la sortie et la source opaque orientée/sRGB aux dimensions exactes de sortie, sur luminance sRGB 8 bits `Y=0,299R+0,587G+0,114B`, fenêtre gaussienne 11×11 sigma 1,5, `K1=0,01`, `K2=0,03`, `L=255`, bords réfléchis et moyenne de tous les pixels. La couleur utilise six images opaques, 150 coordonnées `(u,v)` dans `[0,1]²` et leurs triplets sRGB 8 bits : pixel borné `floor(u×(largeur−1)+0,5), floor(v×(hauteur−1)+0,5)`, conversion vers Lab D65/2° sans adaptation D50, CIEDE2000, médiane et P95 au rang 143. Le lazy loading se mesure en contexte neuf sans cache ni Service Worker, observateur avant navigation, viewport 320 × 800 px, délai initial depuis `load`, seuils de 2 400 px et 800 px et délai post-défilement. Ajouter la matrice serveur d'objets mensongers, les 12 interruptions nommées C1–C4/R1–R5/D1–D3 et un protocole utilisateur standardisé. Exécuter reset, lint/advisors, types, build et scan de secrets avant livraison.

**Rationale**: Les garanties se répartissent entre navigateur, application, base et Storage ; aucun niveau seul ne prouve la fonctionnalité. Le changelog consulté ne contient aucun breaking change galerie incompatible, mais confirme Node 22 et les GRANT explicites.

**Alternatives considered**:

- Tests navigateur seuls : rejetés, ils ne prouvent pas les appels directs ni les contraintes SQL.
- Tests locaux présentés comme validation de production : rejetés, Netlify/CDN et la configuration Supabase hébergée exigent une preview autorisée.

## Decision 13: convertir le bootstrap avec un outil Node isolé

**Decision**: Épingler exactement `sharp@0.35.3` en devDependency dans `package.json` et `package-lock.json` et l'utiliser exclusivement dans `scripts/bootstrap-gallery.mjs` pour convertir les neuf JPEG fermés en WebP sRGB sans métadonnées. Un contrôle automatisé refuse une autre version ou un import depuis `app/`, `components/` ou `lib/`. Un manifeste versionné contient chemin, métadonnées métier, UUID déterministe, SHA-256 source et SHA-256 WebP attendu. Le script vérifie les deux hashes, puis exécute réservation, upload, relecture/validation et finalisation sous une session admin, sans `service_role`.

**Rationale**: Les politiques INSERT restent uniformément WebP et le bootstrap devient reproductible sans introduire Canvas dans Node ni élargir les droits permanents aux JPEG. `sharp` ne rejoint ni le bundle client ni le runtime Next.js.

**Alternatives considered**:

- Autoriser neuf JPEG par une politique permanente : rejeté, élargit inutilement la surface Storage et laisse les métadonnées sources.
- Employer Canvas depuis le script Node : rejeté, les APIs ne sont pas disponibles sans navigateur et l'encodage varierait selon l'UA.
- Importer des lignes `ready` par SQL : rejeté, ne crée pas les objets et viole la convergence.

## Decision 14: auditer les objets absents sans muter pendant une lecture serveur

**Decision**: Un composant image client masque localement une image publique en échec. Dans l'administration, l'échec de miniature ou un contrôle explicite appelle une Server Action réautorisée avec seulement l'ID ; l'action relit le chemin, vérifie l'objet exact via Storage et, si l'absence est confirmée, génère une nouvelle enveloppe serveur `operation_kind=replace`/`operation_id`/date puis passe la ligne à `repair_required/object_missing` sans `pending_storage_path`. Le remplacement réserve ensuite explicitement son nouveau chemin, tandis qu'une suppression démarre une opération delete distincte. Aucun `GET` serveur ne réalise une mutation cachée.

**Rationale**: La base ne peut pas prouver seule l'existence des octets et le bucket privé ne fournit pas une transaction inter-service. Le chemin reste choisi côté serveur, la page publique ne casse pas et la persistance est déclenchée par une mutation authentifiée explicite.

## Decision 15: borner les opérations pending abandonnées

**Decision**: Une opération `pending` reste transitoire pendant 10 minutes. À l'entrée dans `/admin/galerie`, un Client Component minimal invoque une Server Action qui relit les opérations plus anciennes, inspecte leurs chemins exacts et les transforme en `repair_required/stale_pending_object_present` ou `repair_required/stale_pending_no_object` sans nettoyage destructif. Les opérations plus récentes ne sont pas modifiées.

**Rationale**: Le seuil dépasse largement un upload/finalisation de 1 Mio, distingue une opération active d'un abandon et rend la reprise déterministe après fermeture ou perte réseau. Toute suppression reste une action confirmée séparée.

## Sources techniques principales

- Next.js local : `node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md`, `08-caching.md`, `10-error-handling.md`, `12-images.md`, ainsi que les guides `forms.md`, `server-actions.md` et `authentication.md`.
- Supabase : changelog officiel, guides RLS, sécurisation Data API, Storage access control et helpers par opération, standard uploads, buckets privés/publics, téléchargement, suppression d'objets et schéma Storage en lecture seule.
- Plateforme Web : HTML Canvas, MDN `createImageBitmap()`/`toBlob()`/Canvas color space, spécifications PNG et conteneur WebP RIFF.
