create table if not exists public.admins (
  email text primary key check (email = lower(email))
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  nome_pt text not null check (char_length(nome_pt) between 1 and 40),
  nome_en text not null default '' check (char_length(nome_en) <= 40),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  ordem integer not null default 0,
  formato text not null default 'horizontal' check (formato in ('horizontal', 'vertical'))
);

create table if not exists public.longform_filters (
  id uuid primary key default gen_random_uuid(),
  nome_pt text not null check (char_length(nome_pt) between 1 and 30),
  nome_en text not null default '' check (char_length(nome_en) <= 30),
  ordem integer not null default 0
);

create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null check (char_length(titulo) between 1 and 120),
  descricao_pt text not null default '' check (char_length(descricao_pt) <= 160),
  descricao_en text not null default '' check (char_length(descricao_en) <= 160),
  youtube_id text not null check (youtube_id ~ '^[A-Za-z0-9_-]{11}$'),
  preview_url text not null default '' check (preview_url = '' or preview_url ~* '^https://'),
  poster_url text not null default '' check (poster_url = '' or poster_url ~* '^https://'),
  category_id uuid not null references public.categories (id) on delete cascade,
  filter_id uuid references public.longform_filters (id) on delete set null,
  destaque boolean not null default false,
  ordem integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists videos_category_idx on public.videos (category_id);
create index if not exists videos_ordem_idx on public.videos (ordem);
create index if not exists videos_destaque_idx on public.videos (destaque) where destaque;

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(nome) between 1 and 60),
  canal_url text not null default '' check (canal_url = '' or canal_url ~* '^https?://'),
  foto_url text not null default '' check (foto_url = '' or foto_url ~* '^https://'),
  ordem integer not null default 0
);

create table if not exists public.settings (
  id smallint primary key default 1 check (id = 1),
  nome text not null default 'DECXZ' check (char_length(nome) between 1 and 40),
  email text not null default '',
  foto_url text not null default '' check (foto_url = '' or foto_url ~* '^https://'),
  sobre_pt text not null default '' check (char_length(sobre_pt) <= 2000),
  sobre_en text not null default '' check (char_length(sobre_en) <= 2000),
  redes jsonb not null default '{}'::jsonb check (jsonb_typeof(redes) = 'object'),
  discord_nick text not null default '' check (char_length(discord_nick) <= 40),
  comissoes_abertas boolean not null default true
);

create or replace function public.redes_validas(redes jsonb)
returns boolean
language sql
immutable
set search_path = public
as $$
  select jsonb_typeof(redes) = 'object'
    and not exists (
      select 1 from jsonb_each(redes) as r(chave, valor)
      where jsonb_typeof(r.valor) <> 'string'
        or not (r.valor #>> '{}' = '' or (r.valor #>> '{}') ~* '^https://')
    );
$$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'settings_redes_https') then
    alter table public.settings add constraint settings_redes_https check (public.redes_validas(redes));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'settings_email_valido') then
    alter table public.settings add constraint settings_email_valido check (email = '' or email ~* '^[^@\s<>"]+@[^@\s<>"]+\.[^@\s<>"]+$');
  end if;
end;
$$;

create or replace function public.eh_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins
    where email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

revoke all on function public.eh_admin() from public;
grant execute on function public.eh_admin() to anon, authenticated;

alter table public.admins enable row level security;
alter table public.categories enable row level security;
alter table public.longform_filters enable row level security;
alter table public.videos enable row level security;
alter table public.clients enable row level security;
alter table public.settings enable row level security;

drop policy if exists "admin ve o proprio email" on public.admins;
create policy "admin ve o proprio email" on public.admins
  for select to authenticated
  using (email = lower(coalesce(auth.jwt() ->> 'email', '')));

do $$
declare
  tabela text;
begin
  foreach tabela in array array['categories', 'longform_filters', 'videos', 'clients', 'settings'] loop
    execute format('drop policy if exists "leitura publica" on public.%I', tabela);
    execute format('create policy "leitura publica" on public.%I for select to anon, authenticated using (true)', tabela);
    execute format('drop policy if exists "admin insere" on public.%I', tabela);
    execute format('create policy "admin insere" on public.%I for insert to authenticated with check (public.eh_admin())', tabela);
    execute format('drop policy if exists "admin altera" on public.%I', tabela);
    execute format('create policy "admin altera" on public.%I for update to authenticated using (public.eh_admin()) with check (public.eh_admin())', tabela);
    execute format('drop policy if exists "admin exclui" on public.%I', tabela);
    execute format('create policy "admin exclui" on public.%I for delete to authenticated using (public.eh_admin())', tabela);
  end loop;
end
$$;

revoke all on public.admins from anon;
grant select on public.categories, public.longform_filters, public.videos, public.clients, public.settings to anon;
grant select, insert, update, delete on public.categories, public.longform_filters, public.videos, public.clients, public.settings to authenticated;
grant select on public.admins to authenticated;

create or replace function public.reordenar(tabela text, ids uuid[])
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not public.eh_admin() then
    raise exception 'sem permissao' using errcode = '42501';
  end if;
  if tabela not in ('categories', 'longform_filters', 'videos', 'clients') then
    raise exception 'tabela invalida' using errcode = '22023';
  end if;
  execute format(
    'update public.%I as t set ordem = p.posicao - 1 from unnest($1) with ordinality as p(id, posicao) where t.id = p.id',
    tabela
  ) using ids;
end;
$$;

revoke all on function public.reordenar(text, uuid[]) from public, anon;
grant execute on function public.reordenar(text, uuid[]) to authenticated;

insert into public.settings (id) values (1) on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('midia', 'midia', true, 15728640, array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'video/mp4', 'video/webm'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "midia: leitura publica" on storage.objects;
create policy "midia: leitura publica" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'midia');

drop policy if exists "midia: admin envia" on storage.objects;
create policy "midia: admin envia" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'midia' and public.eh_admin());

drop policy if exists "midia: admin altera" on storage.objects;
create policy "midia: admin altera" on storage.objects
  for update to authenticated
  using (bucket_id = 'midia' and public.eh_admin());

drop policy if exists "midia: admin apaga" on storage.objects;
create policy "midia: admin apaga" on storage.objects
  for delete to authenticated
  using (bucket_id = 'midia' and public.eh_admin());
