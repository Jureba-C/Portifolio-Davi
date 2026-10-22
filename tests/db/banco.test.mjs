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
  const destaque = await db.query('select video_destaque_id from public.settings where id = 1');
  assert.ok(destaque.rows[0].video_destaque_id);
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

test('admin cria, reordena, destaca e exclui', async () => {
  await como('authenticated', ADMIN, async () => {
    const cat = await db.query("select id from public.categories where slug = 'motion'");
    const novo = await db.query(
      "insert into public.videos (titulo, youtube_id, category_id, ordem) values ('Teste', 'dQw4w9WgXcQ', $1, -1) returning id",
      [cat.rows[0].id]);
    const id = novo.rows[0].id;
    const todos = await db.query('select id from public.videos order by ordem');
    const ids = todos.rows.map((r) => r.id).reverse();
    await db.query("select public.reordenar('videos', $1::uuid[])", [ids]);
    const primeiro = await db.query('select id from public.videos order by ordem limit 1');
    assert.equal(primeiro.rows[0].id, ids[0]);
    await db.query('select public.definir_destaque($1)', [id]);
    const s = await db.query('select video_destaque_id from public.settings');
    assert.equal(s.rows[0].video_destaque_id, id);
    await db.query('select public.definir_destaque(null)');
    const nenhum = await db.query('select count(*)::int as n from public.videos where destaque');
    assert.equal(nenhum.rows[0].n, 0);
    await db.query('delete from public.videos where id = $1', [id]);
  });
});

test('admin lê o próprio e-mail na tabela de admins', async () => {
  const r = await como('authenticated', ADMIN, () => db.query('select email from public.admins'));
  assert.deepEqual(r.rows.map((x) => x.email), [ADMIN]);
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
