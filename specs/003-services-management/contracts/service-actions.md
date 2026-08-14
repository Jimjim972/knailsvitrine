# Contract: Service Server Actions

## Common security pipeline

Chaque action est un endpoint POST public et exécute exactement cette séquence :

1. `requireAdminAction()` ;
2. validation/normalisation Zod des données non fiables ;
3. construction d'un payload limité aux champs autorisés ;
4. mutation Supabase ciblée sous RLS ;
5. vérification de l'identifiant effectivement affecté ;
6. `updateTag("prestations")` uniquement après succès ;
7. retour d'un état minimal ou redirection après invalidation.

Une interface masquée, un layout protégé, une confirmation côté client ou un UUID bien formé ne remplace aucune de ces étapes.

## Common form fields

| Field | Create | Update | Normalization |
| --- | --- | --- | --- |
| `name` | required | required | trim, 2–120 |
| `description` | required | required | trim, 1–1 000 |
| `category` | required | required | normalized code, then existence rechecked server-side |
| `priceType` | required | required | `fixed`, `starting_at`, `quote` |
| `price` | conditional | conditional | comma/point → canonical decimal → cents |
| `durationMinutes` | optional | optional | empty → null, integer 5–600 |
| `badge` | optional | optional | empty → null, otherwise trim 1–40 |
| `displayOrder` | default 0 | required | non-negative integer |
| `active` | default true | required | explicit boolean |

For `quote`, the payload always sets price to null even if a stale browser field contains a value. For tariffed types, missing or invalid price is a validation error.

Before a service insert or update, the action reads the submitted code from `categories_prestations` under the current session. A missing category returns a field error and performs no service mutation; the PostgreSQL foreign key is the final integrity control.

## State union

```text
idle
validation { fieldErrors, values }
session_expired { message, values? }
unavailable { message, correlationId, values? }
not_found { message }
conflict { message }
internal { message, correlationId, values? }
success { message, serviceId | categoryCode }
```

No state includes a raw database row, SQL text, provider error, JWT, cookie, session identifier, full claims or secret.

## `createServiceAction(previousState, formData)`

### Mutation

Insert one row without accepting `id`, `created_at`, `updated_at` or `image_path` from the client. Ask Supabase to return the created ID and exact price representation.

### Success

- Exactly one row exists.
- Cache tag expired.
- Émettre une preuve HMAC HttpOnly de 60 secondes avec nonce et cookie de garde, puis naviguer vers `/admin/prestations`.
- Le Proxy accepte uniquement une signature valide, fraîche, liée au même client et dont l'empreinte n'est pas présente dans le registre signé des preuves consommées ; il n'expose au Server Component que le type fermé du succès.
- Chaque document efface preuve et garde puis ajoute l'empreinte du nonce à ce registre borné. Les entrées expirées sont purgées ; un registre altéré ou saturé échoue de façon fermée. Un paramètre d'URL, un cookie littéral ou le rejeu A → B → A d'une preuve encore vivante ne produit jamais de succès.

### Failure

- Validation: no request to mutate.
- Authorization/session: no mutation.
- Constraint or network error: safe recoverable state, no false success. Le statut de réponse PostgREST est conservé ; `0`, annulation/délai, `429`, `502`, `503` et `504` deviennent `unavailable`.
- Authorization unavailable, mutation and invalidation failures emit one allowlisted diagnostic with the same correlation ID as the returned state.

## `updateServiceAction(previousState, formData)`

### Additional input

`serviceId`: valid UUID. It selects the target only and never authorizes it.

### Mutation

Update only the nine administrable fields. Never accept changes to identity, timestamps or `image_path`. Return affected ID and price representation.

### Zero-row behavior

Return `not_found`; refresh the list on the next navigation. Do not claim that the service was saved.

### Success

Exactly the same ID remains, no duplicate is inserted, public tag is expired.

## `setServiceVisibilityAction(previousState, formData)`

### Input

- `serviceId`: UUID;
- `active`: explicit desired boolean, not an implicit toggle based only on client state.

### Mutation

Update only `actif` for the targeted ID. Returning the affected ID is mandatory.

### Success

The list rerenders with text status « Active » or « Masquée » and the public tag is expired.

### Failure

The previous visible state remains unconfirmed; the action offers retry and never guesses the database state.

## `deleteServiceAction(previousState, formData)`

### Input

- `serviceId`: UUID;
- the displayed service name may be echoed for the confirmation UI but is never trusted as the target.

### Preconditions

The client dialogue has required explicit confirmation. The server still reauthorizes and validates.

### Mutation

Delete exactly the row matching the UUID and ask for the affected ID.

### Success

The row no longer appears in admin or public reads; tag expired; success announced once.

### Failure

- User cancellation: action not invoked.
- Zero rows: `not_found`, no success.
- Network/authorization/internal: element remains presented until a fresh read proves otherwise.

## `createServiceCategoryAction(previousState, formData)`

### Input and validation

- `name`: required, trimmed, 2–80 characters;
- `displayOrder`: integer from 0 to 2 147 483 647;
- no client-provided code, timestamps or presentation fields.

### Mutation

After `requireAdminAction()`, generate `category_<uuid-v4-without-hyphens>` on the server and insert only `code`, `nom` and `ordre_affichage` into `categories_prestations`. RLS repeats the current-admin decision. The unique index on `lower(btrim(nom))` is mapped to a safe `name` field error.

### Success and failure

Exactly one returned code confirms success, then `updateTag("prestations")` runs and the authenticated one-use `category-create` flash redirects to `/admin/prestations/categories`. Validation, revoked session, non-admin access, duplicate name, network failure or missing returned row never announces success and never exposes provider details.

## `updateServiceCategoryAction(previousState, formData)`

### Input and mutation

`categoryCode` doit satisfaire le format fermé mais ne sert qu’à cibler la ligne. Après réautorisation, `name` et `displayOrder` suivent les mêmes bornes que la création. L’action met à jour uniquement `nom` et `ordre_affichage`, demande le code affecté et ne modifie jamais l’identité ni les timestamps client.

### Result

Un doublon normalisé revient comme erreur du champ `name`; zéro ligne revient comme `not_found`. Un code retourné déclenche `updateTag("prestations")`, le flash `category-edit` et la redirection vers la liste des catégories.

## `deleteServiceCategoryAction(previousState, formData)`

### Preconditions and mutation

Le dialogue client fournit une confirmation explicite mais le serveur réautorise et valide encore `categoryCode`. L’action supprime exactement ce code et demande le code affecté. La clé étrangère `ON DELETE RESTRICT` reste l’arbitre final, même si le compteur affiché indiquait zéro au moment du rendu.

### Result

- violation `23503`: état `conflict` demandant de déplacer ou supprimer les prestations, aucune ligne supprimée ;
- zéro ligne: `not_found`, aucun succès ;
- code retourné: invalidation du tag, flash `category-delete`, redirection vers la liste ;
- aucune cascade, réaffectation implicite ou erreur SQL brute n’est exposée.

## Pending and duplicate activation

Each client form uses `useActionState` and disables its submit control while pending. A pending announcement appears in less than one second. Browser-level repeated activation of the same control must produce one action submission and one mutation. This does not claim idempotence against two separately forged direct POST requests.

## Error classification

| Internal condition | Public state |
| --- | --- |
| Invalid field/UUID | `validation` |
| Missing/revoked/expired session | `session_expired` |
| Authorization service unavailable | `unavailable` |
| Mutation returned zero rows | `not_found` |
| Category still referenced | `conflict` |
| Network/quota/provider unavailable | `unavailable` |
| Unknown/constraint drift | `internal` |

Provider codes may guide the mapping server-side but are never returned verbatim.

## Cache rule

`updateTag("prestations")` is called exactly once after confirmed success and never before the mutation. `revalidateTag` stale-while-revalidate and `refresh()` alone do not satisfy this contract.
