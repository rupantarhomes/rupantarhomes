begin;

create table if not exists public.server_secret_hashes (
  name text primary key,
  value_hash text not null check (value_hash ~ '^[a-f0-9]{64}$'),
  updated_at timestamptz not null default now(),
  constraint server_secret_hashes_known_name check (name = 'public-inquiry')
);

alter table public.server_secret_hashes enable row level security;
revoke all on table public.server_secret_hashes from public, anon, authenticated;

create or replace function public.get_public_inquiry_secret_hash()
returns text
language sql
stable
security definer
set search_path = ''
as $function$
  select secret.value_hash
  from public.server_secret_hashes secret
  where secret.name = 'public-inquiry';
$function$;

revoke all on function public.get_public_inquiry_secret_hash() from public, anon, authenticated, service_role;
grant execute on function public.get_public_inquiry_secret_hash() to service_role;

notify pgrst, 'reload schema';
commit;
