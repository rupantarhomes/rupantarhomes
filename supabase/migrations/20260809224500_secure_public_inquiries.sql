begin;

-- Browser clients must not bypass the validated Cloudflare inquiry endpoint.
-- The endpoint writes with a server-only Supabase secret key after enforcing
-- origin, rate-limit, field, and optional image checks.
drop policy if exists queries_public_insert on public.queries;
drop policy if exists public_insert_queries on public.queries;
drop policy if exists estimate_requests_public_insert on public.estimate_requests;
drop policy if exists public_insert_estimate_requests on public.estimate_requests;

revoke insert on table public.queries, public.estimate_requests
from anon, authenticated;

revoke all on sequence public.queries_id_seq from anon, authenticated;
revoke all on sequence public.estimate_requests_id_seq from anon, authenticated;

notify pgrst, 'reload schema';

commit;
