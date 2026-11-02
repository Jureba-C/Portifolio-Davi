import { criarApi, extrairIdYoutube, ehLinkDeShort, thumbYoutube, iniciais, loginLocalPermitido } from './data.js';
import { nuvemConfigurada } from './supabase.js';
import { el } from './dom.js';

const api = criarApi();
const $ = (seletor, raiz = document) => raiz.querySelector(seletor);
const $$ = (seletor, raiz = document) => [...raiz.querySelectorAll(seletor)];

const ICONES = {
  videos: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M10 9.5v5l4.5-2.5z"/>',
  textos: '<path d="M4 6h16M4 12h16M4 18h10"/>',
  clientes: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.8c2 .7 3.3 2.4 3.6 5.2"/>',
  depoimentos: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9.5h8M8 12.5h5"/>',
  categorias: '<rect x="3" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5"/>',
  mais: '<path d="M12 5v14M5 12h14"/>',
  busca: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
  editar: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  lixo: '<path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/><path d="M10 11v5.5M14 11v5.5"/>',
  estrela: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',
  alca: '<circle cx="9" cy="6" r="1.2"/><circle cx="15" cy="6" r="1.2"/><circle cx="9" cy="12" r="1.2"/><circle cx="15" cy="12" r="1.2"/><circle cx="9" cy="18" r="1.2"/><circle cx="15" cy="18" r="1.2"/>',
  fechar: '<path d="M6 6l12 12M18 6L6 18"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>',
  olho: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  clipe: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10.5l5-3v9l-5-3"/>',
  imagem: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M3 16l5-4 4 3 3-2 6 4"/>',
  ok: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  alerta: '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17.2v.1"/>',
};

const ERROS = {
  'armazenamento-cheio': 'no modo local o navegador não aguenta arquivos grandes. Com o Supabase ligado funciona.',
  credenciais: 'credenciais incorretas!',
  'nao-admin': 'esse e-mail não tem acesso de admin!',
  'nuvem-nao-configurada': 'o painel ainda não está ligado na nuvem.',
};

const PAGINAS = ['videos', 'textos', 'clientes', 'depoimentos', 'categorias'];
const TEXTOS_PAGINA = ['selo_pt', 'selo_en', 'frase_pt', 'frase_en', 'chamada_pt', 'chamada_en'];
const NO_CARTAZ = 6;

let db = null;
let Sortable = null;
let painelPronto = false;
let paginaAtual = null;
let tipoNovo = null;
let filtroCategoria = 'todas';
let editandoVideo = null;
let editandoCliente = null;
let editandoDepoimento = null;
let fotoArquivo = null;
let textosSalvos = '';
const arquivos = { 'foto-sobre': null, clipe: null, capa: null };
const removidos = { clipe: false, capa: false };
const LIMITES = {
  'foto-sobre': { tipos: /^image\//, mb: 3, rotulo: 'Trocar foto' },
  clipe: { tipos: /^video\/(mp4|webm)$/, mb: 15, rotulo: 'Enviar clipe' },
  capa: { tipos: /^image\//, mb: 3, rotulo: 'Enviar capa' },
};
let timerToast;

function icone(nome, classe = 'ic') {
  const caixa = document.createElement('span');
  caixa.innerHTML = `<svg class="${classe}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONES[nome] ?? ''}</svg>`;
  return caixa.firstElementChild;
}

function pintarIcones(raiz = document) {
  $$('svg[data-ic]', raiz).forEach((svg) => { svg.innerHTML = ICONES[svg.dataset.ic] ?? ''; });
}

function erroAmigavel(erro) {
  return ERROS[erro?.message] ?? 'deu ruim! confere a internet e tenta de novo.';
}

function toast(mensagem, tipo = 'ok') {
  const caixa = $('[data-toast]');
  caixa.textContent = '';
  caixa.append(icone(tipo === 'erro' ? 'alerta' : 'ok', 'ic toast-ic'), el('span', { text: mensagem }));
  caixa.classList.toggle('erro', tipo === 'erro');
  caixa.classList.add('visivel');
  clearTimeout(timerToast);
  timerToast = setTimeout(() => caixa.classList.remove('visivel'), tipo === 'erro' ? 6000 : 2800);
}

async function acao(fn, mensagem) {
  try {
    const resultado = await fn();
    if (mensagem) toast(mensagem);
    return resultado;
  } catch (erro) {
    toast(erroAmigavel(erro), 'erro');
    await recarregar().catch(() => {});
    return undefined;
  }
}

async function ocupado(botao, fn) {
  if (!botao) return fn();
  botao.disabled = true;
  botao.setAttribute('aria-busy', 'true');
  botao.classList.add('ocupado');
  try {
    return await fn();
  } finally {
    botao.disabled = false;
    botao.removeAttribute('aria-busy');
    botao.classList.remove('ocupado');
  }
}

function confirmar(texto, botao = 'Excluir') {
  const dialogo = $('[data-confirmar]');
  $('[data-confirmar-texto]', dialogo).textContent = texto;
  $('[data-confirmar-sim]', dialogo).textContent = botao;
  dialogo.returnValue = '';
  dialogo.showModal();
  return new Promise((resolver) => {
    dialogo.addEventListener('close', () => resolver(dialogo.returnValue === 'sim'), { once: true });
  });
}

function urlCompleta(valor) {
  const texto = String(valor ?? '').trim();
  if (!texto) return '';
  if (/^https?:\/\//i.test(texto)) return texto;
  if (/^[a-z][a-z0-9+.-]*:(?!\d)/i.test(texto)) return '';
  return `https://${texto.replace(/^\/+/, '')}`;
}

function slug(texto) {
  return String(texto)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'categoria';
}

function categoria(id) {
  return db.categories.find((c) => c.id === id);
}

function usaFiltros(cat) {
  return cat?.slug === 'long-form';
}

function plural(n, um, varios) {
  return `${n} ${n === 1 ? um : varios}`;
}

function botaoIcone(nome, rotulo, classe, onclick, extra = {}) {
  return el('button', { type: 'button', class: `btn-icone ${classe ?? ''}`, 'aria-label': rotulo, title: rotulo, onclick, ...extra }, icone(nome));
}

function alca(rotulo, lista, tabela) {
  return el('button', {
    type: 'button',
    class: 'alca',
    title: 'Arraste para mudar a ordem',
    'aria-label': `${rotulo} — use as setas pra cima e pra baixo`,
    onkeydown: (e) => {
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
      e.preventDefault();
      const item = e.currentTarget.closest('[data-id]');
      const subir = e.key === 'ArrowUp' || e.key === 'ArrowLeft';
      const vizinho = subir ? item.previousElementSibling : item.nextElementSibling;
      if (!vizinho?.dataset.id) return;
      if (subir) vizinho.before(item);
      else vizinho.after(item);
      e.currentTarget.focus();
      salvarOrdem(tabela, lista());
    },
  }, icone('alca'));
}

async function salvarOrdem(tabela, ul) {
  const visiveis = $$(':scope > [data-id]', ul).map((li) => li.dataset.id);
  let ids = visiveis;
  if (tabela === 'videos') {
    const todos = db.videos.map((v) => v.id);
    const vagas = todos.map((id, i) => (visiveis.includes(id) ? i : -1)).filter((i) => i >= 0);
    const fila = [...visiveis];
    vagas.forEach((posicao) => { todos[posicao] = fila.shift(); });
    ids = todos;
  }
  await acao(async () => {
    await api.reordenar(tabela, ids);
    const posicao = new Map(ids.map((id, i) => [id, i]));
    db[tabela] = db[tabela].map((r) => ({ ...r, ordem: posicao.get(r.id) ?? r.ordem })).sort((a, b) => a.ordem - b.ordem);
  }, 'ordem salva ✓');
  if (tabela === 'clients') renderClientes();
}

function ligarArraste(ul, tabela, handle = '.alca') {
  if (!Sortable || ul.dataset.arraste) return;
  ul.dataset.arraste = '1';
  Sortable.create(ul, {
    handle,
    draggable: '[data-id]',
    animation: 180,
    ghostClass: 'fantasma',
    chosenClass: 'arrastando',
    onEnd: (e) => {
      if (e.oldIndex !== e.newIndex) salvarOrdem(tabela, ul);
    },
  });
}

function mostrarAvisos() {
  const avisos = $$('[data-aviso-modo]');
  if (nuvemConfigurada()) {
    avisos.forEach((a) => { a.hidden = true; });
    return;
  }
  const local = loginLocalPermitido();
  avisos.forEach((a) => {
    a.hidden = false;
    a.textContent = '';
    if (a.closest('[data-tela="login"]')) {
      a.append(
        el('strong', { text: local ? 'Modo local: ' : 'Nuvem desligada: ' }),
        local
          ? 'o Supabase ainda não foi ligado. Entre com demo@local / demo1234. As mudanças ficam só neste navegador.'
          : 'o Supabase ainda não foi configurado (veja o README).',
      );
    } else {
      a.textContent = 'modo local';
      a.title = 'As mudanças ficam só neste navegador até ligar o Supabase.';
    }
  });
  if (!local) $('[data-form="login"] button[type="submit"]').disabled = true;
}

function mostrarTela(nome) {
  $$('[data-tela]').forEach((tela) => { tela.hidden = tela.dataset.tela !== nome; });
}

function mostrarLogin() {
  mostrarTela('login');
  $('[data-form="login"] [name="email"]').focus();
}

async function recarregar() {
  db = await api.carregarTudo();
  renderTudo();
}

function paginaDoHash() {
  const nome = location.hash.slice(1);
  return PAGINAS.includes(nome) ? nome : 'videos';
}

async function irPara(pagina, { foco = true, historico = true } = {}) {
  if (!PAGINAS.includes(pagina)) pagina = 'videos';
  if (paginaAtual === 'textos' && pagina !== 'textos' && textosAlterados()) {
    const sair = await confirmar('Você tem alterações não salvas em Textos e redes. Sair sem salvar?', 'Sair sem salvar');
    if (!sair) {
      if (location.hash !== '#textos') history.replaceState(null, '', '#textos');
      return;
    }
    preencherTextos();
  }
  paginaAtual = pagina;
  $$('[data-pagina]').forEach((p) => { p.hidden = p.dataset.pagina !== pagina; });
  $$('[data-ir]').forEach((a) => {
    if (a.dataset.ir === pagina) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  if (historico && location.hash !== `#${pagina}`) history.pushState(null, '', `#${pagina}`);
  window.scrollTo(0, 0);
  if (foco) $(`#pg-${pagina}`)?.focus({ preventScroll: true });
}

async function abrirPainel() {
  mostrarTela('painel');
  if (!Sortable) {
    try {
      Sortable = (await import('./vendor/sortable.js')).default;
    } catch {
      Sortable = null;
    }
  }
  db = await api.carregarTudo();
  preencherTextos();
  renderTudo();
  if (!painelPronto) {
    painelPronto = true;
    ligarArraste($('[data-lista="categorias"]'), 'categories');
    ligarArraste($('[data-lista="filtros"]'), 'longform_filters');
    ligarArraste($('[data-lista="trabalhos"]'), 'videos');
    ligarArraste($('[data-lista="clientes"]'), 'clients', '.alca');
    ligarArraste($('[data-lista="depoimentos"]'), 'testimonials');
  }
  paginaAtual = null;
  await irPara(paginaDoHash(), { foco: false, historico: false });
}

function renderTudo() {
  $$('[data-campo="nome"]').forEach((n) => { n.textContent = db.settings.nome || 'DECXZ'; });
  renderComissoes();
  renderCategorias();
  renderFiltros();
  renderTipos();
  renderFiltrosSelect($('[data-lista="filtros-select"]'));
  renderFiltroCategoria();
  atualizarPrevia();
  renderTrabalhos();
  renderClientes();
  renderDepoimentos();
  renderContas();
}

function renderContas() {
  const contas = { videos: db.videos.length, clientes: db.clients.length, depoimentos: (db.testimonials || []).length };
  Object.entries(contas).forEach(([nome, n]) => {
    const alvo = $(`[data-conta="${nome}"]`);
    if (alvo) alvo.textContent = String(n);
  });
}

function mostrarFotoSobre(url) {
  const img = $('[data-foto-sobre-img]');
  img.src = url || 'assets/avatar-exemplo.svg';
  img.onerror = () => { img.onerror = null; img.src = 'assets/avatar-exemplo.svg'; };
}

function tamanho(bytes) {
  return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function escolherArquivo(tipo, arquivo) {
  if (!arquivo) return;
  const limite = LIMITES[tipo];
  if (!limite.tipos.test(arquivo.type)) return toast(tipo === 'clipe' ? 'o clipe precisa ser mp4 ou webm' : 'isso não é uma imagem', 'erro');
  if (arquivo.size > limite.mb * 1024 * 1024) return toast(`arquivo grande demais (máx. ${limite.mb} MB)`, 'erro');
  arquivos[tipo] = arquivo;
  if (tipo === 'foto-sobre') {
    $('[data-form="textos"]').foto_url.value = '';
    mostrarFotoSobre(URL.createObjectURL(arquivo));
    $('[data-rotulo="foto-sobre"]').textContent = 'Foto escolhida ✓';
    atualizarBarraTextos();
    return;
  }
  removidos[tipo] = false;
  marcarArquivo(tipo, `✓ ${arquivo.name}`, tamanho(arquivo.size));
  atualizarPrevia();
}

function marcarArquivo(tipo, nome, info) {
  const caixa = $(`[data-arquivo="${tipo}"]`);
  $(`[data-rotulo="${tipo}"]`).textContent = nome;
  $('.arquivo-info', caixa).textContent = info;
  caixa.classList.add('escolhido');
  $(`[data-remover="${tipo}"]`).hidden = false;
}

function limparArquivo(tipo) {
  arquivos[tipo] = null;
  const entrada = $(`[data-solta="${tipo}"] input[type="file"]`);
  if (entrada) entrada.value = '';
  if (tipo === 'foto-sobre') {
    $('[data-rotulo="foto-sobre"]').textContent = LIMITES[tipo].rotulo;
    return;
  }
  const caixa = $(`[data-arquivo="${tipo}"]`);
  $(`[data-rotulo="${tipo}"]`).textContent = LIMITES[tipo].rotulo;
  $('.arquivo-info', caixa).textContent = tipo === 'clipe' ? 'mp4 ou webm, até 15 MB' : 'opcional · imagem até 3 MB';
  caixa.classList.remove('escolhido');
  $(`[data-remover="${tipo}"]`).hidden = true;
}

function estadoTextos() {
  const form = $('[data-form="textos"]');
  return JSON.stringify(['nome', 'email', 'foto_url', 'sobre_pt', 'sobre_en', ...TEXTOS_PAGINA, 'discord_nick', 'instagram', 'x', 'youtube'].map((n) => form[n].value.trim()).concat(arquivos['foto-sobre']?.name ?? ''));
}

function textosAlterados() {
  return Boolean(db) && estadoTextos() !== textosSalvos;
}

function atualizarBarraTextos() {
  $('[data-barra-salvar]').hidden = !textosAlterados();
}

function atualizarContadores() {
  const form = $('[data-form="textos"]');
  ['sobre_pt', 'sobre_en'].forEach((nome) => {
    const campo = form[nome];
    $(`[data-contador="${nome}"]`).textContent = `${campo.value.length} / ${campo.maxLength}`;
  });
}

function atualizarLinksFinais() {
  const form = $('[data-form="textos"]');
  ['instagram', 'x', 'youtube'].forEach((nome) => {
    const final = urlCompleta(form[nome].value);
    const alvo = $(`[data-link-final="${nome}"]`);
    alvo.textContent = form[nome].value.trim() ? (final ? `Vai para ${final}` : 'Link inválido: use só https://') : '';
    alvo.classList.toggle('erro', Boolean(form[nome].value.trim()) && !final);
  });
}

function textoComDestaques(alvo, texto) {
  alvo.textContent = '';
  String(texto || '').split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean).forEach((paragrafo) => {
    const p = el('p');
    paragrafo.replace(/\s*\n\s*/g, ' ').split(/(\*[^*]+\*)/).forEach((parte) => {
      if (/^\*[^*]+\*$/.test(parte)) p.append(el('strong', { text: parte.slice(1, -1) }));
      else if (parte) p.append(parte.replace(/\*/g, ''));
    });
    alvo.append(p);
  });
  if (!alvo.childNodes.length) alvo.append(el('p', { class: 'vazio', text: 'nada escrito ainda' }));
}

function atualizarPreviaSobre() {
  const ligado = $('[data-ver-sobre]').getAttribute('aria-pressed') === 'true';
  const form = $('[data-form="textos"]');
  ['sobre_pt', 'sobre_en'].forEach((nome) => {
    const caixa = $(`[data-sobre-previa="${nome}"]`);
    caixa.hidden = !ligado;
    form[nome].hidden = ligado;
    if (ligado) textoComDestaques(caixa, form[nome].value);
  });
}

function preencherTextos() {
  const form = $('[data-form="textos"]');
  const s = db.settings;
  form.foto_url.value = s.foto_url && /^https?:/.test(s.foto_url) ? s.foto_url : '';
  mostrarFotoSobre(s.foto_url);
  limparArquivo('foto-sobre');
  form.nome.value = s.nome ?? '';
  form.email.value = s.email ?? '';
  form.sobre_pt.value = s.sobre_pt ?? '';
  form.sobre_en.value = s.sobre_en ?? '';
  TEXTOS_PAGINA.forEach((nome) => { form[nome].value = s[nome] ?? ''; });
  form.discord_nick.value = s.discord_nick ?? '';
  form.instagram.value = s.redes?.instagram ?? '';
  form.x.value = s.redes?.x ?? '';
  form.youtube.value = s.redes?.youtube ?? '';
  textosSalvos = estadoTextos();
  atualizarBarraTextos();
  atualizarContadores();
  atualizarLinksFinais();
  atualizarPreviaSobre();
}

function renderComissoes() {
  $('[data-comissoes]').setAttribute('aria-pressed', String(Boolean(db.settings.comissoes_abertas)));
}

function vazio(texto) {
  return el('li', { class: 'lista-vazia' }, el('span', { class: 'vazio-ic', 'aria-hidden': 'true' }, icone('videos')), el('span', { text: texto }));
}

function renderCategorias() {
  const ul = $('[data-lista="categorias"]');
  ul.textContent = '';
  db.categories.forEach((cat) => {
    const total = db.videos.filter((v) => v.category_id === cat.id).length;
    const li = el('li', { class: 'item', 'data-id': cat.id });
    const mostrar = () => {
      li.textContent = '';
      li.classList.remove('editando');
      li.append(
        alca(`Mover ${cat.nome_pt}`, () => ul, 'categories'),
        el('span', { class: 'item-textos' },
          el('span', { class: 'item-titulo', text: cat.nome_en && cat.nome_en !== cat.nome_pt ? `${cat.nome_pt} / ${cat.nome_en}` : cat.nome_pt }),
          el('span', { class: 'item-sub', text: `${plural(total, 'vídeo', 'vídeos')} · ${cat.formato === 'vertical' ? '9:16' : '16:9'}` })),
        el('span', { class: 'item-acoes' },
          botaoIcone('editar', `Renomear ${cat.nome_pt}`, '', editar),
          botaoIcone('lixo', `Excluir ${cat.nome_pt}`, 'btn-icone-perigo', excluir)),
      );
    };
    const editar = () => {
      li.textContent = '';
      li.classList.add('editando');
      const pt = el('input', { value: cat.nome_pt, 'aria-label': 'nome em português', maxlength: '40' });
      const en = el('input', { value: cat.nome_en ?? '', 'aria-label': 'nome em inglês', maxlength: '40', placeholder: 'em inglês' });
      const formato = el('select', { 'aria-label': 'formato', class: 'select-curto' },
        el('option', { value: 'horizontal', text: '16:9' }),
        el('option', { value: 'vertical', text: '9:16' }));
      formato.value = cat.formato;
      const salvar = async () => {
        const nome = pt.value.trim();
        if (!nome) return pt.focus();
        await acao(() => api.atualizar('categories', cat.id, { nome_pt: nome, nome_en: en.value.trim() || nome, formato: formato.value }), 'categoria salva ✓');
        await recarregar();
      };
      li.append(el('div', { class: 'edicao-inline' }, pt, en, formato,
        el('div', { class: 'edicao-botoes' },
          el('button', { type: 'button', class: 'btn btn-fantasma-escuro btn-pequeno', text: 'Cancelar', onclick: mostrar }),
          el('button', { type: 'button', class: 'btn btn-primario btn-pequeno', text: 'Salvar', onclick: salvar }))));
      [pt, en].forEach((i) => i.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') salvar();
        if (e.key === 'Escape') mostrar();
      }));
      pt.focus();
    };
    const excluir = async () => {
      const aviso = total ? ` ${total === 1 ? 'O vídeo dela também some' : `Os ${total} vídeos dela também somem`}.` : '';
      if (!(await confirmar(`Excluir a categoria "${cat.nome_pt}"?${aviso}`))) return;
      await acao(() => api.excluir('categories', cat.id), 'categoria excluída');
      await recarregar();
    };
    mostrar();
    ul.append(li);
  });
}

function renderFiltros() {
  const ul = $('[data-lista="filtros"]');
  ul.textContent = '';
  if (!db.longform_filters.length) ul.append(el('li', { class: 'lista-vazia lista-vazia-curta', text: 'nenhum filtro ainda' }));
  db.longform_filters.forEach((f) => {
    const usados = db.videos.filter((v) => v.filter_id === f.id).length;
    ul.append(el('li', { class: 'chip-filtro', 'data-id': f.id },
      alca(`Mover ${f.nome_pt}`, () => ul, 'longform_filters'),
      el('span', { text: f.nome_pt }),
      el('span', { class: 'chip-conta', text: String(usados), title: plural(usados, 'vídeo', 'vídeos') }),
      botaoIcone('fechar', `Remover filtro ${f.nome_pt}`, 'btn-icone-mini', async () => {
        const aviso = usados ? ` ${usados} ${usados === 1 ? 'vídeo fica' : 'vídeos ficam'} sem filtro.` : '';
        if (!(await confirmar(`Remover o filtro "${f.nome_pt}"?${aviso}`, 'Remover'))) return;
        await acao(() => api.excluir('longform_filters', f.id), 'filtro removido');
        await recarregar();
      })));
  });
}

function renderFiltrosSelect(select, valor) {
  const atual = valor ?? select.value;
  select.textContent = '';
  select.append(el('option', { value: '', text: 'nenhum' }));
  db.longform_filters.forEach((f) => select.append(el('option', { value: f.id, text: f.nome_pt })));
  select.value = db.longform_filters.some((f) => f.id === atual) ? atual : '';
}

function renderTipos() {
  const alvo = $('[data-lista="tipos"]');
  if (!db.categories.some((c) => c.id === tipoNovo)) tipoNovo = db.categories[0]?.id ?? null;
  alvo.textContent = '';
  db.categories.forEach((cat, i) => {
    const marcado = cat.id === tipoNovo;
    alvo.append(el('button', {
      type: 'button',
      role: 'radio',
      class: 'opcao',
      'aria-checked': String(marcado),
      tabindex: marcado ? '0' : '-1',
      'data-tipo': cat.slug,
      text: cat.formato === 'vertical' && !/short/i.test(cat.nome_pt) ? `${cat.nome_pt} (Shorts)` : cat.nome_pt,
      onclick: () => {
        tipoNovo = cat.id;
        renderTipos();
        atualizarPrevia();
      },
      onkeydown: (e) => {
        if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
        e.preventDefault();
        const passo = e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 1;
        const proximo = db.categories[(i + passo + db.categories.length) % db.categories.length];
        tipoNovo = proximo.id;
        renderTipos();
        atualizarPrevia();
        $(`[data-tipo="${proximo.slug}"]`)?.focus();
      },
    }));
  });
  $('[data-campo-filtro]').hidden = !usaFiltros(categoria(tipoNovo));
}

function atualizarPrevia() {
  const form = $('[data-form="video"]');
  const cat = categoria(tipoNovo);
  const id = extrairIdYoutube(form.link.value);
  const vertical = cat?.formato === 'vertical' || ehLinkDeShort(form.link.value);
  const thumb = $('[data-previa-thumb]');
  const img = $('[data-previa-img]');
  const video = $('[data-previa-video]');
  const clipeAtual = !removidos.clipe && editandoVideo?.preview_url;
  const capaAtual = !removidos.capa && editandoVideo?.poster_url;
  const fonteClipe = arquivos.clipe ? URL.createObjectURL(arquivos.clipe) : clipeAtual;
  const chaveClipe = arquivos.clipe?.name ?? clipeAtual ?? '';
  if (fonteClipe) {
    if (video.dataset.nome !== chaveClipe) {
      video.dataset.nome = chaveClipe;
      video.src = fonteClipe;
      video.play().catch(() => {});
    }
    video.hidden = false;
  } else {
    video.hidden = true;
    video.removeAttribute('src');
    delete video.dataset.nome;
  }
  thumb.classList.toggle('vertical', vertical);
  $('[data-previa-tag]').textContent = (cat?.nome_pt ?? '').toUpperCase();
  $('[data-previa-tag]').hidden = vertical;
  $('[data-previa-titulo]').textContent = form.titulo.value.trim() || '[Título do trabalho]';
  $('[data-previa-desc]').textContent = form.descricao_pt.value.trim() || '[descrição / participantes]';
  const ajuda = $('[data-link-ajuda]');
  if (!form.link.value.trim()) {
    ajuda.textContent = 'Vale vídeo não listado.';
    ajuda.className = 'campo-ajuda';
  } else if (id) {
    ajuda.textContent = ehLinkDeShort(form.link.value) ? `✓ Short reconhecido (${id})` : `✓ vídeo reconhecido (${id})`;
    ajuda.className = 'campo-ajuda ok';
  } else {
    ajuda.textContent = 'não reconheci esse link do YouTube';
    ajuda.className = 'campo-ajuda erro';
  }
  const capa = arquivos.capa ? URL.createObjectURL(arquivos.capa) : capaAtual;
  if (capa && !fonteClipe) {
    img.src = capa;
    img.hidden = false;
    delete img.dataset.id;
  } else if (id && !fonteClipe) {
    if (img.dataset.id !== id) {
      img.dataset.id = id;
      img.hidden = true;
      img.onload = () => { img.hidden = false; };
      img.onerror = () => { img.hidden = true; };
      img.src = thumbYoutube(id);
    } else {
      img.hidden = !img.complete || !img.naturalWidth;
    }
  } else {
    img.hidden = true;
    delete img.dataset.id;
  }
}

function camposVideo(form) {
  return {
    titulo: form.titulo.value.trim(),
    youtube_id: extrairIdYoutube(form.link.value),
    descricao_pt: form.descricao_pt.value.trim(),
    descricao_en: form.descricao_en.value.trim(),
  };
}

function estadoVideo() {
  const form = $('[data-form="video"]');
  return JSON.stringify([tipoNovo, form.link.value, form.titulo.value, form.filter_id.value, form.descricao_pt.value, form.descricao_en.value, form.destaque.checked, arquivos.clipe?.name, arquivos.capa?.name, removidos.clipe, removidos.capa]);
}

const gavetas = {};

function registrarGaveta(nome, { estado, aoFechar }) {
  const dialogo = $(`[data-gaveta="${nome}"]`);
  const g = { dialogo, estado, inicial: '', aoFechar };
  gavetas[nome] = g;
  const pedirFechar = async () => {
    if (g.estado() !== g.inicial && !(await confirmar('Descartar o que você mudou?', 'Descartar'))) return;
    fecharGaveta(nome);
  };
  g.pedirFechar = pedirFechar;
  dialogo.addEventListener('cancel', (e) => {
    e.preventDefault();
    pedirFechar();
  });
  dialogo.addEventListener('click', (e) => {
    if (e.target === dialogo) pedirFechar();
  });
  $$('[data-fechar]', dialogo).forEach((b) => b.addEventListener('click', pedirFechar));
}

function abrirGaveta(nome, foco) {
  const g = gavetas[nome];
  g.dialogo.showModal();
  g.dialogo.scrollTop = 0;
  $('.gaveta-corpo', g.dialogo).scrollTop = 0;
  g.inicial = g.estado();
  (foco ?? $('input, textarea', g.dialogo))?.focus();
}

function fecharGaveta(nome) {
  const g = gavetas[nome];
  if (g.dialogo.open) g.dialogo.close();
  g.aoFechar?.();
}

function abrirVideo(v = null) {
  const form = $('[data-form="video"]');
  editandoVideo = v;
  form.reset();
  limparArquivo('clipe');
  limparArquivo('capa');
  removidos.clipe = false;
  removidos.capa = false;
  $('[data-video-erro]').textContent = '';
  $('[data-video-titulo]').textContent = v ? 'Editar vídeo' : 'Novo vídeo';
  $('[data-video-botao]').textContent = v ? 'Salvar vídeo' : 'Adicionar vídeo';
  if (v) {
    tipoNovo = v.category_id;
    form.titulo.value = v.titulo ?? '';
    form.link.value = v.youtube_id ? `https://youtu.be/${v.youtube_id}` : '';
    form.descricao_pt.value = v.descricao_pt ?? '';
    form.descricao_en.value = v.descricao_en ?? '';
    form.destaque.checked = Boolean(v.destaque);
    renderFiltrosSelect(form.filter_id, v.filter_id ?? '');
    if (v.preview_url) marcarArquivo('clipe', 'Clipe atual ✓', 'escolha outro para trocar');
    if (v.poster_url) marcarArquivo('capa', 'Capa atual ✓', 'escolha outra para trocar');
  } else if (filtroCategoria !== 'todas') {
    tipoNovo = filtroCategoria;
  }
  renderTipos();
  atualizarPrevia();
  abrirGaveta('video', v ? form.titulo : $('[aria-checked="true"]', form));
}

async function salvarVideo(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const erro = $('[data-video-erro]');
  const dados = camposVideo(form);
  erro.textContent = '';
  if (!tipoNovo) return void (erro.textContent = 'crie uma categoria primeiro!');
  if (!dados.youtube_id) {
    erro.textContent = 'cola um link do YouTube válido!';
    return form.link.focus();
  }
  if (!dados.titulo) {
    erro.textContent = 'falta o título!';
    return form.titulo.focus();
  }
  const cat = categoria(tipoNovo);
  const v = editandoVideo;
  const botao = $('[data-video-botao]');
  const ok = await ocupado(botao, () => acao(async () => {
    let preview_url = v && !removidos.clipe ? v.preview_url ?? '' : '';
    let poster_url = v && !removidos.capa ? v.poster_url ?? '' : '';
    if (arquivos.clipe) preview_url = await api.enviarArquivo(arquivos.clipe, 'previas');
    if (arquivos.capa) poster_url = await api.enviarArquivo(arquivos.capa, 'capas');
    const registro = {
      ...dados,
      preview_url,
      poster_url,
      category_id: tipoNovo,
      filter_id: usaFiltros(cat) ? form.filter_id.value || null : null,
      destaque: form.destaque.checked,
    };
    if (v) await api.atualizar('videos', v.id, registro);
    else await api.inserir('videos', { ...registro, ordem: Math.min(0, ...db.videos.map((x) => x.ordem ?? 0)) - 1 });
    return true;
  }, v ? 'vídeo salvo ✓' : 'vídeo adicionado ✓'));
  if (!ok) return;
  fecharGaveta('video');
  await recarregar();
}

function textoBusca() {
  return $('[data-busca]').value.trim().toLowerCase();
}

function renderFiltroCategoria() {
  const alvo = $('[data-lista="filtro-categoria"]');
  if (filtroCategoria !== 'todas' && !db.categories.some((c) => c.id === filtroCategoria)) filtroCategoria = 'todas';
  alvo.textContent = '';
  [{ id: 'todas', nome_pt: 'Todos' }, ...db.categories].forEach((c) => {
    const total = c.id === 'todas' ? db.videos.length : db.videos.filter((v) => v.category_id === c.id).length;
    alvo.append(el('button', {
      type: 'button',
      class: 'chip',
      'aria-pressed': String(c.id === filtroCategoria),
      onclick: () => {
        filtroCategoria = c.id;
        renderFiltroCategoria();
        renderTrabalhos();
      },
    }, el('span', { text: c.nome_pt }), el('span', { class: 'chip-conta', text: String(total) })));
  });
}

function renderTrabalhos() {
  const ul = $('[data-lista="trabalhos"]');
  const busca = textoBusca();
  ul.textContent = '';
  const lista = db.videos.filter((v) => {
    if (filtroCategoria !== 'todas' && v.category_id !== filtroCategoria) return false;
    if (!busca) return true;
    const cat = categoria(v.category_id);
    return [v.titulo, v.descricao_pt, v.descricao_en, cat?.nome_pt].join(' ').toLowerCase().includes(busca);
  });
  if (!lista.length) {
    ul.append(vazio(busca || filtroCategoria !== 'todas' ? 'Nenhum vídeo encontrado.' : 'Nenhum vídeo ainda. Clique em "Novo vídeo" para adicionar o primeiro.'));
    return;
  }
  lista.forEach((v) => ul.append(itemTrabalho(v, ul)));
}

function miniatura(v, vertical) {
  const mini = el('span', { class: `mini${vertical ? ' vertical' : ''}`, 'aria-hidden': 'true' });
  const src = v.poster_url || (v.youtube_id ? thumbYoutube(v.youtube_id, 'mqdefault') : '');
  mini.append(icone(v.preview_url ? 'clipe' : 'videos', 'ic mini-ic'));
  if (src) {
    const img = el('img', { src, alt: '', loading: 'lazy' });
    img.addEventListener('error', () => img.remove());
    mini.append(img);
  }
  return mini;
}

function itemTrabalho(v, ul) {
  const cat = categoria(v.category_id);
  const destaque = Boolean(v.destaque);
  const li = el('li', { class: 'item item-video', 'data-id': v.id });
  const sub = [v.descricao_pt, v.youtube_id ? `youtu.be/${v.youtube_id}` : 'sem link'].filter(Boolean).join(' · ');
  li.append(
    alca(`Mover ${v.titulo}`, () => ul, 'videos'),
    miniatura(v, cat?.formato === 'vertical'),
    el('span', { class: 'item-textos' },
      el('span', { class: 'item-titulo', text: v.titulo }),
      el('span', { class: 'item-sub', text: sub })),
    el('span', { class: 'etiquetas' },
      el('span', { class: 'etiqueta-cat', text: cat?.nome_pt ?? '?' }),
      v.preview_url ? el('span', { class: 'etiqueta-clipe', text: 'clipe' }) : null),
    el('span', { class: 'item-acoes' },
      botaoIcone('estrela', destaque ? `Tirar ${v.titulo} dos destaques` : `Destacar ${v.titulo}`, `btn-destaque${destaque ? ' ativo' : ''}`, async () => {
        await acao(() => api.atualizar('videos', v.id, { destaque: !destaque }), destaque ? 'saiu dos destaques' : 'agora está nos destaques ✓');
        await recarregar();
      }, { 'aria-pressed': String(destaque) }),
      botaoIcone('editar', `Editar ${v.titulo}`, '', () => abrirVideo(v)),
      botaoIcone('lixo', `Excluir ${v.titulo}`, 'btn-icone-perigo', async () => {
        if (!(await confirmar(`Excluir "${v.titulo}"? Ele sai do site na hora.`))) return;
        await acao(() => api.excluir('videos', v.id), 'vídeo excluído');
        await recarregar();
      })),
  );
  return li;
}

function avatar(c, classe = 'cliente-rosto') {
  const rosto = el('span', { class: classe });
  if (c.foto_url) {
    const img = el('img', { src: c.foto_url, alt: '', loading: 'lazy' });
    img.addEventListener('error', () => { rosto.textContent = iniciais(c.nome); });
    rosto.append(img);
  } else {
    rosto.textContent = iniciais(c.nome);
  }
  return rosto;
}

function renderClientes() {
  const ul = $('[data-lista="clientes"]');
  ul.textContent = '';
  if (!db.clients.length) ul.append(vazio('Nenhum cliente ainda. Clique em "Novo cliente".'));
  db.clients.forEach((c, i) => {
    let dominio = '';
    try { dominio = c.canal_url ? new URL(c.canal_url).hostname.replace(/^www\./, '') : ''; } catch { dominio = ''; }
    ul.append(el('li', { class: 'cliente', 'data-id': c.id },
      alca(`Mover cliente ${c.nome}`, () => ul, 'clients'),
      avatar(c),
      el('span', { class: 'cliente-textos' },
        el('span', { class: 'cliente-nome', text: c.nome }),
        el('span', { class: 'cliente-linha' },
          el('span', { class: `etiqueta-lugar${i < NO_CARTAZ ? ' cartaz' : ''}`, text: i < NO_CARTAZ ? 'no cartaz' : 'em ver todos' }),
          el('span', { class: 'item-sub', text: dominio || 'sem link' }))),
      el('span', { class: 'item-acoes' },
        botaoIcone('editar', `Editar cliente ${c.nome}`, '', () => abrirCliente(c)),
        botaoIcone('lixo', `Excluir cliente ${c.nome}`, 'btn-icone-perigo', async () => {
          if (!(await confirmar(`Excluir o cliente "${c.nome}"?`))) return;
          await acao(() => api.excluir('clients', c.id), 'cliente excluído');
          await recarregar();
        }))));
  });
}

function mostrarFotoCliente(url, nome = '') {
  const caixa = $('[data-cliente-previa]');
  caixa.textContent = '';
  if (url) {
    const img = el('img', { src: url, alt: '' });
    img.addEventListener('error', () => { caixa.textContent = iniciais(nome || '?'); });
    caixa.append(img);
    $('[data-foto-rotulo]').textContent = 'Trocar foto';
  } else {
    caixa.append(icone('upload'));
    $('[data-foto-rotulo]').textContent = 'Enviar foto';
  }
}

function estadoCliente() {
  const form = $('[data-form="cliente"]');
  return JSON.stringify([form.nome.value, form.canal_url.value, form.foto_url.value, fotoArquivo?.name]);
}

function abrirCliente(c = null) {
  editandoCliente = c;
  fotoArquivo = null;
  const form = $('[data-form="cliente"]');
  form.reset();
  $('[data-cliente-erro]').textContent = '';
  form.nome.value = c?.nome ?? '';
  form.canal_url.value = c?.canal_url ?? '';
  form.foto_url.value = c?.foto_url && !c.foto_url.startsWith('data:') ? c.foto_url : '';
  mostrarFotoCliente(c?.foto_url ?? '', c?.nome);
  $('[data-cliente-titulo]').textContent = c ? 'Editar cliente' : 'Novo cliente';
  $('[data-cliente-botao]').textContent = c ? 'Salvar cliente' : 'Adicionar cliente';
  abrirGaveta('cliente', form.nome);
}

function escolherFoto(arquivo) {
  if (!arquivo) return;
  if (!arquivo.type.startsWith('image/')) return toast('isso não é uma imagem', 'erro');
  if (arquivo.size > 3 * 1024 * 1024) return toast('foto grande demais (máx. 3 MB)', 'erro');
  fotoArquivo = arquivo;
  $('[data-form="cliente"]').foto_url.value = '';
  mostrarFotoCliente(URL.createObjectURL(arquivo));
}

async function salvarCliente(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const erro = $('[data-cliente-erro]');
  erro.textContent = '';
  const nome = form.nome.value.trim();
  if (!nome) {
    erro.textContent = 'falta o nome!';
    return form.nome.focus();
  }
  const c = editandoCliente;
  const ok = await ocupado($('[data-cliente-botao]'), () => acao(async () => {
    let foto = urlCompleta(form.foto_url.value);
    if (fotoArquivo) foto = await api.enviarArquivo(fotoArquivo, 'clientes');
    else if (!foto && c) foto = c.foto_url?.startsWith('data:') ? c.foto_url : '';
    const dados = { nome, canal_url: urlCompleta(form.canal_url.value), foto_url: foto };
    if (c) await api.atualizar('clients', c.id, dados);
    else await api.inserir('clients', { ...dados, ordem: db.clients.length });
    return true;
  }, c ? 'cliente salvo ✓' : 'cliente adicionado ✓'));
  if (!ok) return;
  fecharGaveta('cliente');
  await recarregar();
}

function renderDepoimentos() {
  const ul = $('[data-lista="depoimentos"]');
  ul.textContent = '';
  const lista = db.testimonials || [];
  if (!lista.length) ul.append(vazio('Nenhum depoimento ainda. Clique em "Novo depoimento".'));
  lista.forEach((d) => {
    ul.append(el('li', { class: 'item item-depo', 'data-id': d.id },
      alca(`Mover depoimento de ${d.nome}`, () => ul, 'testimonials'),
      el('span', { class: 'item-textos' },
        el('span', { class: 'item-titulo', text: d.canal ? `${d.nome} · ${d.canal}` : d.nome }),
        el('span', { class: 'item-citacao', text: `“${d.texto_pt}”` }),
        d.texto_en ? null : el('span', { class: 'item-aviso', text: 'sem versão em inglês' })),
      el('span', { class: 'item-acoes' },
        botaoIcone('editar', `Editar depoimento de ${d.nome}`, '', () => abrirDepoimento(d)),
        botaoIcone('lixo', `Excluir depoimento de ${d.nome}`, 'btn-icone-perigo', async () => {
          if (!(await confirmar(`Excluir o depoimento de "${d.nome}"?`))) return;
          await acao(() => api.excluir('testimonials', d.id), 'depoimento excluído');
          await recarregar();
        }))));
  });
}

function estadoDepoimento() {
  const form = $('[data-form="depoimento"]');
  return JSON.stringify([form.nome.value, form.canal.value, form.texto_pt.value, form.texto_en.value]);
}

function abrirDepoimento(d = null) {
  editandoDepoimento = d;
  const form = $('[data-form="depoimento"]');
  form.reset();
  $('[data-depo-erro]').textContent = '';
  form.nome.value = d?.nome ?? '';
  form.canal.value = d?.canal ?? '';
  form.texto_pt.value = d?.texto_pt ?? '';
  form.texto_en.value = d?.texto_en ?? '';
  $('[data-depo-titulo]').textContent = d ? 'Editar depoimento' : 'Novo depoimento';
  $('[data-depo-botao]').textContent = d ? 'Salvar depoimento' : 'Adicionar depoimento';
  abrirGaveta('depoimento', form.nome);
}

async function salvarDepoimento(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const erro = $('[data-depo-erro]');
  const nome = form.nome.value.trim();
  const texto_pt = form.texto_pt.value.trim();
  erro.textContent = '';
  if (!nome || !texto_pt) {
    erro.textContent = 'preenche o nome e o depoimento em português!';
    return (nome ? form.texto_pt : form.nome).focus();
  }
  const d = editandoDepoimento;
  const dados = { nome, canal: form.canal.value.trim(), texto_pt, texto_en: form.texto_en.value.trim() };
  const ok = await ocupado($('[data-depo-botao]'), () => acao(async () => {
    if (d) await api.atualizar('testimonials', d.id, dados);
    else await api.inserir('testimonials', { ...dados, ordem: (db.testimonials || []).length });
    return true;
  }, d ? 'depoimento salvo ✓' : 'depoimento adicionado ✓'));
  if (!ok) return;
  fecharGaveta('depoimento');
  await recarregar();
}

async function salvarTextos(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const nome = form.nome.value.trim();
  if (!nome) {
    toast('o nome artístico não pode ficar vazio', 'erro');
    return form.nome.focus();
  }
  const redes = { instagram: urlCompleta(form.instagram.value), x: urlCompleta(form.x.value), youtube: urlCompleta(form.youtube.value) };
  const ruim = Object.keys(redes).find((r) => form[r].value.trim() && !redes[r]);
  if (ruim) {
    toast('tem um link de rede inválido', 'erro');
    return form[ruim].focus();
  }
  const botao = $('button[type="submit"]', form);
  const ok = await ocupado(botao, async () => {
    let foto_url = urlCompleta(form.foto_url.value) || (db.settings.foto_url ?? '');
    if (arquivos['foto-sobre']) {
      const enviada = await acao(() => api.enviarArquivo(arquivos['foto-sobre'], 'sobre'));
      if (!enviada) return false;
      foto_url = enviada;
    }
    const patch = {
      nome,
      foto_url,
      email: form.email.value.trim(),
      sobre_pt: form.sobre_pt.value.trim(),
      sobre_en: form.sobre_en.value.trim(),
      discord_nick: form.discord_nick.value.trim(),
      ...Object.fromEntries(TEXTOS_PAGINA.map((nome) => [nome, form[nome].value.trim()])),
      redes,
    };
    const salvo = await acao(() => api.salvarSettings(patch), 'textos salvos ✓');
    if (salvo === undefined) return false;
    Object.assign(db.settings, patch);
    return true;
  });
  if (!ok) return;
  preencherTextos();
  renderTudo();
  const aviso = $('[data-salvo]');
  aviso.textContent = 'salvo ✓';
  setTimeout(() => { aviso.textContent = ''; }, 2500);
}

function ligarSoltar(caixa, aoSoltar) {
  ['dragenter', 'dragover'].forEach((ev) => caixa.addEventListener(ev, (e) => {
    e.preventDefault();
    caixa.classList.add('solta');
  }));
  ['dragleave', 'drop'].forEach((ev) => caixa.addEventListener(ev, () => caixa.classList.remove('solta')));
  caixa.addEventListener('drop', (e) => {
    e.preventDefault();
    aoSoltar(e.dataTransfer?.files?.[0]);
  });
}

function ligarEventos() {
  pintarIcones();

  $('[data-form="login"]').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const erro = $('[data-login-erro]');
    const botao = $('button[type="submit"]', form);
    erro.textContent = '';
    form.classList.remove('com-erro');
    botao.disabled = true;
    try {
      await api.entrar(form.email.value, form.senha.value);
      form.reset();
      await abrirPainel();
    } catch (falha) {
      erro.textContent = erroAmigavel(falha);
      form.classList.add('com-erro');
      form.senha.select();
    } finally {
      botao.disabled = !nuvemConfigurada() && !loginLocalPermitido();
    }
  });

  $('[data-ver-senha]').addEventListener('click', (e) => {
    const botao = e.currentTarget;
    const senha = $('[data-form="login"]').senha;
    const ver = senha.type === 'password';
    senha.type = ver ? 'text' : 'password';
    botao.setAttribute('aria-pressed', String(ver));
    botao.setAttribute('aria-label', ver ? 'Esconder senha' : 'Mostrar senha');
  });

  $('[data-sair]').addEventListener('click', async () => {
    if (textosAlterados() && !(await confirmar('Você tem alterações não salvas. Sair mesmo assim?', 'Sair'))) return;
    await api.sair().catch(() => {});
    db = null;
    mostrarLogin();
  });

  $$('[data-ir]').forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault();
    irPara(a.dataset.ir);
  }));
  window.addEventListener('popstate', () => {
    if (db && !$('[data-tela="painel"]').hidden) irPara(paginaDoHash(), { historico: false });
  });
  window.addEventListener('beforeunload', (e) => {
    if (!textosAlterados()) return;
    e.preventDefault();
    e.returnValue = '';
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== '/' || paginaAtual !== 'videos' || document.querySelector('dialog[open]')) return;
    if (e.target.closest('input, textarea, select, [contenteditable]')) return;
    e.preventDefault();
    $('[data-busca]').focus();
  });

  $('[data-comissoes]').addEventListener('click', async (e) => {
    const botao = e.currentTarget;
    const aberto = !db.settings.comissoes_abertas;
    const ok = await ocupado(botao, () => acao(() => api.salvarSettings({ comissoes_abertas: aberto }), aberto ? 'comissões abertas ✓' : 'comissões fechadas'));
    if (ok !== undefined) {
      db.settings.comissoes_abertas = aberto;
      renderComissoes();
    }
  });

  const formTextos = $('[data-form="textos"]');
  formTextos.addEventListener('submit', salvarTextos);
  formTextos.addEventListener('input', () => {
    atualizarBarraTextos();
    atualizarContadores();
    atualizarLinksFinais();
  });
  formTextos.foto_url.addEventListener('input', (e) => {
    limparArquivo('foto-sobre');
    mostrarFotoSobre(urlCompleta(e.target.value) || db.settings.foto_url);
  });
  $('[data-descartar]').addEventListener('click', () => {
    preencherTextos();
    toast('alterações descartadas');
  });
  $('[data-ver-sobre]').addEventListener('click', (e) => {
    const botao = e.currentTarget;
    const ligar = botao.getAttribute('aria-pressed') !== 'true';
    botao.setAttribute('aria-pressed', String(ligar));
    botao.textContent = ligar ? 'Voltar a editar' : 'Ver como fica';
    atualizarPreviaSobre();
  });
  const soltaSobre = $('[data-solta="foto-sobre"]');
  $('input[type="file"]', soltaSobre).addEventListener('change', (e) => escolherArquivo('foto-sobre', e.target.files?.[0]));
  ligarSoltar(soltaSobre, (arquivo) => escolherArquivo('foto-sobre', arquivo));

  $('[data-form="categoria"]').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const nome = form.nome.value.trim();
    if (!nome) return form.nome.focus();
    const base = slug(nome);
    let s = base;
    let n = 2;
    while (db.categories.some((c) => c.slug === s)) s = `${base}-${n++}`;
    const ok = await acao(() => api.inserir('categories', { nome_pt: nome, nome_en: nome, slug: s, formato: form.formato.value, ordem: db.categories.length }), 'categoria criada ✓');
    if (ok) form.reset();
    await recarregar();
  });

  $('[data-form="filtro"]').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const nome = form.nome.value.trim();
    if (!nome) return form.nome.focus();
    const ok = await acao(() => api.inserir('longform_filters', { nome_pt: nome, nome_en: nome, ordem: db.longform_filters.length }), 'filtro criado ✓');
    if (ok) form.reset();
    await recarregar();
  });

  registrarGaveta('video', { estado: estadoVideo, aoFechar: () => { editandoVideo = null; } });
  registrarGaveta('cliente', { estado: estadoCliente, aoFechar: () => { editandoCliente = null; fotoArquivo = null; } });
  registrarGaveta('depoimento', { estado: estadoDepoimento, aoFechar: () => { editandoDepoimento = null; } });

  $('[data-novo-video]').addEventListener('click', () => abrirVideo());
  $('[data-novo-cliente]').addEventListener('click', () => abrirCliente());
  $('[data-novo-depoimento]').addEventListener('click', () => abrirDepoimento());

  ['clipe', 'capa'].forEach((tipo) => {
    const caixa = $(`[data-solta="${tipo}"]`);
    $('input[type="file"]', caixa).addEventListener('change', (e) => escolherArquivo(tipo, e.target.files?.[0]));
    ligarSoltar(caixa, (arquivo) => escolherArquivo(tipo, arquivo));
    $(`[data-remover="${tipo}"]`).addEventListener('click', () => {
      limparArquivo(tipo);
      if (editandoVideo?.[tipo === 'clipe' ? 'preview_url' : 'poster_url']) removidos[tipo] = true;
      atualizarPrevia();
    });
  });

  const formVideo = $('[data-form="video"]');
  formVideo.addEventListener('input', atualizarPrevia);
  formVideo.addEventListener('submit', salvarVideo);

  $('[data-busca]').addEventListener('input', renderTrabalhos);

  $('[data-form="depoimento"]').addEventListener('submit', salvarDepoimento);

  const formCliente = $('[data-form="cliente"]');
  formCliente.addEventListener('submit', salvarCliente);
  formCliente.arquivo.addEventListener('change', (e) => escolherFoto(e.target.files?.[0]));
  formCliente.foto_url.addEventListener('input', (e) => {
    fotoArquivo = null;
    mostrarFotoCliente(urlCompleta(e.target.value), formCliente.nome.value);
  });
  ligarSoltar($('[data-solta-foto]'), escolherFoto);
}

async function iniciar() {
  mostrarAvisos();
  ligarEventos();
  let sessao = null;
  try {
    sessao = await api.sessaoAtual();
  } catch {
    sessao = null;
  }
  if (sessao) await abrirPainel();
  else mostrarLogin();
}

iniciar();
