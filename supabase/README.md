# Supabase setup

Run `migrations/20260809000000_rupantar_schema.sql` once in the Supabase SQL Editor. It creates the seven tables, normalized `work_images`, seed content, explicit Data API grants, and all Row Level Security policies.

Then create the one admin account:

1. Open **Authentication → Users → Add user → Create new user**.
2. Enter the client's admin email and a strong unique password.
3. Enable **Auto confirm user**, then create the user.
4. In SQL Editor, replace the placeholder email and run:

```sql
insert into public.admin_users (user_id)
select id from auth.users where email = 'CLIENT_ADMIN_EMAIL'
on conflict (user_id) do nothing;
```

Verify the setup without exposing any password or secret:

```sql
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('admin_users', 'works', 'work_images', 'reviews', 'site_settings', 'queries', 'estimate_requests')
order by tablename;
```

All seven rows must show `rowsecurity = true`.
