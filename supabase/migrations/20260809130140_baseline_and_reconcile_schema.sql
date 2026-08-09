begin;

-- Canonical production schema for Rupantar Homes.
-- This migration is intentionally additive on existing databases. Legacy columns
-- are preserved until the application has been deployed and acceptance-tested.

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.works (
  id bigint generated always as identity primary key,
  title text not null,
  slug text not null,
  category text not null,
  location text not null default 'Kathmandu',
  short_description text not null default '',
  long_description text not null default '',
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint works_title_not_blank check (btrim(title) <> ''),
  constraint works_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint works_slug_key unique (slug),
  constraint works_category_allowed check (
    category = any (array[
      'interior-designing', 'modular-kitchen', 'tv-cabinet', 'wardrobe',
      'hydraulic-bed', 'false-ceiling', 'parqueting', 'railing'
    ])
  )
);

create table if not exists public.work_images (
  id bigint generated always as identity primary key,
  work_id bigint not null references public.works(id) on delete cascade,
  cloudinary_public_id text not null,
  secure_url text not null,
  alt_text text not null default '',
  format text not null default 'webp',
  width integer not null,
  height integer not null,
  byte_size integer not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint work_images_cloudinary_public_id_key unique (cloudinary_public_id),
  constraint work_images_public_id_not_blank check (btrim(cloudinary_public_id) <> ''),
  constraint work_images_delivery_url_https check (secure_url ~ '^https://'),
  constraint work_images_format_webp check (format = 'webp'),
  constraint work_images_dimensions_positive check (width > 0 and height > 0),
  constraint work_images_1080p_master check (
    greatest(width, height) <= 1920 and least(width, height) <= 1080
  ),
  constraint work_images_byte_size_positive check (byte_size > 0),
  constraint work_images_sort_order_check check (sort_order >= 0),
  constraint work_images_work_id_sort_order_key unique (work_id, sort_order)
);

create table if not exists public.reviews (
  id bigint generated always as identity primary key,
  name text not null,
  location text not null default 'Kathmandu',
  message text not null,
  rating smallint not null default 5,
  instagram_url text,
  created_at timestamptz not null default now(),
  constraint reviews_name_not_blank check (btrim(name) <> ''),
  constraint reviews_message_not_blank check (btrim(message) <> ''),
  constraint reviews_rating_range check (rating between 1 and 5),
  constraint reviews_instagram_url_valid check (
    instagram_url is null or instagram_url = '' or instagram_url ~ '^https://'
  )
);

create table if not exists public.site_settings (
  id smallint primary key default 1,
  slogan text not null,
  phone text not null,
  instagram_url text not null,
  tiktok_url text not null,
  address text not null,
  workshop_note text not null,
  updated_at timestamptz not null default now(),
  constraint site_settings_singleton check (id = 1),
  constraint site_settings_slogan_not_blank check (btrim(slogan) <> ''),
  constraint site_settings_phone_not_blank check (btrim(phone) <> ''),
  constraint site_settings_instagram_https check (instagram_url ~ '^https://'),
  constraint site_settings_tiktok_https check (tiktok_url ~ '^https://')
);

create table if not exists public.queries (
  id bigint generated always as identity primary key,
  name text not null,
  phone text not null,
  category text not null,
  message text not null default '',
  attachment_public_id text,
  attachment_url text,
  created_at timestamptz not null default now(),
  constraint queries_name_not_blank check (btrim(name) <> ''),
  constraint queries_phone_not_blank check (btrim(phone) <> ''),
  constraint queries_category_allowed check (
    category = any (array[
      'interior-designing', 'modular-kitchen', 'tv-cabinet', 'wardrobe',
      'hydraulic-bed', 'false-ceiling', 'parqueting', 'railing'
    ])
  ),
  constraint queries_attachment_pair check (
    (attachment_public_id is null) = (attachment_url is null)
  ),
  constraint queries_attachment_url_https check (
    attachment_url is null or attachment_url ~ '^https://'
  )
);

create table if not exists public.estimate_requests (
  id bigint generated always as identity primary key,
  name text not null,
  phone text not null,
  location text not null,
  category text not null,
  approximate_size text not null default '',
  material_preference text not null default '',
  message text not null default '',
  attachment_public_id text,
  attachment_url text,
  created_at timestamptz not null default now(),
  constraint estimate_requests_name_not_blank check (btrim(name) <> ''),
  constraint estimate_requests_phone_not_blank check (btrim(phone) <> ''),
  constraint estimate_requests_location_not_blank check (btrim(location) <> ''),
  constraint estimate_requests_category_allowed check (
    category = any (array[
      'interior-designing', 'modular-kitchen', 'tv-cabinet', 'wardrobe',
      'hydraulic-bed', 'false-ceiling', 'parqueting', 'railing'
    ])
  ),
  constraint estimate_requests_attachment_pair check (
    (attachment_public_id is null) = (attachment_url is null)
  ),
  constraint estimate_requests_attachment_url_https check (
    attachment_url is null or attachment_url ~ '^https://'
  )
);

-- Add canonical columns when reconciling a dashboard-created or older schema.
alter table public.admin_users
  add column if not exists is_active boolean not null default true;

alter table public.works
  add column if not exists short_description text not null default '',
  add column if not exists long_description text not null default '',
  add column if not exists updated_at timestamptz not null default now();

alter table public.work_images
  add column if not exists secure_url text,
  add column if not exists byte_size integer,
  add column if not exists sort_order integer not null default 0;

alter table public.reviews
  add column if not exists instagram_url text;

alter table public.site_settings
  add column if not exists instagram_url text not null default 'https://instagram.com/',
  add column if not exists tiktok_url text not null default 'https://tiktok.com/';

alter table public.queries
  add column if not exists attachment_public_id text,
  add column if not exists attachment_url text;

alter table public.estimate_requests
  add column if not exists approximate_size text not null default '',
  add column if not exists material_preference text not null default '',
  add column if not exists attachment_public_id text,
  add column if not exists attachment_url text;

-- Copy data from legacy aliases only when the canonical value is empty.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'works' and column_name = 'short_desc'
  ) then
    execute $sql$
      update public.works
      set short_description = short_desc
      where btrim(short_description) = '' and btrim(coalesce(short_desc, '')) <> ''
    $sql$;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'works' and column_name = 'long_desc'
  ) then
    execute $sql$
      update public.works
      set long_description = long_desc
      where btrim(long_description) = '' and btrim(coalesce(long_desc, '')) <> ''
    $sql$;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'work_images' and column_name = 'delivery_url'
  ) then
    execute $sql$
      update public.work_images
      set secure_url = delivery_url
      where (secure_url is null or btrim(secure_url) = '')
        and btrim(coalesce(delivery_url, '')) <> ''
    $sql$;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'work_images' and column_name = 'bytes'
  ) then
    execute $sql$
      update public.work_images
      set byte_size = least(bytes, 2147483647)::integer
      where byte_size is null and bytes is not null
    $sql$;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'work_images' and column_name = 'display_order'
  ) then
    execute $sql$
      update public.work_images
      set sort_order = display_order
      where sort_order = 0 and display_order <> 0
    $sql$;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'reviews' and column_name = 'instagram_link'
  ) then
    execute $sql$
      update public.reviews
      set instagram_url = instagram_link
      where instagram_url is null and instagram_link is not null
    $sql$;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'site_settings' and column_name = 'instagram'
  ) then
    execute $sql$
      update public.site_settings
      set instagram_url = instagram
      where btrim(instagram_url) = '' and btrim(coalesce(instagram, '')) <> ''
    $sql$;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'site_settings' and column_name = 'tiktok'
  ) then
    execute $sql$
      update public.site_settings
      set tiktok_url = tiktok
      where btrim(tiktok_url) = '' and btrim(coalesce(tiktok, '')) <> ''
    $sql$;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'estimate_requests' and column_name = 'size'
  ) then
    execute $sql$
      update public.estimate_requests
      set approximate_size = size
      where btrim(approximate_size) = '' and btrim(coalesce(size, '')) <> ''
    $sql$;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'estimate_requests' and column_name = 'material'
  ) then
    execute $sql$
      update public.estimate_requests
      set material_preference = material
      where btrim(material_preference) = '' and btrim(coalesce(material, '')) <> ''
    $sql$;
  end if;
end
$$;

-- The live dashboard schema had a second ordering constraint whose default value
-- prevented more than one image per work. sort_order is the canonical ordering.
alter table public.work_images
  drop constraint if exists work_images_work_order_unique;

create index if not exists works_recent_idx
  on public.works (created_at desc, id desc);
create index if not exists works_category_recent_idx
  on public.works (category, created_at desc, id desc);
create index if not exists works_featured_recent_idx
  on public.works (created_at desc, id desc) where featured = true;
create index if not exists work_images_work_sort_idx
  on public.work_images (work_id, sort_order);
create unique index if not exists work_images_work_id_sort_order_key
  on public.work_images (work_id, sort_order);
create index if not exists reviews_recent_idx
  on public.reviews (created_at desc, id desc);
create index if not exists queries_recent_idx
  on public.queries (created_at desc, id desc);
create index if not exists estimate_requests_recent_idx
  on public.estimate_requests (created_at desc, id desc);

insert into public.site_settings (
  id, slogan, phone, instagram_url, tiktok_url, address, workshop_note
)
values (
  1,
  'Transforming Spaces Inspiring Lives',
  '9745941799',
  'https://instagram.com/',
  'https://tiktok.com/',
  'Kathmandu, Nepal',
  'Workshop visit by appointment only'
)
on conflict (id) do nothing;

alter table public.admin_users enable row level security;
alter table public.works enable row level security;
alter table public.work_images enable row level security;
alter table public.reviews enable row level security;
alter table public.site_settings enable row level security;
alter table public.queries enable row level security;
alter table public.estimate_requests enable row level security;

-- Replace only Rupantar-managed policies. Unknown policies are left untouched.
drop policy if exists admin_users_read_own_membership on public.admin_users;
drop policy if exists admin_users_read_self on public.admin_users;

drop policy if exists works_public_read on public.works;
drop policy if exists works_admin_insert on public.works;
drop policy if exists works_admin_update on public.works;
drop policy if exists works_admin_delete on public.works;
drop policy if exists public_read_works on public.works;
drop policy if exists admin_insert_works on public.works;
drop policy if exists admin_update_works on public.works;
drop policy if exists admin_delete_works on public.works;

drop policy if exists work_images_public_read on public.work_images;
drop policy if exists work_images_admin_insert on public.work_images;
drop policy if exists work_images_admin_update on public.work_images;
drop policy if exists work_images_admin_delete on public.work_images;
drop policy if exists public_read_work_images on public.work_images;
drop policy if exists admin_insert_work_images on public.work_images;
drop policy if exists admin_update_work_images on public.work_images;
drop policy if exists admin_delete_work_images on public.work_images;

drop policy if exists reviews_public_read on public.reviews;
drop policy if exists reviews_admin_insert on public.reviews;
drop policy if exists reviews_admin_update on public.reviews;
drop policy if exists reviews_admin_delete on public.reviews;
drop policy if exists public_read_reviews on public.reviews;
drop policy if exists admin_insert_reviews on public.reviews;
drop policy if exists admin_update_reviews on public.reviews;
drop policy if exists admin_delete_reviews on public.reviews;

drop policy if exists site_settings_public_read on public.site_settings;
drop policy if exists site_settings_admin_insert on public.site_settings;
drop policy if exists site_settings_admin_update on public.site_settings;
drop policy if exists public_read_site_settings on public.site_settings;
drop policy if exists admin_insert_site_settings on public.site_settings;
drop policy if exists admin_update_site_settings on public.site_settings;

drop policy if exists queries_public_insert on public.queries;
drop policy if exists queries_admin_read on public.queries;
drop policy if exists public_insert_queries on public.queries;
drop policy if exists admin_read_queries on public.queries;
drop policy if exists admin_update_queries on public.queries;
drop policy if exists admin_delete_queries on public.queries;

drop policy if exists estimate_requests_public_insert on public.estimate_requests;
drop policy if exists estimate_requests_admin_read on public.estimate_requests;
drop policy if exists public_insert_estimate_requests on public.estimate_requests;
drop policy if exists admin_read_estimate_requests on public.estimate_requests;
drop policy if exists admin_update_estimate_requests on public.estimate_requests;
drop policy if exists admin_delete_estimate_requests on public.estimate_requests;

create policy admin_users_read_own_membership
on public.admin_users for select to authenticated
using (user_id = (select auth.uid()) and is_active = true);

create policy works_public_read
on public.works for select to anon, authenticated
using (true);
create policy works_admin_insert
on public.works for insert to authenticated
with check (
  exists (
    select 1 from public.admin_users admin
    where admin.user_id = (select auth.uid()) and admin.is_active = true
  )
);
create policy works_admin_update
on public.works for update to authenticated
using (
  exists (
    select 1 from public.admin_users admin
    where admin.user_id = (select auth.uid()) and admin.is_active = true
  )
)
with check (
  exists (
    select 1 from public.admin_users admin
    where admin.user_id = (select auth.uid()) and admin.is_active = true
  )
);
create policy works_admin_delete
on public.works for delete to authenticated
using (
  exists (
    select 1 from public.admin_users admin
    where admin.user_id = (select auth.uid()) and admin.is_active = true
  )
);

create policy work_images_public_read
on public.work_images for select to anon, authenticated
using (true);
create policy work_images_admin_insert
on public.work_images for insert to authenticated
with check (
  exists (
    select 1 from public.admin_users admin
    where admin.user_id = (select auth.uid()) and admin.is_active = true
  )
);
create policy work_images_admin_update
on public.work_images for update to authenticated
using (
  exists (
    select 1 from public.admin_users admin
    where admin.user_id = (select auth.uid()) and admin.is_active = true
  )
)
with check (
  exists (
    select 1 from public.admin_users admin
    where admin.user_id = (select auth.uid()) and admin.is_active = true
  )
);
create policy work_images_admin_delete
on public.work_images for delete to authenticated
using (
  exists (
    select 1 from public.admin_users admin
    where admin.user_id = (select auth.uid()) and admin.is_active = true
  )
);

create policy reviews_public_read
on public.reviews for select to anon, authenticated
using (true);
create policy reviews_admin_insert
on public.reviews for insert to authenticated
with check (
  exists (
    select 1 from public.admin_users admin
    where admin.user_id = (select auth.uid()) and admin.is_active = true
  )
);
create policy reviews_admin_update
on public.reviews for update to authenticated
using (
  exists (
    select 1 from public.admin_users admin
    where admin.user_id = (select auth.uid()) and admin.is_active = true
  )
)
with check (
  exists (
    select 1 from public.admin_users admin
    where admin.user_id = (select auth.uid()) and admin.is_active = true
  )
);
create policy reviews_admin_delete
on public.reviews for delete to authenticated
using (
  exists (
    select 1 from public.admin_users admin
    where admin.user_id = (select auth.uid()) and admin.is_active = true
  )
);

create policy site_settings_public_read
on public.site_settings for select to anon, authenticated
using (true);
create policy site_settings_admin_insert
on public.site_settings for insert to authenticated
with check (
  id = 1 and exists (
    select 1 from public.admin_users admin
    where admin.user_id = (select auth.uid()) and admin.is_active = true
  )
);
create policy site_settings_admin_update
on public.site_settings for update to authenticated
using (
  id = 1 and exists (
    select 1 from public.admin_users admin
    where admin.user_id = (select auth.uid()) and admin.is_active = true
  )
)
with check (
  id = 1 and exists (
    select 1 from public.admin_users admin
    where admin.user_id = (select auth.uid()) and admin.is_active = true
  )
);

create policy queries_public_insert
on public.queries for insert to anon, authenticated
with check (
  btrim(name) <> ''
  and btrim(phone) <> ''
  and char_length(message) <= 4000
);
create policy queries_admin_read
on public.queries for select to authenticated
using (
  exists (
    select 1 from public.admin_users admin
    where admin.user_id = (select auth.uid()) and admin.is_active = true
  )
);

create policy estimate_requests_public_insert
on public.estimate_requests for insert to anon, authenticated
with check (
  btrim(name) <> ''
  and btrim(phone) <> ''
  and btrim(location) <> ''
  and char_length(message) <= 4000
);
create policy estimate_requests_admin_read
on public.estimate_requests for select to authenticated
using (
  exists (
    select 1 from public.admin_users admin
    where admin.user_id = (select auth.uid()) and admin.is_active = true
  )
);

-- Data API grants are explicit because new Supabase projects no longer expose
-- new public tables automatically.
revoke all on table public.admin_users, public.works, public.work_images,
  public.reviews, public.site_settings, public.queries,
  public.estimate_requests from anon, authenticated;

grant select on table public.works, public.work_images, public.reviews,
  public.site_settings to anon, authenticated;
grant select on table public.admin_users to authenticated;
grant insert, update, delete on table public.works, public.work_images,
  public.reviews to authenticated;
grant insert, update on table public.site_settings to authenticated;
grant insert on table public.queries, public.estimate_requests
  to anon, authenticated;
grant select on table public.queries, public.estimate_requests
  to authenticated;

do $$
declare
  sequence_name text;
  grantee_list text;
begin
  foreach sequence_name in array array[
    'works_id_seq',
    'work_images_id_seq',
    'reviews_id_seq',
    'queries_id_seq',
    'estimate_requests_id_seq'
  ]
  loop
    if to_regclass('public.' || sequence_name) is not null then
      execute format(
        'revoke all on sequence public.%I from anon, authenticated',
        sequence_name
      );

      grantee_list := case
        when sequence_name in ('queries_id_seq', 'estimate_requests_id_seq')
          then 'anon, authenticated'
        else 'authenticated'
      end;

      execute format(
        'grant usage, select on sequence public.%I to %s',
        sequence_name,
        grantee_list
      );
    end if;
  end loop;
end
$$;

notify pgrst, 'reload schema';

commit;
