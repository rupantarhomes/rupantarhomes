begin;

-- Expand the canonical Work image limit from three to six while preserving the
-- existing Admin authorization, category validation, Cloudinary cleanup locks,
-- persistence behavior, and project Blog URL normalization.
create or replace function public.save_work_with_images(
  p_title text,
  p_slug text,
  p_category text,
  p_location text,
  p_short_description text,
  p_long_description text,
  p_featured boolean,
  p_blog_url text,
  p_images jsonb,
  p_work_id bigint default null
)
returns bigint
language plpgsql
security definer
set search_path to ''
as $function$
declare
  saved_work_id bigint;
  normalized_images jsonb := coalesce(p_images, '[]'::jsonb);
  clean_category text := case
    when btrim(coalesce(p_category, '')) = 'interior-designing' then 'architect'
    else btrim(coalesce(p_category, ''))
  end;
  clean_blog_url text := nullif(btrim(coalesce(p_blog_url, '')), '');
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
    'false-ceiling','parqueting','railing','home-construction','interior'
  ) then
    raise exception using errcode = '22023', message = 'Invalid category.';
  end if;
  if clean_blog_url is not null then
    if length(clean_blog_url) > 2048 or clean_blog_url !~ '^https://[^[:space:]]+$' then
      raise exception using errcode = '22023', message = 'Project blog URL must be a complete HTTPS URL.';
    end if;
  end if;

  if jsonb_typeof(normalized_images) <> 'array' then
    raise exception using errcode = '22023', message = 'Work images must be an array.';
  end if;
  if jsonb_array_length(normalized_images) > 6 then
    raise exception using errcode = '22023', message = 'A work can contain at most six images.';
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
      long_description, featured, blog_url, updated_at
    ) values (
      btrim(p_title), btrim(p_slug), clean_category, btrim(p_location),
      btrim(p_short_description), btrim(p_long_description),
      coalesce(p_featured, false), clean_blog_url, now()
    ) returning id into saved_work_id;
  else
    update public.works
    set title = btrim(p_title),
        slug = btrim(p_slug),
        category = clean_category,
        location = btrim(p_location),
        short_description = btrim(p_short_description),
        long_description = btrim(p_long_description),
        featured = coalesce(p_featured, false),
        blog_url = clean_blog_url,
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
  select saved_work_id,
    btrim(image.cloudinary_public_id),
    btrim(image.secure_url),
    coalesce(nullif(btrim(image.alt_text), ''), btrim(p_title)),
    case lower(btrim(coalesce(image.format, 'webp')))
      when 'jpeg' then 'jpg'
      else lower(btrim(coalesce(image.format, 'webp')))
    end,
    image.width,
    image.height,
    image.byte_size,
    (item.ordinality - 1)::integer
  from jsonb_array_elements(normalized_images) with ordinality as item(value, ordinality)
  cross join lateral jsonb_to_record(item.value) as image(
    cloudinary_public_id text,
    secure_url text,
    alt_text text,
    format text,
    width integer,
    height integer,
    byte_size integer
  );

  return saved_work_id;
end;
$function$;

revoke all on function public.save_work_with_images(
  text, text, text, text, text, text, boolean, text, jsonb, bigint
) from public, anon;
grant execute on function public.save_work_with_images(
  text, text, text, text, text, text, boolean, text, jsonb, bigint
) to authenticated;

notify pgrst, 'reload schema';

commit;
