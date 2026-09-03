begin;

-- Abandoned Work uploads are reclaimed conservatively. A seven-day minimum
-- gives editors ample time to return to an unfinished draft while still
-- preventing permanent Cloudinary orphan growth after a tab/browser loss.
create or replace function public.claim_expired_cloudinary_drafts(
  p_min_age_minutes integer default 10080,
  p_limit integer default 50
)
returns text[]
language plpgsql
security definer
set search_path to ''
as $function$
declare
  claimed_ids text[];
  safe_min_age integer := greatest(coalesce(p_min_age_minutes, 10080), 10080);
  safe_limit integer := least(greatest(coalesce(p_limit, 50), 1), 100);
begin
  if auth.uid() is null or not exists (
    select 1
    from public.admin_users
    where user_id = auth.uid() and is_active = true
  ) then
    raise exception 'Unauthorized';
  end if;

  -- Anything that has become a saved Work image is no longer a draft.
  delete from public.cloudinary_draft_assets d
  where exists (
    select 1
    from public.work_images wi
    where wi.cloudinary_public_id = d.public_id
  );

  with candidates as (
    select d.public_id
    from public.cloudinary_draft_assets d
    where d.created_at < now() - make_interval(mins => safe_min_age)
      and (
        d.cleanup_claimed_at is null
        or d.cleanup_claimed_at < now() - interval '15 minutes'
      )
      and not exists (
        select 1
        from public.work_images wi
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

revoke all on function public.claim_expired_cloudinary_drafts(integer, integer)
  from public, anon;
grant execute on function public.claim_expired_cloudinary_drafts(integer, integer)
  to authenticated;

notify pgrst, 'reload schema';

commit;
