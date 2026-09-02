begin;

alter table public.works
  drop constraint if exists works_category_allowed;

alter table public.works
  add constraint works_category_allowed check (
    category = any (array[
      'architect',
      'modular-kitchen',
      'tv-cabinet',
      'wardrobe',
      'hydraulic-bed',
      'false-ceiling',
      'parqueting',
      'railing',
      'home-construction',
      'interior'
    ])
  );

notify pgrst, 'reload schema';

commit;
