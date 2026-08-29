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

## AI/Codex instruction block

Use this at the start of future implementation requests:

> Preserve the Rupantar Homes production baseline. Make only the requested change. Do not modify Auth/RLS, Cloudinary Work image lifecycle, inquiry security, security headers, environment/deployment configuration, or GitHub production protection unless the task explicitly requires it. Start from the latest main branch, use a dedicated branch, run `npm run verify`, review the full diff, open a PR, merge only after CI passes, then perform the appropriate production regression from `docs/PRODUCTION-BASELINE.md`.
