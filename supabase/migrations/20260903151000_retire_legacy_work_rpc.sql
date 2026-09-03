begin;

-- Production and the current application both use the p_blog_url overload.
-- Remove the older nine-argument SECURITY DEFINER surface so there is only one
-- canonical Work save RPC to maintain and authorize.
drop function if exists public.save_work_with_images(
  text,
  text,
  text,
  text,
  text,
  text,
  boolean,
  jsonb,
  bigint
);

notify pgrst, 'reload schema';

commit;
