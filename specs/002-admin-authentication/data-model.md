# Data Model: Authentification administrateur

Cette fonctionnalité ne crée aucune table métier. Elle réutilise les identités et sessions gérées par Supabase Auth ainsi que `private.is_current_admin()` créé par `001-supabase-foundation`. La seule évolution persistante est un point d'entrée RPC booléen, versionné par migration, pour appliquer exactement le même prédicat depuis la couche serveur Next.js.

## 1. Compte administrateur

**Owner**: Supabase Auth (`auth.users`), service-managed.

| Attribute | Source | Invariant |
| --- | --- | --- |
| `id` | `auth.users.id` | UUID stable, jamais choisi par l'interface 002 |
| `email` | identité Auth | Compte existant créé par maintenance protégée ; aucune création publique |
| `app_metadata.role` | métadonnée protégée | Doit être exactement `admin` au moment du contrôle |
| `user_metadata` | métadonnée utilisateur | Jamais consultée pour l'autorisation |

Relations :

- un compte peut posséder plusieurs sessions Supabase ;
- le MVP n'expose qu'un niveau de droit administrateur ;
- la feature ne fournit aucune interface d'attribution/retrait de rôle.

## 2. Session administrateur

**Owner**: Supabase Auth (`auth.sessions` + cookies SSR).

| Attribute | Source | Invariant |
| --- | --- | --- |
| `session_id` | claim JWT + `auth.sessions.id` | Non nul et présent dans les deux sources |
| `user_id` | `auth.sessions.user_id` | Égal à `auth.uid()` |
| `not_after` | `auth.sessions.not_after` | Nul ou strictement futur |
| access token | cookie SSR | Signature et expiration validées par `getClaims()` |
| refresh token | cookie SSR | Manipulé seulement par `@supabase/ssr`, jamais exposé aux composants |

### Authorization invariant

Une demande est administratrice si et seulement si toutes les conditions suivantes sont vraies lors de la demande :

1. `getClaims()` accepte le JWT ;
2. `auth.uid()` est non nul ;
3. `auth.users.raw_app_meta_data ->> 'role' = 'admin'` pour `auth.uid()` au moment du contrôle ;
4. le claim `session_id` est non nul ;
5. une ligne `auth.sessions` de ce même identifiant appartient à `auth.uid()` ;
6. `not_after` est nul ou futur.

Le JWT seul ne suffit donc jamais. La suppression de la session ou le retrait du rôle protégé prend effet au prochain RPC, même si le jeton n'a pas encore expiré cryptographiquement et affirme encore l'ancien rôle.

## 3. Droit administrateur

Le droit n'est pas une nouvelle ligne applicative. Il est la conjonction du rôle protégé et de la session courante évaluée par `private.is_current_admin()`.

### Existing private function

```sql
private.is_current_admin() returns boolean
```

Propriétés existantes : `stable`, `security definer`, `search_path` vide, hors schéma exposé. Elle seule lit `auth.sessions`.

### New Data API wrapper

```sql
create or replace function public.is_current_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.is_current_admin();
$$;

revoke all on function public.is_current_admin()
from public, anon, authenticated, service_role;

grant execute on function public.is_current_admin()
to authenticated;
```

La syntaxe exacte doit être placée dans un fichier créé par :

```bash
npx supabase migration new admin_authentication
```

Le nom horodaté ne doit pas être inventé. Après application, les types `public.Functions.is_current_admin` sont régénérés dans `lib/supabase/database.types.ts`.

### Wrapper invariants

- aucun paramètre et aucun objet utilisateur renvoyé ;
- résultat strictement booléen ;
- `security invoker`, jamais `security definer` dans `public` ;
- schéma `private` non exposé ;
- `anon` ne peut pas exécuter ;
- `authenticated` peut uniquement demander son propre état ;
- toute erreur Data API est traitée comme un refus fermé, avec catégorie `unavailable` si un message doit être présenté.

## 4. Destination de retour

**Persistence**: aucune ; query string puis champ caché non fiable.

```ts
type AdminReturnPath = string & { readonly __brand: "AdminReturnPath" };
```

### Valid form

- longueur de 1 à 2 048 caractères ;
- `pathname` égal à `/admin` ou commençant par `/admin/` ;
- origine interne fixe après parsing ;
- query string autorisée ;
- aucun fragment, contrôle ASCII ou `\` ;
- `/admin/connexion` et ses descendants exclus.

### Normalization

Le validateur retourne uniquement `pathname + search`. Une valeur absente ou invalide devient `/admin`. Le validateur est appelé dans Proxy lors de la construction, dans la page pour l'affichage et à nouveau dans la Server Action juste avant `redirect()`.

## 5. État de connexion

**Persistence**: mémoire React du formulaire ; aucun cookie applicatif additionnel.

```ts
type LoginFieldErrors = {
  email?: string[];
  password?: string[];
};

type LoginState =
  | { status: "idle"; email: ""; fieldErrors: {} }
  | { status: "validation"; email: string; fieldErrors: LoginFieldErrors }
  | { status: "refused"; email: string; message: string; fieldErrors: {} }
  | { status: "rate_limited"; email: string; message: string; fieldErrors: {} }
  | { status: "unavailable"; email: string; message: string; fieldErrors: {} };
```

Invariants :

- aucun variant ne contient `password`, token, cookie, session ou objet Supabase ;
- `email` est normalisé, non sensible au sens du formulaire, mais n'est jamais écrit dans une sortie partageable ;
- le succès ne revient pas comme un état : il produit une redirection après preuve forte ;
- l'attente provient de `useActionState`/`pending`, pas d'un succès anticipé ;
- le champ mot de passe est vidé/remonté après chaque échec récupérable.

## 6. État de déconnexion

```ts
type LogoutState =
  | { status: "idle" }
  | { status: "unavailable"; message: string };
```

Le succès ne revient pas comme DTO : `error === null` déclenche une navigation `replace` vers `/admin/connexion`. Un échec ne prétend pas que la session distante est révoquée, même si le SDK a déjà nettoyé le cookie local.

## 7. Résultat d'autorisation serveur

```ts
type AdminAuthorization =
  | { status: "authorized"; userId: string }
  | { status: "denied"; reason: "missing_identity" | "not_current_admin" }
  | { status: "unavailable"; correlationId: string };
```

Invariants :

- `userId` est le seul identifiant transmis à une future couche de données si nécessaire ;
- aucun email, claim complet ou token n'est retourné ;
- `correlationId` est opaque et sans donnée personnelle ;
- seules les gardes serveur consomment ce type ;
- `authorized` exige `getClaims()` puis RPC strictement `true`.

## 8. Transitions de session

### Connexion

```text
Anonymous
  -> Validating
  -> Auth refused --------------------------> Anonymous + generic refusal
  -> Authenticated non-admin
       -> local sign-out confirmed --------> Anonymous + generic refusal
  -> Authenticated, RPC unavailable
       -> local cleanup confirmed ----------> Anonymous + unavailable
       -> local cleanup unconfirmed --------> Unavailable + protected access denied
  -> Current admin ------------------------> Protected admin
```

### Requête protégée

```text
No valid claims ----------------------------> Login redirect
Valid claims + RPC false ------------------> Login redirect, no admin content
Valid claims + RPC error ------------------> Protected unavailable state, no data
Valid claims + RPC true -------------------> Render/execute
```

Une action sensible suit la même transition et n'exécute aucune mutation avant `RPC true`.

### Déconnexion

```text
Current session
  -> signOut(scope=local), success --------> Login (replace navigation)
  -> signOut error ------------------------> Recoverable error, no claimed success
```

Après succès, navigation directe, historique et autre onglet sont refusés à leur prochaine requête protégée.

## 9. Validation rules

| Input | Rule | Public result |
| --- | --- | --- |
| Email | chaîne de 1 à 254 caractères après `trim`, casse normalisée, format email valide | erreur associée au champ avant Auth |
| Password | chaîne non vide ; aucune règle de création ajoutée | erreur associée au champ |
| Return path | contrat interne ci-dessus | fallback `/admin` |
| Auth refusal | codes de refus connus, compte non-admin, compte banni/non confirmé | message générique identique |
| Rate limit | code dédié ou HTTP 429 | message temporaire réessayable |
| Network/service | timeout, réseau, 5xx, code inconnu | indisponibilité récupérable |

## 10. Test fixtures

Les fixtures ne sont pas des données produit. Chaque exécution crée des identités uniques :

| Fixture | `app_metadata.role` | Session | Expected RPC |
| --- | --- | --- | --- |
| admin courant | `admin` | présente/non expirée | `true` |
| non-admin | absent | présente | `false` |
| user-metadata-only | absent ; faux rôle côté user metadata | présente | `false` |
| mauvais propriétaire | `admin` | session liée à un autre utilisateur | `false` |
| admin expiré | `admin` | `not_after` passé | `false` |
| admin révoqué | `admin` | ligne supprimée | `false` |
| visiteur | aucune identité | aucune session | RPC inexécutable |

Les capacités locales privilégiées servent uniquement à établir/révoquer/nettoyer ces fixtures, restent en mémoire et ne participent jamais aux opérations produit testées.
