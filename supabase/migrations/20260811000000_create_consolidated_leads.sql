begin;

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  email text,
  location text,
  service_required text,
  property_type text,
  approximate_area text,
  budget text,
  timeline text,
  message text,
  reference_image_url text,
  reference_image_public_id text,
  status text not null default 'new' check (status in ('new', 'contacted', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  material_preference text
);

alter table public.leads enable row level security;

create index if not exists leads_status_idx on public.leads (status, created_at desc);
create index if not exists idx_leads_created_at on public.leads (created_at desc);

create or replace function public.set_leads_updated_at()
returns trigger
language plpgsql
set search_path to ''
as $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

drop trigger if exists leads_set_updated_at on public.leads;
create trigger leads_set_updated_at
before update on public.leads
for each row execute function public.set_leads_updated_at();

create or replace function public.copy_estimate_request_to_lead()
returns trigger
language plpgsql
set search_path to ''
as $function$
begin
  insert into public.leads (
    name, phone, location, service_required, approximate_area,
    material_preference, message, reference_image_url,
    reference_image_public_id, status
  ) values (
    new.name, new.phone, new.location, new.category, new.approximate_size,
    new.material_preference, new.message, new.attachment_url,
    new.attachment_public_id, 'new'
  );
  return new;
end;
$function$;

drop trigger if exists estimate_request_create_lead on public.estimate_requests;
create trigger estimate_request_create_lead
after insert on public.estimate_requests
for each row execute function public.copy_estimate_request_to_lead();

drop policy if exists leads_admin_select on public.leads;
create policy leads_admin_select on public.leads
for select to authenticated
using (exists (
  select 1 from public.admin_users admin
  where admin.user_id = (select auth.uid()) and admin.is_active = true
));

drop policy if exists leads_admin_update on public.leads;
create policy leads_admin_update on public.leads
for update to authenticated
using (exists (
  select 1 from public.admin_users admin
  where admin.user_id = (select auth.uid()) and admin.is_active = true
))
with check (exists (
  select 1 from public.admin_users admin
  where admin.user_id = (select auth.uid()) and admin.is_active = true
));

drop policy if exists leads_admin_delete on public.leads;
create policy leads_admin_delete on public.leads
for delete to authenticated
using (exists (
  select 1 from public.admin_users admin
  where admin.user_id = (select auth.uid()) and admin.is_active = true
));

revoke all on table public.leads from public, anon, authenticated;
grant select, update, delete on table public.leads to authenticated;

notify pgrst, 'reload schema';
commit;
