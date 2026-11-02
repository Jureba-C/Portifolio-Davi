import { test, expect } from '@playwright/test';

async function entrar(page) {
  await page.goto('/admin.html');
  await page.fill('[data-form="login"] [name="email"]', 'demo@local');
  await page.fill('[data-form="login"] [name="senha"]', 'demo1234');
  await page.click('.login-entrar');
  await expect(page.locator('[data-tela="painel"]')).toBeVisible();
}

async function irPara(page, pagina) {
  await page.click(`[data-ir="${pagina}"]`);
  await expect(page.locator(`[data-pagina="${pagina}"]`)).toBeVisible();
}

async function novoVideo(page) {
  await page.click('[data-novo-video]');
  await expect(page.locator('[data-gaveta="video"]')).toBeVisible();
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

  test('botão de mostrar senha troca o campo', async ({ page }) => {
    await page.goto('/admin.html');
    const senha = page.locator('[data-form="login"] [name="senha"]');
    await expect(senha).toHaveAttribute('type', 'password');
    await page.click('[data-ver-senha]');
    await expect(senha).toHaveAttribute('type', 'text');
  });

  test('adicionar vídeo → aparece no site → reordenar → excluir', async ({ page, context }) => {
    await entrar(page);
    await expect(page.locator('[data-pagina="videos"]')).toBeVisible();
    await novoVideo(page);
    await page.click('[data-tipo="long-form"]');
    await expect(page.locator('[data-campo-filtro]')).toBeVisible();
    await page.fill('[data-form="video"] [name="titulo"]', 'Vídeo de teste');
    await page.fill('[data-form="video"] [name="link"]', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10s');
    await expect(page.locator('[data-link-ajuda]')).toContainText('dQw4w9WgXcQ');
    await expect(page.locator('[data-previa-titulo]')).toHaveText('Vídeo de teste');
    await page.selectOption('[data-form="video"] [name="filter_id"]', { label: 'Vlog' });
    await page.click('[data-form="video"] button[type="submit"]');
    await expect(page.locator('[data-toast]')).toContainText('vídeo adicionado');
    await expect(page.locator('[data-gaveta="video"]')).toBeHidden();
    const primeiro = page.locator('[data-lista="trabalhos"] > li').first();
    await expect(primeiro.locator('.item-titulo')).toHaveText('Vídeo de teste');
    await expect(page.locator('[data-conta="videos"]')).toHaveText('13');

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
    await expect(site.locator('[data-lista="filtros"]')).toBeVisible();
    await expect(site.locator('.grade')).not.toContainText('Vídeo de teste');
  });

  test('editar vídeo pela gaveta muda o título na lista', async ({ page }) => {
    await entrar(page);
    const item = page.locator('[data-lista="trabalhos"] > li', { hasText: 'Lyric video' });
    await item.getByRole('button', { name: /Editar Lyric video/ }).click();
    await expect(page.locator('[data-video-titulo]')).toHaveText('Editar vídeo');
    await expect(page.locator('[data-form="video"] [name="titulo"]')).toHaveValue('Lyric video — Rota 77');
    await page.fill('[data-form="video"] [name="titulo"]', 'Lyric video renomeado');
    await page.click('[data-video-botao]');
    await expect(page.locator('[data-toast]')).toContainText('vídeo salvo');
    await expect(page.locator('[data-lista="trabalhos"]')).toContainText('Lyric video renomeado');
  });

  test('fechar a gaveta com mudanças pede confirmação', async ({ page }) => {
    await entrar(page);
    await novoVideo(page);
    await page.fill('[data-form="video"] [name="titulo"]', 'Rascunho');
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-confirmar]')).toBeVisible();
    await page.locator('[data-confirmar] button[value="nao"]').click();
    await expect(page.locator('[data-gaveta="video"]')).toBeVisible();
    await page.locator('[data-gaveta="video"] .gaveta-botoes [data-fechar]').click();
    await page.locator('[data-confirmar] button[value="sim"]').click();
    await expect(page.locator('[data-gaveta="video"]')).toBeHidden();
  });

  test('filtro por categoria mostra só aqueles vídeos', async ({ page }) => {
    await entrar(page);
    await page.locator('[data-lista="filtro-categoria"]').getByRole('button', { name: /Vertical/ }).click();
    await expect(page.locator('[data-lista="trabalhos"] > li')).toHaveCount(4);
    await expect(page.locator('[data-lista="trabalhos"] .etiqueta-cat').first()).toHaveText('Vertical');
  });

  test('link inválido não é aceito', async ({ page }) => {
    await entrar(page);
    await novoVideo(page);
    await page.fill('[data-form="video"] [name="titulo"]', 'Sem link');
    await page.fill('[data-form="video"] [name="link"]', 'https://vimeo.com/123');
    await expect(page.locator('[data-link-ajuda]')).toHaveText('não reconheci esse link do YouTube');
    await page.click('[data-form="video"] button[type="submit"]');
    await expect(page.locator('[data-video-erro]')).toHaveText('cola um link do YouTube válido!');
  });

  test('vídeo novo com clipe e destaque aparece tocando na abertura', async ({ page, context }) => {
    await entrar(page);
    await novoVideo(page);
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

  test('estrela tira e coloca nos destaques', async ({ page }) => {
    await entrar(page);
    const item = page.locator('[data-lista="trabalhos"] > li', { hasText: 'Lyric video' });
    const estrela = item.getByRole('button', { name: /Destacar Lyric video/ });
    await expect(estrela).toHaveAttribute('aria-pressed', 'false');
    await estrela.click();
    await expect(page.locator('[data-toast]')).toContainText('destaques');
    await expect(item.getByRole('button', { name: /Tirar Lyric video.* dos destaques/ })).toHaveAttribute('aria-pressed', 'true');
  });

  test('foto do sobre mim troca pelo link', async ({ page, context }) => {
    await entrar(page);
    await irPara(page, 'textos');
    await page.fill('[data-form="textos"] [name="foto_url"]', 'https://exemplo.com/foto.jpg');
    await page.click('[data-form="textos"] button[type="submit"]');
    await expect(page.locator('[data-salvo]')).toHaveText('salvo ✓');
    const site = await context.newPage();
    await site.goto('/?intro=0');
    await expect(site.locator('[data-campo="foto"]')).toHaveAttribute('src', /assets\/avatar-exemplo\.svg|exemplo\.com/);
  });

  test('link de Shorts deixa a prévia em 9:16', async ({ page }) => {
    await entrar(page);
    await novoVideo(page);
    await page.fill('[data-form="video"] [name="link"]', 'https://youtube.com/shorts/dQw4w9WgXcQ');
    await expect(page.locator('[data-previa-thumb]')).toHaveClass(/vertical/);
    await expect(page.locator('[data-link-ajuda]')).toContainText('Short reconhecido');
  });

  test('desligar comissões muda o carimbo no site', async ({ page, context }) => {
    await entrar(page);
    await irPara(page, 'textos');
    const botao = page.locator('[data-comissoes]');
    await expect(botao).toHaveAttribute('aria-pressed', 'true');
    await botao.click();
    await expect(botao).toHaveAttribute('aria-pressed', 'false');
    const site = await context.newPage();
    await site.goto('/?intro=0');
    await expect(site.locator('.selo-texto')).toHaveText('COMMISSIONS: OFF');
    await expect(site.locator('.selo')).toHaveClass(/off/);
    await botao.click();
    await expect(botao).toHaveAttribute('aria-pressed', 'true');
    await site.reload();
    await expect(site.locator('.selo-texto')).toHaveText('COMMISSIONS: ON');
  });

  test('salvar textos atualiza o site', async ({ page, context }) => {
    await entrar(page);
    await irPara(page, 'textos');
    await expect(page.locator('[data-barra-salvar]')).toBeHidden();
    await page.fill('[data-form="textos"] [name="sobre_pt"]', 'Texto novo do sobre mim.');
    await expect(page.locator('[data-barra-salvar]')).toBeVisible();
    await page.click('[data-form="textos"] button[type="submit"]');
    await expect(page.locator('[data-salvo]')).toHaveText('salvo ✓');
    await expect(page.locator('[data-barra-salvar]')).toBeHidden();
    const site = await context.newPage();
    await site.goto('/?intro=0');
    await expect(site.locator('[data-campo="sobre"]')).toHaveText('Texto novo do sobre mim.');
  });

  test('sair de Textos com mudanças avisa e descartar volta ao salvo', async ({ page }) => {
    await entrar(page);
    await irPara(page, 'textos');
    const nome = page.locator('[data-form="textos"] [name="nome"]');
    await nome.fill('Outro nome');
    await page.click('[data-ir="clientes"]');
    await expect(page.locator('[data-confirmar]')).toBeVisible();
    await page.locator('[data-confirmar] button[value="nao"]').click();
    await expect(page.locator('[data-pagina="textos"]')).toBeVisible();
    await page.click('[data-descartar]');
    await expect(nome).toHaveValue('DECXZ');
    await expect(page.locator('[data-barra-salvar]')).toBeHidden();
  });

  test('ver como fica mostra o negrito do sobre mim', async ({ page }) => {
    await entrar(page);
    await irPara(page, 'textos');
    await page.click('[data-ver-sobre]');
    await expect(page.locator('[data-sobre-previa="sobre_pt"] strong').first()).toHaveText('3 anos de experiência profissional');
  });

  test('o endereço com # abre a tela certa', async ({ page }) => {
    await entrar(page);
    await page.goto('/admin.html#clientes');
    await expect(page.locator('[data-pagina="clientes"]')).toBeVisible();
    await expect(page.locator('[data-ir="clientes"]')).toHaveAttribute('aria-current', 'page');
    await page.click('[data-ir="categorias"]');
    await page.goBack();
    await expect(page.locator('[data-pagina="clientes"]')).toBeVisible();
  });

  test('criar e excluir categoria e filtro', async ({ page }) => {
    await entrar(page);
    await irPara(page, 'categorias');
    await page.fill('#nova-categoria', 'Thumbnails');
    await page.click('[data-form="categoria"] .botao-add');
    await expect(page.locator('[data-lista="categorias"]')).toContainText('Thumbnails');
    await expect(page.locator('[data-lista="filtro-categoria"]')).toContainText('Thumbnails');
    await page.getByRole('button', { name: 'Excluir Thumbnails' }).click();
    await page.locator('[data-confirmar] button[value="sim"]').click();
    await expect(page.locator('[data-lista="categorias"]')).not.toContainText('Thumbnails');
    await page.fill('#novo-filtro', 'Podcast');
    await page.click('[data-form="filtro"] .botao-add');
    await expect(page.locator('[data-lista="filtros"]')).toContainText('Podcast');
  });

  test('cliente novo com link de foto aparece na lista', async ({ page }) => {
    await entrar(page);
    await irPara(page, 'clientes');
    await page.click('[data-novo-cliente]');
    await page.fill('[data-form="cliente"] [name="nome"]', 'Canal Novo');
    await page.fill('[data-form="cliente"] [name="canal_url"]', 'youtube.com/@canalnovo');
    await page.click('[data-form="cliente"] button[type="submit"]');
    await expect(page.locator('[data-lista="clientes"]')).toContainText('Canal Novo');
    await expect(page.locator('[data-lista="clientes"] > li').last()).toContainText('em ver todos');
  });

  test('depoimento novo aparece no site, pode ser editado e excluído', async ({ page, context }) => {
    await entrar(page);
    await irPara(page, 'depoimentos');
    await page.click('[data-novo-depoimento]');
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
    await page.getByRole('button', { name: 'Editar depoimento de Cliente Teste' }).click();
    await form.locator('[name="texto_pt"]').fill('Edição impecável, rápida e no prazo.');
    await form.locator('button[type="submit"]').click();
    await expect(page.locator('[data-toast]')).toContainText('depoimento salvo');
    await site.reload();
    await expect(site.locator('[data-lista="depoimentos"]')).toContainText('Edição impecável, rápida e no prazo.');
    await page.getByRole('button', { name: 'Excluir depoimento de Cliente Teste' }).click();
    await page.locator('[data-confirmar] button[value="sim"]').click();
    await expect(page.locator('[data-lista="depoimentos"]')).not.toContainText('Cliente Teste');
  });

  test('sair volta para o login', async ({ page }) => {
    await entrar(page);
    await page.click('[data-sair]');
    await expect(page.locator('[data-tela="login"]')).toBeVisible();
    await page.reload();
    await expect(page.locator('[data-tela="login"]')).toBeVisible();
  });
});
