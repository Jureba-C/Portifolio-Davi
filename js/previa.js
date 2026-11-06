import { capaYoutube, urlSegura } from './data.js';
import { reduzMovimento } from './animations.js';

const controles = new Map();
let observador = null;
const motivos = new Set();
const suspenso = () => motivos.size > 0;
let ativo = null;

const economia = () => Boolean(navigator.connection?.saveData);
export const autoplayPermitido = () => !reduzMovimento() && !economia();
const comMouse = () => window.matchMedia?.('(hover: hover) and (pointer: fine)').matches ?? false;

const ALTURA_HD = 1080;
const RECORTE = 1.22;

function ativar(controle) {
  if (ativo && ativo !== controle) ativo.pausar();
  ativo = controle;
  if (!suspenso()) controle.tocar();
}

function desativar(controle) {
  if (ativo !== controle) return;
  controle.pausar();
  ativo = null;
}

let conferindoCentro = 0;
function escolherCentral() {
  conferindoCentro = 0;
  if (comMouse()) return;
  const meio = window.innerHeight / 2;
  let melhor = null;
  let menor = Infinity;
  controles.forEach((controle, tela) => {
    if (!controle.sobDemanda || controle.proporcao < 0.6) return;
    const r = tela.getBoundingClientRect();
    const distancia = Math.abs(r.top + r.height / 2 - meio);
    if (distancia < menor) { menor = distancia; melhor = controle; }
  });
  if (melhor) ativar(melhor);
  else if (ativo?.sobDemanda) desativar(ativo);
}
const agendarCentral = () => { if (!conferindoCentro) conferindoCentro = requestAnimationFrame(escolherCentral); };
window.addEventListener('scroll', agendarCentral, { passive: true });

function obterObservador() {
  if (observador || !('IntersectionObserver' in window)) return observador;
  observador = new IntersectionObserver((entradas) => {
    entradas.forEach((entrada) => {
      const controle = controles.get(entrada.target);
      if (!controle) return;
      controle.proporcao = entrada.isIntersecting ? entrada.intersectionRatio : 0;
      if (controle.sobDemanda) {
        controle.visivel = controle.proporcao > 0;
        if (!controle.visivel) desativar(controle);
        agendarCentral();
        return;
      }
      if (entrada.isIntersecting) controle.carregar();
      controle.visivel = entrada.isIntersecting && entrada.intersectionRatio >= 0.3;
      if (controle.visivel && !suspenso()) controle.tocar();
      else controle.pausar();
    });
  }, { threshold: [0, 0.3, 0.6, 0.9] });
  return observador;
}

function semPrevia(tela, texto) {
  const caixa = document.createElement('span');
  caixa.className = 'previa-sem';
  caixa.setAttribute('aria-hidden', 'true');
  caixa.textContent = texto;
  tela.append(caixa);
}

function imagem(tela, src, texto, youtubeId = '') {
  if (!src && !youtubeId) return semPrevia(tela, texto);
  const img = document.createElement('img');
  img.className = 'previa-midia';
  img.alt = '';
  img.loading = 'lazy';
  img.decoding = 'async';
  const falhou = () => {
    img.remove();
    semPrevia(tela, texto);
  };
  if (src) {
    img.src = src;
    img.addEventListener('error', falhou);
  } else {
    capaYoutube(img, youtubeId, falhou);
  }
  tela.append(img);
  return img;
}

function encaixar(tela, iframe) {
  const ajustar = () => {
    const largura = tela.clientWidth;
    const altura = tela.clientHeight;
    if (!largura || !altura) return;
    const minimo = ALTURA_HD / (window.devicePixelRatio || 1);
    const fator = Math.max(1, minimo / Math.min(largura, altura));
    iframe.style.width = `${Math.round(largura * fator)}px`;
    iframe.style.height = `${Math.round(altura * fator)}px`;
    iframe.style.setProperty('--escala', String(RECORTE / fator));
  };
  ajustar();
  if ('ResizeObserver' in window) new ResizeObserver(ajustar).observe(tela);
}

const iframes = new Map();
window.addEventListener('message', (e) => {
  const iframe = iframes.get(e.source);
  if (!iframe) return;
  let dados;
  try { dados = typeof e.data === 'string' ? JSON.parse(e.data) : e.data; } catch { return; }
  iframe.dataset.ouvido = '1';
  const estado = dados?.info?.playerState;
  if (typeof estado === 'number') iframe.classList.toggle('rodando', estado === 1);
});

function controleDeVideo(tela, video, poster) {
  imagem(tela, poster, '', poster ? '' : video.youtube_id);
  const v = document.createElement('video');
  v.className = 'previa-midia';
  v.muted = true;
  v.defaultMuted = true;
  v.loop = true;
  v.playsInline = true;
  v.preload = 'none';
  v.disablePictureInPicture = true;
  v.setAttribute('muted', '');
  v.setAttribute('playsinline', '');
  v.setAttribute('aria-hidden', 'true');
  v.setAttribute('tabindex', '-1');
  v.dataset.previa = 'video';
  v.addEventListener('playing', () => v.classList.add('pronto'), { once: true });
  tela.append(v);
  return {
    visivel: false,
    carregar() {
      if (!autoplayPermitido() || v.getAttribute('src')) return;
      v.src = urlSegura(video.preview_url, { midia: true });
    },
    tocar() {
      if (!autoplayPermitido()) return;
      this.carregar();
      const promessa = v.play();
      if (promessa?.catch) promessa.catch(() => {});
    },
    pausar() {
      if (!v.paused) v.pause();
    },
  };
}

function controleDeYoutube(tela, video, poster, texto) {
  imagem(tela, poster, texto, poster ? '' : video.youtube_id);
  let iframe = null;
  let querTocar = false;
  const enviar = (func) => iframe?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args: [] }), '*');
  return {
    visivel: false,
    carregar() {},
    tocar() {
      if (!autoplayPermitido()) return;
      querTocar = true;
      if (iframe) {
        enviar('playVideo');
        if (!iframe.dataset.ouvido) iframe.classList.add('rodando');
        return;
      }
      const params = new URLSearchParams({
        autoplay: '1',
        mute: '1',
        loop: '1',
        playlist: video.youtube_id,
        controls: '0',
        disablekb: '1',
        fs: '0',
        rel: '0',
        playsinline: '1',
        iv_load_policy: '3',
        enablejsapi: '1',
        origin: location.origin,
      });
      iframe = document.createElement('iframe');
      iframe.className = 'previa-midia';
      iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(video.youtube_id)}?${params}`;
      iframe.title = video.titulo;
      iframe.allow = 'autoplay; encrypted-media';
      iframe.referrerPolicy = 'strict-origin-when-cross-origin';
      iframe.loading = 'lazy';
      iframe.tabIndex = -1;
      iframe.setAttribute('aria-hidden', 'true');
      iframe.dataset.previa = 'youtube';
      iframe.addEventListener('load', () => {
        iframes.set(iframe.contentWindow, iframe);
        iframe.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }), '*');
      });
      tela.append(iframe);
      encaixar(tela, iframe);
      setTimeout(() => { if (iframe && !iframe.dataset.ouvido && querTocar) iframe.classList.add('rodando'); }, 3500);
    },
    pausar() {
      querTocar = false;
      enviar('pauseVideo');
      iframe?.classList.remove('rodando');
    },
  };
}

function ligarSobDemanda(tela, controle) {
  controle.sobDemanda = true;
  controle.proporcao = 0;
  const alvo = tela.closest('.quadro') || tela;
  let espera = 0;
  alvo.addEventListener('pointerenter', (e) => {
    if (e.pointerType !== 'mouse') return;
    clearTimeout(espera);
    espera = setTimeout(() => ativar(controle), 250);
  });
  alvo.addEventListener('pointerleave', (e) => {
    if (e.pointerType !== 'mouse') return;
    clearTimeout(espera);
    desativar(controle);
  });
  alvo.addEventListener('focusin', () => { if (comMouse()) ativar(controle); });
  alvo.addEventListener('focusout', () => { if (comMouse()) desativar(controle); });
}

export function montarPrevia(tela, video, { modo = 'card', textoSem = '' } = {}) {
  const poster = urlSegura(video.poster_url, { midia: true });
  let controle = null;
  if (urlSegura(video.preview_url, { midia: true })) controle = controleDeVideo(tela, video, poster);
  else if (video.youtube_id && autoplayPermitido()) controle = controleDeYoutube(tela, video, poster, textoSem);
  else imagem(tela, poster, textoSem, poster ? '' : video.youtube_id);
  if (!controle) return;
  controles.set(tela, controle);
  if (modo !== 'destaque' && !urlSegura(video.preview_url, { midia: true })) ligarSobDemanda(tela, controle);
  const obs = obterObservador();
  if (obs) obs.observe(tela);
  else if (!controle.sobDemanda) controle.tocar();
}

export function soltarPrevias(raiz) {
  [...controles.keys()].forEach((tela) => {
    if (!raiz.contains(tela)) return;
    const controle = controles.get(tela);
    controle.pausar();
    if (ativo === controle) ativo = null;
    observador?.unobserve(tela);
    controles.delete(tela);
  });
}

export function suspenderPrevias(motivo, sim) {
  if (sim) motivos.add(motivo);
  else motivos.delete(motivo);
  controles.forEach((controle) => {
    if (suspenso() || !controle.visivel) controle.pausar();
    else if (!controle.sobDemanda || controle === ativo) controle.tocar();
  });
}

document.addEventListener('visibilitychange', () => suspenderPrevias('aba', document.hidden));
