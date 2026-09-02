# Rupantar Homes Production Baseline

This document is the safety contract for all future Rupantar Homes changes.

The production system was fully regression-tested after the Work image WebP/lifecycle hardening and GitHub protection work on 2026-08-26. Future work must build on the latest protected `main` branch instead of recreating or casually refactoring the production foundation.

## Core rule

Make only the requested change. Preserve unrelated production behavior exactly.

Do not modify a locked production system unless the requested task genuinely requires it. If a locked system must change, the pull request must explain why, keep the blast radius minimal, and run the targeted verification listed below.

## Locked production systems

### Authentication and authorization

Treat these as locked unless the task is explicitly about authentication, authorization, Admin access, or RLS:

- `app/rupantar/supabase.ts`
- Admin authentication/session logic in `app/rupantar/site.tsx` and repository/auth helpers
- `functions/_lib/admin-auth.ts`
- Supabase RLS policies, grants, SECURITY DEFINER functions, and migrations under `supabase/`

Preserve the active-admin membership checks and least-privilege behavior.

### Work image upload and lifecycle

Treat these as locked unless the task is explicitly about Work media:

- `app/rupantar/cloudinary.ts`
- Work image state/lifecycle handlers in `app/rupantar/site.tsx`
- Work persistence logic in `app/rupantar/repository.ts`
- `functions/api/cloudinary-signature.ts`
- `functions/api/cloudinary-delete.ts`
- `functions/_lib/cloudinary.ts`
- relevant Supabase Work/image RPCs and tables
- `tests/work-image-webp.test.mjs`

Current required behavior:

- Accept JPG/JPEG/PNG input only.
- Maximum 10 MB per image.
- Maximum 3 Work images.
- Store the uploaded result as genuine WebP.
- Keep the signed Work upload contract explicit and independent from a conflicting upload preset.
- Keep Work assets in `rupantar-homes/works`.
- Keep strict post-upload WebP validation.
- A newly uploaded unsaved image may be deleted when removed or cancelled.
- Removing an existing saved image while editing is draft-only until a successful Update Work.
- Cancel must restore/preserve originally saved images.
- Existing saved images may be deleted from Cloudinary only after the corresponding successful Work update makes them unreferenced.
- Failed saves must not delete existing persisted assets.

### Public inquiry/forms security

Treat these as locked unless the task is explicitly about forms or inquiry handling:

- `functions/api/inquiries.ts`
- inquiry validation and upload helpers
- `functions/_lib/env.ts`
- Supabase public inquiry Edge Function and supporting database functions
- Web3Forms server-side integration

Preserve request-size limits, image type/magic-byte validation, server-side secrets, DB validation, and rate limiting.

### Security headers and browser policy

Treat these as locked unless the task is explicitly about browser security or an integration requires a CSP change:

- `public/_headers`

Preserve HSTS, CSP, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, clickjacking protection, and other existing security directives. Never loosen CSP broadly just to make a new resource work; add only the narrow origin/directive required.

### Environment and deployment configuration

Treat these as locked unless the task explicitly requires infrastructure changes:

- Cloudflare Pages/Functions deployment behavior
- production environment variable names and secret placement
- `.env.example` contract
- `worker-configuration.d.ts`
- GitHub `Protect main` ruleset

Never commit production secrets. Public frontend variables and server-only secrets must remain separated.

## Safe default workflow for every future update

1. Start from the latest `main`.
2. Create a purpose-specific branch, for example `update/homepage-services` or `fix/mobile-header`.
3. State the requested scope and what must be preserved before editing.
4. Make the smallest possible change.
5. Run `npm run verify`.
6. Review the complete diff for unrelated or locked-system changes.
7. Open a pull request into `main` and complete the production-baseline checklist.
8. Merge only when CI passes and the diff is clean.
9. Let Cloudflare deploy the new `main` commit.
10. Perform a production smoke test of the changed surface. If a locked system changed, run its targeted regression below.

Never develop directly on `main`.

## Verification matrix

### Normal content/UI-only change

Required:

- `npm run verify`
- inspect the changed page on desktop and mobile
- confirm no new red browser-console runtime errors
- confirm unrelated Admin/Works behavior was not altered by the diff

### Work image/media change

In addition to `npm run verify`, test in production with disposable media where destructive behavior is involved:

- JPG/PNG upload completes
- returned/stored asset is genuine WebP
- preview appears only after successful upload
- save/update succeeds
- public image renders after refresh
- Remove + Cancel preserves the original saved image
- Remove + Update deletes only the intentionally removed unreferenced asset
- original retained images remain present
- up to 3 images works and a 4th is rejected
- >10 MB is rejected

### Auth/RLS/database security change

In addition to `npm run verify`:

- verify Admin login still works
- verify non-admin access remains denied
- review RLS/grants/SECURITY DEFINER behavior
- run Supabase security advisors after database security changes
- verify no service-role/server secret is exposed client-side

### Form/inquiry change

In addition to `npm run verify`:

- submit the live form successfully
- verify expected DB persistence
- verify notification behavior
- verify file and request limits remain enforced
- verify server-side keys remain server-side
- verify rate limiting remains present

### Security-header/CSP change

In addition to `npm run verify`:

- verify production response headers
- confirm the required integration loads
- confirm CSP was narrowed rather than broadly disabled
- check homepage and Admin browser consoles

## Production facts and accepted limitation

- GitHub `main` is protected by the active repository ruleset `Protect main`, requiring pull requests and blocking deletion/non-fast-forward pushes.
- Cloudflare deploys the production site from `main`.
- Supabase Leaked Password Protection is unavailable on the project's current Free plan. This is an acknowledged platform-plan limitation, not permission to weaken any other authentication control.

## Accepted homepage review/connect/heading update — 2026-08-30

Scope is limited to the public homepage presentation:

- show at most four Client Review cards, with all four in one row at desktop widths;
- preserve the existing charcoal `Connect With Us` panel and add the existing interior asset `/hero-real-1-v2.webp` as a 15% opacity background layer behind its content;
- display the homepage `Recent Works` heading as `RECENT WORKS`;
- preserve all other homepage layout, styling, copy, behavior and production systems unchanged.

Accepted `app` fingerprint after this scoped update: `f018db8b57dedb4a7118e4ae3c1c1f2aede4e13f`.

## Accepted Recent Works label / Connect image refinement — 2026-08-30

Scope remains limited to the same public homepage presentation:

- preserve the four-review layout from the previous accepted update unchanged;
- display the homepage `Recent Works` label in lowercase inside a rounded light-charcoal box with white text;
- replace only the `Connect With Us` background image with `/connect-with-us.webp`, generated from the user-provided interior image at 51,448 bytes (about 50 KB), while preserving the existing 15% opacity treatment and all Connect panel content/buttons;
- preserve all other homepage layout, styling, copy, behavior and production systems unchanged.

Accepted fingerprints after this scoped update:

- `app`: `92cddbadf7a258cabe1f5afa3f44f542d67d3828`
- `public`: `0536c426ff9be2776c277c71fd7bea91257ed0f8`

## Corrected Recent Works casing / Connect image visibility — 2026-08-30

This correction changes only the two requested presentation details from the immediately previous update:

- restore the homepage heading text to exactly `Recent Works` in title case;
- preserve the original heading font sizes already provided by the component (`18px` mobile and `30px` from the `sm` breakpoint) and add only a tight light-charcoal rounded background with white text;
- keep `/connect-with-us.webp` as the Connect With Us image and increase only its presentation opacity so the supplied image is clearly visible;
- preserve the four-review layout, Connect content/buttons, all other homepage presentation, and all production systems unchanged.

Accepted `app` fingerprint after this correction: `0b93bc16a05930f503a8495ef9a0e2569207b656`.

## Direct homepage selector correction — 2026-08-30

This correction addresses the fact that the previous deployed CSS was not visibly applying on the live homepage:

- keep the source text exactly `Recent Works` and preserve the existing component font sizes;
- strengthen only the homepage heading selector so the same-size heading receives the requested tight light-charcoal rounded box and white text;
- keep the existing `/connect-with-us.webp` asset unchanged and strengthen only the Connect panel background-image layer so it cannot be overridden by later theme styles;
- preserve the four-review layout, Connect content/buttons, all other homepage layout/behavior, and all locked production systems unchanged.

Accepted `app` fingerprint after this correction: `356eecba63fa61ffe7aa7a6acb9e22448449eab9`.

## Reverted Recent Works and Connect image — 2026-08-30

This rollback removes only the two presentation changes requested for reversal:

- restore the homepage `Recent Works` heading to its original plain title-case treatment with its existing component sizing and no added charcoal pill/background;
- remove the added background image layer from the `Connect With Us` panel and restore the prior charcoal-only panel presentation;
- preserve the four-review layout, Connect text/social buttons, all other homepage presentation, and all locked production systems unchanged.

Accepted `app` fingerprint after this rollback: `0abca3ab8f80d72ab9ad2ce90f08ac64f898832e`.

## Accepted full-card click targets — 2026-08-31

Scope is limited to click-target behavior for existing public cards:

- make every homepage Recent Works card open its existing Work detail destination when any point inside the card is clicked;
- make every Blog listing card open its existing article destination when any point inside the card is clicked;
- preserve the All Works cards unchanged because they were already fully clickable;
- preserve all layout, typography, colors, content, routes, hover presentation, Admin behavior, data behavior, and locked production systems unchanged.

Accepted `app` fingerprint after this scoped update: `db11d85e9b9ac763bccbf6e72c0232785f1d4be5`.

## Review carousel and mobile Admin stability — 2026-08-31

Scope is limited to the public Client Reviews presentation and mobile Admin viewport behavior:

- keep the existing review-card visual design unchanged;
- expose at most ten existing review cards on the homepage in one horizontal track;
- show three review cards in the initial desktop viewport, two at tablet widths, and one comfortable card at mobile widths;
- preserve smooth touch/trackpad horizontal scrolling with snap alignment and no visible scrollbar;
- on `/admin` only, prevent mobile input-focus zoom and page-wide horizontal drift while preserving normal vertical scrolling and the existing intentional horizontal Admin tab strip;
- restore the normal public-site viewport behavior immediately after leaving `/admin`;
- preserve all Admin authentication, data, forms, Supabase, Cloudinary, routes, public layout, typography, colors, content, and unrelated production behavior unchanged.

Accepted fingerprints for this scoped update:

- `app`: `e1de1d5bc0faf562ede91ed286f21020ed9c35a6`
- `index.html`: `fc419a4bd532547deada34fc931c86245f0d8e6f`

## Review readability and mobile Admin refinement — 2026-08-31

Scope remains limited to the existing review carousel and mobile `/admin` presentation:

- preserve the ten-review horizontal carousel, three-card desktop viewport, card styling, and slider behavior unchanged;
- remove quote line-clamping so review text is fully readable instead of being cut off;
- keep Admin input controls at a mobile-safe 16px font size and retain the admin-only no-zoom viewport behavior;
- refine only the mobile Admin shell/header/content widths and spacing to prevent cramped or drifting layouts;
- expose the existing `View Site` action in the mobile Admin header alongside Logout;
- preserve the intentional horizontally scrollable Admin tab strip and normal vertical page scrolling;
- preserve desktop Admin, authentication/session logic, data, forms, Supabase, Cloudinary, routes, public content, and unrelated production presentation unchanged.

Accepted `app` fingerprint after this scoped refinement: `a71e0cdd002011ed59310e1cce76bf3f5adcec63`.

## Accepted Interior work category — 2026-09-03

Scope is limited to the production Supabase Work category constraint:

- preserve every previously allowed Work category unchanged;
- add the existing frontend category slug `interior` to `works_category_allowed`;
- make no application, UI, Cloudinary, routing, data-model, or unrelated database changes;
- production verification confirmed the live constraint accepts `interior` and retains all previous category values.

Accepted `supabase` fingerprint after this scoped update: `d52e21a36b1e88b9e5cf1cd12836e6b558dbc538`.

## Accepted Interior Work RPC category validation — 2026-09-03

Scope is limited to the underlying Work-save RPC validation:

- preserve the existing works_category_allowed constraint and all ten allowed values;
- preserve both RPC overloads, authorization, grants, SECURITY DEFINER behavior, search path, image validation, cleanup locking, and persistence logic;
- add only the existing frontend category slug interior to the underlying save_work_with_images(..., p_images jsonb, ...) allowlist;
- production verification confirmed both overloads remain compatible and all ten frontend category values are accepted by the complete live RPC validation path.

Accepted supabase fingerprint after this scoped update: 0ebbd43b8c4f09e975c5aa1df7297780c0f8f7a8.

## Admin performance and reliability update — 2026-09-03

Scope is limited to Admin-side loading, save responsiveness, Work image draft ownership, empty Work image-slot interaction, and the saved-content handoff to the public site:

- preserve Supabase Auth, active-admin membership checks, RLS, grants, RPCs, the ten-category system, and database schema unchanged;
- load the full Admin Works collection separately from the public 12-item Works pagination so Admin records cannot disappear when the public page limit is reached;
- stop full Works/Reviews/Settings/Leads/Blogs reloads on every Admin tab switch and open the Admin dashboard immediately after successful authorization while the first Admin data refresh completes;
- preserve only the lightweight Admin totals refresh when navigating back to the Dashboard;
- after Work saves/deletes, refresh only the Admin Works collection on the critical path and refresh the public content cache separately without overwriting Admin Works state;
- pin the set of persisted Cloudinary public IDs when a Work edit begins so later state refreshes cannot reclassify saved images as disposable draft uploads;
- make existing empty Work image slots activate the existing signed uploader without changing layout, colors, file rules, or upload contract;
- make the homepage public-content request contain the six newest Works in database creation order so a newly saved non-featured Work cannot be excluded by older Featured records;
- make Admin `View Site` perform a fresh root-page load so the public landing page reads current Supabase data and current saved image URLs instead of stale in-memory Admin state;
- keep the existing Featured badge and all homepage card layout, styling, copy, and interaction unchanged;
- keep JPEG/PNG input, 10 MB maximum, maximum 3 images, WebP output, 1920×1080 transformation, `rupantar-homes/works`, signed uploads, and reference-safe cleanup unchanged;
- add regression coverage for Admin loading, navigation, save refresh boundaries, stable image ownership, empty-slot activation, newest-six landing data, and the fresh Admin-to-public handoff.

## Complete Admin reliability audit — 2026-09-03

This audit extends the same Admin reliability scope across Admin Login, Dashboard, Works, Blogs, Leads, Reviews, Settings, public detail navigation, and touch/click behavior without changing the site design or security model.

- Admin Login starts with an empty live-data Works state instead of seeded demo Works, prevents duplicate in-flight login submissions, enters Dashboard immediately after successful authorization, and keeps the existing active-admin check unchanged;
- all Admin-to-public exits (`Back to site`, header `View Site`, Dashboard `View Site`, and Logout) perform a fresh root load so public pages cannot inherit stale Admin memory;
- Dashboard keeps lightweight totals refresh behavior and reflects live Works/Lead state without forcing full content reloads on tab navigation;
- Work save now uses the exact confirmed RPC result to update Admin state immediately, invalidates stale Works/public requests, updates the six-item homepage cache immediately, and does not wait for a second Admin Works fetch before the saved Work appears;
- Work delete removes the confirmed deleted Work immediately from Admin/home state and preserves the existing reference-safe Cloudinary cleanup sequence;
- Work image ownership, failed-save cleanup, Cancel behavior, maximum image count, source formats, WebP validation, 1920×1080 bounds, signed upload path, and Cloudinary folder remain unchanged;
- Blog save/update returns the exact confirmed saved Blog row and commits it to Admin/public Blog state immediately without a second list fetch; delete removes the confirmed row locally immediately;
- Lead status updates and deletes commit locally immediately after the confirmed database write instead of doing an additional full Leads fetch, and Admin no longer mutates the Leads prop array directly;
- Review save/delete updates only Review state immediately after the confirmed database operation instead of reloading Works + Reviews + Settings;
- Settings save applies the exact confirmed settings row immediately instead of performing a broad public-content reload;
- selected Work and Blog detail records are pinned independently from mutable paginated lists so a late list response cannot blank or replace a just-clicked detail page;
- public Works/Blog/Admin content reads use request-generation guards so stale in-flight responses cannot overwrite a newer confirmed mutation;
- Login, Admin mutations, Work image upload/removal, estimate submission, and query submission reject duplicate in-flight handler calls, protecting rapid taps/double clicks before React can render a disabled state;
- existing full-card Recent Works and Blog click behavior remains protected from nested-control double firing, while All Works cards retain their existing full-card navigation;
- no Supabase Auth/RLS/grant/schema/RPC/category changes, no Cloudinary configuration changes, no deployment/security-header changes, and no visual redesign were made in this audit;
- live Supabase API inspection during the audit showed healthy successful API responses, so the removed delays were client-side redundant reads/state races rather than a database outage.

Accepted scoped fingerprints after the complete audit:

- `app`: `4d3e682de7537295b9723d55156aea072f4bf7d4`
- `tests`: `236750c3b9990056a8aab04f6d20609880f58946`
- `supabase`: unchanged at `0ebbd43b8c4f09e975c5aa1df7297780c0f8f7a8`
- `functions`: unchanged at `93a01f847b4dfe665ee5d4d7df7b8eae518efd04`

The accepted behavior is: once the required network write is confirmed successful, the affected Admin/public in-memory state is updated immediately from that confirmed result without an additional blocking list/content reload. Network persistence itself is still a real request and therefore is not treated as zero-time.

## AI/Codex instruction block

Use this at the start of future implementation requests:

> Preserve the Rupantar Homes production baseline. Make only the requested change. Do not modify Auth/RLS, Cloudinary Work image lifecycle, inquiry security, security headers, environment/deployment configuration, or GitHub production protection unless the task explicitly requires it. Start from the latest main branch, use a dedicated branch, run `npm run verify`, review the full diff, open a PR, merge only after CI passes, then perform the appropriate production regression from `docs/PRODUCTION-BASELINE.md`.