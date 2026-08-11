# Contract: Administration des prestations UI

## Route map

| Route | Access | Primary purpose |
| --- | --- | --- |
| `/admin` | current admin | Welcome card with real « Prestations » link |
| `/admin/prestations` | current admin | Complete list, statuses and row actions |
| `/admin/prestations/nouvelle` | current admin | Create form |
| `/admin/prestations/[id]/modifier` | current admin | Edit form for one service |

`params` and `searchParams` are treated as promises under Next.js 16. No gallery link appears until its own route is functional.

Route `error.tsx` files are Client Error Boundaries with an explicit `"use client"`; pages, loading states and the semantic list remain Server Components.

## Admin shell

- Keep the existing separate admin layout, brand and logout.
- Add a concise navigation with Dashboard and Prestations only.
- Retain `content-shell`, Manrope for controls and Playfair only for the main admin title.
- Preserve private/no-store response headers through Proxy and the hosting layer.

## List screen

### Header

- Eyebrow/context, `h1` « Prestations », short explanation.
- One dominant primary CTA: « Nouvelle prestation ».

### Semantic list

One DOM list is styled as rows on desktop and cards at 760 px and below. Every item exposes:

- name;
- administrative category label (`adminLabel`);
- display order;
- optional badge;
- text status « Active » or « Masquée »;
- « Modifier »;
- « Masquer » or « Réactiver »;
- « Supprimer ».

Actions never rely on icon-only labels, color or hover. Long content wraps without hiding status/actions.

### States

- loading: visible and announced;
- empty: explanation + « Créer une prestation »;
- loaded: count and list;
- recoverable error: distinct from empty, retry action;
- session expired: reconnect guidance;
- mutation pending/success/error: local status with no layout shift that hides the target.

## Create/edit form

### Grouping

1. **Prestation**: name, description, category.
2. **Tarif et durée**: price type, conditional amount, optional duration, optional badge.
3. **Publication**: display order and active status.

### Interaction

- Visible labels above fields and required indication.
- Errors immediately below fields and linked with `aria-describedby`/`aria-invalid`.
- Non-sensitive values retained after recoverable errors.
- Price field shown/required for fixed/starting-at, cleared and disabled for quote.
- Primary save action last; secondary cancel returns to list.
- Pending disables the primary control and is announced with `role="status"`.

### Success navigation

After confirmed create/update, return to the list and expose one accessible success message that identifies the completed operation without echoing raw provider data.

## Visibility action

Mask/reactivate is available from the Server Component list as an explicit text action rendered by the nested Client Component `service-visibility-form.tsx`. Pending is scoped to that row. Success updates the text status in the action response and expires the public catalogue.

## Delete dialog

- Native `<dialog>` or equivalent accessible modal behavior.
- Accessible title « Supprimer la prestation ? ».
- Body includes the current name and permanent consequence.
- Separate « Annuler » and destructive « Supprimer définitivement » controls.
- Initial focus favors cancellation; Escape cancels where supported.
- Focus returns to the trigger after cancellation and moves to a logical list position after success.
- No action is submitted until explicit confirmation.

## Public services page

- Keep `PageHeading`, the three `ServiceSection` calls, their order, images, captions, reverse layout and eager first image.
- Replace only each section's service array with grouped `PublicService` data.
- Render optional duration/badge without placeholder.
- Preserve the public category titles from `publicLabel`, distinct from the administrative labels.
- Render canonical price labels from the domain formatter: `45 €`, `45,50 €`, « À partir de 45,50 € » and « Sur devis ».
- For an empty category, retain its section and show a neutral unavailable message.
- Keep each « Réserver » link targeting `/contact`.
- Add public loading/error states without restoring static service content.

## Responsive/accessibility acceptance

- No horizontal overflow at 320, 768 or 1 024 px.
- Minimum 44 × 44 px targets.
- Visible `:focus-visible` using `--gold`.
- Logical tab order and restored dialog focus.
- Status changes announced; destructive dialog titled.
- All functionality available by keyboard and touch.
- Reduced motion honored.
- Chromium and WebKit automated; Safari mobile real and Firefox smoke remain manual gates.

## Design prohibitions

- No new color family, font or breakpoint.
- No dark mode, drag-and-drop ordering or icon-only action.
- No public Header/Footer inside admin routes.
- No modification of public category photography or editorial text.
- No false Gallery navigation, booking UI or image upload.
