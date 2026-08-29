begin;

-- Recent Works is a six-item featured queue. Featuring a seventh work keeps the
-- six newest featured works and only removes Featured status from older ones.
-- No work rows or images are deleted.
create or replace function public.enforce_home_featured_work_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if new.featured is not true then
    return new;
  end if;

  -- Serialize featured-queue changes so concurrent admin saves cannot leave
  -- more than six featured works.
  perform pg_advisory_xact_lock(hashtext('rupantar_home_featured_queue')::bigint);

  update public.works
  set featured = false
  where id in (
    select work.id
    from public.works as work
    where work.featured = true
    order by work.created_at desc, work.id desc
    offset 6
  );

  return new;
end;
$function$;

drop trigger if exists enforce_home_featured_work_limit on public.works;
create trigger enforce_home_featured_work_limit
after insert or update of featured on public.works
for each row
when (new.featured = true)
execute function public.enforce_home_featured_work_limit();

-- Normalize pre-existing data without touching the normal Works listing.
with ranked_featured as (
  select
    work.id,
    row_number() over (order by work.created_at desc, work.id desc) as featured_rank
  from public.works as work
  where work.featured = true
)
update public.works as work
set featured = false
from ranked_featured as ranked
where work.id = ranked.id
  and ranked.featured_rank > 6;

revoke all on function public.enforce_home_featured_work_limit()
from public, anon, authenticated, service_role;

commit;
