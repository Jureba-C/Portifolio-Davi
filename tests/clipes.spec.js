import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const SUPABASE = 'https://teste.supabase.co';
const LIBERA = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
const CLIPE_FALSO = `
export const PASTA_LEVE = 'previas/leve';
export async function otimizarClipe(arquivo, aoProgresso = () => {}) {
  aoProgresso(1);
  return new File([new Uint8Array(1000)], 'leve.mp4', { type: 'video/mp4' });
}
export async function clipePesado(url) {
  return Boolean(url) && !url.includes('/previas/leve/');
}
`;

function jwt() {
  const parte = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${parte({ alg: 'HS256', typ: 'JWT' })}.${parte({ sub: 'u1', role: 'authenticated', aal: 'aal2', exp: 4102444800 })}.assinatura`;
}

const VIDEO = { descricao_pt: '', descricao_en: '', filter_id: null, destaque: false, poster_url: '', created_at: '2026-11-01T12:00:00Z' };
const VIDEOS = [
  { ...VIDEO, id: 'v-pesado', titulo: 'Pesado', youtube_id: 'aqz-KE-bpKQ', category_id: 'c1', ordem: 0, preview_url: `${SUPABASE}/storage/v1/object/public/midia/previas/antigo.mp4` },
  { ...VIDEO, id: 'v-leve', titulo: 'Leve', youtube_id: 'eRsGyueVLvQ', category_id: 'c1', ordem: 1, preview_url: `${SUPABASE}/storage/v1/object/public/midia/previas/leve/ja.mp4` },
  { ...VIDEO, id: 'v-sem', titulo: 'Sem clipe', youtube_id: 'R6MlUcmOul8', category_id: 'c1', ordem: 2, preview_url: '' },
];

async function simularSupabase(page) {
  const feitos = { patches: [], apagados: [], enviados: [] };
  await page.route('**/js/config.js', (r) => r.fulfill({
    contentType: 'text/javascript',
    body: `export const SUPABASE_URL = '${SUPABASE}'; export const SUPABASE_ANON_KEY = 'sb_publishable_teste'; export const BUCKET_MIDIA = 'midia'; export const SITE_URL = 'https://decxz.com.br';`,
  }));
  await page.route('**/js/clipe.js', (r) => r.fulfill({ contentType: 'text/javascript', body: CLIPE_FALSO }));
  await page.route(`${SUPABASE}/**`, async (rota) => {
    const req = rota.request();
    const url = new URL(req.url());
    const json = (corpo, status = 200) => rota.fulfill({ status, headers: LIBERA, contentType: 'application/json', body: JSON.stringify(corpo) });
    if (req.method() === 'OPTIONS') return rota.fulfill({ status: 204, headers: LIBERA });
    if (url.pathname.includes('/auth/v1/token')) {
      return json({ access_token: jwt(), refresh_token: 'r', token_type: 'bearer', expires_in: 3600, expires_at: 4102444800, user: { id: 'u1', aud: 'authenticated', email: 'davi@teste.com', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' } });
    }
    if (url.pathname.includes('/rest/v1/admins')) return json({ email: 'davi@teste.com' });
    if (url.pathname.endsWith('/rest/v1/settings')) return json([{ id: 1, nome: 'DECXZ', email: '', foto_url: '', sobre_pt: '', sobre_en: '', redes: {}, discord_nick: '', comissoes_abertas: true }]);
    if (url.pathname.endsWith('/rest/v1/categories')) return json([{ id: 'c1', nome_pt: 'Motion', nome_en: 'Motion', slug: 'motion', ordem: 0, formato: 'horizontal' }, { id: 'c2', nome_pt: 'Vertical', nome_en: 'Vertical', slug: 'vertical', ordem: 1, formato: 'vertical' }]);
    if (url.pathname.endsWith('/rest/v1/videos')) {
      if (req.method() === 'PATCH') {
        feitos.patches.push({ id: url.searchParams.get('id'), corpo: JSON.parse(req.postData() ?? '{}') });
        return rota.fulfill({ status: 204, headers: LIBERA });
      }
      return json(VIDEOS);
    }
    if (url.pathname.includes('/rest/v1/')) return json([]);
    if (url.pathname.startsWith('/storage/v1/object/public/')) {
      if (req.method() === 'HEAD') return rota.fulfill({ status: 200, headers: { ...LIBERA, 'content-length': '9000000', 'content-type': 'video/mp4' } });
      return rota.fulfill({ status: 200, headers: LIBERA, contentType: 'video/mp4', body: Buffer.alloc(2000) });
    }
    if (url.pathname.startsWith('/storage/v1/object/midia') && req.method() === 'DELETE') {
      feitos.apagados.push(...JSON.parse(req.postData() ?? '{}').prefixes);
      return json([]);
    }
    if (url.pathname.startsWith('/storage/v1/object/midia/') && req.method() === 'POST') {
      feitos.enviados.push(url.pathname.replace('/storage/v1/object/midia/', ''));
      return json({ Key: url.pathname });
    }
    return json({});
  });
  return feitos;
}

test.describe('clipes de prévia', () => {
  test('o painel otimiza sozinho o clipe pesado, troca no vídeo e apaga o antigo; o que já é leve fica quieto', async ({ page }) => {
    const feitos = await simularSupabase(page);
    await page.goto('/admin.html');
    await page.fill('[data-form="login"] [name="email"]', 'davi@teste.com');
    await page.fill('[data-form="login"] [name="senha"]', 'qualquer-senha');
    await page.click('.login-entrar');
    await expect(page.locator('[data-tela="painel"]')).toBeVisible();
    await expect.poll(() => feitos.patches.length, { timeout: 10000 }).toBe(1);
    expect(feitos.patches[0].id).toBe('eq.v-pesado');
    expect(feitos.patches[0].corpo.preview_url).toMatch(/\/storage\/v1\/object\/public\/midia\/previas\/leve\/[\w-]+\.mp4$/);
    expect(feitos.enviados).toHaveLength(1);
    expect(feitos.enviados[0]).toMatch(/^previas\/leve\/[\w-]+\.mp4$/);
    await expect.poll(() => feitos.apagados, { timeout: 5000 }).toEqual(['previas/antigo.mp4']);
    await expect(page.locator('[data-otimizando]')).toBeHidden();
  });

  test('banco sem a coluna category_ids: o painel esconde "também aparece em" e não manda a coluna', async ({ page }) => {
    const feitos = await simularSupabase(page);
    await page.goto('/admin.html');
    await page.fill('[data-form="login"] [name="email"]', 'davi@teste.com');
    await page.fill('[data-form="login"] [name="senha"]', 'qualquer-senha');
    await page.click('.login-entrar');
    await expect(page.locator('[data-tela="painel"]')).toBeVisible();
    const item = page.locator('[data-lista="trabalhos"] > li', { hasText: 'Sem clipe' });
    await item.getByRole('button', { name: /Editar Sem clipe/ }).click();
    await expect(page.locator('[data-gaveta="video"]')).toBeVisible();
    await expect(page.locator('[data-campo-extras]')).toBeHidden();
    await page.fill('[data-form="video"] [name="titulo"]', 'Sem clipe renomeado');
    await page.click('[data-video-botao]');
    await expect.poll(() => feitos.patches.find((p) => p.id === 'eq.v-sem')).toBeTruthy();
    const corpo = feitos.patches.find((p) => p.id === 'eq.v-sem').corpo;
    expect(corpo.category_id).toBe('c1');
    expect(corpo).not.toHaveProperty('category_ids');
  });

  test('otimizarClipe devolve um arquivo que não é maior que o original (ou o próprio original)', async ({ page }) => {
    await page.goto('/admin.html');
    const bytes = readFileSync('assets/exemplos/previa-motion.webm').toString('base64');
    const r = await page.evaluate(async (b64) => {
      const { otimizarClipe } = await import('/js/clipe.js');
      const original = new File([Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))], 'previa.webm', { type: 'video/webm' });
      const progresso = [];
      const saida = await otimizarClipe(original, (p) => progresso.push(p));
      return { antes: original.size, depois: saida.size, mesmo: saida === original, tipo: saida.type, chamouProgresso: progresso.length > 0 };
    }, bytes);
    expect(r.depois).toBeLessThanOrEqual(r.antes);
    if (r.mesmo) expect(r.tipo).toBe('video/webm');
    else {
      expect(r.tipo).toBe('video/mp4');
      expect(r.chamouProgresso).toBe(true);
    }
  });

  test('arquivo que não é vídeo volta intacto', async ({ page }) => {
    await page.goto('/admin.html');
    const igual = await page.evaluate(async () => {
      const { otimizarClipe } = await import('/js/clipe.js');
      const lixo = new File([new Uint8Array(500)], 'nada.mp4', { type: 'video/mp4' });
      return (await otimizarClipe(lixo)) === lixo;
    });
    expect(igual).toBe(true);
  });
});
