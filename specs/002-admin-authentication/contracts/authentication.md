# Contract: Authentication Actions

## Purpose

Définir les deux mutations internes de la feature. Ce sont des Server Actions publiques au sens sécurité : toute validation et toute décision d'autorisation sont répétées côté serveur, indépendamment du formulaire.

## Login action

```ts
loginAction(previousState: LoginState, formData: FormData): Promise<LoginState>
```

### Form input

| Field | Type | Required | Handling |
| --- | --- | --- | --- |
| `email` | string | yes | trim, lowercase/normalization, 1–254 characters, email validation |
| `password` | string | yes | presence only, never copied to output/log |
| `returnTo` | string | no | validate as an internal protected admin path |

Unknown fields are ignored. Oversized/invalid values fail validation before Supabase Auth.

### Processing order

1. Read only the three declared fields.
2. Validate with Zod.
3. On validation failure, return `status: validation`, normalized email when safely available, and field errors.
4. Create the request-scoped Supabase server client.
5. Call `signInWithPassword`.
6. Classify an Auth error without inspecting/localizing its raw message.
7. When Auth succeeds, call the strict `public.is_current_admin()` RPC.
8. If RPC is `false`, call `signOut({ scope: "local" })` and return the exact generic refusal used by invalid credentials.
9. If RPC errors, attempt local cleanup and return `unavailable`; if cleanup itself cannot be confirmed, keep the same recoverable outcome, claim neither access nor logout, and rely on every protected guard to continue refusing access.
10. If RPC is exactly `true`, validate `returnTo` again.
11. Call `redirect(validatedPath, RedirectType.replace)` outside any `try/catch`.

### Public outcomes

| Status | Trigger | User behavior |
| --- | --- | --- |
| `validation` | invalid email or empty password | field-level messages |
| `refused` | invalid credentials, banned/unconfirmed/unknown account, valid non-admin | one identical generic message |
| `rate_limited` | provider code for request limit or HTTP 429 | retry-later message |
| `unavailable` | timeout, network, 5xx, RPC/cleanup uncertainty, unknown provider failure | retry/refresh message |
| redirect | Auth success and RPC `true` | replace navigation to safe path |

No success DTO is returned. No public state contains the password, JWT, cookie, session, user object, complete claims or raw Supabase error.

### Generic refusal invariant

The rendered message, status semantics and response shape for these three cases are identical:

- unknown email;
- wrong password;
- authenticated account without current admin authorization.

Timing equalization beyond normal provider behavior is not introduced in the MVP, but no branch logs or renders the account's existence or role.

## Logout action

```ts
logoutAction(previousState: LogoutState, formData: FormData): Promise<LogoutState>
```

No form field grants authority. The action remains callable even if the user's admin role/session has just become invalid, because cleaning the local context must not depend on retaining admin rights.

This is the sole exception to the rule requiring `requireAdminAction()` for Server Actions that read or modify administrative business data. Logout neither reads nor mutates that data; it only attempts to end the caller's current session. It therefore must not be blocked by a removed admin role, an expired session or a failed strong role check.

### Processing order

1. Create the request-scoped server client.
2. Call `signOut({ scope: "local" })` explicitly.
3. If `error === null`, call `redirect('/admin/connexion', RedirectType.replace)` outside `try/catch`.
4. Otherwise return `status: unavailable` with a retry/refresh message and do not claim remote logout.

The client SDK may already have removed local cookies on some remote errors. The UI still reports uncertainty instead of success. A subsequent protected request always re-runs authorization.

During the Server Action POST reconciliation only, the protected page/layout may turn a now-missing identity into the same no-data unavailable state so `useActionState` can display the result instead of losing it to a redirect. This branch never renders admin data, never authorizes an action and does not affect normal GET navigation or `/admin/connexion` behavior (FR-008).

## Form interaction contract

- `useActionState` is the only required client boundary.
- `pending` disables the submit button and changes its visible text.
- Login and logout controls have a minimum 44 × 44 px target.
- Pending changes are announced in a polite status region.
- Form-level refusal/unavailability is announced once; field errors are bound with `aria-invalid` and `aria-describedby`.
- Email persists after recoverable errors; password never does.
- Repeated activation while pending produces one Action request.
- A redirect occurs only after confirmed success.

## Diagnostic contract

Permitted diagnostic fields:

```ts
type AuthDiagnostic = {
  category:
    | "validation"
    | "authentication_refused"
    | "authorization_refused"
    | "rate_limited"
    | "identity_unavailable"
    | "authorization_unavailable"
    | "logout_unavailable";
  stage: "input" | "sign_in" | "admin_check" | "cleanup" | "sign_out";
  correlationId: string;
};
```

These are the only shareable diagnostic fields. Shareable output includes client responses, development/CI console output, test reports and handoff documents. Forbidden there: complete email, password, FormData dump, cookies, tokens, session identifier/content, claims, secret/publishable key values, provider objects/codes, raw error objects and stack traces.
