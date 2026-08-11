# Contract: Admin Access

## Database RPC

```text
POST /rest/v1/rpc/is_current_admin
Authorization: Bearer <authenticated user access token>
Body: {}
```

This is a logical Data API contract consumed through `supabase.rpc('is_current_admin')`, not an application Route Handler.

### Results

| Caller | Result |
| --- | --- |
| `anon`/no JWT | execute denied or request rejected |
| authenticated non-admin | `false` |
| admin role only in `user_metadata` | `false` |
| stale JWT role after protected `app_metadata` removal | `false` |
| admin with current matching session | `true` |
| admin with missing, expired or wrong-owner session | `false` |
| service/transport failure | error, never interpreted as `true` |

Only strict boolean `true` authorizes.

## Server-only DAL

```ts
getAdminAuthorization(): Promise<AdminAuthorization>
requireAdminPage(returnTo: string): Promise<
  | { status: "authorized"; userId: string }
  | { status: "unavailable" }
>
requireAdminAction(): Promise<
  | { authorized: true; userId: string }
  | { authorized: false; state: "session_expired" | "unavailable" }
>
```

### `getAdminAuthorization`

1. Mark module `server-only`.
2. Create a request-scoped Supabase server client.
3. Call `getClaims()` and extract only the subject required for the result.
4. If claims are absent/invalid, return `denied/missing_identity`.
5. Call `public.is_current_admin()` with the same request cookies/JWT.
6. Return `authorized` only for `data === true` and no error.
7. Return `denied/not_current_admin` for a successful `false`.
8. Return `unavailable` for a service/transport error, with a safe correlation ID.

The function may be wrapped in React `cache()` to deduplicate calls during one server render only. Persistent/shared Next caches are forbidden.

### Page guard

- Every protected page calls `requireAdminPage()` before loading or rendering admin data.
- The protected layout may also call it to avoid rendering admin chrome, but is never the only guard.
- Missing/denied authorization redirects to `/admin/connexion?returnTo=<validated internal path>`.
- Unavailability returns a distinct result so the protected route renders a cache-free retry/logout state with no admin data; it must not redirect through the login page, lose the recoverable logout state or render stale data.
- `/admin/connexion` performs the same strong check: a current admin is always redirected to `/admin` and any `returnTo` supplied to that already-authenticated visit is ignored; everyone else sees the form.
- A validated `returnTo` is consumed only after a fresh successful login.

### Action guard

- Every future sensitive Server Action begins with `requireAdminAction()` after input parsing and before any read/mutation whose result is sensitive.
- A refusal returns a structured session-expired/unauthorized state and executes no mutation.
- An unavailable result executes no mutation and produces no false success.
- Supabase RLS remains active and evaluates `private.is_current_admin()` again for the actual table/Storage operation.

### Direct contract proof for `requireAdminAction()`

`tests/unit/auth/admin-session.test.ts` must exercise `requireAdminAction()` directly through an injected authorization dependency or another production-safe test seam. It must prove, without adding a test-only route or performing a business mutation, that:

1. missing or invalid claims return `authorized: false` with `session_expired` and never invoke protected work;
2. valid claims followed by an RPC result other than strict boolean `true` return `session_expired` and never invoke protected work;
3. an RPC/transport failure returns `unavailable` and never invokes protected work;
4. only valid claims plus RPC `true` return `authorized: true` with the authenticated subject;
5. `user_metadata.role`, a stale role claim or a truthy non-boolean RPC value is never sufficient.

The browser access matrix complements this unit contract at the page boundary; it does not replace the direct action-guard proof.

### Logout exception

`logoutAction()` does not call `requireAdminAction()`: it reads or mutates no administrative business data and exists only to clean the caller's current session. It must remain callable after role removal or session expiry. Every subsequent protected request still performs the strong page/action authorization check.

## Access matrix

| Context | `/admin/connexion` | `/admin` | Sensitive action | Admin data |
| --- | --- | --- | --- | --- |
| visitor | form | login redirect | refused | none |
| invalid credentials | generic refusal | login redirect | refused | none |
| authenticated non-admin | form/no admin state | login redirect | refused | none |
| stale admin claim, session deleted | form/no admin state | login redirect | refused | none |
| current admin | redirect to `/admin`; supplied `returnTo` ignored | rendered | allowed subject to RLS | allowed subject to RLS |
| Auth/DB unavailable | retryable state | protected unavailable state | refused/unavailable | none |

## Admin page UI contract

The feature delivers only:

- brand identity;
- explicit context label/title “Administration”;
- concise text confirming the protected space;
- current-session logout action and its recoverable error region.

It does not render disabled or placeholder links to Prestations/Galerie. Future routes add their navigation only when functional.
