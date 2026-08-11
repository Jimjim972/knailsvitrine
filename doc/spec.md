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
| `PRE-PUB-02` | Regrouper les prestations selon les catégories existantes : onglerie et manucure, soins du corps, esthétique et visage. |
| `PRE-PUB-03` | Respecter l'ordre d'affichage choisi dans l'administration. |
| `PRE-PUB-04` | Afficher au minimum le nom, la description, le prix et la durée. |
| `PRE-PUB-05` | Pouvoir afficher un badge facultatif, par exemple « Populaire » ou « Nouveau ». |
| `PRE-PUB-06` | Gérer les cas « prix fixe », « à partir de » et « sur devis ». |
| `PRE-PUB-07` | Une modification validée dans l'administration doit être visible sur le site sans nouveau déploiement. |

Les trois catégories et leur présentation visuelle restent configurées dans le code pour la première version. Une table de catégories ne sera nécessaire que si l'administrateur doit ensuite créer ou modifier les catégories elles-mêmes.

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

### 7.3 Galerie publique

| ID | Besoin |
| --- | --- |
| `GAL-PUB-01` | Afficher uniquement les photos actives. |
| `GAL-PUB-02` | Respecter l'ordre défini dans l'administration. |
| `GAL-PUB-03` | Conserver les variantes visuelles de la galerie actuelle : mise en avant, petite carte et carte large. |
| `GAL-PUB-04` | Chaque photo doit avoir un texte alternatif. |
| `GAL-PUB-05` | Un titre, un libellé et un lien externe peuvent être associés à une photo de manière facultative. |
| `GAL-PUB-06` | Le chargement différé doit être utilisé pour les photos qui ne sont pas immédiatement visibles. |

### 7.4 Administration de la galerie

| ID | Besoin |
| --- | --- |
| `GAL-ADM-01` | Envoyer une photo depuis l'appareil de l'administrateur. |
| `GAL-ADM-02` | Vérifier le type, les dimensions et la taille du fichier avant l'envoi. |
| `GAL-ADM-03` | Enregistrer le texte alternatif, le titre facultatif, le type d'affichage, l'ordre et le statut. |
| `GAL-ADM-04` | Prévisualiser l'image et sa visibilité. |
| `GAL-ADM-05` | Remplacer une photo sans laisser un ancien fichier inutilisé. |
| `GAL-ADM-06` | Supprimer la ligne de base de données et le fichier Storage associé après confirmation. |
| `GAL-ADM-07` | Si l'enregistrement des métadonnées échoue après l'envoi, supprimer le fichier envoyé ou signaler clairement le nettoyage nécessaire. |

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

Le formulaire devra :

- effectuer une validation côté navigateur et côté serveur ou plateforme ;
- afficher un retour de réussite réel uniquement après réception confirmée ;
- afficher une erreur exploitable en cas d'échec ;
- inclure une protection anti-spam ;
- ne pas enregistrer les messages dans les tables publiques Supabase.

Si Netlify Forms s'avère incompatible avec le besoin final, la solution de remplacement devra être décidée avant implémentation : envoi par un fournisseur d'e-mail transactionnel ou stockage sécurisé dans Supabase avec protection anti-spam.

## 8. Règles de gestion

### 8.1 Prestations

- le nom est obligatoire et contient entre 2 et 120 caractères ;
- la description est obligatoire et contient au maximum 1 000 caractères ;
- la catégorie appartient à une liste fermée définie dans l'application ;
- le prix est positif ou nul lorsqu'il est renseigné ;
- le type de prix vaut `fixed`, `starting_at` ou `quote` ;
- `fixed` et `starting_at` exigent un prix renseigné ; `quote` exige un prix absent ;
- la durée est exprimée en minutes, facultative, et comprise entre 5 et 600 minutes ;
- le badge est facultatif et limité à 40 caractères ;
- l'ordre d'affichage est un entier positif ou nul ;
- une nouvelle prestation est active par défaut, sauf choix contraire dans le formulaire ;
- une suppression est définitive et demande une confirmation.

### 8.2 Photos

- formats entrants acceptés : JPEG, PNG et WebP ;
- SVG, GIF animés, vidéos et fichiers arbitraires sont refusés dans la première version ;
- taille maximale du fichier entrant : 8 Mo ;
- largeur cible après traitement : 1 600 px maximum ;
- format cible recommandé : WebP ;
- poids cible : 150 à 400 Ko, avec un maximum applicatif à définir autour de 1 Mo après traitement ;
- le texte alternatif est obligatoire et limité à 200 caractères ;
- le nom de fichier final est généré par l'application et ne reprend pas directement un nom fourni par l'utilisateur ;
- le chemin Storage est unique ;
- les dimensions finales sont conservées en base afin d'éviter les décalages de mise en page ;
- une image inactive reste stockée mais n'est pas affichée publiquement ;
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
- des variables d'environnement distinctes entre développement et production ;
- un domaine personnalisé avec HTTPS.

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

Le bucket Supabase `galerie` est public en lecture, mais protégé en écriture par des politiques Storage.

Le flux recommandé est :

1. l'administrateur choisit un fichier ;
2. le navigateur valide son type et sa taille ;
3. le navigateur redimensionne et convertit l'image en WebP ;
4. le fichier est envoyé directement à Supabase Storage avec la session authentifiée ;
5. les métadonnées sont enregistrées dans PostgreSQL ;
6. le cache de la galerie est invalidé.

L'envoi direct évite de transférer les fichiers lourds à travers une fonction Netlify.

Pour limiter les crédits Netlify, les images déjà compressées peuvent être rendues avec `next/image` sans transformation serveur supplémentaire. Les propriétés `width`, `height`, `sizes` et `alt` restent obligatoires. Le domaine Storage Supabase doit être autorisé précisément dans `images.remotePatterns` si l'optimisation Next.js est utilisée.

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
| `categorie` | `text` | Obligatoire, valeur contrôlée |
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

### 10.2 Table `photos_galerie`

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
| `mime_type` | `text` | Obligatoire, normalement `image/webp` |
| `size_bytes` | `integer` | Obligatoire, valeur positive |
| `ordre_affichage` | `integer` | Obligatoire, zéro par défaut |
| `actif` | `boolean` | Obligatoire, vrai par défaut |
| `created_at` | `timestamptz` | Obligatoire, date serveur par défaut |
| `updated_at` | `timestamptz` | Obligatoire, date serveur par défaut |

Index partiel `photos_galerie_public_variant_order_idx` sur `(variante_affichage, ordre_affichage, created_at, id)` lorsque `actif = true`.

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
| Photos actives et fichiers publics | Lecture | Lecture | Lecture |
| Métadonnées des photos inactives | Aucun accès | Aucun accès | Lecture |
| Envoi/remplacement/suppression de fichiers | Refusé | Refusé | Autorisé |

Le rôle administrateur provient de `app_metadata`, contrôlé par le serveur, et jamais de `user_metadata`, modifiable par l'utilisateur. Le prédicat serveur relit la valeur protégée courante dans Supabase Auth au lieu d'autoriser depuis le rôle potentiellement ancien du JWT : un retrait du rôle prend donc effet dès le prochain contrôle.

Le même prédicat exige que le claim `session_id` référence encore une session appartenant à `auth.uid()` et non expirée. Un ancien JWT admin perd ainsi les droits privilégiés dès que son rôle, sa session ou son expiration ne satisfait plus l'autorité courante.

Les politiques d'actualisation Storage doivent tenir compte du fait qu'un remplacement de fichier nécessite les droits `INSERT`, `SELECT` et `UPDATE`. La suppression nécessite également sa politique dédiée.

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

## 12. Exigences non fonctionnelles

### 12.1 Performance

- les pages publiques doivent rester utilisables sur une connexion mobile ;
- les images doivent avoir des dimensions explicites pour éviter les décalages visuels ;
- seules les premières images visibles peuvent être chargées en priorité ;
- les autres images utilisent le chargement différé ;
- les requêtes indépendantes sont lancées en parallèle lorsque cela est pertinent ;
- les listes publiques utilisent un cache invalidé lors des modifications ;
- aucune pagination n'est requise pour 40 prestations, mais la galerie devra en prévoir une si elle dépasse environ 100 éléments dans l'administration.

### 12.2 Accessibilité

- respecter au minimum WCAG 2.1 niveau AA pour les parcours principaux ;
- navigation complète au clavier ;
- focus visible ;
- libellé explicite pour chaque champ ;
- messages d'erreur reliés aux champs ;
- contraste lisible ;
- textes alternatifs obligatoires pour les images porteuses d'information ;
- éléments décoratifs ignorés par les technologies d'assistance ;
- annonces de succès et d'erreur avec une région de statut adaptée.

### 12.3 Référencement

- métadonnées uniques pour les pages principales ;
- titres et descriptions cohérents avec l'activité réelle ;
- sitemap et robots configurés ;
- balises Open Graph pour le partage ;
- données structurées de type entreprise locale lorsque l'adresse, le téléphone et les horaires définitifs seront connus ;
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
- test de refus d'une opération non autorisée.

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

La fondation Supabase peut vérifier séparément les droits de suppression de la ligne et du fichier. Le scénario 7 reste le critère du futur workflow applicatif de galerie, qui devra coordonner les deux ressources et traiter les échecs partiels.

### 15.3 Vérifications fonctionnelles

- affichage correct des trois catégories ;
- ordre des prestations conforme à l'administration ;
- formats de prix corrects ;
- badge facultatif correctement affiché ;
- galerie conforme au design existant ;
- textes alternatifs présents ;
- modifications visibles sans redéploiement ;
- connexion, expiration de session et déconnexion opérationnelles ;
- formulaire de contact réellement reçu avant d'afficher le succès ;
- navigation mobile et clavier validée.

## 16. Critères d'acceptation du MVP

La fonctionnalité est considérée comme terminée lorsque :

1. les prestations codées en dur ont été remplacées par les données Supabase ;
2. les photos administrables sont stockées dans Supabase Storage ;
3. le design public existant est conservé sans régression notable ;
4. l'administrateur peut gérer les prestations et les photos depuis `/admin` ;
5. un visiteur ou un utilisateur non-admin ne peut effectuer aucune mutation ;
6. RLS et les politiques Storage ont été testées ;
7. les images sont validées, compressées et accompagnées de leurs métadonnées ;
8. les modifications publiques sont visibles sans redéploiement ;
9. le formulaire de contact n'affiche plus de faux succès ;
10. le lint, la vérification TypeScript et le build de production réussissent ;
11. le projet est déployé sur Netlify avec les variables d'environnement correctes ;
12. le domaine et le HTTPS fonctionnent en production.

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
