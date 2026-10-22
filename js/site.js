import { carregarSite, thumbYoutube, linkYoutube, iniciais } from './data.js';
import { t, campo, aplicar, definirIdioma, idioma, aoMudarIdioma } from './i18n.js';
import {
  iniciarRevelacao,
  iniciarAranhaHero,
  iniciarWalker,
  iniciarOlho,
  iniciarRodape,
  letrasPulando,
  temMouse,
} from './animations.js';
import { iniciarCursor } from './cursor.js';
import { criarPlayer } from './player.js';
import { el, usoSvg } from './dom.js';

const TILTS = ['tilt-l', 'tilt-r', 'tilt-0'];
const ICONES = {
  instagram: '<svg aria-hidden="true" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.8" fill="currentColor"/></svg>',
  x: '<svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 4l16 16"/><path d="M20 4L4 20"/></svg>',
  youtube: '<svg aria-hidden="true" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="M10 9.5v5l4.5-2.5z" fill="currentColor"/></svg>',
  discord: '<svg aria-hidden="true" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7 C 10 5.8, 14 5.8, 17 7 C 19 10, 20 13, 19.5 16.5 C 18 17.8, 16.5 18.5, 15 19 L 14 17"/><path d="M10 17 L 9 19 C 7.5 18.5, 6 17.8, 4.5 16.5 C 4 13, 5 10, 7 7"/><circle cx="9.5" cy="12.5" r="1.2" fill="currentColor"/><circle cx="14.5" cy="12.5" r="1.2" fill="currentColor"/></svg>',
  email: '<svg aria-hidden="true" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 6.5 C 9 6, 15 6.4, 20.5 6 L 20 18 C 14 18.4, 9 17.8, 4 18.2 Z"/><path d="M4 7 L 12 13 L 20 6.5"/></svg>',
};

const estado = { db: null, categoria: null, filtro: 'todos' };
const player = criarPlayer();
let observarNovos = () => {};
let timerToast;

function aranhaVazia(texto) {
  return el('div', { class: 'vazio' },
    el('span', { class: 'fio', 'aria-hidden': 'true' }),
    usoSvg('aranha', 'aranha-svg swing'),
    el('p', { class: 'vazio-texto', text: texto }));
}

function nomeDaCategoria(cat) {
  return campo(cat, 'nome');
}

function categoriaDe(video) {
  return estado.db.categories.find((c) => c.id === video.category_id);
}

function ehVertical(cat) {
  return cat?.formato === 'vertical';
}

function usaFiltros(cat) {
  return cat?.slug === 'long-form' && estado.db.longform_filters.length > 0;
}

function tagDoPlayer(video) {
  const cat = categoriaDe(video);
  const partes = [nomeDaCategoria(cat).toUpperCase()];
  const filtro = estado.db.longform_filters.find((f) => f.id === video.filter_id);
  if (filtro) partes.push(campo(filtro, 'nome').toUpperCase());
  return partes.filter(Boolean).join(' · ');
}

function abrirVideo(video) {
  player.abrir({
    titulo: video.titulo,
    descricao: campo(video, 'descricao'),
    youtubeId: video.youtube_id,
    vertical: ehVertical(categoriaDe(video)),
    tag: tagDoPlayer(video),
  });
}

function renderNome() {
  const nome = estado.db.settings.nome || 'DAVI';
  document.querySelectorAll('[data-campo="nome"]').forEach((no) => { no.textContent = nome; });
  const h1 = document.querySelector('[data-campo="nome-letras"]');
  h1.setAttribute('aria-label', nome);
  letrasPulando(h1, nome);
  document.querySelector('[data-campo="nome-traco"]').textContent = `${nome} — `;
  document.querySelector('[data-campo="ano"]').textContent = String(new Date().getFullYear());
}

function renderFaixas() {
  [['a', 'strip-palavra-a'], ['b', 'strip-palavra-b']].forEach(([lado, classe]) => {
    const alvo = document.querySelector(`[data-faixa="${lado}"]`);
    const palavras = t(`faixa.${lado}`);
    alvo.textContent = '';
    for (let volta = 0; volta < 4; volta += 1) {
      palavras.forEach((palavra) => {
        alvo.append(el('span', { class: classe, text: palavra }), usoSvg('estrela', 'spin estrela', 'viewBox="0 0 40 40"'));
      });
    }
  });
}

function renderShowreel() {
  const { settings, videos } = estado.db;
  const destaque = videos.find((v) => v.id === settings.video_destaque_id) ?? videos.find((v) => v.destaque);
  const moldura = document.querySelector('.moldura');
  const thumb = moldura.querySelector('.moldura-thumb');
  const legenda = moldura.querySelector('[data-campo="showreel-titulo"]');
  if (!destaque) {
    moldura.href = '#trabalhos';
    moldura.onclick = null;
    thumb.hidden = true;
    legenda.dataset.i18n = 'hero.semShowreel';
    legenda.textContent = t('hero.semShowreel');
    return;
  }
  delete legenda.dataset.i18n;
  legenda.textContent = destaque.titulo;
  moldura.href = linkYoutube(destaque.youtube_id) || '#trabalhos';
  moldura.onclick = (e) => {
    e.preventDefault();
    abrirVideo(destaque);
  };
  if (destaque.youtube_id) {
    thumb.onerror = () => { thumb.hidden = true; };
    thumb.onload = () => { thumb.hidden = false; };
    thumb.src = thumbYoutube(destaque.youtube_id, 'hqdefault');
  } else {
    thumb.hidden = true;
  }
}

function renderClientes() {
  const lista = document.querySelector('[data-lista="clientes"]');
  lista.textContent = '';
  const { clients } = estado.db;
  if (!clients.length) {
    lista.append(el('li', {}, aranhaVazia(t('clientes.vazio'))));
    return;
  }
  clients.forEach((c, i) => {
    const rosto = el('span', { class: 'avatar-rosto', 'aria-hidden': 'true' });
    if (c.foto_url) {
      const img = el('img', { src: c.foto_url, alt: '', loading: 'lazy', decoding: 'async', width: '108', height: '108' });
      img.addEventListener('error', () => { rosto.textContent = iniciais(c.nome); });
      rosto.append(img);
    } else {
      rosto.textContent = iniciais(c.nome);
    }
    const conteudo = [
      el('span', { class: 'avatar' }, el('span', { class: 'avatar-sombra', 'aria-hidden': 'true' }), rosto),
      el('span', { class: 'client-nome', text: c.nome }),
      c.canal_url ? el('span', { class: 'sr-only', text: t('clientes.canal') }) : null,
    ];
    const props = { class: 'client float', style: `animation-delay: ${(i * 0.45).toFixed(2)}s` };
    const item = c.canal_url
      ? el('a', { ...props, href: c.canal_url, target: '_blank', rel: 'noopener' }, conteudo)
      : el('div', props, conteudo);
    lista.append(el('li', {}, item));
  });
}

function categoriasVisiveis() {
  return estado.db.categories;
}

function escolherCategoria(id, focar = false) {
  estado.categoria = id;
  estado.filtro = 'todos';
  renderAbas(focar);
  renderFiltros();
  renderVideos();
}

function renderAbas(focar = false) {
  const alvo = document.querySelector('[data-lista="abas"]');
  const cats = categoriasVisiveis();
  if (!cats.some((c) => c.id === estado.categoria)) estado.categoria = cats[0]?.id ?? null;
  alvo.textContent = '';
  cats.forEach((cat, i) => {
    const ativa = cat.id === estado.categoria;
    const aba = el('button', {
      type: 'button',
      role: 'tab',
      id: `aba-${cat.slug || cat.id}`,
      class: `chip ${i % 2 ? 'rough2' : 'rough'}`,
      'aria-selected': String(ativa),
      'aria-controls': 'painel-trabalhos',
      tabindex: ativa ? '0' : '-1',
      'data-categoria': cat.slug || cat.id,
      text: nomeDaCategoria(cat),
      onclick: () => escolherCategoria(cat.id),
    });
    alvo.append(aba);
    if (ativa && focar) aba.focus();
  });
  const painel = document.getElementById('painel-trabalhos');
  const ativa = cats.find((c) => c.id === estado.categoria);
  if (ativa) painel.setAttribute('aria-labelledby', `aba-${ativa.slug || ativa.id}`);
}

function renderFiltros() {
  const alvo = document.querySelector('[data-lista="filtros"]');
  const cat = estado.db.categories.find((c) => c.id === estado.categoria);
  alvo.textContent = '';
  alvo.hidden = !usaFiltros(cat);
  if (alvo.hidden) return;
  alvo.append(el('span', { class: 'filtros-rotulo', text: t('trabalhos.filtrar') }));
  const opcoes = [{ id: 'todos', rotulo: t('trabalhos.todos') }, ...estado.db.longform_filters.map((f) => ({ id: f.id, rotulo: campo(f, 'nome') }))];
  opcoes.forEach((op) => {
    alvo.append(el('button', {
      type: 'button',
      class: 'filtro',
      'aria-pressed': String(estado.filtro === op.id),
      text: op.rotulo,
      onclick: () => {
        estado.filtro = op.id;
        renderFiltros();
        renderVideos();
      },
    }));
  });
}

function cartao(video, i, vertical, cat) {
  const thumb = el('div', { class: 'scrap thumb' });
  if (video.youtube_id) {
    const img = el('img', {
      class: 'thumb-img',
      src: thumbYoutube(video.youtube_id),
      alt: '',
      loading: 'lazy',
      decoding: 'async',
      width: '480',
      height: '360',
    });
    img.addEventListener('error', () => {
      img.remove();
      thumb.querySelector('.thumb-sem').hidden = false;
    });
    thumb.append(img);
  }
  if (!vertical) thumb.append(el('span', { class: 'rough thumb-tag', text: nomeDaCategoria(cat).toUpperCase() }));
  const rabisco = document.createElement('span');
  rabisco.innerHTML = '<svg aria-hidden="true" class="play-rabisco" viewBox="0 0 100 100"><path class="scrib" d="M50 6 C 80 4, 96 26, 94 52 C 92 80, 70 96, 46 94 C 20 92, 4 72, 6 48 C 8 22, 28 6, 58 9" fill="none" stroke="#E8505B" stroke-width="4" stroke-linecap="round"/></svg>';
  thumb.append(
    el('span', { class: 'play-bloco' }, rabisco.firstElementChild, el('span', { class: 'thumb-play' }, usoSvg('play', 'icone', 'viewBox="0 0 24 24"'))),
    el('span', { class: 'thumb-sem', text: t('trabalhos.semThumb'), hidden: Boolean(video.youtube_id) }),
  );
  const quem = campo(video, 'descricao');
  const link = el('a', {
    class: `card ${TILTS[(vertical ? i + 1 : i) % 3]}`,
    href: linkYoutube(video.youtube_id) || '#trabalhos',
    'data-video': video.id,
    'aria-label': t('trabalhos.assistir', { titulo: video.titulo }),
    onclick: (e) => {
      e.preventDefault();
      abrirVideo(video);
    },
  },
  el('span', { class: 'fita tape', 'aria-hidden': 'true' }),
  thumb,
  el('div', { class: 'card-texto' },
    el('span', { class: 'card-titulo', text: video.titulo }),
    quem ? el('span', { class: 'card-quem', text: quem }) : null));
  const pop = el('div', { class: 'pop', style: `animation-delay: ${(i * 0.08).toFixed(2)}s` }, link);
  return el('div', { class: 'reveal' }, pop);
}

function renderVideos() {
  const grade = document.querySelector('[data-lista="videos"]');
  const cat = estado.db.categories.find((c) => c.id === estado.categoria);
  const vertical = ehVertical(cat);
  grade.className = `grade${vertical ? ' grade-vertical' : ''}`;
  grade.textContent = '';
  let lista = estado.db.videos.filter((v) => v.category_id === estado.categoria);
  if (usaFiltros(cat) && estado.filtro !== 'todos') lista = lista.filter((v) => v.filter_id === estado.filtro);
  if (!lista.length) {
    grade.append(aranhaVazia(t('trabalhos.vazio')));
    return;
  }
  lista.forEach((video, i) => grade.append(cartao(video, i, vertical, cat)));
  observarNovos();
}

function renderSobre() {
  const texto = campo(estado.db.settings, 'sobre');
  document.querySelector('[data-campo="sobre"]').textContent = texto;
}

async function copiar(texto) {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    const area = el('textarea', { style: 'position:fixed;opacity:0' });
    area.value = texto;
    document.body.append(area);
    area.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch {}
    area.remove();
    return ok;
  }
}

function toast(mensagem) {
  const caixa = document.querySelector('.toast');
  caixa.textContent = mensagem;
  caixa.classList.add('visivel');
  clearTimeout(timerToast);
  timerToast = setTimeout(() => caixa.classList.remove('visivel'), 1800);
}

function renderContato() {
  const { settings } = estado.db;
  const titulo = document.querySelector('[data-letras="contato.titulo"]');
  letrasPulando(titulo, t('contato.titulo'), 'shake-hover', 0);
  titulo.setAttribute('aria-label', t('contato.titulo'));

  const selo = document.querySelector('[data-campo="comissoes"]');
  const aberto = Boolean(settings.comissoes_abertas);
  selo.classList.toggle('off', !aberto);
  selo.querySelector('.selo-texto').textContent = `COMMISSIONS: ${aberto ? 'ON' : 'OFF'}`;

  const redes = document.querySelector('[data-lista="redes"]');
  redes.textContent = '';
  const formas = [['rough2', 'rough'], ['rough', 'rough2']];
  let n = 0;
  const adicionar = (no) => {
    redes.append(no);
    n += 1;
  };
  const caixa = (icone) => el('span', { class: `rede-dentro ${formas[n % 2][1]}`, html: ICONES[icone] });
  [['instagram', 'Instagram'], ['x', 'X / Twitter'], ['youtube', 'YouTube']].forEach(([chave, rotulo]) => {
    const url = settings.redes?.[chave];
    if (!url) return;
    adicionar(el('a', { href: url, target: '_blank', rel: 'noopener me', 'aria-label': rotulo, class: `rede ink-btn shake-hover ${formas[n % 2][0]}` }, caixa(chave)));
  });
  if (settings.discord_nick) {
    adicionar(el('button', {
      type: 'button',
      class: `rede ink-btn shake-hover ${formas[n % 2][0]}`,
      'data-discord': '',
      'aria-label': t('contato.discord', { nick: settings.discord_nick }),
      onclick: async () => {
        const ok = await copiar(settings.discord_nick);
        toast(ok ? t('toast.nick') : t('toast.nickFalhou', { nick: settings.discord_nick }));
      },
    }, caixa('discord')));
  }
  if (settings.email) {
    adicionar(el('a', { href: `mailto:${settings.email}`, 'aria-label': `${t('contato.email')} (${settings.email})`, class: `rede ink-btn shake-hover ${formas[n % 2][0]}` }, caixa('email')));
  }
}

function renderOffline(origem) {
  const aviso = document.querySelector('[data-campo="offline"]');
  const mostrar = origem === 'cache' || origem === 'mock';
  aviso.hidden = !mostrar;
  if (mostrar) aviso.textContent = t('rodape.offline');
}

function renderTudo() {
  renderNome();
  renderFaixas();
  renderShowreel();
  renderClientes();
  renderAbas();
  renderFiltros();
  renderVideos();
  renderSobre();
  renderContato();
  renderOffline(estado.db.origem);
  observarNovos();
}

function iniciarCabecalho() {
  const cabecalho = document.querySelector('.cabecalho');
  const botao = cabecalho.querySelector('.menu-botao');
  const fechar = () => {
    cabecalho.classList.remove('aberto');
    botao.setAttribute('aria-expanded', 'false');
    botao.setAttribute('aria-label', t('menu.abrir'));
  };
  botao.addEventListener('click', () => {
    const abrir = !cabecalho.classList.contains('aberto');
    cabecalho.classList.toggle('aberto', abrir);
    botao.setAttribute('aria-expanded', String(abrir));
    botao.setAttribute('aria-label', t(abrir ? 'menu.fechar' : 'menu.abrir'));
  });
  cabecalho.querySelectorAll('.menu a, .contratar').forEach((a) => a.addEventListener('click', fechar));
  document.querySelectorAll('[data-idioma]').forEach((b) => {
    b.addEventListener('click', () => definirIdioma(b.dataset.idioma));
  });
}

function marcarIdioma() {
  document.querySelectorAll('[data-idioma]').forEach((b) => {
    b.setAttribute('aria-pressed', String(b.dataset.idioma === idioma()));
  });
}

function iniciarAbasTeclado() {
  document.querySelector('[data-lista="abas"]').addEventListener('keydown', (e) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    const cats = categoriasVisiveis();
    const atual = cats.findIndex((c) => c.id === estado.categoria);
    let proximo = atual;
    if (e.key === 'ArrowRight') proximo = (atual + 1) % cats.length;
    if (e.key === 'ArrowLeft') proximo = (atual - 1 + cats.length) % cats.length;
    if (e.key === 'Home') proximo = 0;
    if (e.key === 'End') proximo = cats.length - 1;
    e.preventDefault();
    escolherCategoria(cats[proximo].id, true);
  });
}

async function iniciar() {
  if (!temMouse()) {
    const psiu = document.querySelector('.psiu');
    psiu.dataset.i18n = 'rodape.psiuToque';
  }
  aplicar();
  marcarIdioma();
  iniciarCabecalho();
  iniciarAbasTeclado();
  iniciarAranhaHero();
  iniciarWalker();
  iniciarOlho();
  iniciarRodape();
  iniciarCursor();
  observarNovos = iniciarRevelacao() ?? (() => {});
  estado.db = await carregarSite();
  renderTudo();
  document.documentElement.classList.add('pronto');
  aoMudarIdioma(() => {
    marcarIdioma();
    renderTudo();
  });
  window.addEventListener('storage', async (e) => {
    if (e.key !== 'portfolio-local') return;
    estado.db = await carregarSite();
    renderTudo();
  });
}

iniciar();
