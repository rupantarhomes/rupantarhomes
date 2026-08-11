create or replace function public.copy_query_to_lead()
returns trigger
language plpgsql
set search_path to ''
as $function$
begin
  insert into public.leads (
    name,
    phone,
    service_required,
    message,
    reference_image_url,
    reference_image_public_id,
    status
  ) values (
    new.name,
    new.phone,
    new.category,
    new.message,
    new.attachment_url,
    new.attachment_public_id,
    'new'
  );
  return new;
end;
$function$;

drop trigger if exists query_create_lead on public.queries;
create trigger query_create_lead
after insert on public.queries
for each row execute function public.copy_query_to_lead();
