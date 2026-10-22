import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'acorn';

const raiz = fileURLToPath(new URL('..', import.meta.url));
const PASTAS = ['css', 'js', 'assets', 'scripts', 'tests'];
const ARQUIVOS = ['index.html', 'admin.html', 'styleguide.html', 'playwright.config.js'];
const IGNORAR = new Set(['node_modules', 'design', 'test-results', 'playwright-report', 'fonts']);

async function listar(pasta) {
  const saida = [];
  const itens = await readdir(pasta, { withFileTypes: true }).catch(() => []);
  for (const item of itens) {
    const caminho = join(pasta, item.name);
    if (item.isDirectory()) {
      if (!IGNORAR.has(item.name)) saida.push(...(await listar(caminho)));
    } else saida.push(caminho);
  }
  return saida;
}

function comentariosJs(codigo, nome) {
  const achados = [];
  const opcoes = { ecmaVersion: 'latest', allowHashBang: true, onComment: (_bloco, texto, inicio) => achados.push({ inicio, texto: texto.trim().slice(0, 60) }) };
  try {
    parse(codigo, { ...opcoes, sourceType: 'module' });
  } catch {
    achados.length = 0;
    try {
      parse(codigo, { ...opcoes, sourceType: 'script' });
    } catch (erro) {
      return [{ inicio: 0, texto: `não deu pra analisar ${nome}: ${erro.message}` }];
    }
  }
  return achados;
}

function comentariosCss(css) {
  const achados = [];
  let i = 0;
  while (i < css.length) {
    const c = css[i];
    if (c === '"' || c === "'") {
      i += 1;
      while (i < css.length && css[i] !== c) i += css[i] === '\\' ? 2 : 1;
      i += 1;
    } else if (c === '/' && css[i + 1] === '*') {
      const fim = css.indexOf('*/', i + 2);
      achados.push({ inicio: i, texto: css.slice(i, fim === -1 ? i + 60 : Math.min(fim + 2, i + 60)) });
      i = fim === -1 ? css.length : fim + 2;
    } else i += 1;
  }
  return achados;
}

function comentariosMarcacao(texto) {
  const achados = [];
  const regex = /<!--[\s\S]*?(-->|$)/g;
  let m;
  while ((m = regex.exec(texto))) achados.push({ inicio: m.index, texto: m[0].slice(0, 60) });
  const scripts = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  while ((m = scripts.exec(texto))) {
    if (/type\s*=\s*["']?application\/(ld\+)?json/i.test(m[1])) continue;
    comentariosJs(m[2], 'script inline').forEach((a) => achados.push({ inicio: m.index + a.inicio, texto: a.texto }));
  }
  const estilos = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  while ((m = estilos.exec(texto))) {
    comentariosCss(m[1]).forEach((a) => achados.push({ inicio: m.index + a.inicio, texto: a.texto }));
  }
  return achados;
}

const linha = (texto, indice) => texto.slice(0, indice).split('\n').length;

const arquivos = [
  ...(await Promise.all(PASTAS.map((p) => listar(join(raiz, p))))).flat(),
  ...ARQUIVOS.map((a) => join(raiz, a)),
];

const problemas = [];
let verificados = 0;
for (const arquivo of arquivos) {
  const tipo = extname(arquivo).toLowerCase();
  if (!['.js', '.mjs', '.css', '.html', '.svg'].includes(tipo)) continue;
  let texto;
  try {
    texto = await readFile(arquivo, 'utf8');
  } catch {
    continue;
  }
  verificados += 1;
  const achados = tipo === '.css' ? comentariosCss(texto)
    : tipo === '.html' || tipo === '.svg' ? comentariosMarcacao(texto)
      : comentariosJs(texto, arquivo);
  achados.forEach((a) => problemas.push(`${relative(raiz, arquivo)}:${linha(texto, a.inicio)}  ${a.texto}`));
}

if (problemas.length) {
  console.error(`Comentários encontrados (${problemas.length}):`);
  problemas.forEach((p) => console.error(`  ${p}`));
  process.exit(1);
}
console.log(`Nenhum comentário em ${verificados} arquivos.`);
