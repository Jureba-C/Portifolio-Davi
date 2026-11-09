import { test, expect } from '@playwright/test';

const SUPABASE = 'https://teste.supabase.co';
const LIBERA = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
const CODIGO_CERTO = '123456';
const SEGREDO = 'JBSWY3DPEHPK3PXP';
const QR = '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="black"/></svg>';

function jwt(aal) {
  const parte = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${parte({ alg: 'HS256', typ: 'JWT' })}.${parte({ sub: 'u1', role: 'authenticated', aal, amr: [{ method: 'password', timestamp: 1 }], exp: 4102444800 })}.assinatura`;
}

async function simularSupabase(page, fatores) {
  const feitos = { apagados: [], desafios: [], codigos: [] };
  const usuario = () => ({ id: 'u1', aud: 'authenticated', email: 'davi@teste.com', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z', factors: fatores });
  const sessao = (aal) => ({ access_token: jwt(aal), refresh_token: 'r', token_type: 'bearer', expires_in: 3600, expires_at: 4102444800, user: usuario() });
  await page.route('**/js/config.js', (r) => r.fulfill({
    contentType: 'text/javascript',
    body: `export const SUPABASE_URL = '${SUPABASE}'; export const SUPABASE_ANON_KEY = 'sb_publishable_teste'; export const BUCKET_MIDIA = 'midia'; export const SITE_URL = 'https://decxz.com.br';`,
  }));
  await page.route(`${SUPABASE}/**`, async (rota) => {
    const req = rota.request();
    const { pathname } = new URL(req.url());
    const json = (corpo, status = 200) => rota.fulfill({ status, headers: LIBERA, contentType: 'application/json', body: JSON.stringify(corpo) });
    if (req.method() === 'OPTIONS') return rota.fulfill({ status: 204, headers: LIBERA });
    if (pathname.endsWith('/auth/v1/token')) return json(sessao('aal1'));
    if (pathname.endsWith('/auth/v1/user')) return json(usuario());
    if (pathname.endsWith('/auth/v1/factors') && req.method() === 'POST') {
      fatores.push({ id: 'f-novo', factor_type: 'totp', friendly_name: 'Painel Decxz', status: 'unverified' });
      return json({ id: 'f-novo', type: 'totp', friendly_name: 'Painel Decxz', totp: { qr_code: QR, secret: SEGREDO, uri: 'otpauth://totp/x' } });
    }
    const fator = pathname.match(/\/auth\/v1\/factors\/([^/]+)(?:\/(challenge|verify))?$/);
    if (fator && req.method() === 'DELETE') {
      feitos.apagados.push(fator[1]);
      fatores.splice(fatores.findIndex((f) => f.id === fator[1]), 1);
      return json({ id: fator[1] });
    }
    if (fator?.[2] === 'challenge') {
      feitos.desafios.push(fator[1]);
      return json({ id: 'desafio-1', type: 'totp', expires_at: 4102444800 });
    }
    if (fator?.[2] === 'verify') {
      const { code } = JSON.parse(req.postData() ?? '{}');
      feitos.codigos.push(code);
      if (code !== CODIGO_CERTO) return json({ code: 'mfa_verification_failed', msg: 'Invalid TOTP code entered' }, 422);
      fatores.find((f) => f.id === fator[1]).status = 'verified';
      return json(sessao('aal2'));
    }
    if (pathname.includes('/rest/v1/admins')) return json({ email: 'davi@teste.com' });
    if (pathname.endsWith('/rest/v1/settings')) return json([{ id: 1, nome: 'DECXZ', email: '', foto_url: '', sobre_pt: '', sobre_en: '', redes: {}, discord_nick: '', comissoes_abertas: true }]);
    if (pathname.includes('/rest/v1/')) return json([]);
    return json({});
  });
  return feitos;
}

async function entrarComSenha(page) {
  await page.goto('/admin.html');
  await page.fill('[data-form="login"] [name="email"]', 'davi@teste.com');
  await page.fill('[data-form="login"] [name="senha"]', 'qualquer-senha');
  await page.click('.login-entrar');
}

test.describe('verificação em duas etapas (MFA)', () => {
  test('admin com app cadastrado digita o código: errado mostra erro, certo abre o painel', async ({ page }) => {
    const feitos = await simularSupabase(page, [{ id: 'f1', factor_type: 'totp', friendly_name: 'Painel Decxz', status: 'verified' }]);
    await entrarComSenha(page);
    const mfa = page.locator('[data-tela="mfa"]');
    await expect(mfa).toBeVisible();
    await expect(mfa.getByRole('heading')).toHaveText('Código de verificação');
    await expect(page.locator('[data-mfa-cadastro]')).toBeHidden();
    const campo = page.getByLabel('Código de 6 dígitos');
    await expect(campo).toBeFocused();
    await expect(campo).toHaveAttribute('inputmode', 'numeric');
    await expect(campo).toHaveAttribute('autocomplete', 'one-time-code');
    await expect(page.locator('[data-tela="painel"]')).toBeHidden();

    await campo.fill('000000');
    await page.getByRole('button', { name: 'Confirmar' }).click();
    await expect(page.locator('[data-mfa-erro]')).toHaveText(/código incorreto ou expirado/);
    await expect(mfa).toBeVisible();

    await campo.fill(CODIGO_CERTO);
    await page.getByRole('button', { name: 'Confirmar' }).click();
    await expect(page.locator('[data-tela="painel"]')).toBeVisible();
    expect(feitos.desafios).toEqual(['f1', 'f1']);
    expect(feitos.codigos).toEqual(['000000', CODIGO_CERTO]);
  });

  test('código com letras ou curto nem vai pro servidor', async ({ page }) => {
    const feitos = await simularSupabase(page, [{ id: 'f1', factor_type: 'totp', status: 'verified' }]);
    await entrarComSenha(page);
    await page.getByLabel('Código de 6 dígitos').fill('12a');
    await page.getByRole('button', { name: 'Confirmar' }).click();
    await expect(page.locator('[data-mfa-erro]')).toHaveText(/código incorreto ou expirado/);
    expect(feitos.codigos).toEqual([]);
  });

  test('admin sem app cadastrado ativa com QR e chave, apagando o cadastro pela metade de antes', async ({ page }) => {
    const feitos = await simularSupabase(page, [{ id: 'f-velho', factor_type: 'totp', status: 'unverified' }]);
    await entrarComSenha(page);
    await expect(page.locator('[data-tela="mfa"]').getByRole('heading')).toHaveText('Ative a verificação em duas etapas');
    await expect(page.getByRole('img', { name: /QR code/ })).toHaveAttribute('src', /^data:image\/svg\+xml/);
    await expect(page.getByLabel(/Digite esta chave no app/)).toHaveValue(SEGREDO);
    await expect(page.locator('[data-mfa-cadastro]')).toContainText('Google Authenticator');
    await expect(page.getByLabel('Código de 6 dígitos')).toBeFocused();
    expect(feitos.apagados).toEqual(['f-velho']);

    await page.getByLabel('Código de 6 dígitos').fill(CODIGO_CERTO);
    await page.getByRole('button', { name: 'Confirmar' }).click();
    await expect(page.locator('[data-tela="painel"]')).toBeVisible();
    expect(feitos.desafios).toEqual(['f-novo']);
  });

  test('recarregar com a sessão já verificada (aal2) abre o painel direto', async ({ page }) => {
    await simularSupabase(page, [{ id: 'f1', factor_type: 'totp', status: 'verified' }]);
    await entrarComSenha(page);
    await page.getByLabel('Código de 6 dígitos').fill(CODIGO_CERTO);
    await page.getByRole('button', { name: 'Confirmar' }).click();
    await expect(page.locator('[data-tela="painel"]')).toBeVisible();
    await page.reload();
    await expect(page.locator('[data-tela="painel"]')).toBeVisible();
    await expect(page.locator('[data-tela="mfa"]')).toBeHidden();
  });

  test('recarregar só com a senha (aal1) volta para o código, e Sair desloga', async ({ page }) => {
    await simularSupabase(page, [{ id: 'f1', factor_type: 'totp', status: 'verified' }]);
    await entrarComSenha(page);
    await expect(page.locator('[data-tela="mfa"]')).toBeVisible();
    await page.reload();
    await expect(page.locator('[data-tela="mfa"]').getByRole('heading')).toHaveText('Código de verificação');
    await expect(page.locator('[data-tela="painel"]')).toBeHidden();
    await expect(page.getByLabel('Código de 6 dígitos')).toBeFocused();
    await page.locator('[data-mfa-sair]').click();
    await expect(page.locator('[data-tela="login"]')).toBeVisible();
    await page.reload();
    await expect(page.locator('[data-tela="login"]')).toBeVisible();
  });

  test('modo demonstração continua entrando sem código', async ({ page }) => {
    await page.goto('/admin.html');
    await page.fill('[data-form="login"] [name="email"]', 'demo@local');
    await page.fill('[data-form="login"] [name="senha"]', 'demo1234');
    await page.click('.login-entrar');
    await expect(page.locator('[data-tela="painel"]')).toBeVisible();
    await expect(page.locator('[data-tela="mfa"]')).toBeHidden();
  });
});
