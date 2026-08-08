begin;

create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.works (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  category text not null,
  location text not null default 'Kathmandu',
  short_desc text not null default '',
  long_desc text not null default '',
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.work_images (
  id uuid primary key default gen_random_uuid(),
  work_id uuid not null references public.works(id) on delete cascade,
  cloudinary_public_id text not null unique,
  secure_url text not null check (secure_url like 'https://res.cloudinary.com/%'),
  alt_text text,
  sort_order integer not null default 0 check (sort_order >= 0),
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  bytes bigint check (bytes is null or bytes > 0),
  format text not null default 'webp' check (format = 'webp'),
  created_at timestamptz not null default now(),
  unique (work_id, sort_order)
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  location text not null default '',
  message text not null check (char_length(message) between 1 and 2000),
  rating smallint not null check (rating between 1 and 5),
  instagram_link text,
  created_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  id smallint primary key default 1 check (id = 1),
  slogan text not null default '',
  phone text not null default '',
  instagram text not null default '',
  tiktok text not null default '',
  address text not null default '',
  workshop_note text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.queries (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  phone text not null check (char_length(phone) between 7 and 30),
  category text not null default '',
  message text not null default '' check (char_length(message) <= 4000),
  created_at timestamptz not null default now()
);

create table if not exists public.estimate_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  phone text not null check (char_length(phone) between 7 and 30),
  location text not null default '',
  category text not null default '',
  size text not null default '',
  material text not null default '',
  message text not null default '' check (char_length(message) <= 4000),
  created_at timestamptz not null default now()
);

create index if not exists works_created_at_idx on public.works (created_at desc);
create index if not exists works_category_created_at_idx on public.works (category, created_at desc);
create index if not exists works_featured_idx on public.works (featured) where featured = true;
create index if not exists work_images_work_sort_idx on public.work_images (work_id, sort_order);
create index if not exists reviews_created_at_idx on public.reviews (created_at desc);
create index if not exists queries_created_at_idx on public.queries (created_at desc);
create index if not exists estimate_requests_created_at_idx on public.estimate_requests (created_at desc);

insert into public.works (id, title, slug, category, location, short_desc, long_desc, featured)
values
  ('10000000-0000-4000-8000-000000000001', 'Modern Living Room Makeover', 'modern-living-room-makeover', 'interior-designing', 'Kathmandu', 'Warm minimal interior with oak finishes and ambient cove lighting.', 'A complete transformation of a 3BHK apartment in Kathmandu. We focused on warm neutrals, fluted panels, hidden storage and layered lighting. The client wanted a calm, clutter-free home that still feels lived-in. Delivered in 22 days with factory-finished modular elements fabricated at our workshop.', true),
  ('10000000-0000-4000-8000-000000000002', 'Premium L-Shaped Modular Kitchen', 'premium-l-shaped-modular-kitchen', 'modular-kitchen', 'Sanepa, Kathmandu', 'High-gloss acrylic with quartz top and soft-close hardware.', 'L-shaped kitchen with tall unit, built-in chimney space and corner optimization. Materials: BWR ply, Hettich hinges, quartz countertop. Includes under-cabinet lights and cutlery organizers. Designed after detailed site measurement and 3D visualization.', true),
  ('10000000-0000-4000-8000-000000000003', 'Floating TV Unit with Marble Finish', 'floating-tv-unit-marble', 'tv-cabinet', 'Kathmandu', 'Floating cabinet with fluted louvers and LED backlight.', 'A sleek floating TV cabinet designed to hide wiring and add depth to the living wall. Combination of sintered stone, laminate and open display niches. Integrated warm LED strip adds a premium floating effect in the evening.', true),
  ('10000000-0000-4000-8000-000000000004', 'Sliding Door Wardrobe with Loft', 'sliding-door-wardrobe-loft', 'wardrobe', 'Kathmandu', 'Floor-to-ceiling wardrobe with mirror sliding and loft storage.', 'Custom 10ft wardrobe with soft-close sliding doors, internal drawers, and loft box. Optimized for a compact bedroom, maximizing vertical storage without making the room feel heavy.', false),
  ('10000000-0000-4000-8000-000000000005', 'King Hydraulic Storage Bed', 'king-hydraulic-storage-bed', 'hydraulic-bed', 'Kathmandu', 'Cushioned headboard with heavy-duty lift-up storage.', 'Upholstered hydraulic bed with premium fabric, teakwood legs and high-capacity storage. Hydraulic mechanism tested for 50k cycles. Paired with matching side tables.', false),
  ('10000000-0000-4000-8000-000000000006', 'Living False Ceiling with Cove', 'living-false-ceiling-cove', 'false-ceiling', 'Kathmandu', 'Gypsum ceiling with layered cove and magnetic track lights.', 'Contemporary gypsum false ceiling featuring layered cove, hidden profile lights and magnetic track system. Adds height and drama while concealing wiring and providing soft ambient lighting.', false)
on conflict (slug) do nothing;

insert into public.reviews (id, name, location, message, rating, instagram_link)
values
  ('20000000-0000-4000-8000-000000000001', 'Anil Shrestha', 'Kathmandu', 'Rupantar team delivered our kitchen before time. Finish is excellent, hardware smooth. Very professional.', 5, null),
  ('20000000-0000-4000-8000-000000000002', 'Sarina K.C.', 'Kathmandu', 'Loved the 3D design process. What we saw is what we got. Wardrobe storage planning is very smart.', 5, 'https://www.instagram.com/reel/example'),
  ('20000000-0000-4000-8000-000000000003', 'Ramesh Neupane', 'Kathmandu', 'Workshop visit helped us choose materials confidently. Installation was clean and fast.', 4, null),
  ('20000000-0000-4000-8000-000000000004', 'Pooja Maharjan', 'Kathmandu', 'Our TV unit became the highlight of our home. Guests always compliment it.', 5, null)
on conflict (id) do nothing;

insert into public.site_settings (id, slogan, phone, instagram, tiktok, address, workshop_note)
values (1, 'Transforming Spaces Inspiring Lives', '9745941799', 'https://instagram.com/', 'https://tiktok.com/', 'Kathmandu, Nepal', 'Workshop visit by appointment only')
on conflict (id) do nothing;

alter table public.admin_users enable row level security;
alter table public.works enable row level security;
alter table public.work_images enable row level security;
alter table public.reviews enable row level security;
alter table public.site_settings enable row level security;
alter table public.queries enable row level security;
alter table public.estimate_requests enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

do $$
declare
  policy_record record;
begin
  for policy_record in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = any (array[
        'admin_users', 'works', 'work_images', 'reviews',
        'site_settings', 'queries', 'estimate_requests'
      ])
  loop
    execute format('drop policy %I on %I.%I', policy_record.policyname, policy_record.schemaname, policy_record.tablename);
  end loop;
end
$$;

create policy admin_users_read_self
on public.admin_users for select to authenticated
using (user_id = (select auth.uid()));

create policy public_read_works
on public.works for select to anon, authenticated
using (true);
create policy admin_insert_works
on public.works for insert to authenticated
with check ((select public.is_admin()));
create policy admin_update_works
on public.works for update to authenticated
using ((select public.is_admin())) with check ((select public.is_admin()));
create policy admin_delete_works
on public.works for delete to authenticated
using ((select public.is_admin()));

create policy public_read_work_images
on public.work_images for select to anon, authenticated
using (true);
create policy admin_insert_work_images
on public.work_images for insert to authenticated
with check ((select public.is_admin()));
create policy admin_update_work_images
on public.work_images for update to authenticated
using ((select public.is_admin())) with check ((select public.is_admin()));
create policy admin_delete_work_images
on public.work_images for delete to authenticated
using ((select public.is_admin()));

create policy public_read_reviews
on public.reviews for select to anon, authenticated
using (true);
create policy admin_insert_reviews
on public.reviews for insert to authenticated
with check ((select public.is_admin()));
create policy admin_update_reviews
on public.reviews for update to authenticated
using ((select public.is_admin())) with check ((select public.is_admin()));
create policy admin_delete_reviews
on public.reviews for delete to authenticated
using ((select public.is_admin()));

create policy public_read_site_settings
on public.site_settings for select to anon, authenticated
using (true);
create policy admin_insert_site_settings
on public.site_settings for insert to authenticated
with check ((select public.is_admin()));
create policy admin_update_site_settings
on public.site_settings for update to authenticated
using ((select public.is_admin())) with check ((select public.is_admin()));

create policy public_insert_queries
on public.queries for insert to anon, authenticated
with check (char_length(name) between 1 and 120 and char_length(phone) between 7 and 30);
create policy admin_read_queries
on public.queries for select to authenticated
using ((select public.is_admin()));
create policy admin_update_queries
on public.queries for update to authenticated
using ((select public.is_admin())) with check ((select public.is_admin()));
create policy admin_delete_queries
on public.queries for delete to authenticated
using ((select public.is_admin()));

create policy public_insert_estimate_requests
on public.estimate_requests for insert to anon, authenticated
with check (char_length(name) between 1 and 120 and char_length(phone) between 7 and 30);
create policy admin_read_estimate_requests
on public.estimate_requests for select to authenticated
using ((select public.is_admin()));
create policy admin_update_estimate_requests
on public.estimate_requests for update to authenticated
using ((select public.is_admin())) with check ((select public.is_admin()));
create policy admin_delete_estimate_requests
on public.estimate_requests for delete to authenticated
using ((select public.is_admin()));

revoke all on table public.admin_users, public.works, public.work_images, public.reviews,
  public.site_settings, public.queries, public.estimate_requests from anon, authenticated;

grant select on table public.works, public.work_images, public.reviews, public.site_settings to anon, authenticated;
grant insert on table public.queries, public.estimate_requests to anon, authenticated;
grant select on table public.admin_users to authenticated;
grant insert, update, delete on table public.works, public.work_images, public.reviews, public.site_settings to authenticated;
grant select, update, delete on table public.queries, public.estimate_requests to authenticated;

commit;
