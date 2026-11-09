import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const ADMIN = 'editor@exemplo.com';
const raiz = new URL('../../supabase/', import.meta.url);
let db;

const AMBIENTE_SUPABASE = `
  create role anon nologin;
  create role authenticated nologin;
  create schema auth;
  create function auth.jwt() returns jsonb language sql stable as
    $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.jwt() to anon, authenticated;
  grant usage on schema public to anon, authenticated;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
`;

async function como(papel, email, fn) {
  await db.exec('reset role');
  await db.query(`select set_config('request.jwt.claims', $1, false)`, [email ? JSON.stringify({ email }) : '']);
  await db.exec(`set role ${papel}`);
  try {
    return await fn();
  } finally {
    await db.exec('reset role');
  }
}

before(async () => {
  db = new PGlite();
  await db.exec(AMBIENTE_SUPABASE);
  const schema = await readFile(new URL('schema.sql', raiz), 'utf8');
  await db.exec(schema);
  await db.exec(schema);
  await db.exec(await readFile(new URL('seed.sql', raiz), 'utf8'));
  await db.query('insert into public.admins (email) values ($1)', [ADMIN]);
});

test('schema roda duas vezes sem erro e o seed carrega os exemplos', async () => {
  const { rows } = await db.query('select count(*)::int as n from public.videos');
  assert.equal(rows[0].n, 12);
  const destaques = await db.query('select count(*)::int as n from public.videos where destaque');
  assert.equal(destaques.rows[0].n, 4);
});

test('visitante lê o conteúdo público', async () => {
  const linhas = await como('anon', null, () => db.query('select titulo from public.videos'));
  assert.equal(linhas.rows.length, 12);
});

test('visitante não vê a tabela de admins nem escreve', async () => {
  await assert.rejects(como('anon', null, () => db.query('select * from public.admins')));
  await assert.rejects(como('anon', null, () => db.query("update public.settings set nome = 'X' where id = 1")));
});

test('usuário logado que não é admin não consegue alterar nada', async () => {
  const resultado = await como('authenticated', 'intruso@exemplo.com', () =>
    db.query("update public.settings set nome = 'HACK' where id = 1 returning id"));
  assert.equal(resultado.rows.length, 0);
  await assert.rejects(como('authenticated', 'intruso@exemplo.com', () =>
    db.query("insert into public.longform_filters (nome_pt) values ('x')")));
  await assert.rejects(como('authenticated', 'intruso@exemplo.com', () =>
    db.query("select public.reordenar('videos', array[]::uuid[])")));
});

test('admin cria vídeo com clipe, reordena, destaca e exclui', async () => {
  await como('authenticated', ADMIN, async () => {
    const cat = await db.query("select id from public.categories where slug = 'motion'");
    const novo = await db.query(
      "insert into public.videos (titulo, youtube_id, preview_url, category_id, ordem) values ('Teste', 'dQw4w9WgXcQ', 'https://exemplo.supabase.co/storage/v1/object/public/midia/previas/a.mp4', $1, -1) returning id",
      [cat.rows[0].id]);
    const id = novo.rows[0].id;
    const todos = await db.query('select id from public.videos order by ordem');
    const ids = todos.rows.map((r) => r.id).reverse();
    await db.query("select public.reordenar('videos', $1::uuid[])", [ids]);
    const primeiro = await db.query('select id from public.videos order by ordem limit 1');
    assert.equal(primeiro.rows[0].id, ids[0]);
    await db.query('update public.videos set destaque = true where id = $1', [id]);
    const d = await db.query('select count(*)::int as n from public.videos where destaque');
    assert.equal(d.rows[0].n, 5);
    await db.query('delete from public.videos where id = $1', [id]);
  });
});

test('admin lê o próprio e-mail na tabela de admins', async () => {
  const r = await como('authenticated', ADMIN, () => db.query('select email from public.admins'));
  assert.deepEqual(r.rows.map((x) => x.email), [ADMIN]);
});

test('link de clipe ou foto precisa ser https', async () => {
  await assert.rejects(como('authenticated', ADMIN, () => db.query("update public.videos set preview_url = 'javascript:alert(1)' where destaque")));
  await assert.rejects(como('authenticated', ADMIN, () => db.query("update public.settings set foto_url = 'http://inseguro.com/a.jpg' where id = 1")));
});

test('redes e e-mail do contato não aceitam link perigoso', async () => {
  await assert.rejects(como('authenticated', ADMIN, () => db.query(`update public.settings set redes = '{"instagram":"javascript:alert(1)"}'::jsonb where id = 1`)));
  await assert.rejects(como('authenticated', ADMIN, () => db.query(`update public.settings set email = 'a@b.com?bcc=<x>' where id = 1`)));
  await como('authenticated', ADMIN, () => db.query(`update public.settings set redes = '{"instagram":"https://instagram.com/x","x":""}'::jsonb, email = 'oi@decxz.com' where id = 1`));
});

test('textos da página: admin muda, visitante lê e o tamanho tem limite', async () => {
  await como('authenticated', ADMIN, () => db.query(`update public.settings set frase_pt = 'que fazem você assistir até o fim.', chamada_pt = 'Bora?' where id = 1`));
  const lido = await como('anon', null, () => db.query('select frase_pt, chamada_pt, selo_pt from public.settings where id = 1'));
  assert.equal(lido.rows[0].frase_pt, 'que fazem você assistir até o fim.');
  assert.equal(lido.rows[0].selo_pt, '');
  await assert.rejects(como('authenticated', ADMIN, () => db.query(`update public.settings set selo_pt = repeat('x', 41) where id = 1`)));
  await assert.rejects(como('anon', null, () => db.query(`update public.settings set frase_pt = 'invasão' where id = 1 returning id`)).then((r) => { if (!r.rows.length) throw new Error('sem permissão'); }));
});

test('rodar o schema de novo não apaga dados nem dá erro', async () => {
  const antes = await db.query('select count(*)::int as n from public.videos');
  await db.exec(await readFile(new URL('schema.sql', raiz), 'utf8'));
  const depois = await db.query('select count(*)::int as n from public.videos');
  assert.equal(depois.rows[0].n, antes.rows[0].n);
});

test('depoimentos: visitante lê, só admin escreve e reordena', async () => {
  const lidos = await como('anon', null, () => db.query('select nome from public.testimonials order by ordem'));
  assert.equal(lidos.rows.length, 3);
  await assert.rejects(como('anon', null, () => db.query("insert into public.testimonials (nome, texto_pt) values ('X', 'Y')")));
  await como('authenticated', ADMIN, async () => {
    const novo = await db.query("insert into public.testimonials (nome, canal, texto_pt) values ('Teste', 'Canal', 'Muito bom') returning id");
    const ids = (await db.query('select id from public.testimonials order by ordem')).rows.map((r) => r.id).reverse();
    await db.query('select public.reordenar($1, $2::uuid[])', ['testimonials', ids]);
    await db.query('delete from public.testimonials where id = $1', [novo.rows[0].id]);
  });
});

test('reordenar recusa tabela fora da lista', async () => {
  await assert.rejects(como('authenticated', ADMIN, () => db.query("select public.reordenar('admins', array[]::uuid[])")));
});

test('excluir categoria leva os vídeos junto e filtro vira nulo', async () => {
  await como('authenticated', ADMIN, async () => {
    const f = await db.query("select id from public.longform_filters where nome_pt = 'Vlog'");
    await db.query('delete from public.longform_filters where id = $1', [f.rows[0].id]);
    const semFiltro = await db.query('select count(*)::int as n from public.videos where filter_id = $1', [f.rows[0].id]);
    assert.equal(semFiltro.rows[0].n, 0);
    const c = await db.query("select id from public.categories where slug = 'vertical'");
    await db.query('delete from public.categories where id = $1', [c.rows[0].id]);
    const restantes = await db.query('select count(*)::int as n from public.videos where category_id = $1', [c.rows[0].id]);
    assert.equal(restantes.rows[0].n, 0);
  });
});

test('vídeo guarda categorias extras com a principal na frente e sem repetir', async () => {
  await como('authenticated', ADMIN, async () => {
    const cats = await db.query("select id, slug from public.categories where slug in ('motion', 'long-form')");
    const motion = cats.rows.find((c) => c.slug === 'motion').id;
    const longa = cats.rows.find((c) => c.slug === 'long-form').id;
    const sem = await db.query("insert into public.videos (titulo, youtube_id, category_id) values ('Só principal', 'dQw4w9WgXcQ', $1) returning category_ids", [motion]);
    assert.deepEqual(sem.rows[0].category_ids, [motion]);
    const com = await db.query("insert into public.videos (titulo, youtube_id, category_id, category_ids) values ('Duas', 'dQw4w9WgXcQ', $1, $2::uuid[]) returning category_ids", [motion, [longa, motion, longa]]);
    assert.deepEqual(com.rows[0].category_ids, [motion, longa]);
    const naLonga = await db.query('select count(*)::int as n from public.videos where category_ids @> array[$1::uuid]', [longa]);
    assert.equal(naLonga.rows[0].n, 5);
    await db.query("delete from public.videos where titulo in ('Só principal', 'Duas')");
  });
});

test('excluir categoria secundária tira ela do vídeo; excluir a principal leva o vídeo', async () => {
  await como('authenticated', ADMIN, async () => {
    const nova = async (slug) => (await db.query('insert into public.categories (nome_pt, slug) values ($1, $1) returning id', [slug])).rows[0].id;
    const principal = await nova('cat-principal');
    const extra = await nova('cat-extra');
    const v = await db.query("insert into public.videos (titulo, youtube_id, category_id, category_ids) values ('Multi', 'dQw4w9WgXcQ', $1, $2::uuid[]) returning id", [principal, [principal, extra]]);
    const id = v.rows[0].id;
    await db.query('delete from public.categories where id = $1', [extra]);
    const depois = await db.query('select category_ids from public.videos where id = $1', [id]);
    assert.deepEqual(depois.rows[0].category_ids, [principal]);
    await db.query('delete from public.categories where id = $1', [principal]);
    const sumiu = await db.query('select count(*)::int as n from public.videos where id = $1', [id]);
    assert.equal(sumiu.rows[0].n, 0);
  });
});

test('migração de categorias roda num banco antigo, preenche category_ids e pode rodar de novo', async () => {
  const antigo = new PGlite();
  await antigo.exec(AMBIENTE_SUPABASE);
  const migracao = await readFile(new URL('migracoes/2026-11-categorias.sql', raiz), 'utf8');
  const schema = await readFile(new URL('schema.sql', raiz), 'utf8');
  assert.ok(schema.includes(migracao));
  await antigo.exec(schema.replace(migracao, ''));
  const cat = await antigo.query("insert into public.categories (nome_pt, slug) values ('Motion', 'motion') returning id");
  await antigo.query("insert into public.videos (titulo, youtube_id, category_id) values ('Velho', 'dQw4w9WgXcQ', $1)", [cat.rows[0].id]);
  await antigo.exec(migracao);
  await antigo.exec(migracao);
  const { rows } = await antigo.query('select category_ids from public.videos');
  assert.deepEqual(rows[0].category_ids, [cat.rows[0].id]);
  await antigo.close();
});
