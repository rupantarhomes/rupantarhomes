-- Public forms call the Pages backend, which calls the Edge Function. Only the
-- Edge Function's managed service credential may invoke this SECURITY DEFINER RPC.
revoke all on function public.submit_public_inquiry(text, text, text, text, text, text, text, text, text, text) from public;
revoke execute on function public.submit_public_inquiry(text, text, text, text, text, text, text, text, text, text) from anon, authenticated;
grant execute on function public.submit_public_inquiry(text, text, text, text, text, text, text, text, text, text) to service_role;

