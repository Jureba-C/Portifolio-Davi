import { t } from './i18n.js';
import { linkYoutube } from './data.js';

const FOCAVEIS = 'a[href], button:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])';

function formatar(segundos) {
  const s = Math.max(0, Math.floor(segundos || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function criarPlayer({ aoAbrir = () => {}, aoFechar = () => {} } = {}) {
  const raiz = document.querySelector('[data-player]');
  if (!raiz) return { abrir() {} };
  const caixa = raiz.querySelector('[role="dialog"]');
  const video = raiz.querySelector('[data-player-video]');
  const tela = raiz.querySelector('[data-player-tela]');
  const tag = raiz.querySelector('[data-player-tag]');
  const titulo = raiz.querySelector('[data-player-titulo]');
  const desc = raiz.querySelector('[data-player-desc]');
  const link = raiz.querySelector('[data-player-link]');
  const play = raiz.querySelector('[data-player-play]');
  const som = raiz.querySelector('[data-player-som]');
  const cheia = raiz.querySelector('[data-player-cheia]');
  const barra = raiz.querySelector('[data-player-barra]');
  const progresso = raiz.querySelector('[data-player-progresso]');
  const tempo = raiz.querySelector('[data-player-tempo]');
  const nav = raiz.querySelector('[data-player-nav]');
  const anterior = raiz.querySelector('[data-player-anterior]');
  const proximo = raiz.querySelector('[data-player-proximo]');
  const posicao = raiz.querySelector('[data-player-posicao]');

  let iframe = null;
  let origemFoco = null;
  let duracao = 0;
  let atual = 0;
  let tocando = false;
  let mudo = false;
  let vizinhos = null;

  const enviar = (func, args = []) => {
    iframe?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args }), '*');
  };

  const desenhar = () => {
    const fracao = duracao ? Math.min(1, atual / duracao) : 0;
    progresso.style.width = `${(fracao * 100).toFixed(2)}%`;
    tempo.textContent = `${formatar(atual)} / ${formatar(duracao)}`;
    raiz.classList.toggle('tocando', tocando);
    play.setAttribute('aria-label', t(tocando ? 'player.pausar' : 'player.reproduzir'));
    som.setAttribute('aria-pressed', String(mudo));
    som.setAttribute('aria-label', t(mudo ? 'player.comSom' : 'player.mudo'));
  };

  const aoMensagem = (e) => {
    if (!iframe || e.source !== iframe.contentWindow) return;
    let dados;
    try { dados = typeof e.data === 'string' ? JSON.parse(e.data) : e.data; } catch { return; }
    const info = dados?.info;
    if (!info || typeof info !== 'object') return;
    if (typeof info.duration === 'number' && info.duration > 0) duracao = info.duration;
    if (typeof info.currentTime === 'number') atual = info.currentTime;
    if (typeof info.playerState === 'number') tocando = info.playerState === 1 || info.playerState === 3;
    if (typeof info.muted === 'boolean') mudo = info.muted;
    desenhar();
  };

  const prenderFoco = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      fechar();
      return;
    }
    if (vizinhos && (e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !e.target.closest?.('[data-player-barra]')) {
      e.preventDefault();
      vizinhos.ir(e.key === 'ArrowLeft' ? -1 : 1);
      return;
    }
    if (e.key !== 'Tab') return;
    const itens = [...caixa.querySelectorAll(FOCAVEIS)].filter((el) => el.offsetParent !== null || el === iframe);
    if (!itens.length) return;
    const primeiro = itens[0];
    const ultimo = itens[itens.length - 1];
    if (e.shiftKey && document.activeElement === primeiro) {
      e.preventDefault();
      ultimo.focus();
    } else if (!e.shiftKey && document.activeElement === ultimo) {
      e.preventDefault();
      primeiro.focus();
    }
  };

  function abrir(item) {
    const jaAberto = !raiz.hidden;
    if (!jaAberto) origemFoco = document.activeElement;
    vizinhos = item.vizinhos || null;
    nav.hidden = !vizinhos;
    if (vizinhos) posicao.textContent = vizinhos.posicao;
    duracao = 0;
    atual = 0;
    tocando = false;
    mudo = false;
    raiz.classList.toggle('vertical', Boolean(item.vertical));
    tag.textContent = item.tag || '';
    tag.hidden = !item.tag;
    titulo.textContent = item.titulo || '';
    desc.textContent = item.descricao || '';
    video.textContent = '';
    if (item.youtubeId) {
      const params = new URLSearchParams({
        enablejsapi: '1',
        autoplay: '1',
        controls: '0',
        rel: '0',
        playsinline: '1',
        modestbranding: '1',
        origin: location.origin,
      });
      iframe = document.createElement('iframe');
      iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(item.youtubeId)}?${params}`;
      iframe.title = item.titulo || 'YouTube';
      iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      iframe.allowFullscreen = true;
      iframe.referrerPolicy = 'strict-origin-when-cross-origin';
      iframe.addEventListener('load', () => {
        iframe?.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }), '*');
      });
      video.append(iframe);
      link.href = linkYoutube(item.youtubeId);
      link.hidden = false;
      tela.classList.remove('sem-video');
    } else {
      iframe = null;
      const aviso = document.createElement('p');
      aviso.className = 'player-aviso';
      aviso.textContent = t('player.semVideo');
      video.append(aviso);
      link.hidden = true;
      tela.classList.add('sem-video');
    }
    desenhar();
    if (jaAberto) {
      raiz.classList.remove('trocou');
      void raiz.offsetWidth;
      raiz.classList.add('trocou');
      return;
    }
    raiz.hidden = false;
    aoAbrir();
    document.documentElement.style.overflow = 'hidden';
    document.addEventListener('keydown', prenderFoco);
    window.addEventListener('message', aoMensagem);
    raiz.querySelector('.player-fechar').focus();
  }

  function fechar() {
    if (raiz.hidden) return;
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    raiz.hidden = true;
    video.textContent = '';
    iframe = null;
    vizinhos = null;
    document.documentElement.style.overflow = '';
    document.removeEventListener('keydown', prenderFoco);
    window.removeEventListener('message', aoMensagem);
    if (origemFoco?.focus) origemFoco.focus();
    aoFechar();
  }

  raiz.querySelectorAll('[data-fechar]').forEach((el) => el.addEventListener('click', fechar));
  anterior.addEventListener('click', () => vizinhos?.ir(-1));
  proximo.addEventListener('click', () => vizinhos?.ir(1));
  play.addEventListener('click', () => {
    if (!iframe) return;
    tocando = !tocando;
    enviar(tocando ? 'playVideo' : 'pauseVideo');
    desenhar();
  });
  som.addEventListener('click', () => {
    if (!iframe) return;
    mudo = !mudo;
    enviar(mudo ? 'mute' : 'unMute');
    desenhar();
  });
  cheia.addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else tela.requestFullscreen?.().catch(() => {});
  });
  barra.addEventListener('click', (e) => {
    if (!iframe || !duracao) return;
    const r = barra.getBoundingClientRect();
    const fracao = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    atual = fracao * duracao;
    enviar('seekTo', [atual, true]);
    desenhar();
  });

  return { abrir, fechar };
}
