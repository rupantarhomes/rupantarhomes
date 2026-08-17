begin;

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
    select 1 from jsonb_array_elements(normalized_images) as item(value)
    where jsonb_typeof(item.value) <> 'object'
  ) then
    raise exception using errcode = '22023', message = 'Every work image must be an object.';
  end if;

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
    coalesce(nullif(btrim(image.alt_text), ''), btrim(p_title)), 'webp',
    image.width, image.height, image.byte_size, (item.ordinality - 1)::integer
  from jsonb_array_elements(normalized_images) with ordinality as item(value, ordinality)
  cross join lateral jsonb_to_record(item.value) as image(
    cloudinary_public_id text, secure_url text, alt_text text,
    width integer, height integer, byte_size integer
  );
  return saved_work_id;
end;
$function$;

revoke all on function public.save_work_with_images(
  text, text, text, text, text, text, boolean, jsonb, bigint
) from public, anon, authenticated, service_role;
grant execute on function public.save_work_with_images(
  text, text, text, text, text, text, boolean, jsonb, bigint
) to authenticated;

notify pgrst, 'reload schema';
commit;
