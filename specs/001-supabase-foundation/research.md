# Phase 0 Research: Fondation Supabase

## 1. Runtime et versions

**Decision**: Standardiser l'implémentation sur Node.js 22 LTS et verrouiller `@supabase/supabase-js` 2.112.2, `@supabase/ssr` 0.12.4, `supabase` 2.112.0 et `zod` 4.4.3.

**Rationale**: Le dépôt s'exécute actuellement sous Node.js 20.19.5, alors que la version actuelle de `supabase-js` requiert Node.js 22 ou supérieur depuis juin 2026. Des versions exactes rendent la génération des types et les migrations reproductibles ; `@supabase/ssr` reste en bêta et mérite donc un verrouillage strict.

**Alternatives considered**:

- Conserver Node.js 20 : rejeté car non pris en charge par la version Supabase JS retenue.
- Utiliser des plages `^` : rejeté pour les dépendances Supabase de fondation, dont les changements peuvent modifier le contrat SSR ou les types.
- Employer une ancienne version de `supabase-js` : rejeté car le projet démarre son intégration et doit viser la pile officiellement supportée.

## 2. Clients Supabase dans Next.js 16

**Decision**: Créer un client navigateur avec `createBrowserClient<Database>` et une fabrique serveur asynchrone avec `createServerClient<Database>`, `await cookies()` et les adaptateurs `getAll`/`setAll`. Le module serveur est marqué `server-only` et aucun client serveur n'est partagé entre requêtes.

**Rationale**: `cookies()` est asynchrone dans Next.js 16. La séparation empêche l'import de code serveur dans un Client Component et prépare les futures Server Actions sans exposer de secret. Les deux clients n'emploient que la clé publiable ; RLS reste la barrière d'autorisation.

**Alternatives considered**:

- Un client universel singleton : rejeté car il peut mélanger des contextes de session et brouille la frontière client/serveur.
- Une clé `service_role` côté serveur pour le CRUD : rejetée car elle contourne RLS et n'est pas nécessaire.
- Créer `proxy.ts` dans cette feature : rejeté car les écrans et le rafraîchissement de session sont hors périmètre. La feature d'authentification l'ajoutera selon la convention Next.js 16.

## 3. Exposition Data API et droits SQL

**Decision**: Révoquer les privilèges implicites inutiles, y compris les privilèges par défaut futurs du rôle `postgres` dans `public`, accorder explicitement `SELECT` aux rôles `anon` et `authenticated`, puis `INSERT`, `UPDATE` et `DELETE` uniquement à `authenticated`. Activer RLS sur les deux tables et ne s'appuyer ni sur les droits seuls ni sur RLS seule.

**Rationale**: Depuis mai 2026, la création de nouvelles tables ne garantit plus leur exposition automatique. Les `GRANT` déterminent l'opération disponible et les politiques RLS déterminent les lignes accessibles. La combinaison produit une fondation explicite et testable. Les privilèges par défaut du schéma applicatif sont configurés en mode fermé pour éviter qu'une future table exposée hérite d'un accès accidentel.

**Alternatives considered**:

- Dépendre des privilèges par défaut du tableau de bord : rejeté car non reproductible.
- Accorder toutes les opérations puis laisser RLS refuser : rejeté car contraire au moindre privilège.
- Accorder des droits directs à `service_role` : inutile ; ce rôle possède déjà un accès privilégié et reste hors du parcours applicatif normal.

## 4. Identité administrateur et révocation

**Decision**: Centraliser le prédicat administrateur dans `private.is_current_admin()`. Cette fonction `security definer`, placée hors schéma exposé avec un `search_path` vide, exige simultanément `app_metadata.role = 'admin'` et une ligne `auth.sessions` dont l'identifiant correspond au `session_id` courant et l'utilisateur à `auth.uid()`. Seul `authenticated` peut l'exécuter. Les politiques l'appellent sous la forme `(select private.is_current_admin())` afin que PostgreSQL puisse l'évaluer une fois par instruction.

**Rationale**: `app_metadata` est contrôlé par le service, contrairement à `user_metadata`. Vérifier aussi la session permet à une révocation globale de rendre un ancien jeton inutilisable pour les politiques, ce qui couvre explicitement le cas d'un droit administrateur devenu obsolète. Une promotion exige toujours un rafraîchissement du jeton ; une rétrogradation exige la suppression du rôle puis la révocation des sessions.

**Alternatives considered**:

- Tester uniquement `auth.jwt()->'app_metadata'->>'role'` dans chaque politique : plus simple, mais un jeton ancien conserverait le rôle jusqu'à expiration.
- Stocker un rôle dans une table publique de profils : rejeté pour ce MVP à un seul administrateur et parce que cette table ajouterait un domaine et des politiques sans besoin démontré.
- Utiliser `user_metadata` : rejeté car modifiable par l'utilisateur.

## 5. Modèle et contraintes PostgreSQL

**Decision**: Utiliser deux tables `public.prestations` et `public.photos_galerie`, des UUID générés, des types numériques exacts, des contraintes `CHECK` nommées et un trigger partagé de mise à jour de `updated_at`. Ajouter des index partiels alignés sur les listes publiques, avec `id` comme dernier critère de tri déterministe.

**Rationale**: Les volumes sont faibles, mais les requêtes publiques sont connues et filtrent toujours `actif = true`. Les index partiels restent petits et suivent l'ordre `categorie/variante`, `ordre_affichage`, `created_at`, `id`. Les contraintes de base garantissent les invariants même si une future mutation échappe à la validation applicative.

**Alternatives considered**:

- Enums PostgreSQL : rejetés pour ce socle ; des `CHECK` nommés restent explicites et plus simples à faire évoluer par migration.
- Indexer chaque colonne : rejeté car inutile au volume du MVP et coûteux en écriture.
- Rendre `ordre_affichage` unique : rejeté car la spécification autorise temporairement les doublons.
- Lier `storage_path` par clé étrangère à `storage.objects` : rejeté car Supabase Storage ne fournit pas ce contrat relationnel applicatif et les suppressions multi-étapes seront traitées par la future feature galerie.

## 6. Bucket et politiques Storage

**Decision**: Configurer un bucket public `galerie`, limité à 8 MiB et aux MIME `image/jpeg`, `image/png` et `image/webp`. Les objets applicatifs admis suivent `photos/<uuid-v4-minuscule>.<extension-autorisée>`. Les politiques sur `storage.objects` autorisent `SELECT`, `INSERT`, `UPDATE` et `DELETE` uniquement à l'administrateur courant, dans ce bucket et pour ce chemin exact ; `UPDATE` répète la frontière dans `USING` et `WITH CHECK`. Aucun `SELECT` public sur `storage.objects` n'est accordé.

**Rationale**: Un bucket public rend les objets accessibles par URL sans ouvrir l'énumération des métadonnées Storage. Les droits d'upsert requièrent `INSERT`, `SELECT` et `UPDATE`, tandis que `DELETE` doit rester distinct. La limite de 8 MiB et les trois MIME sont les seules contraintes d'entrée finalisées par la spécification actuelle.

**Alternatives considered**:

- Bucket privé avec URLs signées : rejeté car la galerie est un contenu de diffusion publique.
- Limite de 1 MiB et WebP uniquement : différée ; le traitement et son plafond après compression ne sont pas encore finalisés et sont hors périmètre de cette feature.
- Politique publique de lecture de `storage.objects` : rejetée car elle faciliterait l'énumération sans être nécessaire à la diffusion par URL.

## 7. Types, validation et vérification

**Decision**: Versionner `database.types.ts` généré par la CLI locale, valider les deux variables publiques avec Zod, et établir les garanties SQL avec des tests pgTAP exécutés sous les trois profils. Compléter les tests SQL par des scénarios HTTP contre les API Auth et Storage locales, puis par `db lint`, les advisors, un contrôle de dérive des types, ESLint, TypeScript, le build et un scan post-build de secrets. Chaque script autonome émet le même résultat structuré que le rapport agrégé. Toute capacité administrative de test provient uniquement de la pile loopback, est capturée en mémoire depuis une sortie machine de la CLI et ne sert qu'à créer, inspecter ou nettoyer les fixtures.

**Rationale**: Les types générés relient l'application au schéma réel ; la régénération en CI détecte les migrations non reflétées. pgTAP prouve le schéma, les contraintes, les droits et les politiques au niveau PostgreSQL. Il ne prouve toutefois pas à lui seul le comportement des passerelles Auth/Storage, des limites de bucket ou d'un upsert réel : les scénarios HTTP emploient donc la clé publiable et des sessions réelles. La capacité locale privilégiée ne fait réussir aucune opération du parcours contrôlé et n'entre jamais dans l'environnement public. Les advisors et le scan du bundle couvrent des risques distincts.

**Alternatives considered**:

- Écrire manuellement les types de lignes : rejeté car ils dériveraient du schéma.
- Tester uniquement depuis le navigateur : rejeté car l'interface est hors périmètre et les refus RLS doivent être prouvés directement.
- Tester Storage uniquement en insérant dans `storage.objects` : rejeté car cela contourne l'API qui applique les limites de bucket et le cycle réel d'upload/upsert/delete.
- Tester seulement en production : rejeté car dangereux et incompatible avec la reproductibilité exigée.

## 8. Données existantes et déploiement

**Decision**: Ne fournir aucun seed métier, aucun import des tableaux codés en dur et aucune application automatique à un projet Supabase hébergé.

**Rationale**: La clarification de la spécification limite cette feature au socle. Les migrations et tests locaux sont livrés pour revue ; l'import, le branchement public et le déploiement seront planifiés séparément.

**Alternatives considered**:

- Migrer immédiatement les contenus existants : rejeté explicitement par la clarification.
- Exécuter directement la migration en production : rejeté car la demande porte sur le plan et parce qu'une cible, une sauvegarde et une validation de déploiement seraient requises.

## 9. Fermeture de l'inscription publique

**Decision**: Définir `auth.enable_signup = false`, `auth.enable_anonymous_sign_ins = false`, `auth.email.enable_signup = false` et `auth.sms.enable_signup = false` dans `supabase/config.toml`, en gardant les fournisseurs externes désactivés. Conserver la création du compte administrateur dans une procédure protégée et manuelle. Documenter, sans l'exécuter, la configuration équivalente à appliquer au futur projet hébergé. Un contrôle HTTP local tente une inscription avec la clé publiable et exige son refus sans création d'utilisateur.

**Rationale**: Les trois options d'inscription sont activées par défaut dans la configuration CLI actuelle. L'absence d'interface d'inscription n'empêche pas un appel direct à l'API Auth ; la fermeture doit donc être assurée par le service d'identité lui-même.

**Alternatives considered**:

- Masquer tout formulaire d'inscription : rejeté, car l'endpoint Auth resterait appelable directement.
- Laisser l'inscription email ouverte en comptant sur RLS : rejeté, car la création de compte est un contrôle d'identité distinct de l'accès aux tables.
- Créer l'administrateur avec une clé privilégiée dans le code applicatif : rejeté ; la procédure reste hors navigateur et hors de cette feature.

## 10. Validation des URL d'environnement

**Decision**: Accepter `http://localhost:<port>`, `http://127.0.0.1:<port>` et `http://[::1]:<port>` uniquement pour le développement et les tests locaux ; exiger `https://` pour toute autre origine. Refuser les identifiants intégrés, les fragments et toute URL HTTP non-loopback. La clé publiable reste obligatoire et non vide.

**Rationale**: La pile Supabase CLI expose officiellement son API locale sur `http://127.0.0.1:54321`, tandis qu'une origine distante en HTTP dégraderait la confidentialité des jetons. Une règle HTTPS universelle rendrait le quickstart local invalide ; une règle HTTP universelle affaiblirait la production.

**Alternatives considered**:

- Exiger HTTPS partout : rejeté car incompatible avec l'URL locale générée par la CLI.
- Autoriser HTTP selon `NODE_ENV` seulement : rejeté car un environnement mal nommé pourrait autoriser une URL distante non chiffrée ; la nature loopback de l'hôte est aussi vérifiée.

La matrice d'environnement importe directement le module TypeScript avec la suppression native des types de Node.js 22, après vérification de cette capacité via `node --help`. Cette décision évite une dépendance de test supplémentaire ; l'implémentation doit échouer explicitement si le runtime Node 22 installé ne fournit pas le mécanisme attendu.

## 11. Contrat des chemins et suppressions différées

**Decision**: Cette fondation impose et teste la grammaire canonique `photos/<uuid-v4-minuscule>.<extension-autorisée>` dans les contraintes et politiques, mais ne livre aucun générateur applicatif. Elle fournit séparément les permissions de suppression de `photos_galerie` et de `storage.objects`; l'ordre, la compensation et la reprise du workflow coordonné appartiennent à la future feature galerie.

**Rationale**: Les clarifications demandent une barrière de sécurité reproductible maintenant, sans prétendre livrer une mutation applicative multi-étapes. PostgreSQL et Storage ne partagent pas une transaction atomique ; le workflow futur devra donc choisir et tester sa stratégie de récupération.

**Alternatives considered**:

- Livrer immédiatement le générateur et les Server Actions galerie : rejeté comme extension de périmètre.
- Simuler une suppression coordonnée dans la migration : rejeté, car cela masquerait la frontière réelle entre base et Storage.
- Omettre les droits `DELETE` jusqu'à la galerie : rejeté, car la fondation doit préparer et prouver chaque permission distincte.

## 12. Sorties de diagnostic

**Decision**: Fournir un lanceur local qui agrège chaque contrôle avec un identifiant stable, un statut et exactement une catégorie d'échec parmi `validation`, `authorization`, `privilege` ou `internal`. Le rapport ne contient ni jeton, clé, cookie, SQL brut, trace ni corps de réponse sensible. Les textes destinés aux utilisateurs finaux restent différés.

**Rationale**: La catégorisation rend les échecs actionnables sans confondre contrainte de données, refus RLS et droit SQL manquant. Une catégorie unique par contrôle permet un bilan déterministe et vérifiable.

**Alternatives considered**:

- Réutiliser directement les messages Supabase : rejeté car ils peuvent exposer des détails techniques et changent selon la couche.
- Ajouter des catégories `authentication` ou `conflict` à ce socle : rejeté afin de respecter les quatre catégories clarifiées ; ces nuances pourront exister dans une future UX sans modifier le contrat des contrôles de fondation.

## Sources consultées

- Documents projet : `doc/spec.md`, `doc/design.md`, `doc/architecture.md`, `doc/infra.md`.
- Documentation locale Next.js 16.3 : cookies asynchrones, Proxy, Data Access Layer et sécurité des Server Actions.
- Documentation et changelog officiels Supabase consultés le 2026-08-08 : configuration Auth CLI, URL locale, clés publiables/secrètes, SSR Next.js, Data API et privilèges explicites, RLS, Storage, génération des types et support Node.js.
- Aide de Supabase CLI 2.112.0 : `init`, `migration new`, `db reset`, `db lint`, `db advisors`, `test db`, `gen types` et `seed buckets`.
