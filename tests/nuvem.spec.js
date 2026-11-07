import { test, expect } from '@playwright/test';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('..', import.meta.url));
const SUPABASE = 'https://abcdefgh.supabase.co';
const CHAVE_JWT = `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ role: 'anon', ref: 'abcdefgh' })).toString('base64url')}.assinatura`;
const CHAVE_NOVA = 'sb_publishable_TesteDoSite_123';

const servidores = [];
const pastas = [];

function construirEServir(chave, porta) {
  const pasta = mkdtempSync(join(tmpdir(), 'decxz-nuvem-'));
  pastas.push(pasta);
  const r = spawnSync(process.execPath, ['scripts/build.mjs'], {
    cwd: raiz,
    env: { PATH: process.env.PATH, SAIDA: pasta, SUPABASE_URL: SUPABASE, SUPABASE_ANON_KEY: chave, SITE_URL: 'https://decxz.com.br' },
    encoding: 'utf8',
  });
  if (r.status !== 0) throw new Error(r.stderr);
  servidores.push(spawn(process.execPath, ['scripts/servir-dist.mjs', pasta, String(porta)], { cwd: raiz, stdio: 'ignore' }));
  return { pasta, url: `http://localhost:${porta}` };
}

function banco({ titulo = 'Vídeo que veio do banco', email = 'decxz@exemplo-real.com' } = {}) {
  return {
    settings: [{ id: 1, nome: 'DECXZ', email, foto_url: '', sobre_pt: 'Texto do banco.', sobre_en: 'Text from the database.', redes: { instagram: 'https://www.instagram.com/decxz', x: '', youtube: '' }, discord_nick: '', comissoes_abertas: true }],
    categories: [{ id: 'c1', nome_pt: 'Motion', nome_en: 'Motion', slug: 'motion', ordem: 0, formato: 'horizontal' }],
    longform_filters: [],
    videos: [{ id: 'v1', titulo, descricao_pt: 'cliente real', descricao_en: 'real client', youtube_id: 'aqz-KE-bpKQ', preview_url: '', poster_url: '', category_id: 'c1', filter_id: null, destaque: false, ordem: 0, created_at: '2026-11-01T12:00:00Z' }],
    clients: [],
    testimonials: [],
  };
}

async function servirBanco(page, respostas, pedidos = []) {
  await page.route('**/i.ytimg.com/**', (rota) => rota.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720"/>' }));
  await page.route(/youtube(-nocookie)?\.com/, (rota) => rota.fulfill({ contentType: 'text/html', body: '<!doctype html><title>yt</title>' }));
  await page.route(`${SUPABASE}/**`, (rota) => {
    const pedido = rota.request();
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' };
    if (pedido.method() === 'OPTIONS') return rota.fulfill({ status: 204, headers: cors });
    pedidos.push({ url: pedido.url(), cabecalhos: pedido.headers() });
    const atual = typeof respostas === 'function' ? respostas() : respostas;
    if (!atual) return rota.fulfill({ status: 500, headers: cors, body: '{}' });
    const tabela = new URL(pedido.url()).pathname.split('/').pop();
    return rota.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify(atual[tabela] ?? []) });
  });
}

let antigo;
let novo;

test.describe.configure({ mode: 'serial' });

test.beforeAll(async ({}, testInfo) => {
  const base = 4520 + testInfo.workerIndex * 2;
  antigo = construirEServir(CHAVE_JWT, base);
  novo = construirEServir(CHAVE_NOVA, base + 1);
  await new Promise((ok) => setTimeout(ok, 600));
});

test.afterAll(() => {
  servidores.forEach((s) => s.kill());
  pastas.forEach((p) => rmSync(p, { recursive: true, force: true }));
});

test.describe('site publicado lendo o Supabase', () => {
  test('mostra os dados do banco e lê só pela API, sem baixar o cliente do Supabase', async ({ page }) => {
    const pedidos = [];
    const arquivos = [];
    page.on('request', (r) => arquivos.push(r.url()));
    await servirBanco(page, banco(), pedidos);
    await page.goto(`${antigo.url}/?intro=0`);
    await expect(page.locator('.grade .card', { hasText: 'Vídeo que veio do banco' })).toBeAttached();
    await expect(page.locator('[data-campo="sobre"]')).toContainText('Texto do banco.');
    await expect(page.locator('[data-campo="offline"]')).toBeHidden();
    expect(pedidos.map((p) => new URL(p.url).pathname).sort()).toEqual(['/rest/v1/categories', '/rest/v1/clients', '/rest/v1/longform_filters', '/rest/v1/settings', '/rest/v1/testimonials', '/rest/v1/videos']);
    const vendor = readdirSync(join(antigo.pasta, 'js', 'm')).find((f) => readFileSync(join(antigo.pasta, 'js', 'm', f), 'utf8').includes('GoTrueClient'));
    expect(vendor).toBeTruthy();
    expect(arquivos.some((u) => u.endsWith(vendor))).toBe(false);
    const pessoa = JSON.parse(await page.locator('#dados-pessoa').textContent());
    expect(pessoa.email).toBe('mailto:decxz@exemplo-real.com');
    expect(pessoa.sameAs).toEqual(['https://www.instagram.com/decxz']);
  });

  test('manda a chave do jeito certo para a chave antiga e para a nova', async ({ browser }) => {
    for (const [site, chave, comBearer] of [[antigo, CHAVE_JWT, true], [novo, CHAVE_NOVA, false]]) {
      const contexto = await browser.newContext();
      const page = await contexto.newPage();
      const pedidos = [];
      await servirBanco(page, banco(), pedidos);
      await page.goto(`${site.url}/?intro=0`);
      await expect(page.locator('.grade .card').first()).toBeAttached();
      expect(pedidos.length).toBeGreaterThan(0);
      pedidos.forEach(({ cabecalhos }) => {
        expect(cabecalhos.apikey).toBe(chave);
        if (comBearer) expect(cabecalhos.authorization).toBe(`Bearer ${chave}`);
        else expect(cabecalhos.authorization).toBeUndefined();
      });
      await contexto.close();
    }
  });

  test('quem volta vê na hora o que estava guardado e o site se atualiza se o banco mudou', async ({ page }) => {
    let atual = banco({ titulo: 'Primeira versão' });
    await servirBanco(page, () => atual);
    await page.goto(`${antigo.url}/?intro=0`);
    await expect(page.locator('.grade .card', { hasText: 'Primeira versão' })).toBeAttached();
    atual = banco({ titulo: 'Versão nova do banco' });
    await page.reload();
    await expect(page.locator('.grade .card', { hasText: 'Versão nova do banco' })).toBeAttached();
    await expect(page.locator('.grade .card', { hasText: 'Primeira versão' })).toHaveCount(0);
  });

  test('se o banco cair, mostra o que estava guardado e avisa', async ({ page }) => {
    let atual = banco({ titulo: 'Guardado no aparelho' });
    await servirBanco(page, () => atual);
    await page.goto(`${antigo.url}/?intro=0`);
    await expect(page.locator('.grade .card', { hasText: 'Guardado no aparelho' })).toBeAttached();
    atual = null;
    await page.reload();
    await expect(page.locator('.grade .card', { hasText: 'Guardado no aparelho' })).toBeAttached();
    await expect(page.locator('[data-campo="offline"]')).toBeVisible();
  });

  test('banco fora do ar na primeira visita não mostra os vídeos de exemplo', async ({ page }) => {
    await servirBanco(page, null);
    await page.goto(`${antigo.url}/?intro=0`);
    await expect(page.locator('[data-campo="offline"]')).toBeVisible({ timeout: 12000 });
    await expect(page.locator('.grade .card')).toHaveCount(0);
    await expect(page.getByText('Showreel 2026')).toHaveCount(0);
    await expect(page.locator('[data-campo="email-linha"]')).toBeHidden();
  });

  test('o painel publicado carrega o cliente do Supabase e mostra o login', async ({ page }) => {
    await servirBanco(page, banco());
    await page.goto(`${antigo.url}/admin`);
    await expect(page.locator('[data-form="login"]')).toBeVisible();
    await expect(page.locator('[data-form="login"]')).not.toContainText('demo@local');
  });
});
