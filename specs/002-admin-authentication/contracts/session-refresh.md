# Contract: Session Refresh and Proxy

## Matcher

```ts
export const config = {
  matcher: ["/admin/:path*"],
};
```

The matcher includes `/admin`, `/admin/connexion`, deeper admin pages and Server Action POSTs sent from these routes. It does not intercept public pages or static assets.

## Request algorithm

1. Create the Supabase response-aware client immediately.
2. Its cookie adapter reads `request.cookies.getAll()`.
3. Its `setAll(cookiesToSet, headers)` updates request cookies, recreates/preserves the final `NextResponse`, writes every response cookie, and copies every supplied cache header.
4. Call `await supabase.auth.getClaims()` immediately after client creation, before custom branching.
5. Classify the optimistic result as `validated`, `missing` or `unavailable`. An Auth error without an Auth cookie is a confirmed missing identity; an Auth error while a session cookie exists is treated as unavailable/indeterminate.
6. For a protected path other than `/admin/connexion`, redirect to login only when identity is confirmed missing. Pass an unavailable/indeterminate result to the strong DAL, which fails closed and renders no admin data. Server Action POSTs are not redirected by this optimistic layer so their structured no-data error state can be reconciled by React.
7. Otherwise return the response for normal Next.js handling.
8. Add `Cache-Control: private, no-store` to every final `/admin` response, including redirects. Preserve stricter SSR headers such as `no-cache`, `must-revalidate`, `Expires: 0` and `Pragma: no-cache`.

The implementation must return the exact response object that contains the refreshed cookies. Replacing it without recopying cookies/headers breaks sessions.

## Optimistic redirect

For a request such as:

```text
GET /admin/future-page?filter=active
```

without valid claims, Proxy responds with a redirect to:

```text
/admin/connexion?returnTo=%2Fadmin%2Ffuture-page%3Ffilter%3Dactive
```

The value contains only the original `pathname + search`. It is still untrusted and is revalidated by the login page/action.

## Explicit non-responsibilities

Proxy must not:

- authorize from `app_metadata.role`;
- call `public.is_current_admin()` or any table;
- consider a valid JWT proof of a current session row;
- redirect `/admin/connexion` to `/admin` from claims alone;
- render or fetch admin data;
- replace the strong page/action guards;
- introduce `middleware.ts`.

## Cookie and header invariants

- Server client is created per request; no module-level Supabase client.
- All cookies retain options returned by Supabase.
- Cookies changed during a redirect appear on that redirect response.
- No cookie/token is logged or returned in a React prop.
- Auth responses cannot be stored by a shared CDN/browser cache.
- `lib/supabase/server.ts` remains server-only and uses async `cookies()`.
- A Server Component's inability to write cookies is tolerated only because Proxy performs refresh before the render.

## Failure behavior

| Failure | Behavior |
| --- | --- |
| no claims on protected path | login redirect with safe `returnTo` |
| no claims on login path | render login form |
| stale admin role but valid JWT | pass Proxy; strong page guard denies without content |
| refresh service unavailable with a session cookie | pass the indeterminate request to the strong guard; render generic retry/logout state with no admin data |
| malformed return path | login/action fallback `/admin` |

## Netlify validation gate

In a deploy preview and the final custom domain, inspect login, refresh and logout responses and prove:

- `Set-Cookie` survives Proxy on normal and redirect responses;
- `Cache-Control` is private/no-store;
- no Origin/Host mismatch blocks Server Actions;
- no broad `allowedOrigins` is required;
- an open tab across a deployment receives a recoverable refresh/retry path rather than a raw error.
