import { cp, mkdir, readFile, readdir, realpath, rm, stat, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('..', import.meta.url));
let destino = resolve(raiz, process.env.SAIDA || 'dist');
const PUBLICOS = ['index.html', 'admin.html', '404.html', 'robots.txt', 'sitemap.xml', 'css', 'js', 'assets'];
const ENDERECO_PROVISORIO = 'https://portfolio-editor.vercel.app';

function falhar(mensagem) {
  console.error(`\n✗ ${mensagem}\n`);
  process.exit(1);
}

function limpo(valor) {
  return String(valor ?? '')
    .trim()
    .replace(/^[A-Z_]+\s*=\s*/, '')
    .replace(/^["'`]+|["'`]+$/g, '')
    .trim();
}

function enderecoSupabase(valor) {
  const texto = limpo(valor);
  if (/^[a-z0-9]{20}$/i.test(texto)) return `https://${texto.toLowerCase()}.supabase.co`;
  const achado = texto.match(/^(?:https?:\/\/)?([a-z0-9-]+\.supabase\.co)(?:[/?#].*)?$/i);
  return achado ? `https://${achado[1].toLowerCase()}` : texto.replace(/\/+$/, '');
}

function enderecoDoSite(demo) {
  const informado = limpo(process.env.SITE_URL).replace(/\/+$/, '');
  if (informado) return informado;
  if (!demo) falhar('Falta SITE_URL, o endereço final do site (ex.: SITE_URL=https://decxz.com.br). Sem ele as metatags, o sitemap.xml e o robots.txt ficariam com o endereço provisório. Veja o DEPLOY.md.');
  return ENDERECO_PROVISORIO;
}

function lerConfiguracao() {
  const url = enderecoSupabase(process.env.SUPABASE_URL);
  const chave = limpo(process.env.SUPABASE_ANON_KEY).replace(/\s+/g, '');
  const demo = process.env.PERMITIR_DEMO === '1';
  const site = enderecoDoSite(demo);
  if (!url || !chave) {
    if (!demo) {
      falhar('Faltam SUPABASE_URL e/ou SUPABASE_ANON_KEY nas variáveis de ambiente. Rode o build com elas na frente do comando. Veja o DEPLOY.md.');
    }
    console.warn('! Sem Supabase: publicando em modo demonstração (PERMITIR_DEMO=1).');
  } else {
    if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url)) falhar(`SUPABASE_URL não parece um endereço do Supabase (esperado: https://xxxx.supabase.co). Veio: ${url.slice(0, 60)}`);
    if (/^sb_secret_/.test(chave)) falhar('SUPABASE_ANON_KEY está com a chave "secret", que é secreta. Use a chave "publishable" (sb_publishable_…) ou a "anon public" (eyJ…).');
    if (!/^(eyJ[\w-]+\.[\w-]+\.[\w-]+|sb_publishable_[\w-]+)$/.test(chave)) falhar(`SUPABASE_ANON_KEY não parece a chave "publishable" (sb_publishable_…) nem a "anon public" (eyJ…) do Supabase. Começa com "${chave.slice(0, 6)}…" e tem ${chave.length} caracteres.`);
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

const aspas = (valor) => `"${String(valor).replace(/[\\"]/g, '\\$&')}"`;

async function gerarHtaccess() {
  const { headers: regras } = JSON.parse(await readFile(join(raiz, 'cabecalhos.json'), 'utf8'));
  const linhas = [
    'Options -Indexes',
    'RewriteEngine On',
    'RewriteCond %{HTTP_HOST} ^www\\.(.+)$ [NC]',
    'RewriteRule ^ https://%1%{REQUEST_URI} [L,R=301]',
    'RewriteCond %{HTTPS} off',
    'RewriteCond %{HTTP:X-Forwarded-Proto} !https',
    'RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]',
    'RewriteCond %{REQUEST_FILENAME} !-f',
    'RewriteCond %{REQUEST_FILENAME} !-d',
    'RewriteCond %{REQUEST_FILENAME}.html -f',
    'RewriteRule ^(.+)$ $1.html [L]',
    'ErrorDocument 404 /404.html',
    '<IfModule mod_headers.c>',
  ];
  regras.forEach(({ source, headers }, i) => {
    const todos = source === '/(.*)';
    const padrao = source.replace(/\(\.\*\)/g, '\u0001').replace(/\./g, '[.]').replace(/\u0001/g, '(.*)');
    if (!todos) linhas.push(`  SetEnvIf Request_URI ${aspas(`^${padrao}$`)} HDR_${i}`);
    for (const { key, value } of headers) linhas.push(`  Header set ${key} ${aspas(value)}${todos ? '' : ` env=HDR_${i}`}`);
  });
  linhas.push('</IfModule>', '');
  await writeFile(join(destino, '.htaccess'), linhas.join('\n'));
}

const PAGINAS = {
  'index.html': { js: 'site', css: ['fonts', 'base', 'formas', 'site'], boot: true },
  'admin.html': { js: 'admin', css: ['fonts', 'base', 'admin'], boot: false },
};

async function carregarEsbuild() {
  try {
    return await import('esbuild');
  } catch {
    falhar('Falta o esbuild para empacotar o site. Rode npm install.');
  }
  return null;
}

const nomeDe = (caminho) => caminho.split('/').pop();

async function empacotar(site, demo) {
  const esbuild = await carregarEsbuild();
  const pastaJs = join(destino, 'js');
  const pastaCss = join(destino, 'css');
  const js = await esbuild.build({
    entryPoints: Object.values(PAGINAS).map(({ js: nome }) => join(pastaJs, `${nome}.js`)),
    bundle: true,
    splitting: true,
    format: 'esm',
    minify: true,
    target: 'es2020',
    outdir: join(destino, 'js', 'm'),
    entryNames: '[name]-[hash]',
    chunkNames: 'parte-[hash]',
    metafile: true,
    logLevel: 'silent',
  });
  const boot = await esbuild.build({
    entryPoints: [join(pastaJs, 'boot.js')],
    minify: true,
    target: 'es2020',
    outdir: join(destino, 'js', 'm'),
    entryNames: '[name]-[hash]',
    metafile: true,
    logLevel: 'silent',
  });
  const entradasCss = [];
  for (const [pagina, { css }] of Object.entries(PAGINAS)) {
    const entrada = join(pastaCss, `_${pagina.replace('.html', '')}.css`);
    await writeFile(entrada, css.map((nome) => `@import "./${nome}.css";`).join('\n'));
    entradasCss.push(entrada);
  }
  const estilos = await esbuild.build({
    entryPoints: entradasCss,
    bundle: true,
    minify: true,
    outdir: join(destino, 'css'),
    entryNames: '[name]-[hash]',
    external: ['*.woff2', '*.png', '*.svg', '*.webp', '*.jpg'],
    metafile: true,
    logLevel: 'silent',
  });
  const saidaDe = (resultado, entrada) => Object.entries(resultado.metafile.outputs).find(([, info]) => info.entryPoint && resolve(raiz, info.entryPoint) === resolve(entrada))?.[0];
  for (const [pagina, { js: nome, boot: comBoot }] of Object.entries(PAGINAS)) {
    const caminho = join(destino, pagina);
    let html = await readFile(caminho, 'utf8');
    const jsSaida = nomeDe(saidaDe(js, join(pastaJs, `${nome}.js`)));
    const cssSaida = nomeDe(saidaDe(estilos, join(pastaCss, `_${pagina.replace('.html', '')}.css`)));
    let primeiro = true;
    html = html.replace(/<link rel="stylesheet" href="css\/[a-z-]+\.css">\n?/g, () => {
      if (!primeiro) return '';
      primeiro = false;
      return `<link rel="stylesheet" href="css/${cssSaida}">\n`;
    });
    html = html.replace(`<script type="module" src="js/${nome}.js"></script>`, `<script type="module" src="js/m/${jsSaida}"></script>`);
    if (comBoot) html = html.replace('<script src="js/boot.js"></script>', `<script src="js/m/${nomeDe(saidaDe(boot, join(pastaJs, 'boot.js')))}"></script>`);
    if (site.supabase && pagina === 'index.html') html = html.replace('<link rel="preconnect" href="https://i.ytimg.com">', `<link rel="preconnect" href="${site.supabase}" crossorigin>\n<link rel="preconnect" href="https://i.ytimg.com">`);
    await writeFile(caminho, html);
  }
  for (const entrada of entradasCss) await rm(entrada, { force: true });
  if (!demo) {
    for (const arquivo of await readdir(pastaJs)) if (arquivo.endsWith('.js')) await rm(join(pastaJs, arquivo));
    await rm(join(pastaJs, 'vendor'), { recursive: true, force: true });
    for (const arquivo of await readdir(pastaCss)) if (arquivo.endsWith('.css') && !arquivo.startsWith('_')) await rm(join(pastaCss, arquivo));
  }
  await cp(join(raiz, 'js', 'vendor', 'LICENCAS.txt'), join(destino, 'js', 'm', 'LICENCAS.txt'));
}

async function principal() {
  const { url, chave, site } = lerConfiguracao();
  await rm(destino, { recursive: true, force: true });
  await mkdir(destino, { recursive: true });
  destino = await realpath(destino);
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
  await empacotar({ supabase: url }, !url);
  await gerarHtaccess();
  const faltando = await referenciasQuebradas();
  if (faltando.length) falhar(`Arquivos citados nos HTML que não existem:\n  ${faltando.join('\n  ')}`);
  const arquivos = await readdir(destino, { recursive: true });
  console.log(`✓ Build pronto em ${destino.replace(raiz, '')} (${arquivos.length} itens)`);
  console.log(`  site: ${site}`);
  console.log(`  supabase: ${url ? url : 'desligado (modo demonstração)'}`);
}

principal().catch((erro) => falhar(erro.message));
