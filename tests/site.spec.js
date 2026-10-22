import { test, expect } from '@playwright/test';

const EXTERNOS = /ytimg\.com|youtube(-nocookie)?\.com|google|gstatic/;

function vigiarErros(page) {
  const erros = [];
  page.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const local = m.location()?.url ?? '';
    if (EXTERNOS.test(local) || /ERR_TUNNEL|ERR_NAME|ERR_CONNECTION|net::/.test(m.text())) return;
    erros.push(`console: ${m.text()}`);
  });
  page.on('response', (r) => {
    if (r.status() >= 400 && !EXTERNOS.test(r.url())) erros.push(`${r.status()} ${r.url()}`);
  });
  return erros;
}

const ehCelular = (testInfo) => testInfo.project.name.startsWith('celular') || testInfo.project.name.startsWith('iphone');

test.describe('site público', () => {
  test('carrega sem erros, sem 4xx/5xx e sem rolagem horizontal', async ({ page }) => {
    const erros = vigiarErros(page);
    await page.goto('/?intro=0');
    await expect(page.locator('.card').first()).toBeVisible();
    await expect(page.locator('.client').first()).toBeAttached();
    const rolagemLateral = await page.evaluate(() => {
      window.scrollTo(300, window.scrollY);
      const x = window.scrollX;
      window.scrollTo(0, window.scrollY);
      return x;
    });
    expect(rolagemLateral).toBe(0);
    expect(erros).toEqual([]);
  });

  test('intro roda uma vez por sessão e some sozinha', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveClass(/intro-on/);
    await expect(page.locator('.intro')).toBeVisible();
    await expect(page.locator('html')).not.toHaveClass(/intro-on/, { timeout: 5000 });
    await expect(page.locator('.intro')).toBeHidden();
    await page.reload();
    await expect(page.locator('html')).not.toHaveClass(/intro-on/);
  });

  test('intro pode ser pulada com uma tecla', async ({ page }, testInfo) => {
    test.skip(ehCelular(testInfo), 'teclado só no computador');
    await page.goto('/');
    await expect(page.locator('html')).toHaveClass(/intro-on/);
    await page.keyboard.press('Space');
    await expect(page.locator('html')).not.toHaveClass(/intro-on/, { timeout: 1500 });
  });

  test('troca PT/EN e lembra a escolha', async ({ page }) => {
    await page.goto('/?intro=0');
    await expect(page.locator('#trabalhos-titulo')).toHaveText('TRABALHOS');
    await page.click('[data-idioma="en"]');
    await expect(page.locator('#trabalhos-titulo')).toHaveText('WORK');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('[data-campo="sobre"]')).toContainText('editing video');
    await page.reload();
    await expect(page.locator('#trabalhos-titulo')).toHaveText('WORK');
    await page.click('[data-idioma="pt"]');
    await expect(page.locator('#trabalhos-titulo')).toHaveText('TRABALHOS');
  });

  test('abas e sub-filtros do Long Form', async ({ page }) => {
    await page.goto('/?intro=0');
    await expect(page.locator('[data-lista="filtros"]')).toBeHidden();
    await page.click('[data-categoria="vertical"]');
    await expect(page.locator('[data-categoria="vertical"]')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('.grade')).toHaveClass(/grade-vertical/);
    await page.click('[data-categoria="long-form"]');
    await expect(page.locator('[data-lista="filtros"]')).toBeVisible();
    await expect(page.locator('.grade .card')).toHaveCount(4);
    await page.getByRole('button', { name: 'Vlog' }).click();
    await expect(page.locator('.grade .card')).toHaveCount(1);
    await expect(page.locator('.grade .quadro-titulo')).toHaveText('Um dia na Paulista');
    await page.getByRole('button', { name: 'todos' }).click();
    await expect(page.locator('.grade .card')).toHaveCount(4);
  });

  test('abas respondem às setas do teclado', async ({ page }, testInfo) => {
    test.skip(ehCelular(testInfo), 'teclado só no computador');
    await page.goto('/?intro=0');
    await page.focus('[data-categoria="motion"]');
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('[data-categoria="vertical"]')).toBeFocused();
    await expect(page.locator('[data-categoria="vertical"]')).toHaveAttribute('aria-selected', 'true');
  });

  test('player abre com o vídeo do YouTube (nocookie) e fecha com ESC', async ({ page }) => {
    await page.goto('/?intro=0');
    const card = page.locator('.grade .card').nth(1);
    await card.click();
    const player = page.locator('[data-player]');
    await expect(player).toBeVisible();
    await expect(player.locator('iframe')).toHaveAttribute('src', /^https:\/\/www\.youtube-nocookie\.com\/embed\/eRsGyueVLvQ\?/);
    await expect(page.locator('#player-titulo')).toHaveText('Abertura do canal Pixel Torto');
    await page.keyboard.press('Escape');
    await expect(player).toBeHidden();
    await expect(page.locator('[data-player] iframe')).toHaveCount(0);
  });

  test('player fecha clicando fora e Shorts abre em 9:16', async ({ page }) => {
    await page.goto('/?intro=0');
    await page.click('[data-categoria="vertical"]');
    await page.locator('.grade .card').first().click();
    const player = page.locator('[data-player]');
    await expect(player).toHaveClass(/vertical/);
    const caixa = await page.locator('[data-player-tela]').boundingBox();
    expect(caixa.height / caixa.width).toBeGreaterThan(1.6);
    await page.mouse.click(5, 5);
    await expect(player).toBeHidden();
  });

  test('clicar no Discord copia o nick e mostra o toast', async ({ page, context }, testInfo) => {
    if (!ehCelular(testInfo)) await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/?intro=0');
    await page.locator('[data-discord]').click();
    await expect(page.locator('.toast')).toHaveText('NICK COPIADO!');
    await expect(page.locator('.toast')).toHaveClass(/visivel/);
    if (!ehCelular(testInfo)) {
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('davi.edits');
    }
  });

  test('a aranha foge ao clicar e volta quicando', async ({ page }) => {
    await page.goto('/?intro=0');
    await page.locator('.aranha-hero').click({ force: true });
    await expect(page.locator('.fuga')).toHaveClass(/flee-up/);
    await expect(page.locator('.ei')).toBeVisible();
    await expect(page.locator('.fuga')).toHaveClass(/flee-down/, { timeout: 4000 });
    await expect(page.locator('.ei')).toBeHidden();
  });

  test('destaques da abertura tocam sozinhos, sem som e sem botão de play', async ({ page }) => {
    await page.goto('/?intro=0');
    const destaques = page.locator('[data-lista="destaques"] .quadro');
    await expect(destaques).toHaveCount(4);
    await expect(destaques.first().locator('.quadro-rec')).toBeVisible();
    const video = destaques.first().locator('video');
    await expect(video).toHaveJSProperty('muted', true);
    await expect(video).toHaveJSProperty('loop', true);
    await expect(video).not.toHaveAttribute('controls', /.*/);
    await expect.poll(() => video.evaluate((v) => !v.paused && v.currentTime > 0), { timeout: 8000 }).toBe(true);
    await expect(page.locator('.quadro button, .quadro .thumb-play')).toHaveCount(0);
  });

  test('prévias dos trabalhos tocam só quando aparecem e pausam ao abrir o player', async ({ page }) => {
    await page.goto('/?intro=0');
    const card = page.locator('.grade .card').first();
    const video = card.locator('video');
    await expect(video).toHaveJSProperty('paused', true);
    await card.scrollIntoViewIfNeeded();
    await expect.poll(() => video.evaluate((v) => !v.paused), { timeout: 8000 }).toBe(true);
    await card.click();
    await expect(page.locator('[data-player]')).toBeVisible();
    await expect.poll(() => video.evaluate((v) => v.paused)).toBe(true);
    await page.keyboard.press('Escape');
    await expect.poll(() => video.evaluate((v) => !v.paused), { timeout: 8000 }).toBe(true);
  });

  test('vídeo sem clipe mostra a capa, sem botão de play', async ({ page }) => {
    await page.goto('/?intro=0');
    const semClipe = page.locator('.grade .card', { hasText: 'Vinheta de live' });
    await expect(semClipe.locator('video')).toHaveCount(0);
    await expect(semClipe.locator('img.previa-midia, .previa-sem')).toHaveCount(1);
  });

  test('sobre mim tem foto e texto curto', async ({ page }) => {
    await page.goto('/?intro=0');
    const foto = page.locator('[data-campo="foto"]');
    await expect(foto).toHaveAttribute('alt', 'Foto de DAVI');
    expect(await foto.evaluate((img) => img.complete && img.naturalWidth > 0)).toBe(true);
    const texto = await page.locator('[data-campo="sobre"]').textContent();
    expect(texto.length).toBeLessThan(320);
    await expect(page.locator('.olho, .olho-svg')).toHaveCount(0);
  });

  test('âncoras do menu levam às seções', async ({ page }, testInfo) => {
    await page.goto('/?intro=0');
    if (ehCelular(testInfo)) {
      await page.click('.menu-botao');
      await expect(page.locator('.menu-botao')).toHaveAttribute('aria-expanded', 'true');
    }
    await page.locator('.menu a[href="#contato"]').click();
    await expect(page).toHaveURL(/#contato$/);
    await expect(page.locator('#contato-titulo')).toBeInViewport();
    if (ehCelular(testInfo)) await expect(page.locator('.menu-botao')).toHaveAttribute('aria-expanded', 'false');
  });

  test('selo de comissões vem dos dados', async ({ page }) => {
    await page.goto('/?intro=0');
    await expect(page.locator('.selo-texto')).toHaveText('COMMISSIONS: ON');
    await expect(page.locator('.selo')).not.toHaveClass(/off/);
  });

  test('cursor de tinta só existe com mouse', async ({ page }, testInfo) => {
    await page.goto('/?intro=0');
    const total = await page.locator('.ink-cursor').count();
    if (ehCelular(testInfo)) expect(total).toBe(0);
    else expect(total).toBe(5);
  });
});

test.describe('movimento reduzido', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  test('sem intro, sem cursor e sem animações', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).not.toHaveClass(/intro-on/);
    await expect(page.locator('.intro')).toBeHidden();
    await expect(page.locator('.ink-cursor')).toHaveCount(0);
    const animadas = await page.evaluate(() => {
      const nomes = ['.letras-pulam .l', '.swing', '.strip-l', '.flutua', '.rec', '.gira', '.pisca'];
      return nomes.filter((s) => {
        const el = document.querySelector(s);
        return el && getComputedStyle(el).animationName !== 'none';
      });
    });
    expect(animadas).toEqual([]);
    const filtro = await page.locator('.abertura-nome').evaluate((el) => getComputedStyle(el).filter);
    expect(filtro).toBe('none');
    const video = page.locator('[data-lista="destaques"] video').first();
    await page.waitForTimeout(1200);
    await expect(video).toHaveJSProperty('paused', true);
    expect(await video.getAttribute('src')).toBeNull();
    expect(await video.getAttribute('poster')).toContain('assets/exemplos/');
  });
});
