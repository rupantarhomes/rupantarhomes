# Rupantar Homes Production Handover

## Final handover baseline

Rupantar Homes is packaged for production handover as of 2026-09-11.

- Production repository: `rupantarhomes/rupantarhomes`
- Default/protected branch: `main`
- Accepted runtime baseline commit: `e9c01094e341e1fdaf366905bfaa074c8848489d`
- Hosting: Cloudflare Pages + Pages Functions, deployed from `main`
- Database/Auth: Supabase
- Work media: Cloudinary
- Secondary form notification: Web3Forms
- Required merge checks on `main`: `Build and tests` and `Cloudflare Pages`

The final accepted post-handover polish preserves the fully filled solid dark gray (`#3f3f46`) Work-detail category box with white text. On every Work detail page, only the `Project Overview` and `Details` headings use the Rupantar brand red (`#FF1A3D`), while both body-copy paragraphs remain black (`#18181b`). The location badge, title, gallery, page structure, public content, Admin UI, routes, Supabase schema/data, Cloudinary behavior, inquiry behavior, and production environment values remain unchanged.

The exact final deployed `main` SHA is recorded separately after the final handover merge. The runtime baseline above identifies the code-bearing commit for the accepted dark-gray category badge plus red overview/details headings and black body-copy state.

## Production freeze contract

`.github/production-lock.json` fingerprints all production-bearing source/configuration surfaces at the accepted baseline. `scripts/verify-production-lock.mjs` verifies those fingerprints on every CI run through the required `Build and tests` job.

Locked surfaces include:

- `app/`
- `functions/`
- `public/`
- `supabase/`
- `tests/`
- production/build configuration files at repository root
- `.env.example`
- `.cloudflare-deploy-trigger`
- `.github/workflows/production-baseline.yml`

If any locked object changes without updating the accepted fingerprints, CI fails.

## Required change process after handover

1. Re-fetch GitHub `main` and record its current SHA.
2. Branch from that exact SHA. Never develop directly on `main`.
3. State the requested scope and what must be preserved before editing.
4. Make the smallest possible change.
5. Run `npm run verify`.
6. Run `node scripts/verify-production-lock.mjs`.
7. If a production-bearing object changed intentionally, update only its corresponding fingerprint in `.github/production-lock.json` after targeted verification passes.
8. Update `docs/PRODUCTION-BASELINE.md` with the new accepted behavior/baseline where appropriate.
9. Review the complete diff for unrelated changes and secrets.
10. Open a pull request into `main`.
11. Merge only after both required checks pass.
12. Confirm the merged `main` SHA and perform the appropriate production smoke/regression test.

Never bypass the handover controls by weakening the workflow, deleting the manifest/checker, force-pushing `main`, or changing fingerprints merely to make CI green.

## GitHub protection

The repository ruleset `Protect main` is intended to protect the default branch. Preserve the pull-request workflow, required checks, and production-lock verification during ownership transfer and future maintenance.

Repository protection and the production-lock manifest work together: GitHub controls how changes reach `main`; the manifest makes production drift explicit and reviewable.

## Architecture ownership map

### GitHub

Source of deployable truth. The receiving owner should have repository administration access, understand the pull-request workflow, and preserve the `Protect main` ruleset and production-lock verification.

### Cloudflare

Owns the public deployment boundary: Pages project, Pages Functions, custom domain/DNS if managed there, production environment values/secrets, deployment history, and runtime logs. Production is expected to deploy from `main`.

### Supabase

Owns Auth, PostgreSQL data, RLS/policies, RPCs, Edge Functions, Admin membership, logs, and backups/export responsibilities. Production project reference: `gmtdqeskyvdvyibccxwt`.

### Cloudinary

Owns Work media plus newer estimate attachments. Preserve the signed upload/deletion contract and reference-safe cleanup rules documented in `README.md`, `docs/PRODUCTION-BASELINE.md`, and `docs/PRODUCTION-OPERATIONS.md`.

### Web3Forms

Secondary notification path only. The database remains the source of truth for inquiries/leads.

## Secrets and environment

Never put real credentials in source control or in this handover document.

Browser-safe build variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Server/runtime variables and secrets are documented by name in `README.md`; their real values remain only in the appropriate provider dashboards/runtime environment.

During ownership transfer:

- transfer provider access first;
- confirm the receiving owner can log in independently;
- then rotate credentials one integration at a time if ownership/security policy requires it;
- smoke-test after each rotation;
- never rotate credentials through a source-code commit.

## Supabase handover status

The production project `gmtdqeskyvdvyibccxwt` was confirmed `ACTIVE_HEALTHY` during final packaging on 2026-09-10.

Security-advisor notes at final packaging:

- internal cleanup/secret tables have RLS enabled with no public policies by design;
- several `SECURITY DEFINER` Work/media RPCs are callable by `authenticated` and must retain their explicit active-admin authorization checks;
- Leaked Password Protection is currently disabled/unavailable under the present project configuration and remains an acknowledged limitation;
- do not alter authorization paths merely to silence an advisor without running the documented security regression.

Performance-advisor notes at final packaging:

- `idx_leads_status` and `works_featured_recent_idx` were reported as unused indexes; this is informational and is not a reason to remove them during handover.

## Final ownership checklist

The receiving owner should independently possess and test access to:

- GitHub repository administration and PR workflow
- Cloudflare Pages project, production environment values/secrets, deployment history, custom domain and DNS where applicable
- Supabase project, Auth, database, RLS/policies/functions, logs, and backup/export workflow
- Cloudinary account/cloud, Work asset folders, API credentials, usage/billing controls
- Web3Forms account/key used by production
- domain registrar ownership if the registrar is separate from Cloudflare
- the production Admin account and a tested recovery path for that account

Access transfer is not complete until the receiving owner can log in directly to each required provider without relying on the outgoing operator's existing browser session.

## Production smoke test for transfer

Perform these on the live production domain after the final handover packaging PR is deployed:

### Public

- homepage loads without console-breaking errors;
- desktop and mobile navigation work;
- Recent Works display live saved projects and do not fall back to demo/placeholder cards when Supabase is configured;
- Recent Works cards open dedicated Work pages;
- All Works filters/pagination work;
- Work detail pages open directly and via cards;
- Work detail category badges render as fully filled solid dark gray (`#3f3f46`) boxes with white text while location badges retain the existing brand-red treatment;
- Work detail `Project Overview` and `Details` headings render in brand red (`#FF1A3D`) and their body-copy paragraphs render black (`#18181b`);
- Blog cards and direct article routes work;
- Reviews render correctly;
- About, Contact, Privacy and Interior pages load;
- browser back/forward and refresh preserve valid routes;
- `/api/health` returns HTTP 200.

### Forms

- submit one disposable Query and confirm exactly one saved record/Lead;
- submit one disposable Estimate with an allowed image and confirm exactly one saved record/Lead;
- verify notification behavior separately from database persistence;
- remove disposable test data only after confirming persistence state.

### Admin

- active Admin login works;
- unauthorized/non-admin access remains denied;
- Dashboard totals and Leads load;
- Work create/update/delete and image lifecycle work with disposable test content;
- Blog create/update/delete works with disposable test content;
- Review create/delete works with disposable test content;
- Settings save only after live settings are confirmed loaded;
- Lead status update/delete behaves correctly;
- View Site/Logout return to a fresh public load.

For destructive media tests, follow `docs/PRODUCTION-BASELINE.md` and `docs/PRODUCTION-OPERATIONS.md` exactly.

## Backup and recovery responsibilities

- Maintain off-platform database exports according to `docs/PRODUCTION-OPERATIONS.md`.
- Keep at least two recent dated exports until managed retention/restore guarantees meet business needs.
- Periodically verify Cloudinary media integrity and reverse orphans before deleting anything.
- Record the exact deployed Git SHA for incidents.
- Prefer a reviewed revert PR over hot-editing or force-pushing production.

If a bad code change reaches production:

1. identify the offending PR/commit;
2. create a revert on a new branch;
3. run verification and required checks;
4. merge the revert through the normal protected PR path;
5. allow Cloudflare to redeploy `main`;
6. re-run the affected smoke/regression test;
7. record the final known-good `main` SHA.

## Handover package contents

The repository itself is the canonical package. Key documents are:

- `README.md` — architecture, image contract, environment variable names, local commands
- `docs/HANDOVER.md` — this transfer guide
- `docs/HANDOVER-CHECKLIST.md` — compact receiving-owner checklist
- `docs/PRODUCTION-BASELINE.md` — protected behavior and accepted production-change history
- `docs/PRODUCTION-OPERATIONS.md` — monitoring, backups, restore, migration, deployment and incident runbook
- `docs/FRONTEND-RELIABILITY-GUARD.md` — frontend reliability constraints
- `docs/PRODUCTION-RESILIENCE-AUDIT.md` — resilience/security audit record
- `.github/production-lock.json` — frozen production-bearing Git fingerprints
- `scripts/verify-production-lock.mjs` — lock verifier

The final runtime baseline recorded for handover is `e9c01094e341e1fdaf366905bfaa074c8848489d`.
