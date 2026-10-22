import { carregarSite, linkYoutube, iniciais } from './data.js';
import { t, campo, aplicar, definirIdioma, idioma, aoMudarIdioma } from './i18n.js';
import { iniciarRevelacao, iniciarAranhaHero, iniciarRodape, letrasSoltas, recorte, temMouse } from './animations.js';
import { iniciarCursor } from './cursor.js';
import { criarPlayer } from './player.js';
import { montarPrevia, soltarPrevias, suspenderPrevias } from './previa.js';
import { el, usoSvg } from './dom.js';

const TILTS = ['tilt-l', 'tilt-r', 'tilt-0'];
const ICONES = {
  instagram: '<svg aria-hidden="true" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.9" fill="currentColor"/></svg>',
  x: '<svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="square"><path d="M4 4l16 16"/><path d="M20 4L4 20"/></svg>',
  youtube: '<svg aria-hidden="true" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><rect x="2.5" y="5.5" width="19" height="13" rx="3"/><path d="M10 9.5v5l4.5-2.5z" fill="currentColor"/></svg>',
  discord: '<svg aria-hidden="true" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7 C 10 5.8, 14 5.8, 17 7 C 19 10, 20 13, 19.5 16.5 C 18 17.8, 16.5 18.5, 15 19 L 14 17"/><path d="M10 17 L 9 19 C 7.5 18.5, 6 17.8, 4.5 16.5 C 4 13, 5 10, 7 7"/><circle cx="9.5" cy="12.5" r="1.2" fill="currentColor"/><circle cx="14.5" cy="12.5" r="1.2" fill="currentColor"/></svg>',
  email: '<svg aria-hidden="true" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="miter"><path d="M3 6 H21 V18 H3 Z"/><path d="M3 6 L12 13 L21 6"/></svg>',
};

const estado = { db: null, categoria: null, filtro: 'todos' };
const player = criarPlayer({
  aoAbrir: () => suspenderPrevias('player', true),
  aoFechar: () => suspenderPrevias('player', false),
});
let observarNovos = () => {};
let timerToast;

function aranhaVazia(texto) {
  return el('div', { class: 'vazio' },
    el('span', { class: 'fio', 'aria-hidden': 'true' }),
    usoSvg('aranha', 'aranha-svg swing'),
    el('p', { class: 'vazio-texto nota', text: texto }));
}

const nomeDaCategoria = (cat) => campo(cat, 'nome');
const categoriaDe = (video) => estado.db.categories.find((c) => c.id === video.category_id);
const ehVertical = (cat) => cat?.formato === 'vertical';
const usaFiltros = (cat) => cat?.slug === 'long-form' && estado.db.longform_filters.length > 0;

function tagDoPlayer(video) {
  const partes = [nomeDaCategoria(categoriaDe(video)).toUpperCase()];
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

function quadro(video, { classe = '', selo = '', rec = false, assistir = '', vertical = false, modo = 'card', tag = '' }) {
  const conteudoVertical = ehVertical(categoriaDe(video));
  const tela = el('span', { class: `quadro-tela${conteudoVertical && !vertical ? ' contido' : ''}` });
  const quem = campo(video, 'descricao');
  const link = el('a', {
    class: `quadro ${classe}${vertical ? ' vertical' : ''}`,
    href: linkYoutube(video.youtube_id) || '#trabalhos',
    'data-video': video.id,
    'aria-label': t('trabalhos.assistir', { titulo: video.titulo }),
    onclick: (e) => {
      e.preventDefault();
      abrirVideo(video);
    },
  },
  el('span', { class: 'quadro-sombra', 'aria-hidden': 'true' }),
  el('span', { class: 'quadro-borda' }, tela),
  rec ? el('span', { class: 'quadro-rec', 'aria-hidden': 'true' }, el('span', { class: 'rec' }), 'REC') : null,
  selo ? el('span', { class: 'etiqueta etiqueta-preta quadro-selo', 'aria-hidden': 'true', text: selo }) : null,
  tag ? el('span', { class: 'etiqueta card-tag', 'aria-hidden': 'true', text: tag }) : null,
  el('span', { class: 'quadro-rotulo' },
    el('span', { class: 'quadro-titulo', text: video.titulo }),
    quem ? el('span', { class: 'quadro-sub', text: quem }) : null),
  assistir ? el('span', { class: 'quadro-assistir nota', 'aria-hidden': 'true', text: assistir }) : null);
  montarPrevia(tela, video, { modo, textoSem: t('trabalhos.semPrevia') });
  return link;
}

function renderNome() {
  const nome = estado.db.settings.nome || 'DAVI';
  document.querySelectorAll('[data-campo="nome"]').forEach((no) => { no.textContent = nome; });
  const h1 = document.querySelector('[data-campo="nome-letras"]');
  h1.setAttribute('aria-label', nome);
  letrasSoltas(h1, nome, { passo: 0.12 });
  const intro = document.querySelector('[data-campo="intro-nome"]');
  if (intro && intro.textContent !== nome) letrasSoltas(intro, nome, { atraso: 0.45, passo: 0.15 });
  document.querySelector('[data-campo="ano"]').textContent = String(new Date().getFullYear());
}

function renderFaixas() {
  [['a', 'strip-palavra-a'], ['b', 'strip-palavra-b']].forEach(([lado, classe]) => {
    const alvo = document.querySelector(`[data-faixa="${lado}"]`);
    const palavras = t(`faixa.${lado}`);
    alvo.textContent = '';
    for (let volta = 0; volta < 4; volta += 1) {
      palavras.forEach((palavra) => {
        alvo.append(el('span', { class: classe, text: palavra }), usoSvg('faisca', 'faisca gira', 'viewBox="0 0 40 40"'));
      });
    }
  });
}

function renderDestaques() {
  const principal = document.querySelector('[data-lista="showreel"]');
  const fileira = document.querySelector('[data-lista="destaques"]');
  [principal, fileira].forEach((alvo) => {
    soltarPrevias(alvo);
    alvo.textContent = '';
  });
  const [primeiro, ...resto] = estado.db.videos.filter((v) => v.destaque).slice(0, 4);
  if (!primeiro) principal.append(aranhaVazia(t('destaques.vazio')));
  else {
    principal.append(quadro(primeiro, { classe: 'destaque', rec: true, assistir: t('destaques.assistir'), modo: 'destaque' }));
  }
  fileira.closest('.mais-destaques').hidden = resto.length === 0;
  resto.forEach((video) => fileira.append(quadro(video, { classe: 'destaque', modo: 'destaque' })));
}

function renderSobre() {
  const { settings } = estado.db;
  const nome = settings.nome || 'DAVI';
  document.querySelector('[data-campo="sobre"]').textContent = campo(settings, 'sobre');
  const foto = document.querySelector('[data-campo="foto"]');
  const src = settings.foto_url || 'assets/avatar-exemplo.svg';
  if (foto.getAttribute('src') !== src) foto.src = src;
  foto.alt = t('sobre.fotoAlt', { nome });
  foto.onerror = () => { foto.onerror = null; foto.src = 'assets/avatar-exemplo.svg'; };
  document.querySelector('[data-campo="foto-selo"]').textContent = t('sobre.fotoSelo', { nome });
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
    const rosto = el('span', { class: 'painel-rosto', 'aria-hidden': 'true' });
    const iniciaisEl = () => el('span', { text: iniciais(c.nome) });
    if (c.foto_url) {
      const img = el('img', { src: c.foto_url, alt: '', loading: 'lazy', decoding: 'async', width: '160', height: '200' });
      img.addEventListener('error', () => { rosto.textContent = ''; rosto.append(iniciaisEl()); });
      rosto.append(img);
    } else {
      rosto.append(iniciaisEl());
    }
    const nome = el('span', { class: 'client-nome recorte', 'aria-hidden': 'true' });
    recorte(nome, c.nome);
    const conteudo = [
      el('span', { class: 'painel' },
        el('span', { class: 'painel-sombra', 'aria-hidden': 'true' }),
        el('span', { class: 'painel-borda' }, rosto)),
      nome,
      el('span', { class: 'sr-only', text: c.nome }),
      c.canal_url ? el('span', { class: 'sr-only', text: t('clientes.canal') }) : null,
    ];
    const props = { class: 'client flutua', style: `animation-delay: ${(i * 0.45).toFixed(2)}s` };
    const item = c.canal_url
      ? el('a', { ...props, href: c.canal_url, target: '_blank', rel: 'noopener' }, conteudo)
      : el('div', props, conteudo);
    lista.append(el('li', {}, item));
  });
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
  const cats = estado.db.categories;
  if (!cats.some((c) => c.id === estado.categoria)) estado.categoria = cats[0]?.id ?? null;
  alvo.textContent = '';
  cats.forEach((cat) => {
    const ativa = cat.id === estado.categoria;
    const aba = el('button', {
      type: 'button',
      role: 'tab',
      id: `aba-${cat.slug || cat.id}`,
      class: 'chip',
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
  const ativa = cats.find((c) => c.id === estado.categoria);
  if (ativa) document.getElementById('painel-trabalhos').setAttribute('aria-labelledby', `aba-${ativa.slug || ativa.id}`);
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

function renderVideos() {
  const grade = document.querySelector('[data-lista="videos"]');
  const cat = estado.db.categories.find((c) => c.id === estado.categoria);
  const vertical = ehVertical(cat);
  soltarPrevias(grade);
  grade.className = `grade${vertical ? ' grade-vertical' : ''}`;
  grade.textContent = '';
  let lista = estado.db.videos.filter((v) => v.category_id === estado.categoria);
  if (usaFiltros(cat) && estado.filtro !== 'todos') lista = lista.filter((v) => v.filter_id === estado.filtro);
  if (!lista.length) {
    grade.append(aranhaVazia(t('trabalhos.vazio')));
    return;
  }
  lista.forEach((video, i) => {
    const card = quadro(video, {
      classe: `card ${TILTS[(vertical ? i + 1 : i) % 3]}`,
      vertical,
      assistir: t('trabalhos.verVideo'),
      tag: vertical ? '' : nomeDaCategoria(cat).toUpperCase(),
    });
    grade.append(el('div', { class: 'reveal' }, el('div', { class: 'pop', style: `animation-delay: ${(i * 0.08).toFixed(2)}s` }, card)));
  });
  observarNovos();
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

  const selo = document.querySelector('[data-campo="comissoes"]');
  const aberto = Boolean(settings.comissoes_abertas);
  selo.classList.toggle('off', !aberto);
  selo.querySelector('.selo-texto').textContent = `COMMISSIONS: ${aberto ? 'ON' : 'OFF'}`;

  const redes = document.querySelector('[data-lista="redes"]');
  redes.textContent = '';
  const caixa = (icone) => el('span', { class: 'rede-dentro', html: ICONES[icone] });
  [['instagram', 'Instagram'], ['x', 'X / Twitter'], ['youtube', 'YouTube']].forEach(([chave, rotulo]) => {
    const url = settings.redes?.[chave];
    if (url) redes.append(el('a', { href: url, target: '_blank', rel: 'noopener me', 'aria-label': rotulo, class: 'rede' }, caixa(chave)));
  });
  if (settings.discord_nick) {
    redes.append(el('button', {
      type: 'button',
      class: 'rede',
      'data-discord': '',
      'aria-label': t('contato.discord', { nick: settings.discord_nick }),
      onclick: async () => {
        const ok = await copiar(settings.discord_nick);
        toast(ok ? t('toast.nick') : t('toast.nickFalhou', { nick: settings.discord_nick }));
      },
    }, caixa('discord')));
  }
  if (settings.email) {
    redes.append(el('a', { href: `mailto:${settings.email}`, 'aria-label': `${t('contato.email')} (${settings.email})`, class: 'rede' }, caixa('email')));
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
  renderDestaques();
  renderSobre();
  renderFaixas();
  renderClientes();
  renderAbas();
  renderFiltros();
  renderVideos();
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
    const cats = estado.db.categories;
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
  if (!temMouse()) document.querySelector('.psiu').dataset.i18n = 'rodape.psiuToque';
  aplicar();
  marcarIdioma();
  iniciarCabecalho();
  iniciarAbasTeclado();
  iniciarAranhaHero();
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
