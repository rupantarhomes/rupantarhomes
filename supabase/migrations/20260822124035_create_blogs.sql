create table public.blogs (
  id bigint generated always as identity primary key, title text not null, slug text not null, body text not null, category text not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint blogs_title_not_blank check (btrim(title) <> ''), constraint blogs_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'), constraint blogs_slug_key unique (slug),
  constraint blogs_category_allowed check (category in ('architecture', 'interior-design', 'home-construction')), constraint blogs_body_not_blank check (btrim(body) <> ''), constraint blogs_body_word_limit check (cardinality(regexp_split_to_array(btrim(body), E'\\s+')) <= 1200)
);
alter table public.blogs enable row level security;
create policy blogs_public_read on public.blogs for select to anon, authenticated using (true);
create policy blogs_admin_insert on public.blogs for insert to authenticated with check (exists (select 1 from public.admin_users admin where admin.user_id = (select auth.uid()) and admin.is_active = true));
create policy blogs_admin_update on public.blogs for update to authenticated using (exists (select 1 from public.admin_users admin where admin.user_id = (select auth.uid()) and admin.is_active = true)) with check (exists (select 1 from public.admin_users admin where admin.user_id = (select auth.uid()) and admin.is_active = true));
create policy blogs_admin_delete on public.blogs for delete to authenticated using (exists (select 1 from public.admin_users admin where admin.user_id = (select auth.uid()) and admin.is_active = true));
revoke all on table public.blogs from anon, authenticated;
grant select on table public.blogs to anon, authenticated;
grant insert, update, delete on table public.blogs to authenticated;
