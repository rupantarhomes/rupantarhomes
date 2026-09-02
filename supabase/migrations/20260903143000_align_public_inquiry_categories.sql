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

notify pgrst, 'reload schema';

commit;
