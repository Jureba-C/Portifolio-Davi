alter table public.videos add column if not exists category_ids uuid[] not null default '{}';

create index if not exists videos_category_ids_idx on public.videos using gin (category_ids);

create or replace function public.normalizar_categorias_do_video()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.category_id is distinct from old.category_id and new.category_ids is not distinct from old.category_ids then
    new.category_ids := array_remove(new.category_ids, old.category_id);
  end if;
  new.category_ids := array(
    select c
    from unnest(array[new.category_id] || coalesce(new.category_ids, '{}')) with ordinality as x(c, posicao)
    where c is not null
    group by c
    order by min(posicao)
  );
  return new;
end;
$$;

drop trigger if exists videos_normalizar_categorias on public.videos;
create trigger videos_normalizar_categorias
  before insert or update of category_id, category_ids on public.videos
  for each row execute function public.normalizar_categorias_do_video();

create or replace function public.tirar_categoria_dos_videos()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  update public.videos
    set category_ids = array_remove(category_ids, old.id)
    where category_ids @> array[old.id];
  return old;
end;
$$;

drop trigger if exists categories_tirar_dos_videos on public.categories;
create trigger categories_tirar_dos_videos
  after delete on public.categories
  for each row execute function public.tirar_categoria_dos_videos();

update public.videos set category_ids = array[category_id] where cardinality(category_ids) = 0;
