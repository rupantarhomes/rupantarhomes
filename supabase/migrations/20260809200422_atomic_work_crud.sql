begin;

-- A work and its ordered image rows are one aggregate. Saving them through one
-- RPC keeps create/edit operations atomic: either every row commits, or the
-- entire call rolls back under the caller's existing RLS permissions.
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
security invoker
set search_path = ''
as $function$
declare
  saved_work_id bigint;
  normalized_images jsonb := coalesce(p_images, '[]'::jsonb);
begin
  if btrim(coalesce(p_title, '')) = '' then
    raise exception using errcode = '22023', message = 'Work title is required.';
  end if;
  if btrim(coalesce(p_slug, '')) = '' then
    raise exception using errcode = '22023', message = 'Work slug is required.';
  end if;
  if jsonb_typeof(normalized_images) <> 'array' then
    raise exception using errcode = '22023', message = 'Work images must be an array.';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(normalized_images) as item(value)
    where jsonb_typeof(item.value) <> 'object'
  ) then
    raise exception using errcode = '22023', message = 'Every work image must be an object.';
  end if;

  if p_work_id is null then
    insert into public.works (
      title,
      slug,
      category,
      location,
      short_description,
      long_description,
      featured,
      updated_at
    )
    values (
      btrim(p_title),
      btrim(p_slug),
      btrim(p_category),
      btrim(p_location),
      btrim(p_short_description),
      btrim(p_long_description),
      coalesce(p_featured, false),
      now()
    )
    returning id into saved_work_id;
  else
    update public.works
    set
      title = btrim(p_title),
      slug = btrim(p_slug),
      category = btrim(p_category),
      location = btrim(p_location),
      short_description = btrim(p_short_description),
      long_description = btrim(p_long_description),
      featured = coalesce(p_featured, false),
      updated_at = now()
    where id = p_work_id
    returning id into saved_work_id;

    if saved_work_id is null then
      raise exception using errcode = 'P0002', message = 'Work was not found or is not writable.';
    end if;
  end if;

  delete from public.work_images
  where work_id = saved_work_id;

  insert into public.work_images (
    work_id,
    cloudinary_public_id,
    secure_url,
    alt_text,
    format,
    width,
    height,
    byte_size,
    sort_order
  )
  select
    saved_work_id,
    btrim(image.cloudinary_public_id),
    btrim(image.secure_url),
    coalesce(nullif(btrim(image.alt_text), ''), btrim(p_title)),
    'webp',
    image.width,
    image.height,
    image.byte_size,
    (item.ordinality - 1)::integer
  from jsonb_array_elements(normalized_images) with ordinality as item(value, ordinality)
  cross join lateral jsonb_to_record(item.value) as image(
    cloudinary_public_id text,
    secure_url text,
    alt_text text,
    width integer,
    height integer,
    byte_size integer
  );

  return saved_work_id;
end;
$function$;

-- Return the exact Cloudinary IDs owned by the deleted row. The work deletion
-- and ON DELETE CASCADE of work_images commit atomically; external Cloudinary
-- cleanup happens only after this RPC succeeds.
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
