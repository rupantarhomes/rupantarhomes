begin;

-- Keep the public inquiry contract aligned with the canonical ten service
-- categories exposed by the application. This is additive: no existing
-- category is removed or remapped.
alter table public.queries
  drop constraint if exists queries_category_allowed;

alter table public.queries
  add constraint queries_category_allowed check (
    category = any (array[
      'architect', 'modular-kitchen', 'tv-cabinet', 'wardrobe',
      'hydraulic-bed', 'false-ceiling', 'parqueting', 'railing',
      'home-construction', 'interior'
    ])
  );

alter table public.estimate_requests
  drop constraint if exists estimate_requests_category_allowed;

alter table public.estimate_requests
  add constraint estimate_requests_category_allowed check (
    category = any (array[
      'architect', 'modular-kitchen', 'tv-cabinet', 'wardrobe',
      'hydraulic-bed', 'false-ceiling', 'parqueting', 'railing',
      'home-construction', 'interior'
    ])
  );

-- A browser retry after a lost HTTP response must not create a second lead.
-- Existing historical rows remain valid with a null submission_id.
alter table public.queries
  add column if not exists submission_id uuid;

alter table public.estimate_requests
  add column if not exists submission_id uuid;

create unique index if not exists queries_submission_id_unique
  on public.queries (submission_id)
  where submission_id is not null;

create unique index if not exists estimate_requests_submission_id_unique
  on public.estimate_requests (submission_id)
  where submission_id is not null;

-- Track Admin Work assets from the moment an upload is authorized so a tab
-- crash cannot leave an invisible permanent Cloudinary draft. This table is
-- accessible only through the Admin-only SECURITY DEFINER functions below.
create table if not exists public.cloudinary_draft_assets (
  public_id text primary key,
  created_at timestamptz not null default now(),
  cleanup_claimed_at timestamptz,
  constraint cloudinary_draft_assets_public_id_allowed check (
    public_id ~ '^rupantar-homes/works/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  )
);

alter table public.cloudinary_draft_assets enable row level security;
revoke all on table public.cloudinary_draft_assets from public, anon, authenticated;

create or replace function public.register_cloudinary_draft_image(p_public_id text)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if auth.uid() is null or not exists (
    select 1
    from public.admin_users
    where user_id = auth.uid() and is_active = true
  ) then
    raise exception 'Unauthorized';
  end if;

  if btrim(coalesce(p_public_id, '')) !~ '^rupantar-homes/works/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    raise exception 'Invalid Cloudinary draft image ID.';
  end if;

  insert into public.cloudinary_draft_assets (public_id, created_at, cleanup_claimed_at)
  values (btrim(p_public_id), now(), null)
  on conflict (public_id) do update
    set created_at = excluded.created_at,
        cleanup_claimed_at = null;
end;
$function$;

create or replace function public.claim_expired_cloudinary_drafts(
  p_min_age_minutes integer default 1440,
  p_limit integer default 50
)
returns text[]
language plpgsql
security definer
set search_path to ''
as $function$
declare
  claimed_ids text[];
  safe_min_age integer := greatest(coalesce(p_min_age_minutes, 1440), 60);
  safe_limit integer := least(greatest(coalesce(p_limit, 50), 1), 100);
begin
  if auth.uid() is null or not exists (
    select 1
    from public.admin_users
    where user_id = auth.uid() and is_active = true
  ) then
    raise exception 'Unauthorized';
  end if;

  delete from public.cloudinary_draft_assets d
  where exists (
    select 1 from public.work_images wi
    where wi.cloudinary_public_id = d.public_id
  );

  with candidates as (
    select d.public_id
    from public.cloudinary_draft_assets d
    where d.created_at < now() - make_interval(mins => safe_min_age)
      and (d.cleanup_claimed_at is null or d.cleanup_claimed_at < now() - interval '15 minutes')
      and not exists (
        select 1 from public.work_images wi
        where wi.cloudinary_public_id = d.public_id
      )
    order by d.created_at asc
    limit safe_limit
    for update skip locked
  ), claimed as (
    update public.cloudinary_draft_assets d
    set cleanup_claimed_at = now()
    from candidates c
    where d.public_id = c.public_id
    returning d.public_id
  )
  select coalesce(array_agg(public_id), array[]::text[])
  into claimed_ids
  from claimed;

  return claimed_ids;
end;
$function$;

create or replace function public.complete_cloudinary_draft_cleanup(p_public_ids text[])
returns void
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if auth.uid() is null or not exists (
    select 1
    from public.admin_users
    where user_id = auth.uid() and is_active = true
  ) then
    raise exception 'Unauthorized';
  end if;

  delete from public.cloudinary_draft_assets
  where public_id = any(coalesce(p_public_ids, array[]::text[]));
end;
$function$;

revoke all on function public.register_cloudinary_draft_image(text) from public, anon;
revoke all on function public.claim_expired_cloudinary_drafts(integer, integer) from public, anon;
revoke all on function public.complete_cloudinary_draft_cleanup(text[]) from public, anon;
grant execute on function public.register_cloudinary_draft_image(text) to authenticated;
grant execute on function public.claim_expired_cloudinary_drafts(integer, integer) to authenticated;
grant execute on function public.complete_cloudinary_draft_cleanup(text[]) to authenticated;

-- Upgrade the currently deployed ten-argument caller too. This closes the
-- category mismatch immediately while keeping the existing production request
-- path valid during the database-first rollout.
create or replace function public.submit_public_inquiry(
  p_kind text,
  p_name text,
  p_phone text,
  p_category text,
  p_message text,
  p_attachment_public_id text default null,
  p_attachment_url text default null,
  p_location text default null,
  p_approximate_size text default null,
  p_material_preference text default null
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  recent_count integer;
  clean_name text := btrim(coalesce(p_name, ''));
  clean_phone text := btrim(coalesce(p_phone, ''));
  clean_category text := case
    when btrim(coalesce(p_category, '')) = 'interior-designing' then 'architect'
    else btrim(coalesce(p_category, ''))
  end;
  clean_message text := btrim(coalesce(p_message, ''));
  clean_public_id text := btrim(coalesce(p_attachment_public_id, ''));
  clean_url text := btrim(coalesce(p_attachment_url, ''));
begin
  if p_kind not in ('query', 'estimate') then
    raise exception 'Invalid request type.';
  end if;
  if clean_name = '' or length(clean_name) > 150 then
    raise exception 'Invalid name.';
  end if;
  if clean_phone = '' or length(clean_phone) > 40 or clean_phone !~ '^[0-9+()\-\s]{5,40}$' then
    raise exception 'Invalid phone.';
  end if;
  if clean_category not in (
    'architect','modular-kitchen','tv-cabinet','wardrobe','hydraulic-bed',
    'false-ceiling','parqueting','railing','home-construction','interior'
  ) then
    raise exception 'Invalid category.';
  end if;
  if clean_message = '' or length(clean_message) > 4000 then
    raise exception 'Invalid message.';
  end if;

  select (
    (select count(*) from public.queries where phone = clean_phone and created_at > now() - interval '1 minute') +
    (select count(*) from public.estimate_requests where phone = clean_phone and created_at > now() - interval '1 minute')
  ) into recent_count;
  if recent_count >= 3 then
    raise exception 'Too many requests. Please wait a minute and try again.';
  end if;

  if p_kind = 'estimate' then
    if btrim(coalesce(p_location, '')) = '' or length(btrim(p_location)) > 200 then
      raise exception 'Invalid location.';
    end if;
    if btrim(coalesce(p_approximate_size, '')) = '' or length(btrim(p_approximate_size)) > 100 then
      raise exception 'Invalid approximate size.';
    end if;
    if btrim(coalesce(p_material_preference, '')) = '' or length(btrim(p_material_preference)) > 200 then
      raise exception 'Invalid material preference.';
    end if;
    if clean_public_id = '' or clean_url = '' then
      raise exception 'Estimate photo is required.';
    end if;
    if not (
      (
        clean_public_id ~ '^rupantar-homes/inquiries/estimate-'
        and clean_url ~ '^https://res\.cloudinary\.com/'
      )
      or
      (
        clean_public_id ~ '^estimate-uploads/estimates/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png)$'
        and clean_url ~ '^https://gmtdqeskyvdvyibccxwt\.supabase\.co/storage/v1/object/public/estimate-uploads/estimates/'
      )
    ) then
      raise exception 'Invalid estimate photo.';
    end if;

    insert into public.estimate_requests (
      name, phone, location, category, approximate_size, material_preference, message,
      attachment_public_id, attachment_url
    ) values (
      clean_name, clean_phone, btrim(p_location), clean_category, btrim(p_approximate_size),
      btrim(p_material_preference), clean_message, clean_public_id, clean_url
    );
  else
    insert into public.queries (
      name, phone, category, message, attachment_public_id, attachment_url
    ) values (
      clean_name, clean_phone, clean_category, clean_message, null, null
    );
  end if;

  return jsonb_build_object('ok', true);
end;
$function$;

revoke all on function public.submit_public_inquiry(
  text, text, text, text, text, text, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.submit_public_inquiry(
  text, text, text, text, text, text, text, text, text, text
) to service_role;

-- Add the idempotent eleven-argument overload alongside the existing caller so
-- database migration and Edge/Cloudflare rollout can happen independently.
create or replace function public.submit_public_inquiry(
  p_kind text,
  p_submission_id text,
  p_name text,
  p_phone text,
  p_category text,
  p_message text,
  p_attachment_public_id text default null,
  p_attachment_url text default null,
  p_location text default null,
  p_approximate_size text default null,
  p_material_preference text default null
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  recent_count integer;
  clean_submission_id uuid;
  clean_name text := btrim(coalesce(p_name, ''));
  clean_phone text := btrim(coalesce(p_phone, ''));
  clean_category text := case
    when btrim(coalesce(p_category, '')) = 'interior-designing' then 'architect'
    else btrim(coalesce(p_category, ''))
  end;
  clean_message text := btrim(coalesce(p_message, ''));
  clean_public_id text := btrim(coalesce(p_attachment_public_id, ''));
  clean_url text := btrim(coalesce(p_attachment_url, ''));
begin
  if p_kind not in ('query', 'estimate') then
    raise exception 'Invalid request type.';
  end if;

  begin
    clean_submission_id := btrim(coalesce(p_submission_id, ''))::uuid;
  exception when invalid_text_representation then
    raise exception 'Invalid submission ID.';
  end;
  if clean_submission_id is null then
    raise exception 'Invalid submission ID.';
  end if;

  if p_kind = 'query' and exists (
    select 1 from public.queries where submission_id = clean_submission_id
  ) then
    return jsonb_build_object('ok', true, 'duplicate', true);
  end if;
  if p_kind = 'estimate' and exists (
    select 1 from public.estimate_requests where submission_id = clean_submission_id
  ) then
    return jsonb_build_object('ok', true, 'duplicate', true);
  end if;

  if clean_name = '' or length(clean_name) > 150 then
    raise exception 'Invalid name.';
  end if;
  if clean_phone = '' or length(clean_phone) > 40 or clean_phone !~ '^[0-9+()\-\s]{5,40}$' then
    raise exception 'Invalid phone.';
  end if;
  if clean_category not in (
    'architect','modular-kitchen','tv-cabinet','wardrobe','hydraulic-bed',
    'false-ceiling','parqueting','railing','home-construction','interior'
  ) then
    raise exception 'Invalid category.';
  end if;
  if clean_message = '' or length(clean_message) > 4000 then
    raise exception 'Invalid message.';
  end if;

  select (
    (select count(*) from public.queries where phone = clean_phone and created_at > now() - interval '1 minute') +
    (select count(*) from public.estimate_requests where phone = clean_phone and created_at > now() - interval '1 minute')
  ) into recent_count;
  if recent_count >= 3 then
    raise exception 'Too many requests. Please wait a minute and try again.';
  end if;

  if p_kind = 'estimate' then
    if btrim(coalesce(p_location, '')) = '' or length(btrim(p_location)) > 200 then
      raise exception 'Invalid location.';
    end if;
    if btrim(coalesce(p_approximate_size, '')) = '' or length(btrim(p_approximate_size)) > 100 then
      raise exception 'Invalid approximate size.';
    end if;
    if btrim(coalesce(p_material_preference, '')) = '' or length(btrim(p_material_preference)) > 200 then
      raise exception 'Invalid material preference.';
    end if;
    if clean_public_id = '' or clean_url = '' then
      raise exception 'Estimate photo is required.';
    end if;
    if not (
      (
        clean_public_id ~ '^rupantar-homes/inquiries/estimate-'
        and clean_url ~ '^https://res\.cloudinary\.com/'
      )
      or
      (
        clean_public_id ~ '^estimate-uploads/estimates/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png)$'
        and clean_url ~ '^https://gmtdqeskyvdvyibccxwt\.supabase\.co/storage/v1/object/public/estimate-uploads/estimates/'
      )
    ) then
      raise exception 'Invalid estimate photo.';
    end if;

    begin
      insert into public.estimate_requests (
        submission_id, name, phone, location, category, approximate_size,
        material_preference, message, attachment_public_id, attachment_url
      ) values (
        clean_submission_id, clean_name, clean_phone, btrim(p_location),
        clean_category, btrim(p_approximate_size), btrim(p_material_preference),
        clean_message, clean_public_id, clean_url
      );
    exception when unique_violation then
      return jsonb_build_object('ok', true, 'duplicate', true);
    end;
  else
    begin
      insert into public.queries (
        submission_id, name, phone, category, message,
        attachment_public_id, attachment_url
      ) values (
        clean_submission_id, clean_name, clean_phone, clean_category,
        clean_message, null, null
      );
    exception when unique_violation then
      return jsonb_build_object('ok', true, 'duplicate', true);
    end;
  end if;

  return jsonb_build_object('ok', true, 'duplicate', false);
end;
$function$;

revoke all on function public.submit_public_inquiry(
  text, text, text, text, text, text, text, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.submit_public_inquiry(
  text, text, text, text, text, text, text, text, text, text, text
) to service_role;

notify pgrst, 'reload schema';

commit;
