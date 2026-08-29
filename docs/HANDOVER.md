# Rupantar Homes Production Handover

## Handover status

Rupantar Homes is production-frozen for handover.

Accepted live-code baseline before handover controls:

- GitHub repository: `rupantarhomes/rupantarhomes`
- Protected branch: `main`
- Frozen production commit: `1995e4dc2d17ef243f92e4487d8ad8cce6ac04a1`
- Hosting: Cloudflare Pages + Pages Functions, deployed from `main`
- Database/Auth: Supabase
- Work media: Cloudinary
- Required GitHub check: `Build and tests`

The handover controls themselves do not change the public site, Admin UI, database schema/data, Cloudinary behavior, routes, styling, or production environment values.

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

If any locked object changes without updating the handover manifest, CI fails.

## Required change process after handover

1. Re-fetch GitHub `main` and record its current SHA.
2. Branch from that exact SHA. Never work directly on `main`.
3. State the requested scope and protected/unrelated areas before editing.
4. Make the smallest possible change.
5. Run `npm run verify`.
6. Run `node scripts/verify-production-lock.mjs`.
7. If a production-bearing object changed intentionally, update only its corresponding fingerprint in `.github/production-lock.json` after all targeted verification passes.
8. Update `docs/PRODUCTION-BASELINE.md` with the new accepted baseline/change where appropriate.
9. Review the complete diff for unrelated changes and secrets.
10. Open a PR into `main`.
11. Merge only after the required `Build and tests` check passes.
12. Confirm the merged `main` SHA and perform the appropriate production smoke/regression test.

Never bypass the production lock by weakening the workflow, deleting the manifest/checker, or changing fingerprints merely to make CI green. A fingerprint update is approval of a new production baseline and must correspond to an intentional, verified production change.

## GitHub protection

At handover, the repository ruleset `Protect main` is active for the default branch and blocks branch deletion and non-fast-forward pushes, requires pull requests, and requires the `Build and tests` status check. There are no bypass actors.

Repository-side protection and the handover manifest work together: GitHub controls how changes reach `main`; the manifest makes production drift explicit and reviewable.

## Secrets and environment

- Never commit production secrets.
- `.env*` is ignored except `.env.example`.
- `.env.example` contains placeholders only.
- Browser-safe Supabase publishable configuration must remain separate from server-only secrets.
- Cloudinary signing/deletion secrets, Web3Forms secrets, and privileged Supabase credentials stay server-side in the deployment environment.
- During ownership transfer, rotate credentials only through the relevant provider dashboards and only after the receiving owner has confirmed access. Do not rotate credentials through source-code commits.

## Supabase handover notes

The production Supabase project is `gmtdqeskyvdvyibccxwt` and was `ACTIVE_HEALTHY` during the 2026-08-29 handover audit.

Security-advisor notes at handover:

- `cloudinary_cleanup_claims` and `server_secret_hashes` have RLS enabled with no public policies. This is intentional for internal-only tables.
- The warned `SECURITY DEFINER` Work/cleanup RPCs explicitly require a signed-in user whose `auth.uid()` exists as an active member of `public.admin_users` before privileged behavior executes.
- `server_secret_hashes` is not granted to `anon` or `authenticated`; its observed application grant is service-role only.
- Supabase Leaked Password Protection remains unavailable/disabled under the current project plan and is an acknowledged platform limitation documented in `docs/PRODUCTION-BASELINE.md`.

Do not alter these production authorization paths merely to silence an advisor. Any future Auth/RLS/RPC change requires the targeted security regression defined in `docs/PRODUCTION-BASELINE.md`.

## Operational ownership checklist

The receiving owner should independently possess and test access to:

- GitHub repository administration and PR workflow
- Cloudflare Pages project, domain/DNS, production environment variables, and deployment history
- Supabase project, Auth settings, database, RLS/policies/functions, logs, and backups available under the current plan
- Cloudinary account/cloud, Work asset folder, API credentials, and usage/billing controls
- Web3Forms or any notification/inquiry provider credentials used by production
- Domain registrar/DNS ownership if separate from Cloudflare

Access transfer is not complete until the receiving owner can log in directly to each provider without relying on the outgoing operator's session.

## Production smoke test for final transfer

Perform these from the live production domain after the handover PR is deployed:

- Homepage loads without console-breaking errors.
- Desktop and mobile navigation work.
- Homepage Recent Works display correctly and each card opens its dedicated Work page.
- Blog cards open their dedicated Blog pages.
- Featured/Recent Works, Reviews, and Blog sections render expected content.
- Public inquiry form reaches its expected success path without exposing server secrets.
- Admin login works for an active admin and remains inaccessible to non-admin users.
- Work create/update and image lifecycle behavior remains unchanged unless intentionally tested with disposable media.

For destructive Cloudinary lifecycle tests, follow `docs/PRODUCTION-BASELINE.md` exactly.

## Recovery

If a bad change reaches production:

1. Revert the offending PR with a new PR.
2. Do not force-push `main`.
3. Allow the protected CI workflow to pass.
4. Merge the revert and let Cloudflare redeploy `main`.
5. Re-run the affected production regression.
6. Reconfirm the final `main` SHA.

The frozen commit `1995e4dc2d17ef243f92e4487d8ad8cce6ac04a1` is the reference for the public/runtime state immediately before the handover-control files were introduced.
