# Contract: Matrice de vérification galerie

## Base, migration et RLS

| Preuve | Résultat attendu |
| --- | --- |
| Reset local | Toutes migrations de schéma appliquées sans référence `ready` artificielle. |
| Bootstrap local | `sharp` vaut exactement 0.35.3 dans le manifeste et le lockfile et n'est importé que par `scripts/bootstrap-gallery.mjs`; les neuf SHA-256 sources correspondent au manifeste, neuf WebP déterministes validés forment neuf paires `ready`; une seconde exécution ne duplique ni n'écrase. |
| Bornes alt/titre/libellé | 1/200, absent/1/120, absent/1/40 conformes ; dépassements refusés. |
| Valeurs par défaut | Une création sans choix contraire conserve `ordre_affichage=0` et `actif=true` en base et dans le résultat applicatif. |
| État `ready` avec champs d'opération | Refusé. |
| `pending`/`repair_required` incomplet ou chemins invalides | Refusé. |
| MIME/extension/poids/dimensions/ordre invalides | Refusé. |
| Index public | Prédicat exact `actif=true AND file_state='ready'`. |
| anon et non-admin | Lignes `actif=true AND file_state='ready'` seulement ; aucune mutation. |
| admin courant | Tous états + CRUD. |
| user_metadata imposteur / rôle retiré / session révoquée | Refus immédiat au prochain contrôle. |
| GRANT et RLS | Deux protections explicitement présentes. |
| Configuration bucket hébergé | Le script API versionné exige `SUPABASE_GALLERY_CONFIG_URL`, `SUPABASE_GALLERY_CONFIG_PROJECT_REF` et une clé dédiée `sb_secret_...` dans `SUPABASE_GALLERY_CONFIG_SECRET_KEY`, contrôle leur concordance, masque toute valeur sensible, relit `private`/8 Mio/MIME, puis la clé est révoquée et son ancien jeton échoue ; aucune clé JWT `service_role` ni variable de configuration galerie n'entre dans Next.js ou Netlify. |

La matrice vérifie conjointement la non-découverte et la révocation des octets : une URL applicative par ID retourne 200 seulement pour une ligne active/`ready`, puis la même URL retourne 404 dès le masquage, le passage `pending|repair_required` ou la suppression, même si l'objet existe encore.

Les contrats HTTP public et administratif utilisent le même schéma Zod UUID partagé. Le premier revalide le contexte public anonyme par la ligne active/`ready`; le second ajoute la réautorisation de la session administrateur courante. Ils ne prétendent pas identifier un visiteur anonyme.

## Storage

- Admin courant peut uploader un nouveau `photos/<uuid>.webp` réservé.
- Le bucket `galerie` est privé dans la configuration locale et la cible de test vérifiée.
- Anon peut uniquement télécharger le chemin d'une ligne active/`ready`; anon ne peut pas lister. Non-admin et session révoquée n'obtiennent aucun accès supplémentaire.
- Anon, non-admin et session révoquée ne peuvent uploader/remplacer/supprimer.
- Nouveau JPEG/PNG applicatif refusé par le workflow 004 ; objets hérités JPEG/PNG restent lisibles et supprimables.
- Chemin imbriqué, mauvais bucket, UUID invalide, extension/MIME incohérents et taille bucket excessive refusés sans résidu.
- Remplacement utilise un nouveau chemin ; aucun upsert de l'ancien.
- Suppression passe par Storage API et retire réellement les octets.
- La finalisation télécharge avec la session admin le seul objet réservé <=1 Mio ; un contenu PNG déclaré WebP, RIFF tronqué, animé, dimensionnellement discordant ou contenant ICCP/EXIF/XMP/chunk inconnu ne devient jamais `ready`.

## Tests unitaires d'image

- Signatures/structures JPEG, PNG, WebP valides et tronquées.
- Dimensions : 25 000 000 accepté, 25 000 001 refusé ; 8 192 accepté, 8 193 refusé.
- APNG/WebP animé refusés.
- MIME vide + signature valide accepté ; MIME non vide contradictoire refusé.
- Orientation 1 à 8 : dimensions et pixels attendus sans double rotation.
- Fixture RGBA non redimensionnée : 25 coordonnées sur 25 concordent dans l'aperçu et le WebP finalisé, avec alpha 0/255 exact et écart absolu <=1 pour chaque valeur intermédiaire.
- Fixture RGBA 2 000 × 1 000 redimensionnée en 1 600 × 800 : 25 positions normalisées sur 25 suivent `arrondi(255 × u)`, avec 0/255 exacts aux extrémités et écart absolu <=3 pour chaque valeur intermédiaire.
- Corpus opaque versionné de trois images sRGB et trois Display-P3, avec 25 coordonnées normalisées `(u,v)` dans `[0,1]²` et triplets sRGB 8 bits fixes par image. Chaque position sélectionne le pixel borné `floor(u×(largeur−1)+0,5), floor(v×(hauteur−1)+0,5)` ; références et sorties sont converties de sRGB vers Lab D65/2° sans adaptation D50 puis comparées par CIEDE2000. Sur les 150 valeurs de l'aperçu exact puis du WebP finalisé, médiane <=2 et P95 au rang 143 en base 1 <=5.
- Séquence qualité exacte par dimension ; premier résultat <=1 Mio choisi ; aucun essai sous 0,75 ou 1 200 px.
- Original 900 px non agrandi ; refus s'il reste >1 Mio.
- RIFF final valide, MIME WebP, zéro `ICCP`/`EXIF`/`XMP `/chunk inconnu, dimensions attendues.
- Annulation de génération et libération Blob URL/ImageBitmap/Canvas.
- Les parsers, le validateur RIFF et la planification dimension/qualité passent sous `node:test` avec adaptateurs injectés ; orientation, Canvas, sRGB, alpha et encodage réels passent sous Playwright.
- Chaque sortie du bootstrap conserve l'image complète sans recadrage/déformation, respecte les dimensions manifestées à un pixel d'arrondi près et obtient SSIM >=0,97 face à sa source opaque orientée, convertie sRGB et redimensionnée aux dimensions exactes de sortie. Le calcul utilise la luminance sRGB 8 bits `Y=0,299R+0,587G+0,114B`, une fenêtre gaussienne 11×11 sigma 1,5, `K1=0,01`, `K2=0,03`, `L=255`, des bords réfléchis et la moyenne des fenêtres centrées sur tous les pixels.

## Actions et interruptions

Chaque action s'arrête avant mutation sur autorisation/validation refusée et vérifie la ligne affectée. La matrice simule exactement :

- C1 réservation de création avant upload → `pending/create` sans objet, puis audit et annulation ciblée ;
- C2 upload de création avant validation/finalisation → objet réservé revalidé puis finalisé ou nettoyé ;
- C3 octets de création invalides avant nettoyage confirmé → jamais publics, suppression/annulation ou `repair_required/invalid_object_bytes` ;
- C4 ligne créée `ready` avant réponse client → répétition idempotente sans doublon ;
- R1 remplacement masqué/réservé avant upload → ancien conservé, nouveau absent, ligne non publique ;
- R2 nouvel objet uploadé avant validation → ancien courant, nouveau validé ou nettoyé ;
- R3 nouvel objet validé avant bascule → deux objets, ancien courant, bascule répétable ;
- R4 bascule terminée avant retrait ancien → nouveau courant, ancien dans `cleanup_storage_path` puis retiré ;
- R5 ancien retiré avant retour à `ready` → nouveau seul, nettoyage d'état idempotent ;
- D1 `pending/delete` avant retrait objet → ligne/objet non publics puis retrait ciblé ;
- D2 objet retiré avant retrait ligne → absence acceptée puis retrait de ligne ;
- D3 ligne retirée avant réponse client → ligne/objet absents et répétition convergente ;
- réseau, quota, session expirée et cible modifiée concurremment ;
- reprise répétée du même `operation_id` et rejet d'un ancien/mauvais ID ;
- objet déjà absent pendant nettoyage ;
- objet mensonger sous chemin/MIME WebP refusé par la validation serveur puis nettoyé ou conservé sous `invalid_object_bytes` ;
- réconciliation à 9 min 59 s, 10 min et 11 min : seul le premier reste `pending`, les deux autres deviennent selon l'objet exact `repair_required/stale_pending_object_present` ou `repair_required/stale_pending_no_object` sans suppression ;
- miniature admin absente : contrôle ciblé vers `object_missing`; erreur réseau : aucune fausse absence ;
- aucun faux succès, doublon, chemin tiers touché ni ligne active non `ready`.

Après 30 ajouts, 20 remplacements et 20 suppressions réussis, chaque ligne `ready` référence exactement un objet et aucun ancien objet du jeu ne subsiste.

## Parcours navigateur

### Accès et liste

- Deep links admin redirigés sans session ; non-admin refusé ; admin voit tous les états.
- États loading, empty, unavailable, loaded et session-expired distincts.
- Ordre stable sur 100 photos pendant 20 actualisations.
- Avec 201 photos, pages de 100/100/1, précédent/suivant et total exacts, sans perte, duplication ni changement d'ordre entre pages.

### CRUD

- Ajouter JPEG, PNG transparent et WebP fixes ; chacun produit/aperçoit/envoie un WebP conforme. La matrice de refus couvre explicitement SVG, GIF, APNG, WebP animé, vidéo et exécutable.
- Erreurs de champs conservant les autres valeurs.
- Pending visible en moins d'une seconde ; activation répétée produit une opération.
- Modifier tous champs, masquer/réactiver, remplacer, annuler/confirmer suppression.
- Chaque mutation confirmée produit le nouvel état dès le premier rendu administratif post-réponse sans actualisation manuelle, puis devient visible en moins de cinq secondes sur une nouvelle consultation publique.
- Chaque panne partielle reste masquée et réparable après rechargement.

### Public/régression

- Neuf images sans recadrage/déformation, dimensions à un pixel près et SSIM déterministe >=0,97 selon le protocole ci-dessus, alt, variantes, sections et ordre relatif conformes à la baseline.
- Quatre combinaisons de sections vides conformes.
- Liens absents/HTTPS conformes, aucun CTA Instagram inventé.
- Dans un contexte navigateur isolé neuf sans cache mémoire/disque, Service Worker ni bridage réseau artificiel, avec observateur réseau avant navigation et viewport 320 × 800 px, aucune requête identifiable n'est lancée pendant les deux secondes depuis `load` pour une image différée dont le bord supérieur se trouve à au moins 2 400 px sous le bord inférieur initial ; après un défilement terminé qui le place à 800 px ou moins, la requête commence sous deux secondes. Les `sizes` sont adaptés et la somme des entrées `layout-shift` attribuables aux conteneurs d'images est égale à 0.
- Objet retiré : carte publique masquée localement sans détail, puis ligne `object_missing` et absence durable après audit admin/invalidation.
- Photo masquée, `pending`, `repair_required` ou supprimée : aucune métadonnée n'est découverte dans la galerie/Data API et la même URL applicative qui retournait 200 retourne 404 dès la première nouvelle demande, même si l'objet physique existe encore.
- `/`, `/services`, `/galerie`, `/contact` sans régression de navigation/contenu hors données galerie.

### Accessibilité/responsive

- Chromium et WebKit à 320, 768, 1 024 px ; aucun overflow ; Axe sans violation pertinente.
- Clavier pour tous parcours, focus visible/restauré, dialogue titré, cibles 44 px, statuts annoncés.
- Safari mobile réel : JPEG caméra orienté, PNG alpha, photo P3 et image proche des limites.
- Firefox actuel et technologie d'assistance disponible en contrôle manuel.

### Utilisabilité

- Le protocole versionné fixe avant exécution les données de départ, les cinq consignes, le chronométrage, l'absence d'indice, la définition d'une première tentative et la grille anonymisée de résultat.
- Un participant cible non technique réalise l'ajout complet et retrouve la photo publique en moins de 3 minutes sans aide.
- Le même protocole standardisé demande retrouver une photo masquée, ajouter, corriger l'alt, remplacer et supprimer ; au moins 4 tâches sur 5 réussissent à la première tentative ininterrompue, sans indice et sans destruction sans confirmation.
- Le rapport consigne chronométrage, réussite par tâche, aide éventuelle et incident, sans enregistrer de donnée personnelle inutile.

## Gates dépôt

```bash
npm run supabase:reset
npm run supabase:test:db
npm run supabase:test:storage
npm run supabase:lint
npm run supabase:advisors
npm run supabase:types:generate
npm run supabase:types:check
npm run test:unit
npm run lint
npm run typecheck
npm run build
npm run test:e2e:auth
npm run test:e2e:services
npm run test:e2e:gallery
npm run test:e2e:gallery:scenarios
npm run scan:build-secrets
```

L'implémentation ajoute `gallery:check` comme orchestrateur fail-closed visant uniquement une pile Supabase loopback non liée.

## Gates preview/déploiement

Sur une preview Netlify et un projet Supabase de test explicitement vérifiés : migrations revues, bucket privé vérifié par API, neuf objets présents avant bascule, routes d'images même origine en `private, no-store`, cache de métadonnées actualisé sous cinq secondes, `/admin` privé/no-store et ancien onglet après déploiement récupérable. Avec neuf objets de 1 Mio, le contrôle froid 320 × 800 px mesure au plus deux demandes/2 Mio pendant les cinq secondes suivant `load` sans défilement ; une consultation complète mesure au plus neuf invocations/9 Mio sans doublon d'ID, soit au plus 9 000 invocations/9 000 Mio extrapolés pour 1 000 consultations. Le rapport compare ces nombres aux quotas Netlify officiels en vigueur, vérifie que les trois variables `SUPABASE_GALLERY_CONFIG_*` sont absentes de Netlify et que l'ancienne clé échoue après révocation. Zéro secret/détail brut apparaît dans les logs ou le bundle. Aucun push, seed ou déploiement hébergé n'est autorisé par ce contrat seul.
