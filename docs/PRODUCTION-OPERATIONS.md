# Rupantar Homes Production Operations Runbook

This runbook covers the controls that application code alone cannot guarantee:
monitoring, backups, restore readiness, migrations, media integrity, deployment,
secrets, and post-deploy smoke testing.

## Core principle

A production site is durable when failures are detected early, writes are
recoverable, destructive actions are bounded, and every deployment has a known
rollback/recovery path. Do not describe any production system as literally
"perfect forever"; keep these controls active as dependencies, plans, browser
behavior, and traffic change.

## Production systems

- GitHub protected `main`: source of deployable truth.
- Cloudflare Pages/Functions: public app and server boundary.
- Supabase: Auth, PostgreSQL, RLS, RPCs, Edge Function, Leads/data.
- Cloudinary: Work media and newer estimate attachments.
- Web3Forms: secondary notification only; never the data source of truth.

## Health monitoring

`GET /api/health` checks the core Supabase read path and returns HTTP 200 only
when the singleton settings row can be read. It returns HTTP 503 on dependency
failure and exposes no secret values.

Configure an external uptime monitor to call this endpoint at a reasonable
interval and alert on consecutive failures. Also monitor the homepage itself;
health API success does not prove the browser bundle/CDN is healthy.

Suggested checks:

- homepage: every 5 minutes;
- `/api/health`: every 5 minutes;
- alert after 2-3 consecutive failures to avoid one transient false alarm;
- record incident start/end and root cause.

## Database backup and restore

The production Supabase project currently uses the Free plan. Treat managed
backup availability as insufficient for business continuity until the project
is on a plan with the required retention/restore guarantees.

Until then:

1. Export the production database off-platform at least weekly and before every
   schema migration.
2. Keep at least two recent dated exports outside Supabase.
3. Never store database passwords/service-role keys inside the repository or the
   backup archive itself.
4. At least quarterly, restore an export into a disposable/non-production
   Postgres/Supabase environment and verify Works, Work images, Blogs, Reviews,
   Settings, Queries, Estimates, Leads, Admin membership, functions, and key
   constraints.
5. Record backup date, checksum/location, migration head, and restore-test date.

After moving to a paid Supabase plan, document the actual backup retention and
whether PITR is enabled. Keep periodic off-platform exports for independent
recovery.

## Cloudinary backup and orphan policy

Cloudinary automatic backup is an account-level setting, not an application
assumption. Current asset inspection showed no backup bytes for the audited
assets.

If Cloudinary backup is enabled later:

- record the setting/date/retention policy;
- watch storage/credit usage;
- confirm deleting an asset has the intended backup-retention behavior;
- test restoring one disposable asset before relying on it.

Never automatically delete media solely because it is absent from one frontend
screen. A Work image may be destroyed only after the server-side
`claim_unreferenced_cloudinary_images` check confirms it is no longer referenced.

Quarterly media audit:

1. Export current `work_images.cloudinary_public_id` values.
2. List assets in the Work media folder.
3. Verify every DB-referenced asset exists and is WebP within approved dimensions.
4. Identify reverse orphans (Cloudinary assets not referenced by Work rows).
5. Exclude current estimate attachments and known brand/history assets.
6. Delete only positively identified disposable orphans after a second review.

Historical production assets may remain in older folders. Do not normalize them
by moving/deleting referenced assets just for neatness.

## Public inquiry durability

Canonical submission order:

1. browser validation;
2. Cloudflare same-origin/rate-limit/file checks;
3. optional estimate image upload;
4. protected Supabase Edge Function;
5. `submit_public_inquiry` RPC;
6. Query/Estimate row;
7. database trigger creates/updates Admin Lead record;
8. Web3Forms notification attempt.

The database is the source of truth. Web3Forms failure after persistence is
logged but does not delete the saved lead.

If a user reports a missing lead:

- search `queries`/`estimate_requests` by phone/time;
- search `leads` by corresponding time/phone;
- inspect Cloudflare Function logs using the request ID;
- verify Query/Estimate -> Lead triggers are installed;
- do not resubmit or duplicate production data until the persistence state is
  known.

## Admin save rules

- Do not leave Admin or switch tabs while a mutation/upload is active; the UI
  normally locks these controls.
- A successful database write updates Admin/public in-memory state immediately.
- Background reconciliation may follow, but it must never be required for the
  saved record to appear.
- If save reports success but Cloudinary cleanup reports failure, the database
  state is authoritative; perform media cleanup only after verifying the asset is
  unreferenced.
- If a session expires, reauthenticate rather than bypassing authorization.

## Migration procedure

Before any schema change:

1. verify current protected `main` SHA;
2. inspect the live Supabase migration ledger;
3. create one new forward-only migration;
4. never edit/replay already-applied historical migrations;
5. take an off-platform DB export;
6. regenerate database TypeScript after the approved migration;
7. run `npm run verify`;
8. review security/performance advisors;
9. merge only after review and green CI;
10. apply/deploy in the approved order;
11. run the database/media/form/Admin smoke tests below.

If a migration fails, stop. Do not manually improvise partial DDL on production
without first establishing exactly what committed.

## Deployment smoke test

After Cloudflare deploys a reviewed `main` commit, verify on desktop and mobile:

### Public

- homepage loads without console/runtime errors;
- header/footer/settings values are current;
- Recent Works cards respond across the full card;
- All Works pagination/category filters work;
- Work detail route opens directly and via cards;
- Blog list and article routes work directly and via cards;
- Reviews render and only reviews with a valid external URL show a review action;
- About/Contact/Privacy/Interior pages load;
- browser back/forward and direct refresh preserve valid routes;
- `/api/health` returns 200.

### Query form

- submit one disposable Query using a current canonical service category;
- confirm success UI once;
- confirm one Query row and one corresponding Lead;
- confirm Admin displays it;
- confirm notification behavior separately.

### Estimate form

- submit one disposable JPG/PNG <=10 MB;
- confirm one Estimate row and one corresponding Lead;
- confirm reference image opens from Admin;
- confirm the new Cloudinary asset is WebP and placed in
  `rupantar-homes/inquiries`;
- confirm failed validation does not leave a persisted lead.

### Admin

- login with authorized Admin;
- verify unauthorized/non-admin remains denied;
- Dashboard totals/Leads load;
- create a disposable Work with images, then confirm it immediately appears in
  Admin, homepage newest-six behavior, All Works/category view, and Work detail;
- edit Work, remove/retain images, verify cleanup ordering;
- Cancel a Work edit and verify persisted originals remain;
- create/edit/delete a disposable Blog;
- create/delete a disposable Review;
- save Settings only after live values are confirmed loaded;
- update a Lead status and confirm it changes immediately;
- delete only disposable test records;
- View Site/Logout perform a fresh public load.

## Secret rotation

At least annually, and immediately after suspected exposure, rotate relevant
server-only credentials one system at a time with a smoke test between steps:

- Supabase service/server secrets used by server functions;
- public inquiry internal secret/hash pair;
- Cloudinary API secret/key when required;
- Web3Forms access key.

Never rotate all integrations simultaneously without a staged validation path.
Never commit a secret to GitHub.

## Dependency and plan review

Quarterly:

- review Supabase security/performance advisors;
- review Cloudinary credits/storage/bandwidth;
- review Cloudflare errors/rate limits;
- review dependency versions and security notices;
- verify `npm run verify` still includes `tsc --noEmit`, production build, and
  regression tests;
- verify GitHub `main` protection remains active;
- verify health monitoring still alerts;
- confirm backup/export and restore-test records are current.

## Incident priorities

1. Protect data integrity first.
2. Stop destructive cleanup if reference state is uncertain.
3. Preserve logs/request IDs and exact deployed SHA.
4. Restore service from known-good code/data rather than hot-editing production.
5. After recovery, add a regression test/runbook update for the failure mode.
