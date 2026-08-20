begin;

-- Cloudinary is external to the database, so cleanup needs a durable database
-- claim. A claimed public ID is known to be unreferenced at claim time and may
-- never be attached to a work again. This closes the save/cleanup race.
create table if not exists public.cloudinary_cleanup_claims (
  cloudinary_public_id text primary key,
  claimed_at timestamptz not null default now(),
  constraint cloudinary_cleanup_claims_public_id_not_blank
    check (btrim(cloudinary_public_id) <> '')
);

alter table public.cloudinary_cleanup_claims enable row level security;
revoke all on table public.cloudinary_cleanup_claims from public, anon, authenticated, service_role;

create or replace function public.claim_unreferenced_cloudinary_images(p_public_ids text[])
returns text[]
language plpgsql
security definer
set search_path = ''
as $function$
declare
  candidate_id text;
  claimed_ids text[] := array[]::text[];
begin
  if auth.uid() is null or not exists (
    select 1 from public.admin_users admin
    where admin.user_id = auth.uid() and admin.is_active = true
  ) then
    raise exception using errcode = '42501', message = 'Admin authorization required.';
  end if;

  if coalesce(array_length(p_public_ids, 1), 0) > 20 then
    raise exception using errcode = '22023', message = 'Provide at most 20 image IDs.';
  end if;

  for candidate_id in
    select distinct btrim(value)
    from unnest(coalesce(p_public_ids, array[]::text[])) as public_id(value)
    where btrim(value) <> '' and length(btrim(value)) <= 255
    order by 1
  loop
    -- save_work_with_images takes the same transaction-scoped advisory lock
    -- before accepting an image ID, so a stale save and cleanup serialize.
    perform pg_advisory_xact_lock(hashtext(candidate_id)::bigint);

    if exists (
      select 1 from public.work_images image
      where image.cloudinary_public_id = candidate_id
    ) then
      continue;
    end if;

    insert into public.cloudinary_cleanup_claims (cloudinary_public_id)
    values (candidate_id)
    on conflict (cloudinary_public_id) do nothing;

    claimed_ids := array_append(claimed_ids, candidate_id);
  end loop;

  return claimed_ids;
end;
$function$;

create or replace function public.save_work_with_images(
  p_title text,
  p_slug text,
  p_category text,
  p_location text,
  p_short_description text,
  p_long_description text,
  p_featured boolean,
  p_images jsonb,
  p_work_id bigint default null
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $function$
declare
  saved_work_id bigint;
  normalized_images jsonb := coalesce(p_images, '[]'::jsonb);
  clean_category text := case
    when btrim(coalesce(p_category, '')) = 'interior-designing' then 'architect'
    else btrim(coalesce(p_category, ''))
  end;
  image_public_id text;
begin
  if auth.uid() is null or not exists (
    select 1 from public.admin_users admin
    where admin.user_id = auth.uid() and admin.is_active = true
  ) then
    raise exception using errcode = '42501', message = 'Admin authorization required.';
  end if;
  if btrim(coalesce(p_title, '')) = '' then
    raise exception using errcode = '22023', message = 'Work title is required.';
  end if;
  if btrim(coalesce(p_slug, '')) = '' then
    raise exception using errcode = '22023', message = 'Work slug is required.';
  end if;
  if clean_category not in (
    'architect','modular-kitchen','tv-cabinet','wardrobe','hydraulic-bed',
    'false-ceiling','parqueting','railing','home-construction'
  ) then
    raise exception using errcode = '22023', message = 'Invalid category.';
  end if;
  if jsonb_typeof(normalized_images) <> 'array' then
    raise exception using errcode = '22023', message = 'Work images must be an array.';
  end if;
  if jsonb_array_length(normalized_images) > 3 then
    raise exception using errcode = '22023', message = 'A work can contain at most three images.';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(normalized_images) as item(value)
    where jsonb_typeof(item.value) <> 'object'
  ) then
    raise exception using errcode = '22023', message = 'Every work image must be an object.';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(normalized_images) as item(value)
    cross join lateral jsonb_to_record(item.value) as image(format text)
    where coalesce(nullif(lower(btrim(image.format)), ''), 'webp') not in ('jpg', 'jpeg', 'png', 'webp')
  ) then
    raise exception using errcode = '22023', message = 'Work images must use JPG, PNG, or WebP.';
  end if;

  -- Lock every requested ID in a stable order before changing the work. If a
  -- concurrent cleanup has already claimed one, this stale save is rejected.
  for image_public_id in
    select distinct btrim(image.cloudinary_public_id)
    from jsonb_array_elements(normalized_images) as item(value)
    cross join lateral jsonb_to_record(item.value) as image(cloudinary_public_id text)
    where btrim(coalesce(image.cloudinary_public_id, '')) <> ''
    order by 1
  loop
    perform pg_advisory_xact_lock(hashtext(image_public_id)::bigint);
    if exists (
      select 1 from public.cloudinary_cleanup_claims claim
      where claim.cloudinary_public_id = image_public_id
    ) then
      raise exception using errcode = '23514', message = 'An image is pending cleanup. Upload it again before saving.';
    end if;
  end loop;

  if p_work_id is null then
    insert into public.works (
      title, slug, category, location, short_description,
      long_description, featured, updated_at
    ) values (
      btrim(p_title), btrim(p_slug), clean_category, btrim(p_location),
      btrim(p_short_description), btrim(p_long_description),
      coalesce(p_featured, false), now()
    ) returning id into saved_work_id;
  else
    update public.works
    set title = btrim(p_title), slug = btrim(p_slug), category = clean_category,
        location = btrim(p_location), short_description = btrim(p_short_description),
        long_description = btrim(p_long_description), featured = coalesce(p_featured, false),
        updated_at = now()
    where id = p_work_id
    returning id into saved_work_id;
    if saved_work_id is null then
      raise exception using errcode = 'P0002', message = 'Work was not found.';
    end if;
  end if;

  delete from public.work_images where work_id = saved_work_id;
  insert into public.work_images (
    work_id, cloudinary_public_id, secure_url, alt_text, format,
    width, height, byte_size, sort_order
  )
  select saved_work_id, btrim(image.cloudinary_public_id), btrim(image.secure_url),
    coalesce(nullif(btrim(image.alt_text), ''), btrim(p_title)),
    case lower(btrim(coalesce(image.format, 'webp')))
      when 'jpeg' then 'jpg'
      else lower(btrim(coalesce(image.format, 'webp')))
    end,
    image.width, image.height, image.byte_size, (item.ordinality - 1)::integer
  from jsonb_array_elements(normalized_images) with ordinality as item(value, ordinality)
  cross join lateral jsonb_to_record(item.value) as image(
    cloudinary_public_id text, secure_url text, alt_text text, format text,
    width integer, height integer, byte_size integer
  );
  return saved_work_id;
end;
$function$;

-- Lock the work before reading image IDs so a concurrent save cannot replace
-- them between selection and the deletion that triggers Cloudinary cleanup.
create or replace function public.delete_work_with_images(p_work_id bigint)
returns text[]
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  deleted_work_id bigint;
  deleted_public_ids text[];
begin
  perform 1
  from public.works
  where id = p_work_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Work was not found or is not deletable.';
  end if;

  select coalesce(
    array_agg(image.cloudinary_public_id order by image.sort_order, image.id),
    array[]::text[]
  )
  into deleted_public_ids
  from public.work_images as image
  where image.work_id = p_work_id;

  delete from public.works
  where id = p_work_id
  returning id into deleted_work_id;

  if deleted_work_id is null then
    raise exception using errcode = 'P0002', message = 'Work was not found or is not deletable.';
  end if;

  return deleted_public_ids;
end;
$function$;

revoke all on function public.claim_unreferenced_cloudinary_images(text[])
from public, anon, authenticated, service_role;
grant execute on function public.claim_unreferenced_cloudinary_images(text[])
to authenticated;

revoke all on function public.save_work_with_images(
  text, text, text, text, text, text, boolean, jsonb, bigint
) from public, anon, authenticated, service_role;
grant execute on function public.save_work_with_images(
  text, text, text, text, text, text, boolean, jsonb, bigint
) to authenticated;

revoke all on function public.delete_work_with_images(bigint)
from public, anon, authenticated, service_role;
grant execute on function public.delete_work_with_images(bigint)
to authenticated;

notify pgrst, 'reload schema';

commit;

