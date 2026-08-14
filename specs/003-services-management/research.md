# Research: Gestion des prestations

## Decision 1: réutiliser la table et l'autorisation existantes

**Decision**: Conserver `public.prestations`, ses identifiants UUID, son trigger `updated_at`, son index public partiel et le prédicat `private.is_current_admin()`. Les pages administratives réutilisent `requireAdminPage()` et les mutations `requireAdminAction()` avant tout accès à la table ; RLS reste la barrière finale.

**Rationale**: Le schéma 001 contient déjà tous les champs du MVP et la migration 002 relit le rôle protégé et la session courante. Créer une seconde table, un ORM ou un nouveau mécanisme de rôle dupliquerait une fondation déjà testée.

**Alternatives considered**:

- Nouvelle table de prestations : rejetée, aucune donnée ou relation manquante ne le justifie.
- `service_role` côté serveur : rejeté, il contournerait RLS et élargirait la surface de secrets.
- Autoriser uniquement depuis le layout : rejeté, chaque action est un endpoint POST direct.

## Decision 2: durcir la représentation PostgreSQL du prix

**Decision**: Dans la migration 003, convertir `prix numeric(10,2)` en `prix numeric`, remplacer la seule borne implicite par des contraintes nommées qui imposent `0 <= prix <= 99 999 999,99` et au plus deux décimales, puis conserver le couplage existant avec `type_prix`.

**Rationale**: PostgreSQL arrondit une valeur vers l'échelle déclarée avant l'évaluation des contraintes : `1.005::numeric(10,2)` devient `1.01`. Une colonne `numeric` non contrainte par typmod, combinée à une borne et un contrôle d'échelle, peut refuser l'entrée au lieu de l'arrondir silencieusement. Le domaine métier et la valeur maximale restent inchangés.

**Alternatives considered**:

- Garder `numeric(10,2)` et valider seulement dans l'application : rejeté, un appel Data API direct avec un administrateur pourrait encore provoquer un arrondi silencieux.
- RPC de mutation acceptant un prix textuel : rejeté, il ajoute une interface de mutation et laisse l'accès direct à la table incohérent.
- Stocker des cents dans une nouvelle colonne entière : rejeté, cela contredit le modèle métier déjà documenté et impose une migration plus large.

## Decision 3: utiliser les cents comme vérité applicative

**Decision**: Normaliser la saisie française en chaîne canonique, la convertir en entier de cents sûr, puis utiliser les cents pour validation, comparaison et formatage. Le rendu public canonique omet les décimales d'un montant entier (`45 €`) et affiche exactement deux décimales lorsqu'il reste des centimes (`45,50 €`). Convertir vers un `number` uniquement à la frontière Supabase et convertir immédiatement les résultats exacts en cents, en demandant `prix::text` dans les sélections qui doivent préserver la représentation décimale.

**Rationale**: Les types générés exposent actuellement `numeric` comme `number | null`, mais la limite maximale correspond à 9 999 999 999 cents, très inférieure à `Number.MAX_SAFE_INTEGER`. Aucun calcul métier ne dépend donc d'un flottant, tandis que PostgreSQL reste la source de vérité persistante.

**Alternatives considered**:

- Calculer avec le `number` retourné : rejeté, il deviendrait une source métier approximative.
- Ajouter une bibliothèque décimale : rejeté, les cents entiers suffisent pour deux décimales et évitent une dépendance.
- Conserver le prix uniquement comme chaîne dans toute l'application : recevable, mais moins pratique pour les limites et le formatage ; le contrat cents est plus simple à tester.

## Decision 4: séparer strictement lecture publique et lecture administrative

**Decision**: Créer un client Supabase serveur anonyme, sans cookies ni persistance de session, uniquement pour `getPublicServices()`. Il sélectionne explicitement les champs publics, filtre `actif = true` et laisse RLS anon répéter ce filtre. Les lectures admin utilisent le client SSR par requête et restent hors cache.

**Rationale**: Le client serveur existant lit les cookies. L'utiliser dans une fonction partagée `use cache` est incompatible avec les APIs runtime et pourrait mettre en cache le résultat plus large d'un administrateur, incluant les prestations masquées. Un contexte anon produit une réponse identique pour tous les visiteurs.

**Alternatives considered**:

- Réutiliser le client SSR dans le cache : rejeté, risque de fuite inter-utilisateurs et accès runtime interdit dans le scope.
- `use cache: private` : rejeté, inutile pour le public et interdit pour les données d'administration.
- Requête REST manuelle : rejetée, elle duplique le client installé et son traitement des erreurs.

## Decision 5: activer Cache Components avec une adoption minimale

**Decision**: Activer `cacheComponents: true`. Retirer les deux exports `dynamic = "force-dynamic"` existants, incompatibles avec ce mode, et ajouter `instant = false` à `/admin/connexion` et au layout admin protégé. Marquer la lecture publique avec `use cache`, `cacheLife("days")` et `cacheTag("prestations")`.

**Rationale**: Les prestations changent rarement mais doivent être immédiatement invalidées. Le profil `days` réduit les lectures tout en donnant un repli borné si une donnée est modifiée hors de l'application. L'administration doit attendre la vérification de session avant rendu et ne tire aucun bénéfice d'un shell public streamé.

**Alternatives considered**:

- Conserver `dynamic = "force-dynamic"` : invalide lorsque Cache Components est activé.
- Mettre toute l'administration sous Suspense : possible, mais ajoute une complexité de shell protégé sans valeur pour un administrateur unique.
- `cacheLife("max")` : rejeté au profit d'un repli plus court en cas de mutation externe.
- Laisser Cache Components désactivé : contraire à la stratégie de cache du MVP.

## Decision 6: invalider par `updateTag` après succès réel

**Decision**: Chaque action réussie appelle `updateTag("prestations")` après la mutation et la vérification de la ligne affectée, puis retourne son état ou redirige. Aucune invalidation n'est exécutée lors d'une validation refusée, d'une cible absente ou d'une erreur.

**Rationale**: Next.js 16 réserve `updateTag` aux Server Actions et au scénario read-your-own-writes : le prochain lecteur attend la donnée fraîche. `revalidateTag(..., "max")` autoriserait temporairement une valeur obsolète, contraire au succès confirmé en moins de cinq secondes.

**Alternatives considered**:

- `revalidateTag("prestations", "max")` : rejeté, rafraîchissement en arrière-plan.
- `refresh()` uniquement : rejeté, il ne purge pas le catalogue public partagé.
- Route Handler d'invalidation : rejeté, aucune interface HTTP externe n'existe.

## Decision 7: quatre actions fines et des états discriminés

**Decision**: Exposer quatre Server Actions : création, mise à jour, changement de visibilité et suppression. Chaque action appelle l'autorisation, valide son entrée, effectue une seule mutation ciblée par UUID, demande l'identifiant affecté, classe l'erreur et invalide le tag après succès. Les formulaires clients utilisent `useActionState`; les listes et lectures restent serveur.

**Rationale**: Des actions séparées gardent les permissions, entrées et confirmations explicites. Le retour de l'identifiant évite qu'une mise à jour ou suppression de zéro ligne soit annoncée comme réussite. Les unions d'état empêchent d'exposer une erreur brute Supabase.

**Alternatives considered**:

- Une action générique CRUD : rejetée, trop de branches et contrat destructif moins lisible.
- Mutations directement depuis le navigateur : rejetées, elles déplacent la logique et l'autorisation côté client.
- Route Handlers : rejetés, les formulaires internes sont couverts par les Server Actions.

## Decision 8: liste sémantique responsive et formulaires dédiés

**Decision**: Utiliser une liste sémantique unique rendue en grille sur ordinateur et en cartes sous 760 px. Proposer des routes distinctes pour créer et modifier, des actions textuelles explicites pour masquer/réactiver, et un dialogue de suppression titré qui restaure le focus. La liste reste serveur ; le formulaire de visibilité imbriqué, les formulaires create/edit, le dialogue et les Error Boundaries `error.tsx` imposées par Next.js constituent les frontières clientes. La décision initiale distinguait `adminLabel`/`publicLabel`; elle est remplacée par la décision 14, où le nom en base devient le libellé commun et les trois visuels initiaux restent indexés par code.

**Rationale**: Cette structure suit `doc/design.md`, évite un tableau horizontal à 320 px et ne duplique pas deux arbres DOM. Les actions restent nommées au clavier et ne reposent ni sur la couleur ni sur une icône.

**Alternatives considered**:

- Tableau desktop dupliqué par des cartes mobiles : rejeté, duplication des données et de l'ordre de tabulation.
- Tout éditer en ligne : rejeté, formulaire trop dense et erreurs difficiles à associer sur mobile.
- Confirmation native uniquement : rejetée, moins contrôlable pour le titre, la conséquence et le retour de focus.

## Decision 9: migrer les huit prestations statiques avec le schéma

**Decision**: Créer la migration avec `npx supabase migration new services_management`, y inclure huit lignes aux UUID v4 fixes, champs explicites, `fixed`, actives et ordres 0/1/2 par catégorie. Vérifier avant déploiement que la cible attend bien le socle sans doublon, puis supprimer les constantes TypeScript dans le même lot que la bascule publique.

**Rationale**: Un seed local n'est pas une migration de production. Les UUID et ordres déterministes rendent le reset, les tests et la reprise vérifiables. L'absence d'upsert empêche de masquer une collision ou d'écraser un contenu déjà administré.

**Alternatives considered**:

- `supabase/seed.sql` : rejeté, il ne garantit pas la reprise lors d'un push de migrations hébergé.
- Création au démarrage de l'application : rejetée, non déterministe et concurrente.
- Upsert par nom : rejeté, le nom n'est pas unique et une mutation ultérieure pourrait être écrasée.

## Decision 10: consolider les politiques `SELECT` des prestations

**Decision**: Remplacer les deux politiques permissives qui s'appliquent simultanément à `authenticated` par une politique anon `actif = true` et une politique authenticated `actif = true OR private.is_current_admin()`.

**Rationale**: La matrice d'accès ne change pas, la politique `SELECT` nécessaire aux updates reste compatible et l'advisor ne signale plus plusieurs politiques permissives pour `prestations`. L'avertissement identique de la galerie est hors du périmètre 003 et peut être traité avec sa fonctionnalité.

**Alternatives considered**:

- Ignorer l'advisor : rejeté pour la table directement touchée par cette fonctionnalité.
- Consolider aussi la galerie : différé, modification sans rapport avec le parcours livré.

## Decision 11: étendre la stratégie de tests existante sans nouveau framework

**Decision**: Ajouter pgTAP pour la migration/prix/politiques/seed, `node:test` pour les fonctions pures, et Playwright pour la matrice CRUD/cache/accessibilité sous Chromium et WebKit. Élargir les scripts actuels sans supprimer les tests Auth ; ajouter un agrégat `services:check` expurgé.

**Rationale**: Le dépôt possède déjà ces outils et des fixtures Auth locales sûres. Les composants serveur asynchrones et le cache sont mieux vérifiés sur le build de production que dans un environnement DOM simulé.

**Alternatives considered**:

- Ajouter Vitest/Jest : rejeté, dépendance inutile et couverture limitée des Server Components asynchrones.
- Tester uniquement les actions par navigateur : rejeté, trop lent pour la matrice des 28 limites.
- Tester le cache seulement en local : insuffisant, le comportement Netlify doit être confirmé en preview.

## Decision 12: diagnostiquer sans exposer les erreurs fournisseur

**Decision**: Mapper les échecs vers validation, session expirée, autorisation refusée, cible absente/conflit, réseau/quota et erreur interne. La classification préserve le statut de la réponse PostgREST au lieu de lire seulement l'objet `error` : statut `0`, annulation/délai et statuts `429`, `502`, `503`, `504` sont récupérables. Les échecs d'autorisation indisponible, de mutation et d'invalidation journalisent seulement catégorie, phase et le même identifiant de corrélation opaque que l'état retourné ; jamais ligne brute, SQL, erreur Supabase, cookie, JWT, e-mail ou contenu de session.

**Rationale**: L'administrateur reçoit une action récupérable tandis que les logs restent utiles sans violer les exigences de confidentialité. Les anciens identifiants de Server Action après déploiement deviennent un message de rafraîchissement/réessai, jamais un faux succès.

**Alternatives considered**:

- Afficher `error.message` : rejeté, texte fournisseur instable et potentiellement révélateur.
- Un message unique pour tout : rejeté, ne distingue pas validation, session et indisponibilité.

## Decision 13: scénarios de délai et de panne déterministes, locaux et immuables

**Decision**: Injecter les dépendances des actions dans leur cœur pur pour les tests unitaires, retarder le POST de Server Action avec l'interception réseau Playwright pour vérifier le pending, et exécuter les états de lecture vide/indisponible dans des processus Next.js isolés sélectionnant un scénario `server-only` immuable au démarrage. Un scénario n'est accepté que contre une URL Supabase loopback exacte et hors contexte Netlify ; aucune entrée navigateur ne peut le sélectionner.

**Rationale**: Les appels Supabase des Server Components partent du serveur et ne peuvent pas être interceptés de façon fiable depuis une page Playwright. Un scénario fixé par processus rend les tests reproductibles malgré Cache Components, tandis que le garde loopback/fail-closed empêche de transformer l'outil de test en contournement RLS ou en panne activable sur un environnement hébergé. Les parcours de sécurité normaux continuent d'utiliser la vraie pile locale et ses politiques.

**Alternatives considered**:

- Arrêter Supabase pendant les tests : rejeté, l'authentification et le cache partagé rendraient les résultats couplés et non déterministes.
- Déclencher une panne avec query string, cookie, en-tête ou Route Handler : rejeté, cela créerait un interrupteur contrôlable par le client et une surface hors MVP.
- Utiliser uniquement des mocks unitaires : rejeté, ils ne prouvent pas le rendu réel des `error.tsx`, des annonces et du retry dans le build de production.
- Insérer des noms ou UUID sentinelles en base : rejeté, une donnée métier ne doit jamais activer un comportement de test.

## Decision 14: administrer le cycle de vie unitaire des catégories

**Decision**: Ajouter `public.categories_prestations` avec un code texte stable généré côté serveur, un nom unique normalisé, un ordre et les timestamps. Reprendre les trois catégories initiales, remplacer le CHECK fermé de `prestations.categorie` par une clé étrangère `ON UPDATE RESTRICT ON DELETE RESTRICT`, autoriser la lecture publique et réserver `INSERT`/`UPDATE`/`DELETE` à l’administrateur courant. Le code n’est jamais éditable. Une suppression encore référencée devient un conflit récupérable ; aucune cascade ni réaffectation implicite n’est réalisée. La personnalisation visuelle reste hors périmètre. Les catégories vides sont omises publiquement ; les nouvelles catégories non vides utilisent un fallback visuel générique.

**Rationale**: La demande exige désormais « Administration → Prestations → Catégories » avec création, renommage et suppression. Une table dédiée évite toute dérive entre formulaire, DAL et contrainte SQL. Les grants explicites et RLS restent deux barrières distinctes, conformément au changement Data API Supabase courant. Le code serveur empêche le navigateur d’imposer ou modifier une identité technique. La restriction de clé étrangère protège aussi contre une course entre le compteur affiché et la confirmation de suppression.

**Alternatives considered**:

- Étendre seulement une constante TypeScript : rejeté, cela imposerait toujours un déploiement et ne répondrait pas à l’autonomie administrative.
- Utiliser le nom comme clé : rejeté, un libellé éditorial ne doit pas devenir une identité relationnelle mutable.
- Livrer immédiatement rename/delete/visuel : rejeté, périmètre et risques de références orphelines inutiles pour la demande de création.

## Primary sources

- Next.js local 16.3 : `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`, `07-mutating-data.md`, `08-caching.md`, `node_modules/next/dist/docs/01-app/02-guides/forms.md`, `server-actions.md`, `data-security.md`, `migrating-to-cache-components.md`, `testing/playwright.md`, et les références `cacheTag.md`, `cacheLife.md`, `updateTag.md`, `page.md`.
- [Supabase Data API grants et RLS](https://supabase.com/docs/guides/api/securing-your-api), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [advisors](https://supabase.com/docs/guides/database/database-advisors), [sessions](https://supabase.com/docs/guides/auth/sessions), [seed local](https://supabase.com/docs/guides/local-development/seeding-your-database) et [changelog](https://supabase.com/changelog.md).
- [Changement d'exposition automatique Data API](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically).
- [PostgreSQL exact numeric types](https://www.postgresql.org/docs/current/datatype-numeric.html) et [PostgREST column casts](https://docs.postgrest.org/en/v12/references/api/tables_views.html#casting-columns).
