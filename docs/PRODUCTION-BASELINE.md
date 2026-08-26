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

## AI/Codex instruction block

Use this at the start of future implementation requests:

> Preserve the Rupantar Homes production baseline. Make only the requested change. Do not modify Auth/RLS, Cloudinary Work image lifecycle, inquiry security, security headers, environment/deployment configuration, or GitHub production protection unless the task explicitly requires it. Start from the latest main branch, use a dedicated branch, run `npm run verify`, review the full diff, open a PR, merge only after CI passes, then perform the appropriate production regression from `docs/PRODUCTION-BASELINE.md`.
