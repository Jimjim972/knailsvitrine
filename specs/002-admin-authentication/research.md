# Research: Authentification administrateur

## Decision 1: séparer rafraîchissement optimiste et autorisation forte

**Decision**: Utiliser `proxy.ts` sur `/admin/:path*` pour créer un client SSR par requête, appeler immédiatement `getClaims()`, transférer cookies et en-têtes et rediriger uniquement l'absence d'identité. Le Proxy ne décide jamais du rôle administrateur. Chaque page protégée, lecture administrative et action qui lit ou modifie des données administratives appelle une DAL `server-only` qui vérifie la session courante via PostgreSQL. La déconnexion est l'exception explicite : elle ne touche aucune donnée métier et doit pouvoir nettoyer la session courante même après retrait du rôle.

**Rationale**: Next.js 16 présente Proxy comme une aide de préfiltrage et déconseille d'y placer une autorisation complète ou des lectures lentes. `getClaims()` valide l'identité portée par le JWT, mais un JWT encore valide peut survivre à la suppression de sa session. La séparation évite qu'un claim périmé devienne une autorisation et empêche une boucle entre connexion et espace protégé.

**Alternatives considered**:

- Autoriser depuis `app_metadata` lu en Proxy : rejeté, car la session DB peut déjà être révoquée.
- Appeler PostgreSQL depuis Proxy à chaque requête : rejeté, car le contrôle doit rester proche des pages/actions et Proxy doit rester léger.
- Protéger uniquement le layout admin : rejeté, car les layouts ne sont pas réévalués comme barrière à chaque navigation.

## Decision 2: exposer un wrapper RPC minimal en `security invoker`

**Decision**: Créer par migration CLI `public.is_current_admin()` sans argument, `stable`, `security invoker`, `set search_path = ''`, qui retourne uniquement `private.is_current_admin()`. Révoquer `EXECUTE` à `public`, `anon` et aux rôles inutiles, puis l'accorder seulement à `authenticated`.

**Rationale**: La Data API n'expose pas le schéma `private`. Le helper existant est déjà la source d'autorisation exacte : rôle dans `app_metadata`, `auth.uid()`, `session_id`, appartenance, présence et non-expiration dans `auth.sessions`. Un wrapper public non privilégié rend seulement ce booléen appelable sans déplacer une fonction `security definer` dans un schéma exposé. Une erreur ou toute valeur autre que `true` échoue fermée.

**Alternatives considered**:

- Exposer le schéma `private` à la Data API : rejeté, surface inutilement large.
- Répliquer le prédicat dans TypeScript : rejeté, risque de divergence avec RLS/Storage.
- Sonder une table métier protégée : rejeté, résultat vide ambigu et couplage artificiel.

## Decision 3: utiliser `getClaims()`, jamais `getSession()`, pour la preuve d'identité serveur

**Decision**: Appeler `getClaims()` tôt en Proxy et avant le RPC dans le contrôle serveur. Ne jamais utiliser `getSession()` comme preuve d'autorisation. Le RPC reste obligatoire après `getClaims()`.

**Rationale**: La documentation Supabase avertit que `getSession()` lit l'état stocké dans les cookies et ne doit pas servir à protéger du code serveur. `getClaims()` vérifie signature et expiration, mais ne prouve pas à lui seul l'existence actuelle de la session ; le RPC complète cette preuve.

**Alternatives considered**:

- `getUser()` pour chaque garde : recevable pour relire l'utilisateur Auth, mais ne réutilise pas exactement l'invariant `auth.sessions` déjà commun aux politiques du projet.
- RPC seul : sûr côté base, mais `getClaims()` reste nécessaire au rafraîchissement SSR et donne un diagnostic d'identité plus clair.

## Decision 4: Server Actions validées, états discriminés et frontière client basse

**Decision**: Implémenter `loginAction` et `logoutAction` dans un module `use server`. Le formulaire seul est un Client Component utilisant `useActionState`. Zod normalise l'email (`trim`, casse) et valide email/mot de passe avant Auth. Les résultats sont des unions discriminées contenant au maximum email normalisé, erreurs de champs et catégorie/message public.

**Rationale**: Une Server Action reste un endpoint POST public : elle doit valider et autoriser indépendamment de l'interface. `useActionState` fournit l'attente et bloque la double soumission sans déplacer Supabase ou des secrets côté client. Le mot de passe n'entre jamais dans l'état retourné.

**Alternatives considered**:

- Route Handler pour login/logout : rejeté à ce stade, les formulaires internes sont couverts par les Server Actions. Il ne devient justifié que si la vérification Netlify prouve que les en-têtes/cookies d'une réponse Action ne sont pas préservés malgré Proxy.
- Client Auth direct dans le navigateur : rejeté, il élargit la frontière cliente et complique le contrôle fort avant redirection.

## Decision 5: classifier les erreurs sans permettre l'énumération des comptes

**Decision**: Produire quatre familles publiques : `validation`, `refused`, `rate_limited`, `unavailable`. `invalid_credentials`, compte non confirmé/banni/inconnu et RPC `false` partagent exactement le même message `refused`. Utiliser `AuthError.code` et le statut, jamais le texte fournisseur ni l'objet brut.

**Rationale**: La même réponse pour mauvais identifiant et non-admin satisfait la non-énumération. La limitation temporaire et l'indisponibilité restent actionnables sans révéler l'infrastructure. Les diagnostics partageables ne contiennent que catégorie, étape, code sûr, statut et identifiant de corrélation ; jamais email complet, mot de passe, cookie, JWT ou session.

**Alternatives considered**:

- Afficher `error.message` Supabase : rejeté, texte instable et potentiellement trop révélateur.
- Tout classer en « identifiants invalides » : rejeté, l'utilisateur ne pourrait pas distinguer un 429 ou une panne récupérable.

**Residual risk**: Une connexion par mot de passe exécutée côté serveur peut être vue par Auth avec l'adresse de sortie Netlify. Le transfert de l'IP finale par Supabase exige une capacité secrète que le runtime applicatif ne doit pas introduire pour ce MVP. Avec un seul administrateur, le risque principal est un 429 accidentel sur sortie partagée ; il est couvert par le message `rate_limited` et doit être surveillé en preview/production.

## Decision 6: nettoyer toute tentative authentifiée mais non autorisée

**Decision**: Après `signInWithPassword`, appeler le RPC. Si le résultat est `false`, exécuter immédiatement `signOut({ scope: "local" })`, puis retourner le refus générique. Si le RPC échoue, nettoyer aussi le contexte local et retourner `unavailable`. Rediriger seulement après `true`.

**Rationale**: Un compte valide non-admin ne doit laisser aucun contexte exploitable dans l'administration. Une panne après Auth ne doit pas produire un faux succès ni conserver silencieusement la session créée par la tentative.

**Alternatives considered**:

- Conserver une session Supabase non-admin : rejeté par FR-005 et inutile pour ce site sans espace client.
- Transformer l'échec RPC en refus d'identifiants : rejeté, cela masquerait une indisponibilité réelle.

## Decision 7: déconnecter explicitement la session courante

**Decision**: Utiliser `signOut({ scope: "local" })`, tester `error === null`, puis `redirect('/admin/connexion', RedirectType.replace)` hors du `try/catch`. En cas d'erreur distante, afficher un état récupérable sans annoncer de succès.

**Rationale**: Le scope Supabase par défaut est global alors que le MVP demande seulement la session courante. Le SDK peut retirer localement les cookies même lors de certaines erreurs réseau ; seul un résultat sans erreur permet d'affirmer la révocation distante. Le helper DB refusera immédiatement le JWT capturé dès que la ligne `auth.sessions` disparaît.

**Alternatives considered**:

- `signOut()` sans scope : rejeté, terminerait aussi les autres sessions.
- Rediriger quelle que soit l'erreur : rejeté, faux succès contraire à la spécification.
- Appeler une API interne non documentée pour conserver le cookie sur erreur : rejeté, comportement fragile et non supporté.

## Decision 8: valider deux fois la destination de retour

**Decision**: Proxy construit `returnTo` depuis `pathname + search` de la requête. La page de connexion puis l'action revalident la valeur avec une fonction pure : longueur bornée, aucune barre oblique inverse/caractère de contrôle/hash, même origine après parsing, chemin égal à `/admin` ou préfixé `/admin/`, exclusion de `/admin/connexion`, puis retour de `pathname + search`. Toute autre valeur devient `/admin`. Conformément à FR-008, un administrateur déjà autorisé qui ouvre `/admin/connexion` ignore `returnTo` et revient toujours à `/admin`; la destination validée s'applique uniquement après une nouvelle connexion réussie.

**Rationale**: Le champ caché et la query string sont contrôlés par l'utilisateur. La revalidation dans l'action empêche les redirections ouvertes, les chemins protocol-relative, les encodages ambigus et les boucles de connexion.

**Alternatives considered**:

- Vérifier seulement `startsWith('/admin')` : rejeté, accepte des formes ambiguës et ne normalise pas l'URL.
- Faire confiance à la valeur créée par Proxy : rejeté, l'utilisateur peut appeler directement l'action.

## Decision 9: isoler les layouts public et admin avec des route groups

**Decision**: Garder un seul `app/layout.tsx` pour le document, les polices et `globals.css`. Déplacer sans changer leurs URLs les pages existantes sous `app/(public)` avec Header/Footer. Placer l'administration sous `app/(admin)/admin`, avec connexion hors du layout protégé et accueil minimal dans `(protected)`.

**Rationale**: Le root layout actuel entoure toutes les routes du chrome public. Les groupes de routes n'affectent pas les URLs et évitent plusieurs root layouts, lesquels provoqueraient un rechargement complet entre groupes. L'accueil 002 montre uniquement marque, contexte Administration et déconnexion ; aucun lien Prestations/Galerie avant leur existence.

**Alternatives considered**:

- Masquer Header/Footer par CSS ou pathname client : rejeté, flash/complexité client inutile.
- Deux root layouts indépendants : rejeté, navigation avec rechargement complet.
- Afficher la navigation CRUD future désactivée : rejeté, faux contrôle hors périmètre.

## Decision 10: ne jamais partager le cache admin

**Decision**: Ne pas activer `cacheComponents` dans cette feature. Interdire `use cache`, `unstable_cache` et tout cache persistant pour identité, autorisation et pages admin. Autoriser seulement `React.cache()` pour dédupliquer une garde au cours d'un même rendu. Marquer toutes les réponses `/admin` `Cache-Control: private, no-store` et préserver les en-têtes `setAll` de `@supabase/ssr`.

**Rationale**: Les données de session ne doivent jamais être servies à un autre utilisateur. La version installée de `@supabase/ssr` transmet précisément des en-têtes privés/no-store lors des changements de cookie afin d'éviter qu'un CDN mette en cache `Set-Cookie`.

**Alternatives considered**:

- Activer Cache Components pour l'accueil admin : rejeté, aucun bénéfice sur deux pages privées et risque transverse.
- Compter uniquement sur l'accès dynamique à `cookies()` : rejeté, les en-têtes explicites sont une défense supplémentaire nécessaire derrière Netlify.

## Decision 11: combiner pgTAP, tests purs, Playwright et validation manuelle

**Decision**: Ajouter :

- pgTAP pour le wrapper RPC, les droits et les sessions courantes/révoquées ;
- `node:test` de Node 22, sans Vitest/Jest, pour Zod, redirections, mapping d'erreurs et redaction ;
- Playwright 1.62.1, `workers: 1`, projets Chromium et WebKit ;
- `@axe-core/playwright` 4.12.1 pour les violations automatisables ;
- contrôle manuel Firefox et Safari mobile réel pour ce qui ne peut être prouvé par WebKit/Axe.

**Rationale**: Chaque outil couvre un risque distinct. Une pile Supabase locale fournit des identités/sessions réelles ; Playwright prouve cookies, historique et onglets ; les fonctions pures restent rapides sans framework supplémentaire ; Safari réel reste nécessaire car Playwright WebKit n'est pas Safari.

**Alternatives considered**:

- Tests manuels seulement : rejeté pour un parcours de sécurité récurrent.
- Trois moteurs complets à chaque exécution : acceptable mais plus coûteux ; Chromium couvre la matrice complète et WebKit les parcours critiques, avec Firefox manuel pour le MVP.
- Snapshots visuels pixel-perfect : différés, trop sensibles aux polices/OS ; préférer assertions sémantiques, absence de débordement et comparaison manuelle ciblée des pages publiques.

## Decision 12: fixtures locales privilégiées mais éphémères

**Decision**: Le setup de test refuse une cible non-loopback ou un projet Supabase lié, lit `supabase status --output json` en mémoire, crée des utilisateurs uniques admin/non-admin/révoqué via l'API administrative locale, puis nettoie toujours. La capacité privilégiée, les JWT et mots de passe ne sont ni écrits ni affichés. Le navigateur se connecte exclusivement par l'UI avec la clé publiable.

**Rationale**: Une capacité locale est nécessaire uniquement pour préparer/revoquer des fixtures. Les parcours testés doivent utiliser les mêmes cookies, Actions, Proxy et RPC que le produit. `workers: 1` évite les conflits de session et les limitations artificielles.

**Alternatives considered**:

- Comptes de test permanents : rejeté, dérive et fuite de credentials.
- Utiliser la clé privilégiée dans les parcours : rejeté, contourne précisément les contrôles à prouver.
- Déclencher réellement un 429 : rejeté, test lent et instable ; le mapping 429 est testé comme fonction pure.

## Decision 13: utiliser le support Netlify courant sans configuration spéculative

**Decision**: Conserver les Server Actions prises en charge par l'adaptateur Next.js courant de Netlify. Ne pas ajouter d'ancien flag de déploiement, d'`allowedOrigins` large, de limite de corps supérieure ou de `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` sans échec concret en preview. Tester cookies, cache, origine et un onglet ouvert pendant un nouveau déploiement.

**Rationale**: Netlify documente le support des Server Actions et de la skew protection via son adaptateur OpenNext. Une configuration anticipée augmenterait la surface de sécurité sans besoin. Le formulaire est très inférieur à la limite de corps par défaut.

**Alternatives considered**:

- Ajouter immédiatement des origines joker : rejeté, affaiblit la protection Origin/Host.
- Fixer une clé d'Actions dès maintenant : rejeté, ne résout pas une action supprimée entre deux builds et introduit un secret supplémentaire.

## Primary sources

- Next.js local 16.3: `node_modules/next/dist/docs/01-app/02-guides/authentication.md`, `forms.md`, `server-actions.md`, `data-security.md`, `01-app/01-getting-started/16-proxy.md`, `03-api-reference/04-functions/cookies.md` et `03-file-conventions/route-groups.md`.
- [Supabase SSR client creation](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [sessions](https://supabase.com/docs/guides/auth/sessions), [sign out](https://supabase.com/docs/guides/auth/signout), [Auth error codes](https://supabase.com/docs/guides/auth/debugging/error-codes), [database functions](https://supabase.com/docs/guides/database/functions), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) et [changelog](https://supabase.com/changelog.md).
- [Netlify Next.js overview](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/).
- Sources installées : `node_modules/@supabase/ssr/src/types.ts`, `node_modules/@supabase/ssr/src/createServerClient.ts` et `node_modules/@supabase/auth-js/src/GoTrueClient.ts`.
