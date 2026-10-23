import { test, expect } from '@playwright/test';

async function entrar(page) {
  await page.goto('/admin.html');
  await page.fill('[data-form="login"] [name="email"]', 'demo@local');
  await page.fill('[data-form="login"] [name="senha"]', 'demo1234');
  await page.click('.login-entrar');
  await expect(page.locator('[data-tela="painel"]')).toBeVisible();
}

test.describe('painel admin (modo local)', () => {
  test('página do admin não é indexada', async ({ page }) => {
    await page.goto('/admin.html');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  });

  test('senha errada mostra "credenciais incorretas!"', async ({ page }) => {
    await page.goto('/admin.html');
    await page.fill('[data-form="login"] [name="email"]', 'demo@local');
    await page.fill('[data-form="login"] [name="senha"]', 'senhaerrada');
    await page.click('.login-entrar');
    await expect(page.locator('[data-login-erro]')).toHaveText('credenciais incorretas!');
    await expect(page.locator('[data-tela="painel"]')).toBeHidden();
  });

  test('adicionar vídeo → aparece no site → reordenar → excluir', async ({ page, context }) => {
    await entrar(page);
    await page.click('[data-tipo="long-form"]');
    await expect(page.locator('[data-campo-filtro]')).toBeVisible();
    await page.fill('[data-form="video"] [name="titulo"]', 'Vídeo de teste');
    await page.fill('[data-form="video"] [name="link"]', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10s');
    await expect(page.locator('[data-link-ajuda]')).toContainText('dQw4w9WgXcQ');
    await expect(page.locator('[data-previa-titulo]')).toHaveText('Vídeo de teste');
    await page.selectOption('[data-form="video"] [name="filter_id"]', { label: 'Vlog' });
    await page.click('[data-form="video"] button[type="submit"]');
    await expect(page.locator('[data-toast]')).toContainText('vídeo adicionado');
    const primeiro = page.locator('[data-lista="trabalhos"] > li').first();
    await expect(primeiro.locator('.item-titulo')).toHaveText('Vídeo de teste');

    const site = await context.newPage();
    await site.goto('/?intro=0');
    await site.click('[data-categoria="long-form"]');
    await expect(site.locator('.grade .quadro-titulo').first()).toHaveText('Vídeo de teste');
    await site.getByRole('button', { name: 'Vlog' }).click();
    await expect(site.locator('.grade .card')).toHaveCount(2);

    await page.fill('[data-busca]', 'long form');
    await expect(page.locator('[data-lista="trabalhos"] > li')).toHaveCount(5);
    await primeiro.locator('.alca').focus();
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('[data-toast]')).toContainText('ordem salva');
    await expect(page.locator('[data-lista="trabalhos"] > li').nth(1).locator('.item-titulo')).toHaveText('Vídeo de teste');
    await site.reload();
    await site.click('[data-categoria="long-form"]');
    await expect(site.locator('.grade .quadro-titulo').first()).toHaveText('Zerei o jogo sem tomar dano');
    await expect(site.locator('.grade .quadro-titulo').nth(1)).toHaveText('Vídeo de teste');
    await page.fill('[data-busca]', '');

    const item = page.locator('[data-lista="trabalhos"] > li', { hasText: 'Vídeo de teste' });
    await item.getByRole('button', { name: /Excluir Vídeo de teste/ }).click();
    await expect(page.locator('[data-confirmar]')).toBeVisible();
    await page.locator('[data-confirmar] button[value="sim"]').click();
    await expect(page.locator('[data-toast]')).toContainText('vídeo excluído');
    await expect(page.locator('[data-lista="trabalhos"]')).not.toContainText('Vídeo de teste');
    await site.reload();
    await site.click('[data-categoria="long-form"]');
    await expect(site.locator('.grade')).not.toContainText('Vídeo de teste');
  });

  test('link inválido não é aceito', async ({ page }) => {
    await entrar(page);
    await page.fill('[data-form="video"] [name="titulo"]', 'Sem link');
    await page.fill('[data-form="video"] [name="link"]', 'https://vimeo.com/123');
    await expect(page.locator('[data-link-ajuda]')).toHaveText('não reconheci esse link do YouTube');
    await page.click('[data-form="video"] button[type="submit"]');
    await expect(page.locator('[data-video-erro]')).toHaveText('cola um link do YouTube válido!');
  });

  test('vídeo novo com clipe e destaque aparece tocando na abertura', async ({ page, context }) => {
    await entrar(page);
    await page.fill('[data-form="video"] [name="titulo"]', 'Clipe novo');
    await page.fill('[data-form="video"] [name="link"]', 'https://youtu.be/dQw4w9WgXcQ');
    await page.setInputFiles('[data-form="video"] [name="clipe"]', 'assets/exemplos/previa-motion.webm');
    await expect(page.locator('[data-rotulo="clipe"]')).toContainText('previa-motion.webm');
    await expect(page.locator('[data-previa-video]')).toBeVisible();
    await page.check('[data-form="video"] [name="destaque"]');
    await page.click('[data-form="video"] button[type="submit"]');
    await expect(page.locator('[data-toast]')).toContainText('vídeo adicionado');
    const site = await context.newPage();
    await site.goto('/?intro=0');
    const destaque = site.locator('#topo .quadro', { hasText: 'Clipe novo' });
    await expect(destaque).toHaveCount(1);
    await expect(destaque.locator('video')).toHaveJSProperty('muted', true);
  });

  test('foto do sobre mim troca pelo link', async ({ page, context }) => {
    await entrar(page);
    await page.fill('[data-form="textos"] [name="foto_url"]', 'https://exemplo.com/foto.jpg');
    await page.click('[data-form="textos"] button[type="submit"]');
    await expect(page.locator('[data-salvo]')).toHaveText('salvo ✓');
    const site = await context.newPage();
    await site.goto('/?intro=0');
    await expect(site.locator('[data-campo="foto"]')).toHaveAttribute('src', /assets\/avatar-exemplo\.svg|exemplo\.com/);
  });

  test('link de Shorts deixa a prévia em 9:16', async ({ page }) => {
    await entrar(page);
    await page.fill('[data-form="video"] [name="link"]', 'https://youtube.com/shorts/dQw4w9WgXcQ');
    await expect(page.locator('[data-previa-thumb]')).toHaveClass(/vertical/);
  });

  test('desligar comissões muda o carimbo no site', async ({ page, context }) => {
    await entrar(page);
    const botao = page.locator('[data-comissoes]');
    await expect(botao).toHaveAttribute('aria-pressed', 'true');
    await botao.click();
    await expect(botao).toHaveAttribute('aria-pressed', 'false');
    const site = await context.newPage();
    await site.goto('/?intro=0');
    await expect(site.locator('.selo-texto')).toHaveText('COMMISSIONS: OFF');
    await expect(site.locator('.selo')).toHaveClass(/off/);
    await botao.click();
    await site.reload();
    await expect(site.locator('.selo-texto')).toHaveText('COMMISSIONS: ON');
  });

  test('salvar textos atualiza o site', async ({ page, context }) => {
    await entrar(page);
    await page.fill('[data-form="textos"] [name="sobre_pt"]', 'Texto novo do sobre mim.');
    await page.click('[data-form="textos"] button[type="submit"]');
    await expect(page.locator('[data-salvo]')).toHaveText('salvo ✓');
    const site = await context.newPage();
    await site.goto('/?intro=0');
    await expect(site.locator('[data-campo="sobre"]')).toHaveText('Texto novo do sobre mim.');
  });

  test('criar e excluir categoria e filtro', async ({ page }) => {
    await entrar(page);
    await page.fill('#nova-categoria', 'Thumbnails');
    await page.click('[data-form="categoria"] .botao-add');
    await expect(page.locator('[data-lista="categorias"]')).toContainText('Thumbnails');
    await expect(page.locator('[data-tipo="thumbnails"]')).toBeVisible();
    await page.getByRole('button', { name: 'Excluir Thumbnails' }).click();
    await page.locator('[data-confirmar] button[value="sim"]').click();
    await expect(page.locator('[data-lista="categorias"]')).not.toContainText('Thumbnails');
    await page.fill('#novo-filtro', 'Podcast');
    await page.click('[data-form="filtro"] .botao-add');
    await expect(page.locator('[data-lista="filtros"]')).toContainText('Podcast');
  });

  test('cliente novo com link de foto aparece na lista', async ({ page }) => {
    await entrar(page);
    await page.fill('[data-form="cliente"] [name="nome"]', 'Canal Novo');
    await page.fill('[data-form="cliente"] [name="canal_url"]', 'youtube.com/@canalnovo');
    await page.click('[data-form="cliente"] button[type="submit"]');
    await expect(page.locator('[data-lista="clientes"]')).toContainText('Canal Novo');
  });

  test('depoimento novo aparece no site e pode ser excluído', async ({ page, context }) => {
    await entrar(page);
    const form = page.locator('[data-form="depoimento"]');
    await form.locator('[name="nome"]').fill('Cliente Teste');
    await form.locator('[name="canal"]').fill('Canal Teste');
    await form.locator('[name="texto_pt"]').fill('Edição impecável e no prazo.');
    await form.locator('button[type="submit"]').click();
    await expect(page.locator('[data-toast]')).toContainText('depoimento adicionado');
    await expect(page.locator('[data-lista="depoimentos"]')).toContainText('Cliente Teste');
    const site = await context.newPage();
    await site.goto('/?intro=0');
    await expect(site.locator('[data-lista="depoimentos"]')).toContainText('Edição impecável e no prazo.');
    await page.getByRole('button', { name: 'Excluir depoimento de Cliente Teste' }).click();
    await page.locator('[data-confirmar] button[value="sim"]').click();
    await expect(page.locator('[data-lista="depoimentos"]')).not.toContainText('Cliente Teste');
  });

  test('números do site são editados no painel', async ({ page, context }) => {
    await entrar(page);
    const form = page.locator('[data-form="textos"]');
    await form.locator('[name="numero_valor_0"]').fill('+99');
    await form.locator('[name="numero_pt_0"]').fill('cafés tomados');
    await form.locator('[name="numero_valor_1"]').fill('');
    await form.locator('[name="numero_pt_1"]').fill('');
    await form.locator('button[type="submit"]').click();
    await expect(page.locator('[data-salvo]')).toHaveText('salvo ✓');
    const site = await context.newPage();
    await site.goto('/?intro=0');
    const itens = site.locator('[data-lista="numeros"] > li');
    await expect(itens).toHaveCount(3);
    await expect(itens.first()).toContainText('cafés tomados');
  });

  test('sair volta para o login', async ({ page }) => {
    await entrar(page);
    await page.click('[data-sair]');
    await expect(page.locator('[data-tela="login"]')).toBeVisible();
    await page.reload();
    await expect(page.locator('[data-tela="login"]')).toBeVisible();
  });
});
