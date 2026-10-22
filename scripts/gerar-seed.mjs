import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { MOCK } from '../js/mock-data.js';

function uuid(chave) {
  const h = createHash('sha1').update(`portfolio-editor:${chave}`).digest('hex');
  const variante = ((parseInt(h[16], 16) & 0x3) | 0x8).toString(16);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${variante}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

function sql(valor) {
  if (valor === null || valor === undefined) return 'null';
  if (typeof valor === 'boolean') return valor ? 'true' : 'false';
  if (typeof valor === 'number') return String(valor);
  return `'${String(valor).replaceAll("'", "''")}'`;
}

function inserir(tabela, colunas, linhas) {
  const valores = linhas.map((linha) => `  (${linha.map(sql).join(', ')})`).join(',\n');
  return `insert into public.${tabela} (${colunas.join(', ')}) values\n${valores}\non conflict (id) do nothing;\n`;
}

const { settings, categories, longform_filters, videos, clients } = MOCK;

const partes = [
  'begin;\n',
  inserir('categories', ['id', 'nome_pt', 'nome_en', 'slug', 'ordem', 'formato'],
    categories.map((c) => [uuid(c.id), c.nome_pt, c.nome_en, c.slug, c.ordem, c.formato])),
  inserir('longform_filters', ['id', 'nome_pt', 'nome_en', 'ordem'],
    longform_filters.map((f) => [uuid(f.id), f.nome_pt, f.nome_en, f.ordem])),
  inserir('videos', ['id', 'titulo', 'descricao_pt', 'descricao_en', 'youtube_id', 'category_id', 'filter_id', 'destaque', 'ordem'],
    videos.map((v) => [uuid(v.id), v.titulo, v.descricao_pt, v.descricao_en, v.youtube_id, uuid(v.category_id), v.filter_id ? uuid(v.filter_id) : null, v.destaque, v.ordem])),
  inserir('clients', ['id', 'nome', 'canal_url', 'foto_url', 'ordem'],
    clients.map((c) => [uuid(c.id), c.nome, c.canal_url, c.foto_url, c.ordem])),
  [
    'insert into public.settings (id, nome, email, sobre_pt, sobre_en, redes, discord_nick, comissoes_abertas) values',
    `  (1, ${[settings.nome, settings.email, settings.sobre_pt, settings.sobre_en].map(sql).join(', ')}, ${sql(JSON.stringify(settings.redes))}::jsonb, ${sql(settings.discord_nick)}, ${sql(settings.comissoes_abertas)})`,
    'on conflict (id) do update set nome = excluded.nome, email = excluded.email, sobre_pt = excluded.sobre_pt, sobre_en = excluded.sobre_en, redes = excluded.redes, discord_nick = excluded.discord_nick, comissoes_abertas = excluded.comissoes_abertas;\n',
  ].join('\n'),
  'commit;\n',
];

await writeFile(new URL('../supabase/seed.sql', import.meta.url), partes.join('\n'));
