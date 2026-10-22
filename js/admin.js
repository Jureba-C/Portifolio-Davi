import { criarApi, extrairIdYoutube, ehLinkDeShort, thumbYoutube, iniciais, loginLocalPermitido } from './data.js';
import { nuvemConfigurada } from './supabase.js';
import { el, usoSvg } from './dom.js';

const api = criarApi();
const $ = (seletor, raiz = document) => raiz.querySelector(seletor);
const $$ = (seletor, raiz = document) => [...raiz.querySelectorAll(seletor)];

const ERROS = {
  credenciais: 'credenciais incorretas!',
  'nao-admin': 'esse e-mail não tem acesso de admin!',
  'nuvem-nao-configurada': 'o painel ainda não está ligado na nuvem.',
};

let db = null;
let Sortable = null;
let painelPronto = false;
let tipoNovo = null;
let editandoCliente = null;
let fotoArquivo = null;
let timerToast;

function erroAmigavel(erro) {
  return ERROS[erro?.message] ?? 'deu ruim! confere a internet e tenta de novo.';
}

function toast(mensagem, tipo = 'ok') {
  const caixa = $('[data-toast]');
  caixa.textContent = mensagem;
  caixa.classList.toggle('erro', tipo === 'erro');
  caixa.classList.add('visivel');
  clearTimeout(timerToast);
  timerToast = setTimeout(() => caixa.classList.remove('visivel'), 2400);
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

function confirmar(texto, botao = 'EXCLUIR') {
  const dialogo = $('[data-confirmar]');
  $('[data-confirmar-texto]', dialogo).textContent = texto;
  $('.perigo', dialogo).textContent = botao;
  dialogo.returnValue = '';
  dialogo.showModal();
  return new Promise((resolver) => {
    dialogo.addEventListener('close', () => resolver(dialogo.returnValue === 'sim'), { once: true });
  });
}

function urlCompleta(valor) {
  const texto = String(valor ?? '').trim();
  if (!texto) return '';
  return /^https?:\/\//i.test(texto) ? texto : `https://${texto.replace(/^\/+/, '')}`;
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

function botaoIcone(simbolo, rotulo, classe, onclick) {
  return el('button', { type: 'button', class: `icone-botao ${classe ?? ''}`, 'aria-label': rotulo, onclick }, usoSvg(simbolo, '', 'viewBox="0 0 24 24"'));
}

function alca(rotulo, lista, tabela) {
  return el('button', {
    type: 'button',
    class: 'alca',
    'aria-label': `${rotulo} — use as setas pra cima e pra baixo`,
    onkeydown: (e) => {
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
      e.preventDefault();
      const item = e.currentTarget.closest('[data-id]');
      const subir = e.key === 'ArrowUp' || e.key === 'ArrowLeft';
      const vizinho = subir ? item.previousElementSibling : item.nextElementSibling;
      if (!vizinho) return;
      if (subir) vizinho.before(item);
      else vizinho.after(item);
      e.currentTarget.focus();
      salvarOrdem(tabela, lista());
    },
  }, usoSvg('alca', '', 'viewBox="0 0 24 24"'));
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
    a.innerHTML = '';
    if (a.closest('[data-tela="login"]')) {
      a.append(
        el('strong', { text: local ? 'modo local: ' : 'nuvem desligada: ' }),
        local
          ? 'o Supabase ainda não foi ligado. Entre com demo@local / demo1234 — as mudanças ficam só neste navegador.'
          : 'o Supabase ainda não foi configurado (veja o README).',
      );
    } else {
      a.append(el('strong', { text: 'modo local: ' }), 'as mudanças ficam só neste navegador até ligar o Supabase.');
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
    ligarArraste($('[data-lista="clientes"]'), 'clients', '.cliente-avatar');
    iniciarMenuAtivo();
  }
}

function renderTudo() {
  $$('[data-campo="nome"]').forEach((n) => { n.textContent = db.settings.nome || 'DAVI'; });
  renderComissoes();
  renderCategorias();
  renderFiltros();
  renderTipos();
  renderFiltrosSelect($('[data-lista="filtros-select"]'));
  atualizarPrevia();
  renderTrabalhos();
  renderClientes();
}

function preencherTextos() {
  const form = $('[data-form="textos"]');
  const s = db.settings;
  form.nome.value = s.nome ?? '';
  form.email.value = s.email ?? '';
  form.sobre_pt.value = s.sobre_pt ?? '';
  form.sobre_en.value = s.sobre_en ?? '';
  form.discord_nick.value = s.discord_nick ?? '';
  form.instagram.value = s.redes?.instagram ?? '';
  form.x.value = s.redes?.x ?? '';
  form.youtube.value = s.redes?.youtube ?? '';
}

function renderComissoes() {
  $('[data-comissoes]').setAttribute('aria-pressed', String(Boolean(db.settings.comissoes_abertas)));
}

function renderCategorias() {
  const ul = $('[data-lista="categorias"]');
  ul.textContent = '';
  db.categories.forEach((cat) => {
    const total = db.videos.filter((v) => v.category_id === cat.id).length;
    const li = el('li', { class: 'scrap item-ordem', 'data-id': cat.id });
    const mostrar = () => {
      li.textContent = '';
      li.append(
        alca(`Mover ${cat.nome_pt}`, () => ul, 'categories'),
        el('span', { class: 'item-nome', text: cat.nome_en && cat.nome_en !== cat.nome_pt ? `${cat.nome_pt} / ${cat.nome_en}` : cat.nome_pt }),
        el('span', { class: 'item-meta', text: `${total} ${total === 1 ? 'vídeo' : 'vídeos'}${cat.formato === 'vertical' ? ' · 9:16' : ''}` }),
        botaoIcone('lapis', `Renomear ${cat.nome_pt}`, '', editar),
        botaoIcone('xis', `Excluir ${cat.nome_pt}`, 'excluir', excluir),
      );
    };
    const editar = () => {
      li.textContent = '';
      const pt = el('input', { value: cat.nome_pt, 'aria-label': 'nome em português', maxlength: '40' });
      const en = el('input', { value: cat.nome_en ?? '', 'aria-label': 'nome em inglês', maxlength: '40' });
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
        el('div', { class: 'linha-acoes' },
          el('button', { type: 'button', class: 'botao-pequeno', text: 'salvar', onclick: salvar }),
          el('button', { type: 'button', class: 'cancelar', text: 'cancelar', onclick: mostrar }))));
      [pt, en].forEach((i) => i.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') salvar();
        if (e.key === 'Escape') mostrar();
      }));
      pt.focus();
    };
    const excluir = async () => {
      const aviso = total ? ` Os ${total} ${total === 1 ? 'vídeo' : 'vídeos'} dela também somem.` : '';
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
  if (!db.longform_filters.length) ul.append(el('li', { class: 'lista-vazia', text: 'nenhum filtro ainda' }));
  db.longform_filters.forEach((f, i) => {
    const usados = db.videos.filter((v) => v.filter_id === f.id).length;
    ul.append(el('li', { class: `chip-filtro ${i % 2 ? 'rough2' : 'rough'}`, 'data-id': f.id },
      alca(`Mover ${f.nome_pt}`, () => ul, 'longform_filters'),
      el('span', { text: f.nome_pt }),
      el('button', {
        type: 'button',
        class: 'icone-botao',
        'aria-label': `Remover filtro ${f.nome_pt}`,
        text: '×',
        onclick: async () => {
          const aviso = usados ? ` ${usados} ${usados === 1 ? 'vídeo fica' : 'vídeos ficam'} sem filtro.` : '';
          if (!(await confirmar(`Remover o filtro "${f.nome_pt}"?${aviso}`, 'REMOVER'))) return;
          await acao(() => api.excluir('longform_filters', f.id), 'filtro removido');
          await recarregar();
        },
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
      class: `tipo ${i % 2 ? 'rough2' : 'rough'}`,
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
  thumb.classList.toggle('vertical', vertical);
  $('[data-previa-tag]').textContent = (cat?.nome_pt ?? '').toUpperCase();
  $('[data-previa-tag]').hidden = vertical;
  $('[data-previa-titulo]').textContent = form.titulo.value.trim() || '[Título do trabalho]';
  $('[data-previa-desc]').textContent = form.descricao_pt.value.trim() || '[descrição / participantes]';
  const ajuda = $('[data-link-ajuda]');
  if (!form.link.value.trim()) {
    ajuda.textContent = '';
    ajuda.className = 'campo-ajuda';
  } else if (id) {
    ajuda.textContent = `✓ vídeo reconhecido (${id})`;
    ajuda.className = 'campo-ajuda ok';
  } else {
    ajuda.textContent = 'não reconheci esse link do YouTube';
    ajuda.className = 'campo-ajuda erro';
  }
  if (id) {
    if (img.dataset.id !== id) {
      img.dataset.id = id;
      img.hidden = true;
      img.onload = () => { img.hidden = false; };
      img.onerror = () => { img.hidden = true; };
      img.src = thumbYoutube(id);
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

async function adicionarVideo(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const erro = $('[data-video-erro]');
  const dados = camposVideo(form);
  erro.textContent = '';
  if (!tipoNovo) return void (erro.textContent = 'crie uma categoria primeiro!');
  if (!dados.titulo) {
    erro.textContent = 'falta o título!';
    return form.titulo.focus();
  }
  if (!dados.youtube_id) {
    erro.textContent = 'cola um link do YouTube válido!';
    return form.link.focus();
  }
  const cat = categoria(tipoNovo);
  const menor = Math.min(0, ...db.videos.map((v) => v.ordem ?? 0));
  const novo = await acao(() => api.inserir('videos', {
    ...dados,
    category_id: tipoNovo,
    filter_id: usaFiltros(cat) ? form.filter_id.value || null : null,
    destaque: false,
    ordem: menor - 1,
  }), 'vídeo adicionado ✓');
  if (!novo) return;
  if (form.destaque.checked) await acao(() => api.definirDestaque(novo.id));
  form.reset();
  await recarregar();
}

function textoBusca() {
  return $('[data-busca]').value.trim().toLowerCase();
}

function renderTrabalhos() {
  const ul = $('[data-lista="trabalhos"]');
  const busca = textoBusca();
  ul.textContent = '';
  const lista = db.videos.filter((v) => {
    if (!busca) return true;
    const cat = categoria(v.category_id);
    return [v.titulo, v.descricao_pt, v.descricao_en, cat?.nome_pt].join(' ').toLowerCase().includes(busca);
  });
  if (!lista.length) {
    ul.append(el('li', { class: 'lista-vazia', text: busca ? 'nada com esse nome…' : 'nenhum vídeo ainda — adiciona o primeiro aí em cima!' }));
    return;
  }
  lista.forEach((v) => ul.append(itemTrabalho(v, ul)));
}

function itemTrabalho(v, ul) {
  const cat = categoria(v.category_id);
  const destaque = db.settings.video_destaque_id === v.id;
  const li = el('li', { class: 'scrap item-trabalho', 'data-id': v.id });
  const mini = el('span', { class: `scrap2 mini-thumb${cat?.formato === 'vertical' ? ' vertical' : ''}`, 'aria-hidden': 'true' });
  if (v.youtube_id) {
    const img = el('img', { src: thumbYoutube(v.youtube_id, 'mqdefault'), alt: '', loading: 'lazy' });
    img.addEventListener('error', () => img.remove());
    mini.append(img);
  }
  const sub = [v.descricao_pt, v.youtube_id ? `youtu.be/${v.youtube_id}` : 'sem link'].filter(Boolean).join(' · ');
  li.append(...[
    el('div', { class: 'item-principal' },
      alca(`Mover ${v.titulo}`, () => ul, 'videos'),
      mini,
      el('span', { class: 'item-textos' },
        el('span', { class: 'item-titulo', text: v.titulo }),
        el('span', { class: 'item-sub', text: sub }))),
    destaque ? el('span', { class: 'selo-destaque', text: 'showreel' }) : null,
    el('span', { class: 'rough selo-cat', text: (cat?.nome_pt ?? '?').toUpperCase() }),
    el('div', { class: 'item-acoes' },
      botaoIcone('lapis', `Editar ${v.titulo}`, '', () => editarVideo(li, v)),
      botaoIcone('xis', `Excluir ${v.titulo}`, 'excluir', async () => {
        if (!(await confirmar(`Excluir "${v.titulo}"? Ele sai do site na hora.`))) return;
        await acao(() => api.excluir('videos', v.id), 'vídeo excluído');
        await recarregar();
      })),
  ].filter(Boolean));
  return li;
}

function editarVideo(li, v) {
  if ($('.form-edicao', li)) return;
  const form = el('form', { class: 'form-edicao', novalidate: true });
  const campo = (rotulo, entrada) => el('label', { class: 'campo' }, rotulo, entrada);
  const titulo = el('input', { name: 'titulo', class: 'rough', value: v.titulo, maxlength: '120' });
  const cat = el('select', { name: 'category_id', class: 'rough2' }, db.categories.map((c) => el('option', { value: c.id, text: c.nome_pt })));
  cat.value = v.category_id;
  const filtro = el('select', { name: 'filter_id', class: 'rough' });
  renderFiltrosSelect(filtro, v.filter_id ?? '');
  const filtroCampo = campo('filtro', filtro);
  const link = el('input', { name: 'link', class: 'rough2', value: v.youtube_id ? `https://youtu.be/${v.youtube_id}` : '' });
  const descPt = el('input', { name: 'descricao_pt', class: 'rough', value: v.descricao_pt ?? '', maxlength: '160' });
  const descEn = el('input', { name: 'descricao_en', class: 'rough2', value: v.descricao_en ?? '', maxlength: '160' });
  const destaque = el('input', { type: 'checkbox', name: 'destaque' });
  destaque.checked = db.settings.video_destaque_id === v.id;
  const erro = el('p', { class: 'form-erro rabisco', role: 'alert' });
  const ajustarFiltro = () => { filtroCampo.hidden = !usaFiltros(categoria(cat.value)); };
  cat.addEventListener('change', ajustarFiltro);
  ajustarFiltro();
  form.append(
    campo('título', titulo), campo('categoria', cat), filtroCampo, campo('link do YouTube', link),
    campo('descrição (PT)', descPt), campo('descrição (EN)', descEn),
    el('label', { class: 'checagem' }, destaque, ' showreel em destaque'),
    erro,
    el('div', { class: 'linha-acoes' },
      el('button', { type: 'submit', class: 'botao-pequeno', text: 'salvar' }),
      el('button', { type: 'button', class: 'cancelar', text: 'cancelar', onclick: () => form.remove() })),
  );
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const dados = camposVideo(form);
    if (!dados.titulo) return void (erro.textContent = 'falta o título!');
    if (!dados.youtube_id) return void (erro.textContent = 'link do YouTube inválido!');
    const ok = await acao(async () => {
      await api.atualizar('videos', v.id, {
        ...dados,
        category_id: cat.value,
        filter_id: usaFiltros(categoria(cat.value)) ? filtro.value || null : null,
      });
      const eraDestaque = db.settings.video_destaque_id === v.id;
      if (destaque.checked && !eraDestaque) await api.definirDestaque(v.id);
      if (!destaque.checked && eraDestaque) await api.definirDestaque(null);
      return true;
    }, 'vídeo salvo ✓');
    if (ok) await recarregar();
  });
  li.append(form);
  titulo.focus();
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
  if (!db.clients.length) ul.append(el('li', { class: 'lista-vazia', text: 'nenhum cliente ainda' }));
  db.clients.forEach((c) => {
    ul.append(el('li', { class: 'cliente-item', 'data-id': c.id },
      el('span', { class: 'cliente-avatar', title: 'arraste pra reordenar' },
        el('span', { class: 'cliente-sombra', 'aria-hidden': 'true' }), avatar(c)),
      el('span', { class: 'cliente-nome', text: c.nome }),
      el('div', { class: 'cliente-acoes' },
        botaoIcone('lapis', `Editar cliente ${c.nome}`, '', () => editarCliente(c)),
        botaoIcone('xis', `Excluir cliente ${c.nome}`, 'excluir', async () => {
          if (!(await confirmar(`Excluir o cliente "${c.nome}"?`))) return;
          await acao(() => api.excluir('clients', c.id), 'cliente excluído');
          if (editandoCliente?.id === c.id) limparCliente();
          await recarregar();
        }))));
  });
}

function mostrarFoto(url) {
  const rotulo = $('[data-foto-rotulo]');
  const caixa = $('[data-solta-foto]');
  $('img', caixa)?.remove();
  if (url) {
    caixa.insertBefore(el('img', { src: url, alt: '' }), rotulo);
    rotulo.textContent = 'trocar foto';
  } else {
    rotulo.textContent = 'enviar foto';
  }
}

function editarCliente(c) {
  editandoCliente = c;
  fotoArquivo = null;
  const form = $('[data-form="cliente"]');
  form.nome.value = c.nome;
  form.canal_url.value = c.canal_url ?? '';
  form.foto_url.value = c.foto_url?.startsWith('data:') ? '' : c.foto_url ?? '';
  mostrarFoto(c.foto_url);
  $('[data-cliente-titulo]').textContent = 'EDITAR CLIENTE';
  $('[data-cliente-botao]').textContent = 'SALVAR CLIENTE';
  $('[data-cliente-cancelar]').hidden = false;
  form.scrollIntoView({ behavior: 'smooth', block: 'center' });
  form.nome.focus({ preventScroll: true });
}

function limparCliente() {
  editandoCliente = null;
  fotoArquivo = null;
  $('[data-form="cliente"]').reset();
  mostrarFoto('');
  $('[data-cliente-titulo]').textContent = 'NOVO CLIENTE';
  $('[data-cliente-botao]').textContent = 'ADICIONAR CLIENTE';
  $('[data-cliente-cancelar]').hidden = true;
  $('[data-cliente-erro]').textContent = '';
}

function escolherFoto(arquivo) {
  if (!arquivo) return;
  if (!arquivo.type.startsWith('image/')) return toast('isso não é uma imagem', 'erro');
  if (arquivo.size > 3 * 1024 * 1024) return toast('foto grande demais (máx. 3 MB)', 'erro');
  fotoArquivo = arquivo;
  $('[data-form="cliente"]').foto_url.value = '';
  mostrarFoto(URL.createObjectURL(arquivo));
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
  const ok = await acao(async () => {
    let foto = urlCompleta(form.foto_url.value);
    if (fotoArquivo) foto = await api.enviarFoto(fotoArquivo);
    else if (!foto && editandoCliente) foto = editandoCliente.foto_url?.startsWith('data:') ? editandoCliente.foto_url : '';
    const dados = { nome, canal_url: urlCompleta(form.canal_url.value), foto_url: foto };
    if (editandoCliente) await api.atualizar('clients', editandoCliente.id, dados);
    else await api.inserir('clients', { ...dados, ordem: db.clients.length });
    return true;
  }, editandoCliente ? 'cliente salvo ✓' : 'cliente adicionado ✓');
  if (!ok) return;
  limparCliente();
  await recarregar();
}

function iniciarMenuAtivo() {
  const links = $$('.admin-menu a');
  const alvos = links.map((a) => document.getElementById(a.getAttribute('href').slice(1))).filter(Boolean);
  if (!('IntersectionObserver' in window)) return;
  const observador = new IntersectionObserver((entradas) => {
    entradas.forEach((entrada) => {
      if (!entrada.isIntersecting) return;
      links.forEach((a) => {
        const ativo = a.getAttribute('href') === `#${entrada.target.id}`;
        a.classList.toggle('ativo', ativo);
        a.classList.toggle('rough', ativo);
        if (ativo) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
    });
  }, { rootMargin: '-30% 0px -60% 0px' });
  alvos.forEach((alvo) => observador.observe(alvo));
}

function ligarEventos() {
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

  $('[data-sair]').addEventListener('click', async () => {
    await api.sair().catch(() => {});
    mostrarLogin();
  });

  $('[data-comissoes]').addEventListener('click', async () => {
    const aberto = !db.settings.comissoes_abertas;
    const ok = await acao(() => api.salvarSettings({ comissoes_abertas: aberto }), aberto ? 'comissões abertas ✓' : 'comissões fechadas');
    if (ok !== undefined) {
      db.settings.comissoes_abertas = aberto;
      renderComissoes();
    }
  });

  $('[data-form="textos"]').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const nome = form.nome.value.trim();
    if (!nome) return form.nome.focus();
    const patch = {
      nome,
      email: form.email.value.trim(),
      sobre_pt: form.sobre_pt.value.trim(),
      sobre_en: form.sobre_en.value.trim(),
      discord_nick: form.discord_nick.value.trim(),
      redes: {
        instagram: urlCompleta(form.instagram.value),
        x: urlCompleta(form.x.value),
        youtube: urlCompleta(form.youtube.value),
      },
    };
    const ok = await acao(() => api.salvarSettings(patch), 'textos salvos na nuvem ✓');
    if (ok === undefined) return;
    Object.assign(db.settings, patch);
    preencherTextos();
    renderTudo();
    const salvo = $('[data-salvo]');
    salvo.textContent = 'salvo ✓';
    setTimeout(() => { salvo.textContent = ''; }, 2000);
  });

  $('[data-form="categoria"]').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const nome = form.nome.value.trim();
    if (!nome) return form.nome.focus();
    let base = slug(nome);
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

  const formVideo = $('[data-form="video"]');
  formVideo.addEventListener('input', atualizarPrevia);
  formVideo.addEventListener('reset', () => setTimeout(atualizarPrevia));
  formVideo.addEventListener('submit', adicionarVideo);

  $('[data-busca]').addEventListener('input', renderTrabalhos);

  const formCliente = $('[data-form="cliente"]');
  formCliente.addEventListener('submit', salvarCliente);
  formCliente.arquivo.addEventListener('change', (e) => escolherFoto(e.target.files?.[0]));
  formCliente.foto_url.addEventListener('input', (e) => {
    fotoArquivo = null;
    mostrarFoto(urlCompleta(e.target.value));
  });
  $('[data-cliente-cancelar]').addEventListener('click', limparCliente);
  const solta = $('[data-solta-foto]');
  ['dragenter', 'dragover'].forEach((tipo) => solta.addEventListener(tipo, (e) => {
    e.preventDefault();
    solta.classList.add('solta');
  }));
  ['dragleave', 'drop'].forEach((tipo) => solta.addEventListener(tipo, () => solta.classList.remove('solta')));
  solta.addEventListener('drop', (e) => {
    e.preventDefault();
    escolherFoto(e.dataTransfer?.files?.[0]);
  });
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
