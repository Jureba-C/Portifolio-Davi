import { readFile, writeFile } from 'node:fs/promises';
import { SITE_URL } from '../js/config.js';

const raiz = new URL('..', import.meta.url);
const novo = String(process.argv[2] || SITE_URL).replace(/\/+$/, '');
if (!/^https:\/\/[^/\s]+$/.test(novo)) {
  console.error('Use um endereço https sem caminho, por exemplo: npm run endereco -- https://decxz.com.br');
  process.exit(1);
}
const antigo = SITE_URL.replace(/\/+$/, '');
const arquivos = ['index.html', 'sitemap.xml', 'robots.txt', 'js/config.js'];
for (const arquivo of arquivos) {
  const url = new URL(arquivo, raiz);
  const texto = await readFile(url, 'utf8');
  const trocado = texto.split(antigo).join(novo);
  if (trocado !== texto) await writeFile(url, trocado);
  console.log(`${arquivo}: ${trocado === texto ? 'sem mudança' : 'atualizado'}`);
}
