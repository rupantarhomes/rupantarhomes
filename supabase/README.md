# Supabase production contract

Production project reference: `gmtdqeskyvdvyibccxwt`

This directory is the forward-only schema history for Rupantar Homes. The live
Supabase migration ledger is the authoritative record of what production has
already applied.

## Migration safety rule

- Never manually replay an old migration against production because a repository
  filename appears different from a version shown in the Supabase dashboard.
- Historical repository filenames and the live migration ledger contain legacy
  version/name differences from earlier deployment workflows. Production has
  been inspected directly and is the source of truth for already-applied DDL.
- Every future schema change must be a **new forward-only migration**.
- Apply production DDL only through a migration-aware approved deployment step.
- Never edit an already-applied migration to change production behavior.
- After every approved schema migration, regenerate `app/rupantar/database.types.ts`,
  review the diff, and run `npm run verify`.

The current Admin Work system uses atomic `save_work_with_images` and
`delete_work_with_images` RPCs, reference-safe Cloudinary cleanup claims, the
10-category Work contract, consolidated Leads, and the server-mediated public
inquiry path. These systems are already present in production and must not be
recreated by manually rerunning historical migrations.

The migration `20260903143000_align_public_inquiry_categories.sql` is the next
forward-only correction in PR #85. It aligns Query/Estimate validation and the
`submit_public_inquiry` RPC with the same ten canonical service categories used
by the application. It must not be applied to production until the PR is
reviewed and approved.

## Canonical service categories

The application, Work RPC, public inquiry Function, and Query/Estimate database
validation must remain aligned on these values:

- `architect`
- `modular-kitchen`
- `tv-cabinet`
- `wardrobe`
- `hydraulic-bed`
- `false-ceiling`
- `parqueting`
- `railing`
- `home-construction`
- `interior`

The legacy public inquiry value `interior-designing` may be normalized to
`architect` for backward compatibility, but new UI/data must use only the
canonical list above.

## Canonical application columns

- Work descriptions: `short_description`, `long_description`
- Work image URL and size: `secure_url`, `byte_size`
- Work image ordering: `sort_order`
- Work project article: `blog_url`
- Review social link: `instagram_url`
- Settings social links: `instagram_url`, `tiktok_url`
- Estimate details: `approximate_size`, `material_preference`
- Consolidated Lead status: `status`

Legacy compatibility columns may remain in production. New application code
must use the canonical columns above.

## Generated TypeScript contract

`app/rupantar/database.types.ts` is the checked-in TypeScript representation of
the live public schema and is supplied to `createClient<Database>()`.

Regenerate it after every approved schema migration:

```powershell
supabase gen types typescript --project-id gmtdqeskyvdvyibccxwt --schema public > app/rupantar/database.types.ts
```

Then review the generated diff and run:

```powershell
npm run verify
```

`npm run verify` includes strict TypeScript checking, the production build, and
the regression suite. A schema/client mismatch must fail before deployment.

## Authentication and authorization

1. Supabase Auth owns user sessions.
2. Admin users must also have an active row in `public.admin_users`.
3. Browser/Admin operations use RLS plus active-admin checks.
4. Privileged `SECURITY DEFINER` Work/cleanup RPCs perform their own active-admin
   authorization before privileged work.
5. Public Query/Estimate submissions cannot execute the internal persistence RPC
   directly. The browser calls `/api/inquiries`; Cloudflare validates/rate-limits
   the request and calls the protected Supabase Edge Function using an internal
   secret; the Edge Function invokes the RPC using service-role credentials.
6. Server/service-role secrets must never be exposed to frontend code.

## Public inquiry chain

The durable submission path is:

`browser -> /api/inquiries -> optional Cloudinary estimate image -> protected
Supabase Edge Function -> submit_public_inquiry RPC -> queries/estimate_requests
-> database trigger -> leads`

Web3Forms notification is secondary. A notification failure must not roll back a
lead that is already persisted.

New Cloudinary inquiry media uses the dedicated asset folder
`rupantar-homes/inquiries`. Historical inquiry media may remain in older folders
when it is already referenced by production rows; do not move/delete referenced
assets just to normalize folder history.

## Live integrity checks

Before/after a schema or media-lifecycle deployment, verify at minimum:

- no orphan `work_images` rows;
- no duplicate Work or Blog slugs;
- no invalid Work/Blog categories;
- no Work has more than three image rows;
- Work image metadata is complete;
- `site_settings` has exactly the singleton row `id = 1`;
- Lead status is one of `new`, `contacted`, `closed`;
- `cloudinary_cleanup_claims` contains no public ID currently referenced by a
  `work_images` row;
- `query_create_lead` and `estimate_request_create_lead` triggers exist.

## Production backups

The current Supabase project is on the Free plan. Do not assume the project has a
production-grade downloadable automatic backup/point-in-time restore guarantee.
Keep an off-platform database export routine until the project is on a plan with
the required managed backup/retention policy.

A backup is only useful after restore has been tested. Record export date,
restore-test date, schema/migration head, and responsible operator in the
production operations runbook.

## Create an admin user on a new project

1. Create and confirm the user in Supabase Authentication.
2. Insert/activate the exact Auth user ID in `public.admin_users`.
3. Verify login succeeds through the Rupantar Admin UI.
4. Verify a normal authenticated user without an active `admin_users` row cannot
   access Admin data or privileged RPC behavior.

Example activation (replace the placeholder only in a controlled SQL session):

```sql
insert into public.admin_users (user_id)
select id
from auth.users
where email = 'CLIENT_ADMIN_EMAIL'
on conflict (user_id) do update set is_active = true;
```

## Do not do these things

- Do not develop directly on `main`.
- Do not manually rerun historical migrations in production.
- Do not add direct public inserts to Query/Estimate tables.
- Do not grant public/anon/authenticated access to the internal inquiry RPC.
- Do not remove active-admin checks from privileged Work/cleanup functions.
- Do not delete Cloudinary assets solely because they look old; prove they are
  unreferenced first.
- Do not treat a successful notification as proof the database saved, or a
  notification failure as proof the database failed.
