import { MOCK } from './mock-data.js';
import { BUCKET_MIDIA } from './config.js';
import { nuvemConfigurada, obterCliente } from './supabase.js';

const CHAVE_CACHE = 'portfolio-cache';
const CHAVE_LOCAL = 'portfolio-local';
const TABELAS = ['categories', 'longform_filters', 'videos', 'clients'];
const LOGIN_LOCAL = { email: 'demo@local', senha: 'demo1234' };

export function extrairIdYoutube(texto) {
  if (!texto) return '';
  const valor = String(texto).trim();
  if (/^[\w-]{11}$/.test(valor)) return valor;
  let url;
  try {
    url = new URL(/^https?:\/\//i.test(valor) ? valor : `https://${valor}`);
  } catch {
    return '';
  }
  const host = url.hostname.replace(/^www\.|^m\.|^music\./, '');
  let id = '';
  if (host === 'youtu.be') id = url.pathname.split('/')[1] ?? '';
  else if (host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
    if (url.searchParams.get('v')) id = url.searchParams.get('v');
    else {
      const partes = url.pathname.split('/').filter(Boolean);
      const marca = partes.findIndex((p) => ['shorts', 'embed', 'live', 'v'].includes(p));
      if (marca >= 0) id = partes[marca + 1] ?? '';
    }
  }
  return /^[\w-]{11}$/.test(id) ? id : '';
}

export function ehLinkDeShort(texto) {
  return /youtube\.com\/shorts\//i.test(String(texto ?? ''));
}

export function thumbYoutube(id, qualidade = 'hqdefault') {
  return id ? `https://i.ytimg.com/vi/${id}/${qualidade}.jpg` : '';
}

export function urlSegura(url, { midia = false } = {}) {
  const valor = String(url || '').trim();
  if (/^https?:\/\//i.test(valor) || /^(assets\/|blob:)/.test(valor)) return valor;
  if (midia && /^data:(image|video)\//i.test(valor)) return valor;
  return '';
}

export function linkYoutube(id) {
  return id ? `https://www.youtube.com/watch?v=${id}` : '';
}

function porOrdem(a, b) {
  return (a.ordem ?? 0) - (b.ordem ?? 0);
}

function clonar(valor) {
  return JSON.parse(JSON.stringify(valor));
}

function normalizar(db) {
  const base = clonar(MOCK);
  const saida = {
    settings: { ...base.settings, ...(db?.settings ?? {}) },
    categories: [...(db?.categories ?? base.categories)].sort(porOrdem),
    longform_filters: [...(db?.longform_filters ?? base.longform_filters)].sort(porOrdem),
    videos: [...(db?.videos ?? base.videos)].map((v) => ({ preview_url: '', poster_url: '', ...v })).sort(porOrdem),
    clients: [...(db?.clients ?? base.clients)].sort(porOrdem),
  };
  saida.settings.redes = { instagram: '', x: '', youtube: '', ...(saida.settings.redes ?? {}) };
  saida.settings.foto_url = saida.settings.foto_url ?? '';
  return saida;
}

function ler(chave) {
  try {
    const bruto = localStorage.getItem(chave);
    return bruto ? JSON.parse(bruto) : null;
  } catch {
    return null;
  }
}

function gravar(chave, valor) {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
    return true;
  } catch {
    return false;
  }
}

function comTempo(promessa, ms) {
  return Promise.race([
    promessa,
    new Promise((_, rejeitar) => setTimeout(() => rejeitar(new Error('tempo-esgotado')), ms)),
  ]);
}

async function buscarNuvem() {
  const sb = await obterCliente();
  const pedidos = [
    sb.from('settings').select('*').eq('id', 1).maybeSingle(),
    ...TABELAS.map((tabela) => sb.from(tabela).select('*').order('ordem')),
  ];
  const respostas = await Promise.all(pedidos);
  const erro = respostas.find((r) => r.error);
  if (erro) throw erro.error;
  const [settings, categories, longform_filters, videos, clients] = respostas.map((r) => r.data);
  return normalizar({ settings: settings ?? {}, categories, longform_filters, videos, clients });
}

function bancoLocal() {
  return normalizar(ler(CHAVE_LOCAL) ?? MOCK);
}

export async function carregarSite() {
  if (!nuvemConfigurada()) return { ...bancoLocal(), origem: 'local' };
  try {
    const db = await comTempo(buscarNuvem(), 8000);
    gravar(CHAVE_CACHE, db);
    return { ...db, origem: 'nuvem' };
  } catch {
    const cache = ler(CHAVE_CACHE);
    return cache ? { ...normalizar(cache), origem: 'cache' } : { ...normalizar(MOCK), origem: 'mock' };
  }
}

function novoId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function loginLocalPermitido() {
  return !nuvemConfigurada();
}

function apiLocal() {
  let sessao = ler('portfolio-local-sessao');
  const db = () => bancoLocal();
  const salvar = (novo) => {
    if (!gravar(CHAVE_LOCAL, novo)) throw new Error('armazenamento-cheio');
  };
  return {
    modo: 'local',
    async sessaoAtual() {
      return sessao;
    },
    async entrar(email, senha) {
      if (!loginLocalPermitido()) throw new Error('nuvem-nao-configurada');
      if (email.trim().toLowerCase() !== LOGIN_LOCAL.email || senha !== LOGIN_LOCAL.senha) {
        throw new Error('credenciais');
      }
      sessao = { email: LOGIN_LOCAL.email };
      gravar('portfolio-local-sessao', sessao);
      return sessao;
    },
    async sair() {
      sessao = null;
      try { localStorage.removeItem('portfolio-local-sessao'); } catch {}
    },
    async carregarTudo() {
      return db();
    },
    async salvarSettings(patch) {
      const atual = db();
      atual.settings = { ...atual.settings, ...patch };
      salvar(atual);
      return atual.settings;
    },
    async inserir(tabela, registro) {
      const atual = db();
      const novo = { id: novoId(), created_at: new Date().toISOString(), ...registro };
      atual[tabela].push(novo);
      salvar(atual);
      return novo;
    },
    async atualizar(tabela, id, patch) {
      const atual = db();
      atual[tabela] = atual[tabela].map((r) => (r.id === id ? { ...r, ...patch } : r));
      salvar(atual);
    },
    async excluir(tabela, id) {
      const atual = db();
      atual[tabela] = atual[tabela].filter((r) => r.id !== id);
      if (tabela === 'categories') atual.videos = atual.videos.filter((v) => v.category_id !== id);
      if (tabela === 'longform_filters') {
        atual.videos = atual.videos.map((v) => (v.filter_id === id ? { ...v, filter_id: null } : v));
      }
      salvar(atual);
    },
    async reordenar(tabela, ids) {
      const atual = db();
      const posicao = new Map(ids.map((id, i) => [id, i]));
      atual[tabela] = atual[tabela]
        .map((r) => (posicao.has(r.id) ? { ...r, ordem: posicao.get(r.id) } : r))
        .sort(porOrdem);
      salvar(atual);
    },
    async enviarArquivo(arquivo) {
      return new Promise((resolver, rejeitar) => {
        const leitor = new FileReader();
        leitor.onload = () => resolver(String(leitor.result));
        leitor.onerror = () => rejeitar(leitor.error);
        leitor.readAsDataURL(arquivo);
      });
    },
  };
}

function apiNuvem() {
  const sb = () => obterCliente();
  const checar = ({ data, error }) => {
    if (error) throw error;
    return data;
  };
  return {
    modo: 'nuvem',
    async sessaoAtual() {
      const cliente = await sb();
      const { data } = await cliente.auth.getSession();
      const email = data.session?.user?.email;
      if (!email) return null;
      const admin = await cliente.from('admins').select('email').eq('email', email.toLowerCase()).maybeSingle();
      return admin.data ? { email } : null;
    },
    async entrar(email, senha) {
      const cliente = await sb();
      const { data, error } = await cliente.auth.signInWithPassword({ email: email.trim(), password: senha });
      if (error) throw new Error('credenciais');
      const admin = await cliente.from('admins').select('email').eq('email', data.user.email.toLowerCase()).maybeSingle();
      if (!admin.data) {
        await cliente.auth.signOut();
        throw new Error('nao-admin');
      }
      return { email: data.user.email };
    },
    async sair() {
      const cliente = await sb();
      await cliente.auth.signOut();
    },
    async carregarTudo() {
      const db = await buscarNuvem();
      gravar(CHAVE_CACHE, db);
      return db;
    },
    async salvarSettings(patch) {
      const cliente = await sb();
      return checar(await cliente.from('settings').update(patch).eq('id', 1).select().single());
    },
    async inserir(tabela, registro) {
      const cliente = await sb();
      return checar(await cliente.from(tabela).insert(registro).select().single());
    },
    async atualizar(tabela, id, patch) {
      const cliente = await sb();
      checar(await cliente.from(tabela).update(patch).eq('id', id));
    },
    async excluir(tabela, id) {
      const cliente = await sb();
      checar(await cliente.from(tabela).delete().eq('id', id));
    },
    async reordenar(tabela, ids) {
      const cliente = await sb();
      checar(await cliente.rpc('reordenar', { tabela, ids }));
    },
    async enviarArquivo(arquivo, pasta = 'geral') {
      const cliente = await sb();
      const extensao = (arquivo.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
      const caminho = `${pasta}/${novoId()}.${extensao}`;
      checar(await cliente.storage.from(BUCKET_MIDIA).upload(caminho, arquivo, { cacheControl: '31536000', upsert: false, contentType: arquivo.type || undefined }));
      return cliente.storage.from(BUCKET_MIDIA).getPublicUrl(caminho).data.publicUrl;
    },
  };
}

export function criarApi() {
  return nuvemConfigurada() ? apiNuvem() : apiLocal();
}

export function iniciais(nome) {
  const partes = String(nome ?? '').trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return '?';
  const letras = partes.length === 1 ? partes[0].slice(0, 2) : partes[0][0] + partes[partes.length - 1][0];
  return letras.toUpperCase();
}
