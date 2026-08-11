# Contract: Verification matrix

## Database and migration

| Evidence | Expected result |
| --- | --- |
| Local reset applies all migrations | One clean schema, eight initial services |
| Price `0`, `0.01`, `99999999.99` | Accepted for tariffed types |
| Price negative, over maximum, or more than two decimals | Rejected without rounding |
| `quote` with amount / tariffed type without amount | Rejected |
| UUID/value snapshot of eight migrated rows | Exact match including descriptions/order/badges |
| Duplicate display orders | Accepted; deterministic query remains stable |
| anon | Active rows only; no mutation |
| authenticated non-admin | Active rows only; no mutation |
| current admin | All rows + CRUD |
| removed role / revoked or expired session | Hidden reads and mutations refused on next control |
| Database lint/advisors | No new warning; prestation duplicate-policy warning removed |

## Pure unit contracts

The canonical SC-003 matrix contains exactly the following 28 cases. Every row starts from an otherwise valid create payload; `length` is measured after trimming.

| # | Field | Input | Expected |
| ---: | --- | --- | --- |
| 1 | name | length 2 | accepted, exact lower bound |
| 2 | name | length 120 | accepted, exact upper bound |
| 3 | name | length 1 | rejected on `name` |
| 4 | name | length 121 | rejected on `name` |
| 5 | description | length 1 | accepted, exact lower bound |
| 6 | description | length 1,000 | accepted, exact upper bound |
| 7 | description | whitespace only | rejected on `description` after trim |
| 8 | description | length 1,001 | rejected on `description` |
| 9 | fixed price | `0` | accepted as 0 cents |
| 10 | starting-at price | `99999999,99` | accepted as 9,999,999,999 cents |
| 11 | fixed price | `12.34` | accepted as 1,234 cents |
| 12 | fixed price | empty | rejected on `price` |
| 13 | fixed price | `1,005` | rejected on `price`, no rounding |
| 14 | fixed price | `-0,01` | rejected on `price` |
| 15 | fixed price | `100000000` | rejected on `price` |
| 16 | quote price | empty with a stale prior amount | accepted and persisted as null |
| 17 | duration | absent | accepted as null |
| 18 | duration | `5` | accepted, exact lower bound |
| 19 | duration | `600` | accepted, exact upper bound |
| 20 | duration | `4` | rejected on `duration` |
| 21 | duration | `601` | rejected on `duration` |
| 22 | badge | absent/blank | accepted as null |
| 23 | badge | length 1 | accepted, exact lower bound |
| 24 | badge | length 40 | accepted, exact upper bound |
| 25 | badge | length 41 | rejected on `badge` |
| 26 | order | `0` | accepted, exact lower bound |
| 27 | order | `-1` | rejected on `displayOrder` |
| 28 | order | `0.5` | rejected on `displayOrder` as non-integer |

Supplementary tests, outside the fixed count, cover a non-integer duration, a missing tariffed amount, ambiguous/thousand separators, default order/visibility, and trimming of valid text. A stale quote amount is always normalized to null before mutation, as fixed by case 16 and the action contract.

- Comma and point normalization; ambiguous/thousand separators rejected.
- Cents conversions for 0, 0.01, 1.00 and maximum.
- `1.005` rejected before transport.
- Canonical labels: `45 €`, `45,50 €`, « À partir de 45,50 € » and « Sur devis ».
- Quote clears a stale amount.
- Optional duration/badge map to null and render no placeholder.
- Category rank and deterministic tie ordering.
- Every action pipeline stops before mutation on authorization/validation failure.
- Zero-row updates/deletes become `not_found`.
- PostgREST response statuses `0`, `429`, `502`, `503`, `504` and abort/timeout shapes become `unavailable` at read and mutation boundaries.
- Authorization-unavailable, mutation and invalidation failures contain only category, stage and the same opaque correlation ID in state and log.
- The signed consumption registry rejects altered data, stays bounded, and rejects A after consuming A then B for the whole replay lifetime.

## Browser matrix

### Deterministic scenario harness

- Unit action failures use injected dependencies and never call Supabase.
- Pending uses Playwright request interception to delay the browser's Server Action POST; no application delay is shipped.
- `admin-empty`, `admin-unavailable` and `public-unavailable` each run in a separate production-build server process with one immutable server-only scenario.
- Before asserting `public-unavailable`, a real fixture mutation in the same process calls `updateTag("prestations")` so no prerendered cache value can mask the failing read.
- Scenario activation is rejected unless the configured Supabase URL is exact loopback and no Netlify context is present.
- No query parameter, cookie, header, public environment variable or HTTP endpoint can select a scenario.
- Normal access, CRUD, RLS and cache tests always use the real local Supabase stack with the scenario adapter disabled.

### Access

- Visitor deep link to each admin route redirects to login.
- Non-admin cannot list hidden rows or submit any action.
- Current admin sees list, create and edit routes.
- Session/role removal during edit rejects the next save.
- Back/history after logout restores no active admin command.

### CRUD

- Create one fixed, one starting-at and one quote service.
- Invalid form retains values and associates all errors.
- Selecting quote clears and disables amount; returning to a tariffed type requires a fresh valid amount.
- Pending appears within one second; repeated UI activation makes one row.
- Modify every administrable field without creating a duplicate.
- Mask then verify public absence within five seconds of a fresh consultation.
- Reactivate then verify category/order/label.
- Cancel delete, then confirm; only the target disappears.
- Delete target out-of-band locally before confirmation and verify no false success.
- Consume create success, consume delete success, then replay the first proof and verify no success appears.

### Cross-story public projection

- Active creation, modification, masking, reactivation and deletion are each checked from a fresh public consultation after the corresponding confirmed admin mutation.
- Every expected public state appears in under five seconds without a deployment.
- These integration checks run only after the independently testable admin stories and the independently testable public catalogue are available.

### Public catalogue

- Eight migrated cards initially match the static baseline.
- Three section headings, order, images, captions and CTA destinations unchanged.
- Three price presentations correct.
- Missing duration/badge leaves no empty label.
- Empty category retains section with neutral message.
- Forty-row dataset remains stable over 20 refreshes.
- Data failure shows error, not empty state or static fallback.

### Accessibility and responsive

- Chromium and WebKit at 320, 768, 1 024 px.
- No horizontal overflow.
- Axe no relevant violation on list/forms/dialog/errors.
- Keyboard reaches every action with visible focus.
- Dialog title, cancellation, Escape and focus restoration.
- All buttons/links/controls at least 44 × 44 px.
- Pending/success/error/session states announced.

## Repository gates

```bash
npm run supabase:reset
npm run supabase:test:db
npm run supabase:lint
npm run supabase:types:generate
npm run supabase:types:check
npm run test:unit
npm run build
npm run test:e2e:auth
npm run test:e2e:services
npm run test:e2e:services:scenarios
npm run lint
npm run typecheck
npm run scan:build-secrets
```

The implementation should add `npm run services:check` to run the relevant sequence with a non-zero exit on failure and a redacted report.

## Deployment gates

On an authorized Netlify preview backed by a verified Supabase test project:

- apply only reviewed migrations after backup/preflight;
- confirm eight initial services once, with no duplicate;
- inspect build route/cache output after enabling Cache Components;
- confirm public update within five seconds after every mutation;
- confirm `/admin` responses remain private/no-store behind CDN;
- verify a retained old tab fails recoverably after a deploy;
- inspect logs for zero secrets, cookies, tokens, full session data, SQL or raw provider errors.

No hosted migration, seed or deploy is authorized merely by this contract.

## Manual gates

- Safari mobile real at 320/375 px.
- Firefox current smoke.
- Available assistive technology for labels, errors, pending and dialog.
- Timed non-technical create-to-public flow under two minutes.
- Standardized SC-010 session from the same clean fixture: give the five prompts one at a time, provide no hint or restart, record first-attempt success/failure for each prompt, require at least 4/5 successes, and record that deletion occurred only after explicit confirmation.
- Visual comparison against `doc/design.md` and public baseline.
