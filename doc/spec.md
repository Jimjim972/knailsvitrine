# Spécification fonctionnelle et technique du MVP

## 1. Informations du document

| Élément | Valeur |
| --- | --- |
| Projet | Site vitrine K'nails Beauty Institut |
| Nature | MVP — produit minimum viable |
| Statut | Spécification initiale à valider avant implémentation |
| Version de l'application | Next.js 16.3, React 19.2 et TypeScript |
| Hébergement cible | Netlify Free |
| Backend géré | Supabase Free |
| Langue initiale | Français |
| Volume initial | Environ 40 prestations et une galerie de quelques dizaines à quelques centaines de photos |

Ce document précise les besoins et affine les décisions présentées dans [infra.md](./infra.md) et [architecture.md](./architecture.md). Il sert de référence pour développer le backend et l'espace d'administration.

## 2. Statut MVP

Cette première version est un **MVP (produit minimum viable)**. Son objectif est de livrer uniquement les fonctions indispensables pour publier le site et administrer les prestations et les photos de manière autonome.

Les choix d'implémentation doivent privilégier la simplicité, la sécurité et un faible coût d'exploitation. Toute fonctionnalité qui n'est pas nécessaire à la mise en ligne ou à la gestion quotidienne du contenu doit être reportée après validation du MVP.

## 3. Contexte

Le site vitrine existe déjà sous Next.js. Les prestations et les images de la galerie sont actuellement écrites directement dans le code. Toute modification demande donc une modification du projet et un nouveau déploiement.

Le besoin est d'ajouter un petit système d'administration permettant à une personne non technique de gérer les prestations et les photos sans modifier le code. Le système doit rester simple, sécurisé, adapté à un faible volume de données et utilisable avec les offres gratuites retenues.

## 4. Objectifs

La première version doit permettre de :

- conserver le design public existant ;
- remplacer les prestations codées en dur par des données administrables ;
- remplacer les photos codées en dur par une galerie administrable ;
- fournir une connexion réservée à l'administrateur ;
- garantir que les visiteurs ne peuvent jamais modifier les données ;
- limiter la consommation des quotas gratuits de Netlify et Supabase ;
- conserver de bonnes performances, un référencement correct et une expérience mobile soignée.

## 5. Hors périmètre du MVP

Les éléments suivants ne font pas partie du backend initial :

- réservation de créneaux en ligne ;
- paiement en ligne ;
- compte client ;
- inscription publique ;
- gestion d'employés ou de plusieurs niveaux de rôles ;
- programme de fidélité ;
- publication automatique vers Instagram ;
- avis et commentaires publics ;
- historique complet des modifications ;
- application mobile ;
- interface d'administration séparée du projet Next.js.

Ces fonctionnalités pourront être étudiées plus tard sans modifier les fondations principales.

## 6. Utilisateurs et droits

### 6.1 Visiteur

Le visiteur n'a pas besoin de compte. Il peut :

- consulter les prestations actives ;
- consulter les photos actives ;
- accéder aux informations pratiques ;
- utiliser les moyens de contact proposés ;
- suivre les liens vers les réseaux sociaux.

Il ne peut pas accéder aux données masquées ni effectuer d'opération de création, modification ou suppression.

### 6.2 Administrateur

L'administrateur utilise un compte Supabase Auth créé manuellement. Il peut :

- se connecter et se déconnecter ;
- consulter toutes les prestations, y compris celles qui sont masquées ;
- créer, modifier, classer, afficher, masquer et supprimer une prestation ;
- consulter toutes les photos, y compris celles qui sont masquées ;
- envoyer, modifier, classer, afficher, masquer et supprimer une photo.

Il n'existe aucun écran public permettant de créer un compte administrateur.

## 7. Besoins fonctionnels

### 7.1 Prestations publiques

| ID | Besoin |
| --- | --- |
| `PRE-PUB-01` | Afficher uniquement les prestations dont le statut est actif. |
| `PRE-PUB-02` | Regrouper les prestations selon les catégories enregistrées, dans leur ordre d’affichage. |
| `PRE-PUB-03` | Respecter l'ordre d'affichage choisi dans l'administration. |
| `PRE-PUB-04` | Afficher au minimum le nom, la description, le prix et la durée. |
| `PRE-PUB-05` | Pouvoir afficher un badge facultatif, par exemple « Populaire » ou « Nouveau ». |
| `PRE-PUB-06` | Gérer les cas « prix fixe », « à partir de » et « sur devis ». |
| `PRE-PUB-07` | Une modification validée dans l'administration doit être visible sur le site sans nouveau déploiement. |

Les trois catégories initiales conservent leur présentation visuelle dédiée. Une catégorie créée dans l’administration reçoit l’univers visuel générique de l’institut et ne devient publique qu’à partir du moment où elle contient au moins une prestation active.

### 7.2 Administration des prestations

| ID | Besoin |
| --- | --- |
| `PRE-ADM-01` | Afficher la liste complète des prestations avec leur catégorie et leur statut. |
| `PRE-ADM-02` | Créer une prestation depuis un formulaire. |
| `PRE-ADM-03` | Modifier les informations d'une prestation existante. |
| `PRE-ADM-04` | Masquer une prestation sans la supprimer. |
| `PRE-ADM-05` | Supprimer une prestation après confirmation explicite. |
| `PRE-ADM-06` | Modifier l'ordre d'affichage avec une valeur numérique simple dans la première version. |
| `PRE-ADM-07` | Afficher des messages clairs en cas de réussite, de validation invalide ou d'erreur serveur. |
| `PRE-ADM-08` | Empêcher les doubles soumissions pendant une opération en cours. |
| `PRE-ADM-09` | Créer une nouvelle catégorie depuis la gestion des prestations avec un nom et un ordre d’affichage. |
| `PRE-ADM-10` | Proposer immédiatement toutes les catégories enregistrées dans les formulaires de création et de modification d’une prestation. |
| `PRE-ADM-11` | Lister les catégories avec leur ordre et leur nombre de prestations, puis permettre de modifier leur nom et leur ordre. |
| `PRE-ADM-12` | Supprimer une catégorie après confirmation uniquement lorsqu’aucune prestation ne la référence ; sinon refuser sans suppression partielle et expliquer l’action requise. |

### 7.3 Galerie publique

| ID | Besoin |
| --- | --- |
| `GAL-PUB-01` | Afficher uniquement les photos à la fois actives et dans l'état de fichier cohérent `ready`. |
| `GAL-PUB-02` | Respecter l'ordre défini dans l'administration. |
| `GAL-PUB-03` | Conserver les variantes visuelles de la galerie actuelle : mise en avant, petite carte et carte large. |
| `GAL-PUB-04` | Chaque photo doit avoir un texte alternatif. |
| `GAL-PUB-05` | Un titre, un libellé et un lien externe peuvent être associés à une photo de manière facultative. |
| `GAL-PUB-06` | Le chargement différé doit être utilisé pour les photos qui ne sont pas immédiatement visibles. |
| `GAL-PUB-07` | Masquer toute section sans photo active et `ready` ; si la galerie principale et le journal social sont tous deux vides, conserver l'en-tête et afficher un message neutre unique sans image statique de secours. |
| `GAL-PUB-08` | La livraison privée même origine doit rester bornée à deux demandes/2 Mio avant le premier défilement et à neuf invocations/9 Mio pour une consultation complète des neuf fixtures maximales, sans doublon d'ID. |

### 7.4 Administration de la galerie

| ID | Besoin |
| --- | --- |
| `GAL-ADM-01` | Envoyer une photo depuis l'appareil de l'administrateur. |
| `GAL-ADM-02` | Vérifier côté navigateur le conteneur, les dimensions et la taille avant l'envoi, puis vérifier côté serveur les octets du WebP final avant toute publication. |
| `GAL-ADM-03` | Enregistrer le texte alternatif, le titre facultatif, le type d'affichage, l'ordre et le statut. |
| `GAL-ADM-04` | Prévisualiser l'image et sa visibilité. |
| `GAL-ADM-05` | Remplacer une photo sans laisser un ancien fichier inutilisé. |
| `GAL-ADM-06` | Supprimer la ligne de base de données et le fichier Storage associé après confirmation. |
| `GAL-ADM-07` | Si l'enregistrement des métadonnées échoue après l'envoi, supprimer le fichier envoyé ou signaler clairement le nettoyage nécessaire. |
| `GAL-ADM-08` | Une incohérence partielle entre une photo et son fichier doit masquer la photo du public et conserver dans l'administration un état persistant « À réparer » avec une action de reprise jusqu'à résolution. |
| `GAL-ADM-09` | À l'ouverture de la liste, toute opération encore en cours depuis au moins 10 minutes doit devenir « À réparer » après contrôle serveur, sans suppression automatique. |
| `GAL-ADM-10` | Une miniature absente doit déclencher un contrôle serveur ciblé ; seule une absence confirmée masque durablement la photo et la place « À réparer ». |
| `GAL-ADM-11` | La liste doit présenter toutes les combinaisons d'intention active ou masquée et d'état de fichier `ready`, `pending` ou `repair_required`, en distinguant textuellement ces deux notions. |

### 7.5 Authentification

| ID | Besoin |
| --- | --- |
| `AUTH-01` | Se connecter avec une adresse e-mail et un mot de passe. |
| `AUTH-02` | Maintenir la session dans des cookies compatibles avec le rendu serveur. |
| `AUTH-03` | Rediriger un utilisateur non connecté vers `/admin/connexion`. |
| `AUTH-04` | Refuser les opérations sensibles côté serveur et côté base, même si l'interface est contournée. |
| `AUTH-05` | Permettre une déconnexion explicite. |
| `AUTH-06` | Désactiver toute auto-inscription au niveau de Supabase Auth ; l'absence de route ou d'interface publique ne suffit pas. |
| `AUTH-07` | Refuser au prochain contrôle toute session supprimée, expirée ou privée du rôle administrateur courant, même si son ancien JWT affirme encore ce rôle. |
| `AUTH-08` | Garder les réponses `/admin` privées, non stockables et isolées de tout cache partagé. |

### 7.6 Contact

Le formulaire existant est actuellement une simulation et n'envoie aucun message. Avant la mise en production, il devra être rendu fonctionnel.

Le choix initial est d'utiliser Netlify Forms afin d'éviter un service d'e-mail ou une table supplémentaire. Les champs prévus sont : nom, téléphone facultatif, e-mail et message.

Les coordonnées publiques confirmées sont : N°371, Chemin La Hubert, Saint-Joseph 97212, Martinique. L'institut ouvre le lundi, mardi, jeudi et vendredi de 09h00 à 17h00, le samedi de 08h00 à 12h00, et ferme le mercredi et le dimanche. Ces informations sont identiques sur la page Contact et dans le footer.

Le formulaire devra :

- effectuer une validation côté navigateur, dans la Server Action et dans la garde Edge qui protège les POST directs vers Netlify Forms ;
- afficher un retour de réussite réel uniquement après autorisation de la Server Action et réponse HTTP positive de Netlify au POST navigateur ;
- afficher une erreur exploitable en cas d'échec ;
- conserver les valeurs saisies et permettre un réessai après un échec récupérable ;
- empêcher les doubles soumissions pendant un envoi en cours ;
- inclure le filtrage anti-spam de la plateforme et un champ leurre invisible aux visiteurs ordinaires ;
- envoyer automatiquement à l'adresse opérationnelle de l'institut une notification pour chaque soumission vérifiée, avec l'e-mail du visiteur comme adresse de réponse ;
- ne pas enregistrer les messages dans les tables publiques Supabase.

Les règles initiales des champs sont : nom obligatoire de 2 à 120 caractères, e-mail obligatoire de 254 caractères maximum avec un format exploitable, téléphone facultatif de 6 à 30 caractères contenant au moins six chiffres lorsqu'il est renseigné, et message obligatoire de 10 à 2 000 caractères. Les espaces périphériques sont supprimés avant validation. Le téléphone peut contenir `+`, espaces, points, tirets et parenthèses afin de prendre en charge les formats locaux et internationaux usuels.

Le navigateur remet d'abord la saisie à une Server Action Next.js. Celle-ci revalide les données avec Zod et retourne uniquement un instantané normalisé autorisé. Le navigateur ajoute ensuite les champs techniques réservés au fournisseur et envoie cette charge URL-encodée vers le chemin relatif constant `/__forms.html`, sans cookies. Le formulaire React ne déclare pas `form-name` dans sa requête vers la Server Action ; la garde Edge laisse donc cette étape atteindre Next.js. Le contexte Netlify de confiance sélectionne ensuite `contact` en production et `contact-preview` en Deploy Preview, branch deploy ou développement, et tout POST qui déclare l'autre nom est refusé avant Netlify Forms.

Le formulaire présente quatre états distincts et accessibles : neutre, envoi en cours, envoi réussi et erreur récupérable. Une erreur conserve les quatre valeurs et n'affiche jamais de faux succès ; seule l'autorisation serveur suivie d'une réponse HTTP positive de Netlify autorise le succès visible et vide les champs, sans prétendre connaître le classement anti-spam final. L'appel fournisseur expire exactement 10 secondes après le démarrage du `fetch` navigateur ; ce délai indique honnêtement que la réception n'a pas pu être confirmée. Les demandes vérifiées sont consultées dans l'interface Netlify du MVP, sans ajouter de boîte de réception à `/admin`.

Netlify détecte deux blueprints statiques, `contact` et `contact-preview`. Chacun possède sa propre notification `submission_created`, bornée par l'identifiant et le nom du formulaire ; la notification preview utilise en plus un objet explicitement identifié comme preview. Les destinations sont configurées dans Netlify, ne sont pas versionnées et peuvent être identiques sans fusionner les deux hooks. Une notification n'est déclenchée que pour une soumission vérifiée, l'e-mail du visiteur alimente le `Reply-To`, et aucune autoréponse n'est envoyée au visiteur.

Si Netlify Forms s'avère incompatible avec le besoin final, la solution de remplacement devra être décidée avant implémentation : envoi par un fournisseur d'e-mail transactionnel ou stockage sécurisé dans Supabase avec protection anti-spam.

## 8. Règles de gestion

### 8.1 Prestations

- le nom est obligatoire et contient entre 2 et 120 caractères ;
- la description est obligatoire et contient au maximum 1 000 caractères ;
- la catégorie d’une prestation doit référencer une catégorie enregistrée ;
- le nom d’une catégorie est obligatoire, contient entre 2 et 80 caractères et reste unique sans tenir compte de la casse ni des espaces périphériques ;
- le code technique d’une nouvelle catégorie est généré côté serveur et n’est jamais fourni par le navigateur ;
- l’ordre d’une catégorie est un entier positif ou nul ; les égalités sont départagées par date de création puis par code ;
- la création, le renommage, la modification d’ordre et la suppression unitaire d’une catégorie sont inclus dans le MVP ; son code technique reste stable ;
- une catégorie référencée par au moins une prestation ne peut pas être supprimée : les prestations doivent d’abord être déplacées ou supprimées ;
- la gestion d’un visuel propre à chaque catégorie reste hors périmètre ;
- le prix est positif ou nul lorsqu'il est renseigné ;
- le type de prix vaut `fixed`, `starting_at` ou `quote` ;
- `fixed` et `starting_at` exigent un prix renseigné ; `quote` exige un prix absent ;
- la durée est exprimée en minutes, facultative, et comprise entre 5 et 600 minutes ;
- le badge est facultatif et limité à 40 caractères ;
- l'ordre d'affichage est un entier positif ou nul ;
- une nouvelle prestation est active par défaut, sauf choix contraire dans le formulaire ;
- une suppression est définitive et demande une confirmation.

### 8.2 Photos

- formats entrants acceptés : images fixes JPEG, PNG et WebP ;
- SVG, GIF, APNG, WebP animés, vidéos, exécutables et fichiers arbitraires sont refusés dans la première version ;
- taille maximale du fichier entrant : 8 Mo ;
- dimensions maximales avant décodage complet : 25 000 000 pixels au total et 8 192 px par côté ;
- côté le plus long cible après traitement : 1 600 px maximum ;
- format final obligatoire pour tout nouvel ajout ou remplacement : WebP ;
- le canal alpha visible d'une image source est conservé dans l'aperçu et le fichier WebP final ; une fixture RGBA non redimensionnée de 25 positions impose alpha 0/255 exact et un écart absolu maximal de 1 pour les valeurs intermédiaires, tandis qu'une fixture 2 000 × 1 000 redimensionnée en 1 600 × 800 impose sur 25 positions un gradient `arrondi(255 × u)`, avec extrémités exactes et écart intermédiaire maximal de 3, sans garantir les composantes RGB cachées derrière un alpha nul ;
- les fichiers JPEG et PNG déjà publiés restent lisibles sans conversion obligatoire ;
- à chaque dimension évaluée, l'encodage WebP essaie successivement les qualités 0,85, 0,80 et 0,75, sans descendre plus bas ; si aucun essai ne respecte 1 Mio, les dimensions sont réduites puis la séquence recommence à 0,85 ;
- avant la suppression des profils intégrés, les pixels sont convertis vers l'espace sRGB utilisé par la publication Web ;
- poids cible : 150 à 400 Ko, avec un maximum applicatif de 1 Mio (1 048 576 octets) après traitement ;
- pour atteindre 1 Mio, le côté le plus long ne descend pas sous 1 200 px, sauf si l'original est plus petit et n'est pas agrandi ; si la limite reste impossible à ce plancher, le fichier est refusé ;
- le texte alternatif est obligatoire et limité à 200 caractères ;
- le titre est facultatif et limité à 120 caractères ;
- le libellé est facultatif et limité à 40 caractères ;
- le nom de fichier final est généré par l'application et ne reprend pas directement un nom fourni par l'utilisateur ;
- le chemin Storage est unique ;
- les dimensions finales sont conservées en base afin d'éviter les décalages de mise en page ;
- l'orientation de l'original est appliquée aux pixels, puis toutes les métadonnées intégrées, notamment la position, la date et l'appareil, sont supprimées du fichier publié ;
- avant tout passage à l'état public, le serveur relit l'objet réservé de 1 Mio maximum et valide ses octets RIFF/WebP, son caractère statique, ses dimensions et l'absence de chunks ICCP, EXIF, XMP ou inconnus ; le MIME et les dimensions déclarés par le navigateur ne suffisent pas ;
- un objet final invalide est supprimé par l'API Storage ou conservé dans un état « À réparer » non public si son absence ne peut pas être confirmée ;
- une opération `pending` depuis au moins 10 minutes est considérée abandonnée et passe après contrôle serveur à un état « À réparer » persistant ;
- une erreur de chargement publique masque seulement la carte courante ; une absence durable n'est enregistrée qu'après un audit administrateur réautorisé du chemin exact ;
- les neuf images initiales sont converties hors runtime avec `sharp@0.35.3`, épinglé exactement dans le manifeste et le lockfile comme dépendance de développement et importé uniquement par le script de bootstrap ; elles sont contrôlées par un manifeste SHA-256 puis importées via le même flux administrateur, sans clé `service_role` ;
- les tableaux métier statiques restent la source publique active jusqu'à deux exécutions identiques du bootstrap et à la vérification des neuf paires ligne-objet ; la bascule vers la source administrable et le retrait de ces tableaux ont lieu seulement après ce gate ;
- une image inactive reste stockée mais n'est pas affichée publiquement ;
- le bucket galerie reste privé ; chaque demande d'octets relit l'état actuel de la photo et cesse de répondre dès son masquage, son passage hors `ready` ou sa suppression, même avec une adresse déjà observée ;
- une image supprimée doit être retirée de Storage.

### 8.3 Ordre d'affichage

Les éléments sont triés par `ordre_affichage` croissant, puis par date de création. Deux éléments peuvent temporairement partager le même ordre ; ce comportement ne doit pas bloquer l'administration.

## 9. Choix techniques

### 9.1 Application

| Sujet | Choix | Justification |
| --- | --- | --- |
| Framework | Next.js 16.3 avec App Router | Déjà utilisé par le projet et compatible avec les pages publiques et l'administration. |
| Langage | TypeScript strict | Réduit les erreurs entre les formulaires, la base et les composants. |
| Rendu | Server Components par défaut | Limite le JavaScript envoyé au visiteur et garde l'accès aux données côté serveur. |
| Interactivité | Client Components uniquement pour les formulaires, prévisualisations et états interactifs | Évite de transformer inutilement de grandes parties du site en composants client. |
| Mutations | Server Actions | Adaptées aux formulaires Next.js et capables de renvoyer l'interface actualisée dans le même cycle. |
| Endpoints dédiés | Route Handlers uniquement lorsqu'un appel HTTP est réellement nécessaire | Évite de créer une API interne redondante. |
| Validation | Zod côté serveur, avec contrôles HTML côté navigateur | Les données clientes ne sont jamais considérées comme fiables. |
| Accès aux données | Client Supabase typé, sans ORM dans la première version | Deux domaines de données simples ne justifient pas la complexité d'un ORM. |
| Évolution du schéma | Migrations SQL versionnées dans `supabase/migrations` | Rend les changements reproductibles et révisables. |

Chaque Server Action doit être considérée comme un point d'entrée public : elle vérifie la session et l'autorisation avant toute mutation.

### 9.2 Supabase

| Service | Utilisation |
| --- | --- |
| PostgreSQL | Prestations et métadonnées des photos |
| Auth | Compte administrateur et session |
| Storage | Fichiers WebP de la galerie et éventuelles images des prestations |
| Data API | Lecture et écriture via le client Supabase avec RLS |

Les paquets prévus sont `@supabase/supabase-js` et le paquet SSR officiellement recommandé au moment de l'implémentation. Les versions devront être vérifiées dans la documentation Supabase avant installation.

Les nouveaux projets Supabase peuvent ne plus exposer automatiquement les tables à la Data API. L'implémentation devra donc vérifier à la fois :

- l'exposition ou les droits `GRANT` nécessaires pour les rôles utilisés ;
- les politiques RLS, qui contrôlent ensuite les lignes accessibles.

Ces deux mécanismes sont distincts et doivent tous les deux être validés.

### 9.3 Hébergement

Netlify exécute l'application Next.js au moyen de son adaptateur OpenNext. La plateforme doit détecter le projet sans configuration spécifique pour le cas courant.

Le déploiement doit utiliser :

- `npm run build` comme commande de construction ;
- le dépôt GitHub comme source ;
- une branche principale pour la production ;
- des variables d'environnement distinctes entre production, Deploy Preview et branch deploy ;
- un projet Supabase non-production isolé pour Deploy Preview et branch deploy, sans copie des données de production ;
- les trois seules variables applicatives `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` et `SERVICE_SUCCESS_FLASH_SECRET`, ce dernier étant aléatoire, secret, distinct par contexte et long d'au moins 32 caractères ;
- aucune variable ponctuelle `SUPABASE_GALLERY_CONFIG_*` dans Netlify ;
- une origine publique canonique unique `https://knailsbeauty.fr`, sans `www`, protégée par un certificat valide ;
- `www.knailsbeauty.fr`, `knailsbeauty.com`, `www.knailsbeauty.com` et le sous-domaine technique Netlify comme entrées exclusivement redirectrices, chacune protégée par un certificat lorsqu'elle est demandée en HTTPS ;
- une redirection permanente de toutes les variantes HTTP et HTTPS non canoniques vers `https://knailsbeauty.fr`, en conservant le chemin et les paramètres de requête, sans règle applicable à l'origine canonique elle-même et donc sans boucle.

Le domaine `knailsbeauty.com` ne sert jamais directement de contenu et ne peut pas devenir canonique : son apex et son alias `www` redirigent exclusivement vers le domaine `.fr` sans `www`.

Les déploiements de production doivent rester intentionnels, car chacun consomme une partie des crédits de l'offre gratuite.

### 9.4 Cache et actualisation des contenus

Les prestations et la galerie changent peu. Elles doivent donc pouvoir être mises en cache afin de réduire les requêtes vers Supabase et le calcul Netlify.

Le choix prévu pour Next.js 16 est :

- activer `cacheComponents` au moment de l'implémentation ;
- créer des fonctions serveur dédiées à la lecture publique ;
- utiliser `use cache`, une durée de cache longue et des tags séparés pour les prestations et la galerie ;
- utiliser `updateTag` dans les Server Actions lorsque l'administrateur doit voir immédiatement sa modification ;
- utiliser `revalidateTag` uniquement lorsque le rafraîchissement en arrière-plan est acceptable ;
- ne jamais mettre en cache des données de session ou d'administration de manière partagée.

Le bon fonctionnement de ce mécanisme devra être testé sur Netlify, car la persistance du cache dépend de l'adaptateur d'hébergement.

### 9.5 Images

Le bucket Supabase `galerie` est privé. Les politiques Storage autorisent uniquement le téléchargement d'un chemin encore référencé par une photo active et `ready`, sans autoriser la liste anonyme ; toutes les écritures restent administratives.

Le flux recommandé est :

1. l'administrateur choisit un fichier ;
2. le navigateur inspecte les octets et dimensions, puis redimensionne, oriente, convertit en sRGB et encode un WebP sans métadonnée ;
3. une Server Action réautorise l'administrateur et réserve une ligne masquée, un identifiant d'opération et un chemin UUID ;
4. le WebP final est envoyé directement à Supabase Storage avec la session authentifiée ;
5. une Server Action relit les métadonnées Storage, refuse avant téléchargement tout objet supérieur à 1 Mio, puis télécharge et valide les octets du chemin réservé exact ;
6. la ligne passe à `ready` seulement après validation ; sinon l'objet est nettoyé ou la ligne conserve un état `repair_required` reprenable ;
7. lors d'un remplacement ou d'une suppression, l'ancien chemin exact est nettoyé par l'API Storage avant confirmation complète ;
8. le cache des métadonnées de galerie est invalidé lorsque la projection publique change ou doit être masquée par sécurité ; les octets sont servis par une route même origine non cachée qui relit la ligne et son chemin à chaque requête.

L'original de 8 Mo maximum ne traverse jamais une fonction Netlify. Le WebP final borné à 1 Mio est relu une fois par la finalisation serveur puis transite par la route d'image lors de chaque lecture publique autorisée ; ce coût est accepté pour garantir la révocation immédiate sans clé privilégiée.

Les images déjà compressées sont rendues avec `next/image` sans transformation serveur supplémentaire via une URL même origine par identifiant. Les propriétés `width`, `height`, `sizes` et `alt` restent obligatoires. La réponse d'octets porte `Cache-Control: private, no-store` et ne redirige jamais vers le chemin Storage ; aucun `remotePatterns` Supabase n'est requis pour la galerie.

### 9.6 Formulaires

- les formulaires d'administration utilisent des Server Actions ;
- les erreurs de validation sont associées aux champs correspondants ;
- un état d'attente désactive le bouton de soumission ;
- les erreurs techniques sont journalisées côté serveur sans afficher d'informations sensibles ;
- les données reçues sont normalisées avant enregistrement ;
- la réussite n'est affichée qu'après confirmation de la mutation ;
- les actions destructrices possèdent une confirmation explicite.

## 10. Modèle de données détaillé

### 10.1 Table `prestations`

| Colonne | Type PostgreSQL | Contraintes |
| --- | --- | --- |
| `id` | `uuid` | Clé primaire, valeur générée par défaut |
| `nom` | `text` | Obligatoire, longueur contrôlée |
| `description` | `text` | Obligatoire |
| `categorie` | `text` | Obligatoire, clé étrangère vers `categories_prestations.code` |
| `prix` | `numeric` | Facultatif, de 0 à 99 999 999,99 avec au plus deux décimales ; les valeurs plus précises sont refusées sans arrondi |
| `type_prix` | `text` | Obligatoire, `fixed`, `starting_at` ou `quote` |
| `duree_minutes` | `integer` | Facultatif, valeur positive |
| `badge` | `text` | Facultatif |
| `image_path` | `text` | Facultatif |
| `ordre_affichage` | `integer` | Obligatoire, zéro par défaut |
| `actif` | `boolean` | Obligatoire, vrai par défaut |
| `created_at` | `timestamptz` | Obligatoire, date serveur par défaut |
| `updated_at` | `timestamptz` | Obligatoire, mis à jour lors des modifications |

Index recommandés :

- index partiel `prestations_public_category_order_idx` sur `(categorie, ordre_affichage, created_at, id)` lorsque `actif = true` ;
- aucun index d'administration supplémentaire avant qu'une mesure réelle ne le justifie au volume du MVP.

### 10.2 Table `categories_prestations`

| Colonne | Type PostgreSQL | Contraintes |
| --- | --- | --- |
| `code` | `text` | Clé primaire, code technique fermé généré côté serveur pour toute nouvelle catégorie |
| `nom` | `text` | Obligatoire, 2 à 80 caractères, unique après normalisation casse/espaces |
| `ordre_affichage` | `integer` | Obligatoire, zéro par défaut, positif ou nul |
| `created_at` | `timestamptz` | Obligatoire, date serveur par défaut |
| `updated_at` | `timestamptz` | Obligatoire, mis à jour lors des modifications |

Les rôles `anon` et `authenticated` peuvent lire les catégories. Seul l’administrateur courant peut créer, renommer, réordonner et supprimer une catégorie. La clé étrangère `prestations_categorie_fkey` interdit toute suppression tant qu’une prestation référence la catégorie ; aucune suppression en cascade n’est autorisée.

### 10.3 Table `photos_galerie`

| Colonne | Type PostgreSQL | Contraintes |
| --- | --- | --- |
| `id` | `uuid` | Clé primaire, valeur générée par défaut |
| `storage_path` | `text` | Obligatoire et unique |
| `alt_text` | `text` | Obligatoire |
| `titre` | `text` | Facultatif |
| `libelle` | `text` | Facultatif |
| `lien_externe` | `text` | Facultatif, URL HTTPS validée |
| `variante_affichage` | `text` | Valeur contrôlée : `featured`, `small`, `wide_small`, `wide_large` ou `social` |
| `width` | `integer` | Obligatoire, valeur positive |
| `height` | `integer` | Obligatoire, valeur positive |
| `mime_type` | `text` | Obligatoire ; `image/webp` pour tout nouvel ajout ou remplacement, avec prise en charge des anciens JPEG et PNG |
| `size_bytes` | `integer` | Obligatoire, valeur positive |
| `ordre_affichage` | `integer` | Obligatoire, zéro par défaut |
| `actif` | `boolean` | Obligatoire, vrai par défaut |
| `file_state` | `text` | Obligatoire, `ready`, `pending` ou `repair_required` ; seul `ready` peut être public |
| `operation_kind` | `text` | Facultatif, `create`, `replace` ou `delete` pendant une opération de fichier |
| `operation_id` | `uuid` | Facultatif, identifiant idempotent de l'opération en cours ou à réparer |
| `pending_storage_path` | `text` | Facultatif, nouveau chemin réservé à transférer ou confirmer |
| `pending_width` | `integer` | Facultatif, largeur finale attendue du nouveau fichier réservé |
| `pending_height` | `integer` | Facultatif, hauteur finale attendue du nouveau fichier réservé |
| `pending_size_bytes` | `integer` | Facultatif, poids final attendu du nouveau fichier réservé |
| `cleanup_storage_path` | `text` | Facultatif, chemin exact restant à retirer |
| `operation_started_at` | `timestamptz` | Facultatif, date serveur du début de l'opération |
| `repair_code` | `text` | Facultatif, valeur fermée parmi `upload_unconfirmed`, `metadata_unconfirmed`, `invalid_object_bytes`, `new_file_cleanup`, `old_file_cleanup`, `object_delete_unconfirmed`, `row_delete_unconfirmed`, `object_missing`, `stale_pending_no_object` et `stale_pending_object_present` |
| `created_at` | `timestamptz` | Obligatoire, date serveur par défaut |
| `updated_at` | `timestamptz` | Obligatoire, date serveur par défaut |

Index partiel `photos_galerie_public_variant_order_idx` sur `(variante_affichage, ordre_affichage, created_at, id)` lorsque `actif = true and file_state = 'ready'`.

## 11. Sécurité

### 11.1 Principes

- activer RLS sur chaque table du schéma exposé ;
- appliquer le principe du moindre privilège ;
- vérifier l'autorisation au plus près de la donnée ;
- ne pas considérer la protection visuelle de `/admin` comme une mesure de sécurité suffisante ;
- valider toutes les entrées côté serveur ;
- ne jamais faire confiance au type MIME ou au nom transmis par le navigateur ;
- ne jamais exposer une clé secrète dans le code client.

### 11.2 Matrice d'accès

| Ressource | Visiteur `anon` | Utilisateur authentifié non-admin | Administrateur |
| --- | --- | --- | --- |
| Prestations actives | Lecture | Lecture | Lecture |
| Prestations inactives | Aucun accès | Aucun accès | Lecture |
| Création/modification/suppression de prestations | Refusé | Refusé | Autorisé |
| Lecture des catégories de prestations | Lecture | Lecture | Lecture |
| Création d’une catégorie de prestations | Refusé | Refusé | Autorisé |
| Modification/suppression d’une catégorie de prestations | Refusé | Refusé | Autorisé, avec suppression limitée aux catégories non référencées |
| Métadonnées des photos actives et cohérentes (`actif=true AND file_state='ready'`) | Lecture | Lecture | Lecture |
| Octets des photos actives et cohérentes | Lecture réautorisée | Lecture réautorisée | Lecture |
| Octets des photos inactives, non `ready` ou supprimées, même via une URL applicative connue | Refusé | Refusé | Selon état administratif courant |
| Métadonnées des photos inactives | Aucun accès | Aucun accès | Lecture |
| Envoi/remplacement/suppression de fichiers | Refusé | Refusé | Autorisé |

Le rôle administrateur provient de `app_metadata`, contrôlé par le serveur, et jamais de `user_metadata`, modifiable par l'utilisateur. Le prédicat serveur relit la valeur protégée courante dans Supabase Auth au lieu d'autoriser depuis le rôle potentiellement ancien du JWT : un retrait du rôle prend donc effet dès le prochain contrôle.

Le même prédicat exige que le claim `session_id` référence encore une session appartenant à `auth.uid()` et non expirée. Un ancien JWT admin perd ainsi les droits privilégiés dès que son rôle, sa session ou son expiration ne satisfait plus l'autorité courante.

Les politiques d'actualisation Storage doivent tenir compte du fait qu'un remplacement de fichier nécessite les droits `INSERT`, `SELECT` et `UPDATE`. La suppression nécessite également sa politique dédiée.

Le masquage d'une ligne, son passage `pending|repair_required` ou sa suppression révoque les octets dès la première nouvelle demande à la même URL applicative. Le bucket privé, la relecture sous RLS et les réponses `private, no-store` empêchent qu'une URL Storage ou un cache partagé contourne ce changement.

### 11.3 Gestion des secrets

Variables publiques autorisées :

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

La clé publishable peut être présente dans le navigateur parce que les autorisations réelles sont imposées par RLS.

Une éventuelle clé secrète ou `service_role` :

- ne doit jamais être préfixée par `NEXT_PUBLIC_` ;
- ne doit jamais être importée dans un Client Component ;
- ne doit pas être utilisée pour les opérations CRUD normales si RLS suffit ;
- doit rester dans les secrets de l'hébergeur si un usage serveur exceptionnel est justifié.

La configuration ponctuelle du bucket galerie constitue un cas distinct du runtime : le seul processus du script API versionné reçoit `SUPABASE_GALLERY_CONFIG_URL`, `SUPABASE_GALLERY_CONFIG_PROJECT_REF` et une clé Supabase dédiée `sb_secret_...` dans `SUPABASE_GALLERY_CONFIG_SECRET_KEY`, jamais la clé JWT historique `service_role`. Le script exige la concordance URL/référence, masque la clé, vérifie la postcondition, puis la clé est révoquée et son ancien jeton doit échouer. Ces variables ne sont jamais ajoutées à Next.js, Netlify, `.env.local`, au bootstrap CRUD ou au navigateur.

## 12. Exigences non fonctionnelles

### 12.1 Performance

- les pages publiques doivent rester utilisables sur une connexion mobile ;
- les images doivent avoir des dimensions explicites pour éviter les décalages visuels ;
- seules les premières images visibles peuvent être chargées en priorité ;
- les autres images utilisent le chargement différé ;
- le test lazy utilise un contexte navigateur isolé neuf, sans cache mémoire/disque, Service Worker ni bridage réseau artificiel, avec observateur réseau installé avant navigation, origine locale même domaine et viewport 320 × 800 px : pendant les deux secondes chronométrées depuis `load` sans défilement, l'URL identifiable d'une image différée dont le bord supérieur se trouve à au moins 2 400 px sous le bord inférieur initial ne doit pas être demandée ; après un défilement terminé qui place ce bord supérieur à 800 px ou moins sous le viewport, sa requête doit commencer dans les deux secondes ;
- avec neuf fixtures WebP de exactement 1 Mio et le même contexte froid 320 × 800 px, les cinq secondes suivant `load` sans défilement déclenchent au plus deux demandes et 2 Mio de corps d'image ; une consultation complète déclenche au plus neuf invocations et 9 Mio sans doublon d'ID, soit une extrapolation maximale de 9 000 invocations et 9 000 Mio pour 1 000 consultations, à comparer aux quotas Netlify officiels en vigueur ;
- les requêtes indépendantes sont lancées en parallèle lorsque cela est pertinent ;
- les listes publiques utilisent un cache invalidé lors des modifications ;
- aucune pagination n'est requise pour 40 prestations ; la galerie administrative affiche au plus 100 éléments par page et montre précédent, suivant, page courante et total à partir du 101e élément.

### 12.2 Accessibilité

- respecter WCAG 2.1 niveaux A et AA sur les pages complètes, leurs états représentatifs et les processus complets ;
- exécuter pour chaque état un scan Axe borné aux tags WCAG 2.1 A/AA sans aucune violation, tous impacts confondus, puis un scan général distinct sans anomalie sérieuse ou critique ;
- conserver les deux résultats JSON complets avec la preuve Playwright, sans exclusion ni règle désactivée sauf dérogation explicite, datée, bornée et liée à une correction ;
- navigation complète au clavier ;
- focus visible ;
- libellé explicite pour chaque champ ;
- messages d'erreur reliés aux champs ;
- contraste lisible ;
- textes alternatifs obligatoires pour les images porteuses d'information ;
- éléments décoratifs ignorés par les technologies d'assistance ;
- annonces de succès et d'erreur avec une région de statut adaptée.
- absence de défilement horizontal global à l'équivalent de 320 CSS px, indépendamment du contrôle distinct à 200 % de zoom ;
- cibles de contrôle du design d'au moins 44 × 44 CSS px, hors lien réellement inline dans un texte ;
- réduction des mouvements non essentiels lorsque `prefers-reduced-motion: reduce` est actif ;
- les scans automatisés ne remplacent jamais la revue manuelle Firefox, Safari mobile physique et technologie d'assistance.

### 12.3 Référencement

- `/services`, `/galerie` et `/contact` possèdent chacune un titre, une description, un canonical absolu et un Open Graph uniques ;
- l'unique origine SEO est `https://knailsbeauty.fr`, indépendamment de l'hôte entrant, de `www`, du `.com` ou d'une Deploy Preview ;
- en production canonique, le sitemap contient exactement ces trois pages et `robots.txt` autorise le public, exclut `/admin` et référence le sitemap ;
- hors production, toutes les pages sont `noindex, nofollow`, `robots.txt` refuse toute exploration et le sitemap ne contient aucune URL ;
- l'administration, connexion comprise, reste `noindex, nofollow` dans tous les contextes et n'expose aucun canonical ;
- l'image Open Graph finale mesure 1 200 × 630 px et n'affiche aucune coordonnée non confirmée ;
- le JSON-LD `BeautySalon` contient uniquement le nom, l'URL canonique, l'adresse et les horaires confirmés visibles ; aucun téléphone, réseau ou image n'est publié avant confirmation ;
- la syntaxe et la cohérence sont contrôlées localement, puis le document hébergé est soumis au validateur public Schema.org avec zéro erreur ; un résultat externe indisponible ou inclassable reste bloquant ;
- contenu principal rendu côté serveur afin d'être lisible sans exécution JavaScript côté client.

### 12.4 Responsive

Les pages publiques et l'administration doivent être utilisables au minimum aux largeurs suivantes :

- mobile : 320 px et plus ;
- tablette : 768 px et plus ;
- ordinateur : 1 024 px et plus.

L'administration privilégie des formulaires simples et des listes qui restent lisibles sur téléphone.

### 12.5 Compatibilité

La version initiale cible les versions modernes de Chrome, Safari, Firefox et Edge. Safari mobile doit faire partie des contrôles prioritaires en raison de l'usage probable sur téléphone.

## 13. Gestion des erreurs et journalisation

- une erreur publique affiche un message compréhensible sans détails internes ;
- une erreur d'administration conserve les données déjà saisies lorsque cela est possible ;
- une erreur d'authentification ne précise pas si l'adresse e-mail existe ;
- une erreur d'envoi de fichier distingue validation, réseau, quota et autorisation ;
- les contrôles techniques de la fondation classent chaque échec principal dans exactement une catégorie parmi validation, autorisation, droit d'accès et erreur interne, sans exposer de secret ;
- les erreurs serveur sont visibles dans les journaux Netlify ;
- les erreurs de base, d'authentification et de Storage sont consultables dans Supabase ;
- aucun mot de passe, jeton, cookie ou contenu sensible ne doit être écrit dans les journaux.

## 14. Sauvegarde et reprise

Supabase Free ne fournit pas les sauvegardes automatiques du niveau payant. La première version doit donc prévoir :

- toutes les évolutions du schéma dans des migrations versionnées ;
- un export manuel des prestations avant une modification importante de production ;
- une conservation locale ou externe des photos originales importantes ;
- une procédure documentée de restauration des données et de réenvoi des images ;
- aucune suppression en masse sans sauvegarde préalable.

## 15. Tests et vérifications

### 15.1 Vérifications automatisées minimales

- lint sans erreur ;
- vérification TypeScript sans erreur ;
- build Next.js de production réussi ;
- tests unitaires des schémas de validation ;
- tests des fonctions de transformation des données ;
- test de création, modification, masquage et suppression d'une prestation ;
- test d'envoi et suppression d'une image ;
- corpus exact F01–F20 de la spécification galerie, couvrant les six valides, trois bornes vides/supérieures, six formats interdits et cinq contradictions extension/type/octets ;
- deux oracles RGBA de 25 positions validés sur l'aperçu exact et le WebP finalisé, avec et sans redimensionnement ;
- matrice serveur de huit objets déclarés WebP dont seul l'objet réellement conforme devient public ;
- domaine SQL des dix `repair_code` accepté valeur par valeur et toute autre valeur refusée ;
- pagination stable de 201 photos en pages de 100, 100 et 1 sans perte ni doublon ;
- réconciliation d'opérations à 9 min 59 s, 10 min et 11 min, et audit d'un fichier absent ;
- test de refus d'une opération non autorisée.
- test du bucket privé, du refus de liste anonyme et de la même URL applicative passant de 200 à 404 immédiatement après masquage, état non `ready` ou suppression.

La matrice d'interruption galerie couvre exactement les cas suivants :

| ID | Interruption | Résultat attendu après rechargement et reprise |
| --- | --- | --- |
| C1 | Réservation de création avant upload | `pending/create` sans objet, puis audit et annulation ciblée. |
| C2 | Upload de création avant validation/finalisation | Objet réservé revalidé, puis finalisé ou nettoyé. |
| C3 | Octets invalides avant nettoyage confirmé | Jamais public ; suppression/annulation ou `repair_required/invalid_object_bytes`. |
| C4 | Ligne créée `ready` avant réponse client | Même opération confirmée idempotemment, sans doublon. |
| R1 | Remplacement masqué/réservé avant upload | Ancien objet conservé, nouveau absent, ligne non publique. |
| R2 | Nouvel objet uploadé avant validation | Ancien courant ; nouveau validé ou nettoyé. |
| R3 | Nouvel objet validé avant bascule | Ancien courant ; bascule répétable sans duplication. |
| R4 | Bascule avant retrait de l'ancien | Nouveau courant ; ancien chemin nettoyé exactement. |
| R5 | Ancien retiré avant retour à `ready` | Nouveau seul ; état de nettoyage effacé idempotemment. |
| D1 | `pending/delete` avant retrait objet | Ligne et objet non publics, puis retrait ciblé. |
| D2 | Objet retiré avant retrait ligne | Absence acceptée, puis ligne retirée. |
| D3 | Ligne retirée avant réponse client | Ligne et objet absents ; répétition convergente. |

Chaque cas interdit faux succès, doublon et action sur un chemin tiers. Les dix états non convergés restent masqués du public ; C4 et D3 prouvent la répétition idempotente après convergence.

### 15.2 Vérifications de sécurité Supabase

Les scénarios suivants doivent être exécutés avec les rôles réels :

1. un visiteur peut lire une prestation active ;
2. un visiteur ne peut pas lire une prestation inactive ;
3. un visiteur ne peut pas créer, modifier ou supprimer ;
4. un compte authentifié sans rôle admin ne peut pas écrire ;
5. l'administrateur peut effectuer les opérations prévues ;
6. l'administrateur peut remplacer un fichier Storage ;
7. la suppression d'une photo retire la ligne et le fichier ;
8. aucune clé secrète n'apparaît dans le bundle du navigateur.
9. une auto-inscription appelée directement avec la clé publiable est refusée sans créer de compte.

La fondation Supabase vérifie séparément les droits de suppression de la ligne et du fichier. Le workflow applicatif de galerie coordonne désormais les deux ressources par une opération durable, un masquage préalable et une reprise idempotente des échecs partiels ; le scénario 7 en reste le critère de validation.

La préparation à la production sépare obligatoirement trois gates :

- la pile locale exécute les contrats SQL, Auth et Storage reproductibles ;
- une Deploy Preview liée au SHA exécute, après garde de cible et autorisation explicite, une matrice mutable avec sessions anon, authentifiée non-admin et admin réelles ; les UUID, objets et identités de test sont tous supprimés et leur absence est relue avant succès ;
- la production reçoit uniquement l'inventaire en lecture seule des GRANT, RLS, politiques, Auth, advisors, SSL et restrictions réseau tant qu'une mutation n'a pas été autorisée séparément.

La clé secrète temporairement obtenue pour une recette preview sert exclusivement à créer et supprimer les identités de fixture. Les assertions d'autorisation utilisent la clé publiable et les sessions réelles ; les lignes de test sont préparées par l'administrateur courant et nettoyées par la capacité de maintenance, jamais par un contournement utilisé comme preuve RLS. Tout échec de nettoyage, warning advisor, inscription ouverte, SSL base désactivé ou clé legacy compromise maintient la décision `not_ready`.

### 15.3 Vérifications fonctionnelles

- affichage correct des trois catégories initiales et de toute nouvelle catégorie contenant une prestation active ;
- absence publique d’une catégorie vide ou ne contenant que des prestations masquées ;
- création administrative d’une catégorie valide, refus d’un doublon casse/espaces et disponibilité immédiate dans le formulaire de prestation ;
- renommage et réordonnancement immédiatement visibles dans les formulaires et sur la prochaine consultation publique ;
- refus explicite de supprimer une catégorie utilisée, puis suppression confirmée de cette même catégorie après retrait de sa dernière prestation ;
- ordre des prestations conforme à l'administration ;
- formats de prix corrects ;
- badge facultatif correctement affiché ;
- galerie conforme au design existant ;
- textes alternatifs présents ;
- chaque modification confirmée est visible dès le premier rendu administratif suivant la réponse de l'action, sans actualisation manuelle, puis sur une nouvelle consultation publique en moins de cinq secondes et sans redéploiement ;
- connexion, expiration de session et déconnexion opérationnelles ;
- formulaire de contact accusé positivement par Netlify avant d'afficher le succès ;
- navigation mobile et clavier validée.
- somme des entrées `layout-shift` attribuables aux images de galerie égale à 0 sur le parcours automatisé ;
- conversion colorimétrique mesurée sur un corpus opaque versionné de trois images sRGB et trois Display-P3, avec 25 coordonnées normalisées `(u,v)` dans `[0,1]²` et triplets sRGB 8 bits par image ; chaque pixel est choisi par `x=floor(u×(largeur−1)+0,5)`, `y=floor(v×(hauteur−1)+0,5)` puis borné, et références/sorties sont converties de sRGB vers CIE Lab D65, observateur 2°, sans adaptation D50, avant CIEDE2000 ; sur les 150 échantillons de l'aperçu exact comme du WebP finalisé, la médiane est <=2 et le P95 au rang le plus proche, rang 143 en base 1, est <=5 ;
- les neuf WebP initiaux conservent l'image complète sans recadrage ni déformation, respectent les dimensions manifestées à un pixel d'arrondi près et obtiennent un SSIM >=0,97 face à leur source opaque orientée, convertie sRGB et redimensionnée aux dimensions exactes de sortie ; le calcul porte sur `Y=0,299R+0,587G+0,114B` en sRGB 8 bits non linéaire, avec fenêtre gaussienne 11×11 sigma 1,5, `K1=0,01`, `K2=0,03`, `L=255`, extension réfléchie et moyenne des fenêtres centrées sur tous les pixels ;
- un utilisateur cible non technique ajoute et retrouve une photo publique en moins de 3 minutes sans aide, puis réussit au moins 4 des 5 tâches standardisées — retrouver une photo masquée, ajouter, corriger l'alt, remplacer et supprimer — dès la première tentative sans indice.
- le contrôle froid et la preview respectent le budget galerie de deux demandes/2 Mio avant défilement et neuf invocations/9 Mio par consultation complète, sans doublon d'ID ; le rapport consigne l'extrapolation à 1 000 consultations et la comparaison aux quotas Netlify officiels du jour.

### 15.4 Décision de préparation production

Le manifeste de recette inventorie exactement les 56 exigences de préparation, les 16 critères de succès, les 13 critères d'acceptation de la section 16 et les 72 gates des fonctionnalités 001 à 005. Une source absente, supplémentaire, dupliquée, modifiée ou associée à un autre SHA est refusée. Chaque exigence pointe vers au moins une preuve datée et expurgée ; une preuve obligatoire sans artefact, une preuve manuelle non signée ou une preuve antérieure au gel est invalide.

`npm run production:check` exécute le profil local et produit un rapport honnête même lorsque les contrôles hébergés ou humains restent `not_run`; ce rapport ne peut alors pas autoriser la promotion. Après gel, `npm run production:preview-check` exécute une seule fois la garde et les cinq specs hébergées, puis agrège les preuves humaines déjà réellement signées. Ces commandes ne simulent jamais Safari physique, Firefox réel, VoiceOver, la revue visuelle, une restauration ou un réglage fournisseur.

Après promotion du SHA approuvé, `npm run production:smoke` exige une autorisation explicite pour la soumission Contact et des identifiants administrateur injectés uniquement dans le processus. Il exécute exactement les onze cas contractuels sur `https://knailsbeauty.fr`. La décision reste `not_ready` si un seul cas échoue, si le SHA/deploy diverge, si un risque majeur ou critique subsiste, ou si les deux assets finaux ne sont pas retrouvés avec les mêmes digests dans une GitHub Release publiée et immuable.

## 16. Critères d'acceptation du MVP

La fonctionnalité est considérée comme terminée lorsque :

1. les prestations codées en dur ont été remplacées par les données Supabase ;
2. les photos administrables sont stockées dans Supabase Storage ;
3. le design public existant est conservé, avec zéro décalage de mise en page attribuable aux images dans le scénario automatisé et les seuils colorimétriques définis en 15.3 ;
4. l'administrateur peut gérer les prestations, leurs catégories et les photos depuis `/admin`, y compris renommer, réordonner et supprimer sûrement une catégorie vide ;
5. un visiteur ou un utilisateur non-admin ne peut effectuer aucune mutation ;
6. RLS et les politiques Storage ont été testées ;
7. les images sont validées côté navigateur puis leurs octets finaux sont revalidés côté serveur, compressés à 1 Mio maximum et accompagnés de leurs métadonnées ;
8. les modifications publiques sont visibles sans redéploiement ;
9. le formulaire de contact n'affiche plus de faux succès ;
10. le lint, la vérification TypeScript et le build de production réussissent ;
11. le projet est déployé sur Netlify avec les variables d'environnement correctes ;
12. le domaine et le HTTPS fonctionnent en production ;
13. la pagination 100/100/1, le test utilisateur standardisé et le budget de livraison galerie ont des preuves consignées, et aucune clé de configuration ponctuelle du bucket n'est présente dans Netlify.

Pour la gestion de galerie, une liste administrative seule ou une création sans remplacement, suppression, publication publique, reprise des échecs et bootstrap initial ne constitue pas le MVP fonctionnel. Ces parcours doivent être livrés et validés ensemble ; l'upload multiple, le recadrage manuel, l'historique et la publication vers un réseau social restent hors périmètre.

## 17. Ordre d'implémentation recommandé

1. Créer et configurer le projet Supabase.
2. Créer les migrations des tables, contraintes et index.
3. Configurer l'exposition Data API, les droits et toutes les politiques RLS.
4. Créer le bucket Storage et ses politiques.
5. Installer et configurer les clients Supabase navigateur et serveur.
6. Mettre en place la connexion et la protection de l'administration.
7. Développer le CRUD des prestations.
8. Brancher la page publique des prestations sur Supabase.
9. Développer l'envoi, le traitement et le CRUD des photos.
10. Brancher la galerie publique sur Supabase.
11. Rendre le formulaire de contact réellement fonctionnel.
12. Ajouter le cache et son invalidation ciblée.
13. Exécuter les tests de permissions, de build, d'accessibilité et de responsive.
14. Déployer sur Netlify et effectuer les tests de production.

## 18. Références techniques

- [Infrastructure du projet](./infra.md)
- [Architecture du projet](./architecture.md)
- [Système de design du projet](./design.md)
- [Authentification Next.js](https://nextjs.org/docs/app/guides/authentication)
- [Mutations de données avec Next.js](https://nextjs.org/docs/app/getting-started/mutating-data)
- [Cache et revalidation Next.js](https://nextjs.org/docs/app/getting-started/caching)
- [Authentification Supabase avec Next.js](https://supabase.com/docs/guides/auth/quickstarts/nextjs)
- [Sécurisation de la Data API Supabase](https://supabase.com/docs/guides/api/securing-your-api)
- [Tarifs Supabase](https://supabase.com/pricing)
- [Prise en charge de Next.js par Netlify](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/)
- [Tarifs Netlify](https://www.netlify.com/pricing/)
