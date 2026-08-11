# Contract: Verification

## Test layers

| Layer | Tool | Scope |
| --- | --- | --- |
| Database contract | pgTAP/Supabase CLI local | wrapper definition, grants, true/false matrix, revocation |
| Pure domain contracts | Node 22 `node:test` | Zod, return path, error mapping, redaction, DTO secrets, login/logout actions and direct `requireAdminAction()` contract |
| Auth integration | Supabase local + publishable browser flow | real sign-in/session/logout/RPC behavior |
| Browser E2E | Playwright Chromium/WebKit | pages, cookies, redirects, pending, multi-tab, history, responsive |
| Automated accessibility | Axe + semantic Playwright assertions | accessible names, field relationships, detectable violations |
| Manual browser/accessibility | Safari mobile, Firefox, keyboard/reader | behavior not equivalent to WebKit/Axe |
| Application gates | ESLint, TypeScript, build, secret scans | code/bundle integrity |

## Database assertions

The new pgTAP file proves:

1. `public.is_current_admin()` exists, is `stable`, `security invoker`, with fixed empty search path.
2. `public`, `anon` and unnecessary roles have no execute privilege.
3. `authenticated` has execute privilege and the existing required access to the private delegate.
4. current admin + current matching session returns true.
5. non-admin returns false.
6. role only in `user_metadata` returns false.
7. stale JWT after current-role removal, wrong-owner, expired and deleted session return false.
8. no raw row, claim or session detail is returned.
9. the inventory/advisors tests still pass.

## Pure unit assertions

- leading/trailing whitespace and email case normalize correctly;
- empty/malformed/over-254-character email and empty password never call Auth;
- returned states contain no password/session/token key;
- valid `/admin` paths retain their query string;
- absolute, protocol-relative, encoded escape, backslash, fragment, control character, `/admin/connexion` and every `/admin/connexion/...` descendant become `/admin`;
- provider codes map to the four public families;
- unknown email, wrong password and non-admin generate the same public text/category/state shape; this equality excludes provider-intrinsic timing;
- one accepted login-action invocation calls `signInWithPassword` exactly once;
- diagnostics expose only the allowlisted category/stage/correlation fields and redact email, JWT, key, password, session identifiers, provider codes/objects, raw errors, stack traces and cookie-like values.
- `requireAdminAction()` refuses missing identity, RPC `false`/non-boolean and RPC failure without invoking protected work;
- `requireAdminAction()` authorizes only valid claims plus strict RPC `true`, returns the authenticated subject and never accepts `user_metadata` or a stale role claim alone.

## Browser matrix

Run with `workers: 1` and unique fixtures.

| Scenario | Chromium | WebKit | Expected |
| --- | --- | --- | --- |
| anonymous deep link | full | smoke | login redirect, safe return, no admin content |
| valid admin login | full | full | `/admin`, protected context, logout available |
| 20 navigation/reload cycles | full | smoke | each cycle navigates to `/admin`, verifies “Administration”, fully reloads, verifies again; all 40 protected checks remain authorized |
| unknown email / wrong credentials | full | smoke | same visible refusal, public category/state shape and accessible announcement |
| non-admin credentials | full | full | same visible refusal/category/state/announcement and context cleaned |
| expired session/JWT retained | full | full | after local-only expiry of the current fixture session, the first protected request is refused without admin content |
| revoked session/JWT retained | full | full | next protected request refused |
| safe/unsafe return paths | full | smoke | internal only, fallback `/admin` |
| pending/repeated activation | full | smoke | with the Action POST deliberately delayed, pending is visible and announced within 1 000 ms of the first activation, the button is disabled, and repeated activations produce exactly one Action POST; the unit contract separately proves one `signInWithPassword` call for that accepted submission |
| validation/preservation | full | smoke | field errors, email kept, password cleared |
| logout + direct/back/history | full | full | no private data, protected-content marker, active admin command or private cached response; next interaction/request refused |
| logout + second tab | full | full | next request in second tab refused |
| 320/768/1 024 px | full | full | no horizontal overflow, 44 px controls |
| keyboard/focus/accessible names | full | full | logical order and visible focus |
| public routes | full | smoke | `/`, `/services`, `/galerie`, `/contact` preserve the pre-move baseline: URLs, public Header/Footer, visible headings/text, link targets and section order, with no horizontal overflow at 320/768/1 024 px |

Rate limiting and service outages are injected/tested at the pure mapping boundary rather than exhausting Supabase limits. A delayed/intercepted Action POST proves pending UI and exactly one submission.

## Fixture safety

Before fixture creation the harness must:

- verify exact HTTP loopback (`localhost`, `127.0.0.1`, `[::1]`);
- refuse a linked `supabase/.temp/project-ref`;
- obtain local status JSON without printing it;
- keep privileged capability, fixture passwords and tokens in memory only;
- generate unique `.invalid` emails and strong random passwords;
- set `app_metadata.role = admin` only through the local Admin API;
- permit expiring a current fixture session only after the loopback/unlinked guards, never against a hosted project, and never print its session identifier;
- clean every user/session even after a failed test;
- redact all shareable output.

Browser operations use only the real UI, publishable key and resulting cookies. The privileged client is never used to make a tested operation pass.

## Accessibility and design assertions

- Login/admin use Manrope; Playfair is limited to the principal administration title.
- Surfaces/tokens/radii/shadow/spacing match `doc/design.md`.
- State colors become centralized CSS variables; `--gold`, not insufficiently contrasted `--gold-light`, is used where focus contrast requires it.
- Visible labels, errors below fields, `aria-invalid`, `aria-describedby`, status announcements and logical tab order are present.
- Every interactive target is at least 44 × 44 px.
- Widths 320, 768 and 1 024 px have no horizontal overflow.
- A real Safari mobile pass and reader announcement check remain mandatory because WebKit/Axe are not complete substitutes.

## Acceptance command contract

The implementation may aggregate commands as `npm run auth:check`, but the gate must include at least:

```bash
npm run foundation:check
npm run test:unit
npm run supabase:test:db
npm run build
npm run test:e2e:auth
npm run lint
npm run typecheck
npm run scan:build-secrets
```

The aggregate exits non-zero on any failure and never prints a secret, JWT, password, session cookie or complete fixture email.

## Success criteria traceability

| Criterion | Evidence |
| --- | --- |
| SC-001 | database + browser access matrix |
| SC-002 | timed manual run by a person familiar with standard web forms, on a supported current browser and stable connection: start when the fully usable form is displayed, end when the “Administration” context is visible, with only the instruction “accéder à l'administration”, under 60 seconds |
| SC-003 | 20 E2E cycles of navigation to `/admin` plus full reload, 40 successful protected checks, then first-request refusal after expiry/session deletion/role removal |
| SC-004 | pure equality of public text/category/state shape plus accessible-announcement equality in invalid/non-admin E2E; provider-intrinsic timing explicitly excluded from the metric |
| SC-005 | logout direct/history/multi-tab E2E proving no private data, active admin command or private cached response and refusal of the next interaction/request |
| SC-006 | delayed Action POST: pending visible and announced within 1 000 ms of first activation, submit disabled, exactly one Action POST despite repeated activation; unit spy proves exactly one `signInWithPassword` call |
| SC-007 | keyboard, Axe, viewport and manual Safari/reader pass |
| SC-008 | DTO tests, diagnostic redaction, repository/build scans |
| SC-009 | existing signup checks retained in `foundation:check` |
| SC-010 | automated comparison to the pre-route-move baseline recorded from `doc/design.md`—URLs, Header/Footer, visible headings/text, link targets, section order and no horizontal overflow at 320/768/1 024 px—plus manual visual comparison |
