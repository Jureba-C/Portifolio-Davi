import http from 'node:http';
import zlib from 'node:zlib';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raizProjeto = fileURLToPath(new URL('..', import.meta.url));
const pasta = resolve(raizProjeto, process.argv[2] || 'dist');
const porta = Number(process.argv[3] || 4600);
const { headers: regras } = JSON.parse(await readFile(join(raizProjeto, 'vercel.json'), 'utf8'));
const TIPOS = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.webm': 'video/webm', '.mp4': 'video/mp4', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml' };
const casa = (fonte, caminho) => new RegExp(`^${fonte.replace(/\./g, '\\.').replace(/\(\\\.\*\)/g, '.*').replace(/\(\\\.html\)\?/g, '(\\.html)?')}$`).test(caminho);

async function existe(arquivo) {
  try {
    return (await stat(arquivo)).isFile();
  } catch {
    return false;
  }
}

http.createServer(async (req, res) => {
  const caminho = decodeURIComponent(new URL(req.url, 'http://local').pathname);
  let arquivo = join(pasta, caminho === '/' ? 'index.html' : caminho);
  let codigo = 200;
  if (!arquivo.startsWith(pasta)) arquivo = join(pasta, '404.html');
  if (!(await existe(arquivo))) {
    if (await existe(`${arquivo}.html`)) arquivo = `${arquivo}.html`;
    else {
      arquivo = join(pasta, '404.html');
      codigo = 404;
    }
  }
  regras.filter((regra) => casa(regra.source, caminho)).forEach((regra) => regra.headers.forEach(({ key, value }) => res.setHeader(key, value)));
  const tipo = TIPOS[extname(arquivo)] ?? 'application/octet-stream';
  res.setHeader('Content-Type', tipo);
  let corpo = await readFile(arquivo);
  if (/text|javascript|json|svg|xml/.test(tipo) && /\bbr\b/.test(req.headers['accept-encoding'] || '')) {
    corpo = zlib.brotliCompressSync(corpo);
    res.setHeader('Content-Encoding', 'br');
  }
  res.writeHead(codigo);
  res.end(corpo);
}).listen(porta, () => console.log(`dist em http://localhost:${porta}`));
