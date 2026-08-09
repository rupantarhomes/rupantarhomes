# Supabase schema and authentication

Production project reference: `gmtdqeskyvdvyibccxwt`

## Migration status

`migrations/20260809130140_baseline_and_reconcile_schema.sql` is the canonical
schema migration. It has already been applied to production and is recorded in
the Supabase migration history as:

- Version: `20260809130140`
- Name: `baseline_and_reconcile_schema`

Do not manually rerun this migration on the production project.

`migrations/20260809200422_atomic_work_crud.sql` is the next pending
production migration. It adds two `SECURITY INVOKER` RPCs:

- `save_work_with_images` saves a work and all ordered image rows in one
  PostgreSQL transaction.
- `delete_work_with_images` deletes a work with its cascaded image rows and
  returns the exact Cloudinary public IDs for post-commit cleanup.

This migration has **not** been applied to production yet. Apply it only in the
approved deployment step, regenerate `database.types.ts`, and run the live CRUD
smoke test before handing the site over.

`migrations/20260809224500_secure_public_inquiries.sql` is also pending. It
revokes direct browser inserts into `queries` and `estimate_requests`. Public
forms instead use the validated `/api/inquiries` Cloudflare Pages Function,
which writes with the server-only `SUPABASE_SECRET_KEY`. Apply this migration
and add that Cloudflare secret in the same approved deployment step so there is
no interval where public forms are unavailable.

For a new Supabase project, apply the committed migration through the Supabase
CLI or another migration-aware deployment process so its version is recorded.
The migration creates:

- `admin_users`
- `works`
- `work_images`
- `reviews`
- `site_settings`
- `queries`
- `estimate_requests`

It also enables RLS, installs the required policies, grants the minimum Data API
privileges, and creates the singleton settings row.

## Canonical application columns

- Work descriptions: `short_description`, `long_description`
- Work image URL and size: `secure_url`, `byte_size`
- Work image ordering: `sort_order`
- Review social link: `instagram_url`
- Settings social links: `instagram_url`, `tiktok_url`
- Estimate details: `approximate_size`, `material_preference`

Legacy compatibility columns may remain temporarily in production. New
application code must use the canonical columns above.

## Generated TypeScript contract

`app/rupantar/database.types.ts` is generated from the production schema and
is supplied to `createClient<Database>()`. This makes a renamed or missing
database column fail the TypeScript production build instead of failing later
in the browser.

Regenerate the file after every approved schema migration:

```powershell
supabase gen types typescript --project-id gmtdqeskyvdvyibccxwt --schema public > app/rupantar/database.types.ts
```

Review the generated diff and run `pnpm test` before deploying it.

## Create an admin user on a new project

1. Open **Authentication -> Users -> Add user -> Create new user**.
2. Enter the client's admin email and a strong unique password.
3. Enable **Auto confirm user**, then create the user.
4. In SQL Editor, replace the placeholder email and run:

```sql
insert into public.admin_users (user_id)
select id
from auth.users
where email = 'CLIENT_ADMIN_EMAIL'
on conflict (user_id) do update set is_active = true;
```

## Verify RLS and the migration

```sql
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'admin_users',
    'works',
    'work_images',
    'reviews',
    'site_settings',
    'queries',
    'estimate_requests'
  )
order by tablename;
```

All seven rows must show `rowsecurity = true`.

Public users can read published site content. Queries and estimates are accepted
only through the rate-limited Cloudflare Function. Only active users listed in
`admin_users` can read submissions or modify works, work images, reviews, or
site settings.

## Client workflow for query and estimate details

The locked admin dashboard intentionally shows totals only. To read the full
submissions without changing that interface, the client uses Supabase **Table
Editor**:

1. Open `queries` for query details and optional `attachment_url`.
2. Open `estimate_requests` for estimate details and optional `attachment_url`.
3. Sort `created_at` descending so the newest submissions appear first.
4. Open `attachment_url` only when it is present; the corresponding
   `attachment_public_id` is retained for managed Cloudinary cleanup.
