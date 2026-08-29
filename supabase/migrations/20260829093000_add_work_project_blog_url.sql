begin;

alter table public.works
  add column if not exists blog_url text;

alter table public.works
  drop constraint if exists works_blog_url_valid;

alter table public.works
  add constraint works_blog_url_valid
  check (
    blog_url is null
    or (
      length(blog_url) <= 2048
      and blog_url ~ '^https://[^[:space:]]+$'
    )
  );

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
set search_path = ''
as $function$
declare
  saved_work_id bigint;
  clean_blog_url text := nullif(btrim(coalesce(p_blog_url, '')), '');
begin
  if clean_blog_url is not null then
    if length(clean_blog_url) > 2048 or clean_blog_url !~ '^https://[^[:space:]]+$' then
      raise exception using errcode = '22023', message = 'Project blog URL must be a complete HTTPS URL.';
    end if;
  end if;

  saved_work_id := public.save_work_with_images(
    p_title,
    p_slug,
    p_category,
    p_location,
    p_short_description,
    p_long_description,
    p_featured,
    p_images,
    p_work_id
  );

  update public.works
  set blog_url = clean_blog_url,
      updated_at = now()
  where id = saved_work_id;

  return saved_work_id;
end;
$function$;

revoke all on function public.save_work_with_images(
  text, text, text, text, text, text, boolean, text, jsonb, bigint
) from public, anon, authenticated, service_role;

grant execute on function public.save_work_with_images(
  text, text, text, text, text, text, boolean, text, jsonb, bigint
) to authenticated;

notify pgrst, 'reload schema';

commit;
