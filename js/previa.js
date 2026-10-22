import { thumbYoutube } from './data.js';
import { reduzMovimento } from './animations.js';

const controles = new Map();
let observador = null;
const motivos = new Set();
const suspenso = () => motivos.size > 0;

const economia = () => Boolean(navigator.connection?.saveData);
export const autoplayPermitido = () => !reduzMovimento() && !economia();

function obterObservador() {
  if (observador || !('IntersectionObserver' in window)) return observador;
  observador = new IntersectionObserver((entradas) => {
    entradas.forEach((entrada) => {
      const controle = controles.get(entrada.target);
      if (!controle) return;
      if (entrada.isIntersecting) controle.carregar();
      controle.visivel = entrada.isIntersecting && entrada.intersectionRatio >= 0.3;
      if (controle.visivel && !suspenso()) controle.tocar();
      else controle.pausar();
    });
  }, { threshold: [0, 0.3, 0.6] });
  return observador;
}

function semPrevia(tela, texto) {
  const caixa = document.createElement('span');
  caixa.className = 'previa-sem';
  caixa.setAttribute('aria-hidden', 'true');
  caixa.textContent = texto;
  tela.append(caixa);
}

function imagem(tela, src, texto) {
  if (!src) return semPrevia(tela, texto);
  const img = document.createElement('img');
  img.className = 'previa-midia';
  img.alt = '';
  img.loading = 'lazy';
  img.decoding = 'async';
  img.src = src;
  img.addEventListener('error', () => {
    img.remove();
    semPrevia(tela, texto);
  });
  tela.append(img);
  return img;
}

function controleDeVideo(tela, video, poster) {
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
  if (poster) v.poster = poster;
  tela.append(v);
  return {
    visivel: false,
    carregar() {
      if (!autoplayPermitido() || v.getAttribute('src')) return;
      v.src = video.preview_url;
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
  imagem(tela, poster, texto);
  let iframe = null;
  const enviar = (func) => iframe?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args: [] }), '*');
  return {
    visivel: false,
    carregar() {},
    tocar() {
      if (!autoplayPermitido()) return;
      if (iframe) return enviar('playVideo');
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
      iframe.loading = 'lazy';
      iframe.tabIndex = -1;
      iframe.setAttribute('aria-hidden', 'true');
      iframe.dataset.previa = 'youtube';
      tela.append(iframe);
    },
    pausar() {
      enviar('pauseVideo');
    },
  };
}

export function montarPrevia(tela, video, { modo = 'card', textoSem = '' } = {}) {
  const poster = video.poster_url || thumbYoutube(video.youtube_id);
  let controle = null;
  if (video.preview_url) controle = controleDeVideo(tela, video, poster);
  else if (modo === 'destaque' && video.youtube_id && autoplayPermitido()) controle = controleDeYoutube(tela, video, poster, textoSem);
  else imagem(tela, poster, textoSem);
  if (!controle) return;
  controles.set(tela, controle);
  const obs = obterObservador();
  if (obs) obs.observe(tela);
  else controle.tocar();
}

export function soltarPrevias(raiz) {
  [...controles.keys()].forEach((tela) => {
    if (!raiz.contains(tela)) return;
    controles.get(tela).pausar();
    observador?.unobserve(tela);
    controles.delete(tela);
  });
}

export function suspenderPrevias(motivo, sim) {
  if (sim) motivos.add(motivo);
  else motivos.delete(motivo);
  controles.forEach((controle) => {
    if (suspenso() || !controle.visivel) controle.pausar();
    else controle.tocar();
  });
}

document.addEventListener('visibilitychange', () => suspenderPrevias('aba', document.hidden));
