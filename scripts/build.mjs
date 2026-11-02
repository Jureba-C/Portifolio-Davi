import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('..', import.meta.url));
const destino = resolve(raiz, process.env.SAIDA || 'dist');
const PUBLICOS = ['index.html', 'admin.html', '404.html', 'robots.txt', 'sitemap.xml', 'css', 'js', 'assets'];
const ENDERECO_PROVISORIO = 'https://portfolio-editor.vercel.app';

function falhar(mensagem) {
  console.error(`\n✗ ${mensagem}\n`);
  process.exit(1);
}

function limpo(valor) {
  return String(valor ?? '').trim();
}

function enderecoDoSite() {
  const informado = limpo(process.env.SITE_URL).replace(/\/+$/, '');
  if (informado) return informado;
  const vercel = limpo(process.env.VERCEL_PROJECT_PRODUCTION_URL);
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, '').replace(/\/+$/, '')}`;
  return ENDERECO_PROVISORIO;
}

function lerConfiguracao() {
  const url = limpo(process.env.SUPABASE_URL).replace(/\/+$/, '');
  const chave = limpo(process.env.SUPABASE_ANON_KEY);
  const site = enderecoDoSite();
  const demo = process.env.PERMITIR_DEMO === '1';
  if (!url || !chave) {
    if (!demo) {
      falhar('Faltam SUPABASE_URL e/ou SUPABASE_ANON_KEY nas variáveis de ambiente. Na Vercel: Settings → Environment Variables. Veja o DEPLOY.md.');
    }
    console.warn('! Sem Supabase: publicando em modo demonstração (PERMITIR_DEMO=1).');
  } else {
    if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url)) falhar(`SUPABASE_URL não parece um endereço do Supabase: ${url}`);
    if (!/^(eyJ[\w-]+\.[\w-]+\.[\w-]+|sb_publishable_[\w-]+)$/.test(chave)) falhar('SUPABASE_ANON_KEY não parece a chave "anon public" (ou "publishable") do Supabase. Nunca use a chave service_role.');
    if (/service_role/.test(Buffer.from(chave.split('.')[1] ?? '', 'base64').toString())) falhar('Essa é a chave service_role, que é secreta. Use a chave "anon public".');
  }
  if (!/^https:\/\/[^/\s]+$/.test(site)) falhar(`SITE_URL precisa ser https e sem caminho, ex.: https://decxz.com.br (veio: ${site})`);
  return { url, chave, site };
}

async function existe(caminho) {
  try {
    await stat(caminho);
    return true;
  } catch {
    return false;
  }
}

async function referenciasQuebradas() {
  const faltando = [];
  for (const pagina of ['index.html', 'admin.html', '404.html']) {
    const html = await readFile(join(destino, pagina), 'utf8');
    const refs = [...html.matchAll(/(?:href|src)="([^"#?]+)"/g)].map((m) => m[1]).filter((r) => !/^(https?:|mailto:|data:|#|\.\/?$|\/?$)/.test(r));
    for (const ref of new Set(refs)) {
      const caminho = join(destino, ref.replace(/^\//, ''));
      if (!(await existe(caminho))) faltando.push(`${pagina} → ${ref}`);
    }
  }
  return faltando;
}

async function trocarEndereco(site) {
  if (site === ENDERECO_PROVISORIO) return;
  for (const arquivo of ['index.html', 'robots.txt', 'sitemap.xml']) {
    const caminho = join(destino, arquivo);
    const texto = await readFile(caminho, 'utf8');
    await writeFile(caminho, texto.split(ENDERECO_PROVISORIO).join(site));
  }
}

async function principal() {
  const { url, chave, site } = lerConfiguracao();
  await rm(destino, { recursive: true, force: true });
  await mkdir(destino, { recursive: true });
  for (const item of PUBLICOS) {
    await cp(join(raiz, item), join(destino, item), { recursive: true });
  }
  const config = [
    `export const SUPABASE_URL = ${JSON.stringify(url)};`,
    `export const SUPABASE_ANON_KEY = ${JSON.stringify(chave)};`,
    "export const BUCKET_MIDIA = 'midia';",
    `export const SITE_URL = ${JSON.stringify(site)};`,
    '',
  ].join('\n');
  await writeFile(join(destino, 'js', 'config.js'), config);
  await trocarEndereco(site);
  const faltando = await referenciasQuebradas();
  if (faltando.length) falhar(`Arquivos citados nos HTML que não existem:\n  ${faltando.join('\n  ')}`);
  const arquivos = await readdir(destino, { recursive: true });
  console.log(`✓ Build pronto em ${destino.replace(raiz, '')} (${arquivos.length} itens)`);
  console.log(`  site: ${site}`);
  console.log(`  supabase: ${url ? url : 'desligado (modo demonstração)'}`);
}

principal().catch((erro) => falhar(erro.message));
