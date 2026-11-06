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

const svg = (w, h) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="#333"/></svg>`;

const paginaYoutube = (roteiro) => `<!doctype html><title>yt</title><body style="margin:0;background:#123"><script>
const roteiro = ${JSON.stringify(roteiro || [])};
let comecou = false;
addEventListener('message', (e) => {
  let d;
  try { d = JSON.parse(e.data); } catch { return; }
  if (d.event === 'listening' && !comecou) {
    comecou = true;
    roteiro.forEach(([ms, info]) => setTimeout(() => parent.postMessage(JSON.stringify({ event: 'infoDelivery', info }), '*'), ms));
  }
  if (d.event === 'command') parent.postMessage(JSON.stringify({ event: 'comando-falso', func: d.func, args: d.args }), '*');
});
</script></body>`;

async function youtubeFalso(page, roteiro = null) {
  await page.route('**/i.ytimg.com/**', (rota) => rota.fulfill({ contentType: 'image/svg+xml', body: svg(1280, 720) }));
  await page.route(/youtube(-nocookie)?\.com/, (rota) => rota.fulfill({ contentType: 'text/html', body: roteiro ? paginaYoutube(roteiro) : '<!doctype html><title>yt</title>' }));
  await page.addInitScript(() => {
    window.__comandos = [];
    addEventListener('message', (e) => {
      let d;
      try { d = JSON.parse(e.data); } catch { return; }
      const player = document.querySelector('[data-player-video] iframe');
      if (d.event === 'comando-falso' && player && e.source === player.contentWindow) window.__comandos.push(`${d.func}:${JSON.stringify(d.args)}`);
    });
  });
}

async function soLinksDoYoutube(page, { semMaxres = false, roteiro = null } = {}) {
  await page.route('**/i.ytimg.com/**', (rota) => {
    const pequena = semMaxres && rota.request().url().includes('maxresdefault');
    rota.fulfill({ contentType: 'image/svg+xml', body: pequena ? svg(120, 90) : svg(1280, 720) });
  });
  await page.route(/youtube(-nocookie)?\.com/, (rota) => rota.fulfill({ contentType: 'text/html', body: roteiro ? paginaYoutube(roteiro) : '<!doctype html><title>yt</title>' }));
  await page.goto('/?intro=0');
  await page.evaluate(async () => {
    const { MOCK } = await import('/js/mock-data.js');
    const dados = JSON.parse(JSON.stringify(MOCK));
    dados.videos.forEach((v) => { v.preview_url = ''; v.poster_url = ''; });
    localStorage.setItem('portfolio-local', JSON.stringify(dados));
  });
  await page.reload();
}

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
    await expect(page.locator('[data-campo="sobre"]')).toContainText('video editor and motion designer');
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
    await page.getByRole('button', { name: 'todos', exact: true }).click();
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
    await expect(page.locator('.grade')).toHaveClass(/grade-vertical/);
    await page.locator('.grade .card').first().click();
    const player = page.locator('[data-player]');
    await expect(player).toHaveClass(/vertical/);
    const proporcao = await page.locator('[data-player-tela]').evaluate((el) => el.offsetHeight / el.offsetWidth);
    expect(proporcao).toBeGreaterThan(1.6);
    await page.mouse.click(5, 5);
    await expect(player).toBeHidden();
  });

  test('player passa para o próximo e volta pro anterior', async ({ page }) => {
    await page.goto('/?intro=0');
    const cards = page.locator('.grade .card');
    const total = await cards.count();
    await cards.first().click();
    const titulo = page.locator('[data-player-titulo]');
    const posicao = page.locator('[data-player-posicao]');
    await expect(posicao).toHaveText(`1 / ${total}`);
    const primeiro = await titulo.textContent();
    await page.locator('[data-player-proximo]').click();
    await expect(posicao).toHaveText(`2 / ${total}`);
    await expect(titulo).not.toHaveText(primeiro);
    await page.keyboard.press('ArrowLeft');
    await expect(posicao).toHaveText(`1 / ${total}`);
    await expect(titulo).toHaveText(primeiro);
  });

  test('clicar no Discord copia o nick e mostra o toast', async ({ page, context }, testInfo) => {
    if (!ehCelular(testInfo)) await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/?intro=0');
    await page.locator('[data-discord]').click();
    await expect(page.locator('.toast')).toHaveText('NICK COPIADO!');
    await expect(page.locator('.toast')).toHaveClass(/visivel/);
    if (!ehCelular(testInfo)) {
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('decxz.editor');
    }
  });

  test('pedir orçamento valida, monta a mensagem e fecha com ESC', async ({ page, context }, testInfo) => {
    if (!ehCelular(testInfo)) await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    const erros = vigiarErros(page);
    await page.goto('/?intro=0');
    await page.locator('.orcamento-abrir').click();
    const caixa = page.locator('[data-orcamento]');
    await expect(caixa).toBeVisible();
    expect(await caixa.evaluate((d) => d.scrollWidth - d.clientWidth)).toBeLessThanOrEqual(0);
    await page.locator('[data-orc-discord]').click();
    await expect(page.locator('[data-orc-aviso]')).not.toBeEmpty();
    await caixa.locator('input[name="nome"]').fill('Canal Teste');
    await caixa.locator('[data-orc-tipos] label').first().click();
    await caixa.locator('textarea[name="detalhes"]').fill('Vídeo de 10 minutos.');
    await page.locator('[data-orc-discord]').click();
    await expect(page.locator('[data-orc-aviso]')).toContainText('Discord');
    await page.keyboard.press('Escape');
    await expect(caixa).toBeHidden();
    if (!ehCelular(testInfo)) {
      const texto = await page.evaluate(() => navigator.clipboard.readText());
      expect(texto).toContain('Canal Teste');
      expect(texto).toContain('Vídeo de 10 minutos.');
    }
    expect(erros).toEqual([]);
  });

  test('clientes mostram 6 no cartaz e o resto em ver todos', async ({ page }) => {
    await page.goto('/?intro=0');
    await expect(page.locator('[data-lista="clientes"] > li')).toHaveCount(6);
    const mural = page.locator('[data-lista="clientes-todos"]');
    await expect(mural).toBeHidden();
    const botao = page.locator('[data-clientes-mais]');
    await expect(botao).toHaveText('VER TODOS OS CLIENTES (16)');
    await botao.click();
    await expect(mural).toBeVisible();
    await expect(mural.locator('.ficha')).toHaveCount(10);
    await expect(botao).toHaveAttribute('aria-expanded', 'true');
    await botao.click();
    await expect(mural).toBeHidden();
  });

  test('botão de pausar animações para tudo e lembra a escolha', async ({ page }) => {
    await page.goto('/?intro=0');
    const botao = page.locator('[data-movimento]');
    const video = page.locator('[data-lista="showreel"] video');
    await expect.poll(() => video.evaluate((v) => !v.paused), { timeout: 8000 }).toBe(true);
    await botao.click();
    await expect(botao).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(() => video.evaluate((v) => v.paused)).toBe(true);
    const duracao = await page.locator('.letras-pulam .l').first().evaluate((el) => parseFloat(getComputedStyle(el).animationDuration));
    expect(duracao).toBeLessThan(0.01);
    await page.reload();
    await expect(page.locator('html')).toHaveClass(/parado/);
    await expect(page.locator('[data-movimento]')).toHaveAttribute('aria-pressed', 'true');
    await page.locator('[data-movimento]').click();
    await expect(page.locator('html')).not.toHaveClass(/parado/);
  });

  test('links que abrem em nova aba avisam', async ({ page }) => {
    await page.goto('/?intro=0');
    for (const link of await page.locator('.redes a[target="_blank"]').all()) {
      await expect(link).toHaveAttribute('aria-label', /nova aba/);
    }
    await expect(page).toHaveTitle(/Decxz Editor/);
  });

  test('links perigosos são descartados', async ({ page }) => {
    await page.goto('/?intro=0');
    const r = await page.evaluate(async () => {
      const { urlSegura } = await import('/js/data.js');
      return [
        urlSegura('javascript:alert(1)'),
        urlSegura(' JavaScript:alert(1)'),
        urlSegura('data:text/html,<script>1</script>'),
        urlSegura('data:text/html,x', { midia: true }),
        urlSegura('data:image/png;base64,AAAA', { midia: true }),
        urlSegura('https://youtube.com/@x'),
      ];
    });
    expect(r).toEqual(['', '', '', '', 'data:image/png;base64,AAAA', 'https://youtube.com/@x']);
    expect(await page.locator('a[href^="javascript"], a[href^="data:"]').count()).toBe(0);
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
    const showreel = page.locator('[data-lista="showreel"] .quadro');
    await expect(showreel).toHaveCount(1);
    await expect(page.locator('[data-lista="destaques"] .quadro')).toHaveCount(3);
    await expect(showreel.locator('.quadro-rec')).toBeVisible();
    const video = showreel.locator('video');
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
    await expect(foto).toHaveAttribute('alt', 'Foto de DECXZ');
    expect(await foto.evaluate((img) => img.complete && img.naturalWidth > 0)).toBe(true);
    const texto = await page.locator('[data-campo="sobre"]').textContent();
    expect(texto.length).toBeLessThan(700);
    await expect(page.locator('[data-campo="sobre"] strong')).toHaveCount(3);
    expect(texto).not.toContain('*');
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

  test('depoimento sem inglês aparece em português no site em inglês', async ({ page }) => {
    await page.addInitScript(() => {
      try { localStorage.setItem('idioma', 'en'); } catch {}
    });
    await page.goto('/?intro=0');
    await page.evaluate(async () => {
      const { MOCK } = await import('/js/mock-data.js');
      const dados = JSON.parse(JSON.stringify(MOCK));
      dados.testimonials[0].texto_en = '';
      localStorage.setItem('portfolio-local', JSON.stringify(dados));
    });
    await page.reload();
    const lista = page.locator('[data-lista="depoimentos"]');
    await expect(lista.locator('li').first()).toContainText('Mandei o bruto numa sexta');
    await expect(lista.locator('li').nth(1)).toContainText('He gets the timing');
  });

  test('banco recém-criado, sem foto e sem texto, mostra a foto e o texto do Decxz', async ({ page }) => {
    await page.goto('/?intro=0');
    await page.evaluate(async () => {
      const { MOCK } = await import('/js/mock-data.js');
      const dados = JSON.parse(JSON.stringify(MOCK));
      dados.settings = { id: 1 };
      localStorage.setItem('portfolio-local', JSON.stringify(dados));
    });
    await page.reload();
    const foto = page.locator('[data-campo="foto"]');
    await expect(foto).toHaveAttribute('src', 'assets/foto-decxz.webp');
    await expect.poll(() => foto.evaluate((img) => img.complete && img.naturalWidth > 0)).toBe(true);
    await expect(page.locator('[data-campo="sobre"]')).toContainText('editor de vídeo e motion designer');
    await page.getByRole('button', { name: 'EN', exact: true }).first().click();
    await expect(page.locator('[data-campo="sobre"]')).toContainText('video editor and motion designer');
  });

  test('contato sem redes nem e-mail não mostra legenda nem orçamento sem destino', async ({ page }) => {
    await page.goto('/?intro=0');
    await page.evaluate(async () => {
      const { MOCK } = await import('/js/mock-data.js');
      const dados = JSON.parse(JSON.stringify(MOCK));
      Object.assign(dados.settings, { email: '', discord_nick: '', redes: { instagram: '', x: '', youtube: '' } });
      localStorage.setItem('portfolio-local', JSON.stringify(dados));
    });
    await page.reload();
    await expect(page.locator('.redes-legenda')).toBeHidden();
    await expect(page.locator('.orcamento-abrir')).toBeHidden();
    const contratar = page.locator('.contratar:visible').first();
    if (await contratar.count()) {
      await contratar.click();
      await expect(page.locator('[data-orcamento]')).not.toBeVisible();
      await expect(page).toHaveURL(/#contato$/);
    }
  });

  test('selo de comissões vem dos dados', async ({ page }) => {
    await page.goto('/?intro=0');
    await expect(page.locator('.selo-texto')).toHaveText('COMMISSIONS: ON');
    await expect(page.locator('.selo')).not.toHaveClass(/off/);
  });

  test('mira do cursor só existe com mouse e trava em botões', async ({ page }, testInfo) => {
    await page.goto('/?intro=0');
    const mira = page.locator('.mira');
    if (ehCelular(testInfo)) {
      await expect(mira).toHaveCount(0);
      return;
    }
    await expect(mira).toHaveCount(1);
    await page.mouse.move(700, 500);
    await expect(mira).toHaveClass(/visivel/);
    await page.locator('.abertura-cta').hover();
    await expect(mira).toHaveClass(/travada/);
    const caixa = await page.locator('.abertura-cta').boundingBox();
    await expect.poll(async () => (await mira.boundingBox()).width).toBeGreaterThan(caixa.width);
  });
});

test.describe('sistema com "reduzir animações" ligado', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  test('o site continua animado igual ao celular', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveClass(/intro-on/);
    await expect(page.locator('.intro')).toBeVisible();
    await expect(page.locator('html')).not.toHaveClass(/intro-on/, { timeout: 6000 });
    const animadas = await page.evaluate(() => ['.letras-pulam .l', '.rec'].filter((s) => {
      const el = document.querySelector(s);
      return el && getComputedStyle(el).animationName !== 'none' && parseFloat(getComputedStyle(el).animationDuration) > 0.1;
    }));
    expect(animadas).toEqual(['.letras-pulam .l', '.rec']);
    const video = page.locator('[data-lista="showreel"] video').first();
    await expect.poll(() => video.evaluate((v) => !v.paused), { timeout: 8000 }).toBe(true);
  });
});

test.describe('animações pausadas pelo botão', () => {
  test('sem intro, sem cursor e sem animações', async ({ page }) => {
    await page.addInitScript(() => { try { sessionStorage.setItem('movimento', 'parado'); } catch {} });
    await page.goto('/');
    await expect(page.locator('html')).toHaveClass(/parado/);
    await expect(page.locator('html')).not.toHaveClass(/intro-on/);
    await expect(page.locator('.intro')).toBeHidden();
    await expect(page.locator('.mira')).toHaveCount(0);
    const duracao = await page.locator('.letras-pulam .l').first().evaluate((el) => parseFloat(getComputedStyle(el).animationDuration));
    expect(duracao).toBeLessThan(0.01);
    const filtro = await page.locator('.abertura-nome').evaluate((el) => getComputedStyle(el).filter);
    expect(filtro).toBe('none');
    const video = page.locator('[data-lista="showreel"] video').first();
    await page.waitForTimeout(1200);
    await expect(video).toHaveJSProperty('paused', true);
    expect(await video.getAttribute('src')).toBeNull();
    const capa = page.locator('[data-lista="showreel"] img.previa-midia').first();
    await expect(capa).toBeVisible();
    expect(await capa.getAttribute('src')).toContain('assets/exemplos/');
  });

  test('a pausa vale só para esta visita', async ({ browser }) => {
    const contexto = await browser.newContext();
    const page = await contexto.newPage();
    await page.goto('/?intro=0');
    await page.locator('[data-movimento]').click();
    await page.reload();
    await expect(page.locator('html')).toHaveClass(/parado/);
    const nova = await contexto.newPage();
    await nova.goto('/?intro=0');
    await expect(nova.locator('html')).not.toHaveClass(/parado/);
    await contexto.close();
  });
});

test.describe('navegador sem animação ligada à rolagem (Safari antigo, Firefox)', () => {
  test('os blocos aparecem ao rolar pelo plano B', async ({ page }) => {
    await page.addInitScript(() => {
      const original = CSS.supports.bind(CSS);
      CSS.supports = (...args) => (String(args.join(' ')).includes('animation-timeline') ? false : original(...args));
    });
    await page.goto('/?intro=0');
    await expect(page.locator('html')).toHaveClass(/io/);
    const bloco = page.locator('.depo').first();
    await bloco.scrollIntoViewIfNeeded();
    await expect(bloco).toHaveClass(/visto/);
    await expect.poll(() => bloco.evaluate((el) => parseFloat(getComputedStyle(el).opacity))).toBeGreaterThan(0.95);
    const card = page.locator('.grade .card').first();
    await card.scrollIntoViewIfNeeded();
    await expect.poll(() => card.evaluate((el) => parseFloat(getComputedStyle(el).opacity))).toBeGreaterThan(0.95);
  });
});

test.describe('prévias do YouTube', () => {
  test('capa em alta, caindo para a próxima quando o YouTube não tem a maior', async ({ page }) => {
    await soLinksDoYoutube(page);
    const capa = page.locator('.grade .card img.previa-midia').first();
    await expect(capa).toHaveAttribute('src', /maxresdefault\.jpg$/);
    await soLinksDoYoutube(page, { semMaxres: true });
    await expect(page.locator('.grade .card img.previa-midia').first()).toHaveAttribute('src', /sddefault\.jpg$/);
  });

  test('o player do destaque é montado grande e reduzido para caber no card', async ({ page }) => {
    await soLinksDoYoutube(page);
    const tela = page.locator('[data-lista="showreel"] .quadro-tela').first();
    const iframe = tela.locator('iframe[data-previa="youtube"]');
    await expect(iframe).toHaveCount(1);
    const medidas = await iframe.evaluate((f) => {
      const t = f.parentElement.getBoundingClientRect();
      const r = f.getBoundingClientRect();
      return { largura: f.offsetWidth, altura: f.offsetHeight, cobre: r.left <= t.left + 1 && r.top <= t.top + 1 && r.right >= t.right - 1 && r.bottom >= t.bottom - 1 };
    });
    expect(Math.min(medidas.largura, medidas.altura)).toBeGreaterThanOrEqual(1080 / 2.7);
    expect(medidas.cobre).toBe(true);
  });

  test('no computador, o card dos Trabalhos toca ao passar o mouse, um de cada vez', async ({ page }, testInfo) => {
    test.skip(ehCelular(testInfo), 'só no computador');
    await soLinksDoYoutube(page);
    const cards = page.locator('.grade .card');
    const primeiro = cards.nth(0);
    const segundo = cards.nth(1);
    await primeiro.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    await expect(page.locator('.grade iframe[data-previa="youtube"]')).toHaveCount(0);
    await primeiro.hover();
    await expect(primeiro.locator('iframe[data-previa="youtube"]')).toHaveCount(1);
    await segundo.hover();
    await expect(segundo.locator('iframe[data-previa="youtube"]')).toHaveCount(1);
    await page.waitForTimeout(4000);
    await expect(segundo.locator('iframe')).toHaveClass(/rodando/);
    await expect(primeiro.locator('iframe')).not.toHaveClass(/rodando/);
    await page.mouse.move(5, 5);
    await expect(segundo.locator('iframe')).not.toHaveClass(/rodando/);
  });

  test('no celular, toca só o card do meio da tela', async ({ page }, testInfo) => {
    test.skip(!ehCelular(testInfo), 'só no celular');
    await soLinksDoYoutube(page);
    const card = page.locator('.grade .card').nth(1);
    await card.evaluate((el) => el.scrollIntoView({ block: 'center' }));
    await expect(card.locator('iframe[data-previa="youtube"]')).toHaveCount(1);
    await page.waitForTimeout(4000);
    await expect(card.locator('iframe')).toHaveClass(/rodando/);
    await expect(page.locator('.grade iframe.rodando')).toHaveCount(1);
  });

  test('com as animações pausadas, passar o mouse não toca nada', async ({ page }, testInfo) => {
    test.skip(ehCelular(testInfo), 'só no computador');
    await page.addInitScript(() => { try { sessionStorage.setItem('movimento', 'parado'); } catch {} });
    await soLinksDoYoutube(page);
    const card = page.locator('.grade .card').first();
    await card.scrollIntoViewIfNeeded();
    await card.hover();
    await page.waitForTimeout(800);
    await expect(page.locator('iframe[data-previa="youtube"]')).toHaveCount(0);
  });
});

const SOBE_ATE_1080 = [
  [100, { playerState: 1, playbackQuality: 'small', availableQualityLevels: ['hd1080', 'hd720', 'large', 'medium', 'small', 'tiny', 'auto'], muted: true, duration: 30, currentTime: 0.1 }],
  [700, { playbackQuality: 'large', currentTime: 0.7 }],
  [1400, { playbackQuality: 'hd1080', currentTime: 1.4 }],
];

async function abrirPlayer(page) {
  await page.goto('/?intro=0');
  await page.locator('.grade .card').first().click();
  await expect(page.locator('[data-player]')).toBeVisible();
}

test.describe('player na melhor qualidade', () => {
  test('o vídeo aquece escondido e aparece do começo, já em HD', async ({ page }) => {
    await youtubeFalso(page, SOBE_ATE_1080);
    await abrirPlayer(page);
    const capa = page.locator('.player-capa');
    await expect(capa).toBeVisible();
    await expect(page.locator('.player-aquece')).toHaveText('CARREGANDO EM HD');
    await page.waitForTimeout(900);
    await expect(capa).toHaveCount(1);
    await expect(capa).toHaveCount(0, { timeout: 5000 });
    const comandos = await page.evaluate(() => window.__comandos);
    expect(comandos).toEqual(expect.arrayContaining(['seekTo:[0,true]', 'unMute:[]', 'playVideo:[]']));
    expect(comandos.indexOf('seekTo:[0,true]')).toBeLessThan(comandos.indexOf('playVideo:[]'));
  });

  test('vídeo que não chega a 1080p aparece quando a qualidade para de subir', async ({ page }) => {
    await youtubeFalso(page, [
      [100, { playerState: 1, playbackQuality: 'medium', availableQualityLevels: [] }],
      [500, { playbackQuality: 'hd720' }],
    ]);
    await abrirPlayer(page);
    await page.waitForTimeout(2000);
    await expect(page.locator('.player-capa')).toHaveCount(1);
    await expect(page.locator('.player-capa')).toHaveCount(0, { timeout: 3500 });
  });

  test('sem resposta do YouTube, o vídeo aparece logo, sem travar', async ({ page }) => {
    await youtubeFalso(page, null);
    await abrirPlayer(page);
    await expect(page.locator('.player-capa')).toBeVisible();
    await expect(page.locator('.player-capa')).toHaveCount(0, { timeout: 4000 });
  });

  test('fechar durante o aquecimento não deixa nada tocando', async ({ page }) => {
    await youtubeFalso(page, SOBE_ATE_1080);
    await abrirPlayer(page);
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-player]')).toBeHidden();
    await page.waitForTimeout(2000);
    await expect(page.locator('[data-player-video] iframe, .player-capa')).toHaveCount(0);
    expect(await page.evaluate(() => window.__comandos)).toEqual([]);
  });

  test('o player é montado com pelo menos 1080 pixels reais e cobre a tela', async ({ page }) => {
    await youtubeFalso(page, null);
    await abrirPlayer(page);
    const medidas = await page.locator('[data-player-video] iframe').evaluate((f) => {
      const caixa = f.parentElement.getBoundingClientRect();
      const r = f.getBoundingClientRect();
      return {
        real: Math.min(f.offsetWidth, f.offsetHeight) * window.devicePixelRatio,
        cobre: Math.abs(r.left - caixa.left) < 2 && Math.abs(r.top - caixa.top) < 2 && Math.abs(r.right - caixa.right) < 2 && Math.abs(r.bottom - caixa.bottom) < 2,
      };
    });
    expect(medidas.real).toBeGreaterThanOrEqual(1079);
    expect(medidas.cobre).toBe(true);
  });

  test('a prévia do card só aparece depois de chegar em HD', async ({ page }, testInfo) => {
    test.skip(ehCelular(testInfo), 'só no computador');
    await soLinksDoYoutube(page, { roteiro: [
      [100, { playerState: 1, playbackQuality: 'small', availableQualityLevels: ['hd1080', 'hd720', 'small'] }],
      [1800, { playbackQuality: 'hd1080' }],
    ] });
    const card = page.locator('.grade .card').first();
    await card.scrollIntoViewIfNeeded();
    await card.hover();
    const iframe = card.locator('iframe[data-previa="youtube"]');
    await expect(iframe).toHaveCount(1);
    await page.waitForTimeout(1000);
    await expect(iframe).not.toHaveClass(/rodando/);
    await expect(iframe).toHaveClass(/rodando/, { timeout: 4000 });
  });
});
