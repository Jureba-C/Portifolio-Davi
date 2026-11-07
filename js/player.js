import { t } from './i18n.js';
import { linkYoutube, capaYoutube } from './data.js';
import { reduzMovimento } from './animations.js';
import { alturaReal, aquecerQualidade, comandoYoutube, encaixarGrande, ouvirYoutube, qualidadeAlvo } from './youtube.js';

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
  const fio = raiz.querySelector('[data-player-fio]');
  const zona = raiz.querySelector('[data-player-zona]');
  const controles = raiz.querySelector('[data-player-controles]');
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
  let aquecimento = null;
  let pararDeOuvir = () => {};
  let soltarEncaixe = () => {};
  let esconder = 0;
  let ocioso = 0;
  let sobControles = false;
  let focoNosControles = false;

  const enviar = (func, args = []) => comandoYoutube(iframe, func, args);
  const aquecendo = () => Boolean(aquecimento && !aquecimento.pronto);

  const atualizarControles = (atraso = 1000) => {
    const deveOcultar = tocando && Boolean(iframe) && !aquecendo() && !sobControles && !focoNosControles && !raiz.hidden;
    if (!deveOcultar) {
      clearTimeout(esconder);
      esconder = 0;
      raiz.classList.remove('controles-ocultos');
      return;
    }
    if (esconder || raiz.classList.contains('controles-ocultos')) return;
    esconder = setTimeout(() => {
      esconder = 0;
      raiz.classList.add('controles-ocultos');
    }, atraso);
  };

  const revelarControles = (atraso) => {
    clearTimeout(esconder);
    esconder = 0;
    raiz.classList.remove('controles-ocultos');
    atualizarControles(atraso);
  };

  const armarOcioso = () => {
    clearTimeout(ocioso);
    ocioso = setTimeout(() => {
      ocioso = 0;
      sobControles = false;
      atualizarControles(0);
    }, 2500);
  };

  const zerarControles = () => {
    clearTimeout(esconder);
    clearTimeout(ocioso);
    esconder = 0;
    ocioso = 0;
    sobControles = false;
    focoNosControles = false;
    raiz.classList.remove('controles-ocultos');
  };

  const desenhar = () => {
    const fracao = duracao ? Math.min(1, atual / duracao) : 0;
    progresso.style.width = `${(fracao * 100).toFixed(2)}%`;
    fio.style.width = `${(fracao * 100).toFixed(2)}%`;
    tempo.textContent = `${formatar(atual)} / ${formatar(duracao)}`;
    raiz.classList.toggle('tocando', tocando);
    play.setAttribute('aria-label', t(tocando ? 'player.pausar' : 'player.reproduzir'));
    som.setAttribute('aria-pressed', String(mudo));
    som.setAttribute('aria-label', t(mudo ? 'player.comSom' : 'player.mudo'));
    atualizarControles();
  };

  const aoInfo = (info) => {
    aquecimento?.info(info);
    if (typeof info.duration === 'number' && info.duration > 0) duracao = info.duration;
    if (aquecendo()) return;
    if (typeof info.currentTime === 'number') atual = info.currentTime;
    if (typeof info.playerState === 'number') tocando = info.playerState === 1 || info.playerState === 3;
    if (typeof info.muted === 'boolean') mudo = info.muted;
    desenhar();
  };

  const mostrarVideo = (capa) => {
    if (!iframe) return;
    enviar('seekTo', [0, true]);
    enviar('unMute');
    enviar('playVideo');
    atual = 0;
    tocando = true;
    mudo = false;
    desenhar();
    if (reduzMovimento()) capa.remove();
    else {
      capa.classList.add('saindo');
      setTimeout(() => capa.remove(), 450);
    }
    raiz.classList.remove('aquecendo');
  };

  const encerrarAquecimento = () => {
    aquecimento?.cancelar();
    aquecimento = null;
    pararDeOuvir();
    pararDeOuvir = () => {};
    soltarEncaixe();
    soltarEncaixe = () => {};
    raiz.classList.remove('aquecendo');
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
    zerarControles();
    raiz.classList.toggle('vertical', Boolean(item.vertical));
    tag.textContent = item.tag || '';
    tag.hidden = !item.tag;
    titulo.textContent = item.titulo || '';
    desc.textContent = item.descricao || '';
    encerrarAquecimento();
    video.textContent = '';
    if (item.youtubeId) {
      const params = new URLSearchParams({
        enablejsapi: '1',
        autoplay: '1',
        mute: '1',
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
      const capa = document.createElement('div');
      capa.className = 'player-capa';
      capa.setAttribute('aria-hidden', 'true');
      const img = capaYoutube(Object.assign(document.createElement('img'), { alt: '', decoding: 'async' }), item.youtubeId);
      const aviso = document.createElement('span');
      aviso.className = 'player-aquece';
      const ponto = document.createElement('span');
      ponto.className = 'rec';
      aviso.append(ponto, t('player.carregandoHd'));
      capa.append(img, aviso);
      const quadroAtual = iframe;
      const telaGrande = (window.screen?.width || 0) * (window.devicePixelRatio || 1) >= 2560;
      aquecimento = aquecerQualidade({
        alvo: (disponiveis) => qualidadeAlvo(alturaReal(quadroAtual), disponiveis),
        aoPronto: () => { if (iframe === quadroAtual) mostrarVideo(capa); },
      });
      pararDeOuvir = ouvirYoutube(iframe, aoInfo);
      raiz.classList.add('aquecendo');
      mudo = true;
      video.append(iframe, capa);
      soltarEncaixe = encaixarGrande(video, iframe, { alturaMinima: telaGrande ? 2160 : 1080 });
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
    raiz.querySelector('.player-fechar').focus();
  }

  function fechar() {
    if (raiz.hidden) return;
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    raiz.hidden = true;
    zerarControles();
    encerrarAquecimento();
    video.textContent = '';
    iframe = null;
    vizinhos = null;
    document.documentElement.style.overflow = '';
    document.removeEventListener('keydown', prenderFoco);
    if (origemFoco?.focus) origemFoco.focus();
    aoFechar();
  }

  const atrasoDe = (e) => (e.pointerType === 'mouse' || e.pointerType === 'pen' ? 1000 : 3500);
  zona.addEventListener('pointerenter', (e) => revelarControles(atrasoDe(e)));
  zona.addEventListener('pointerdown', (e) => revelarControles(atrasoDe(e)));
  controles.addEventListener('pointerenter', () => {
    sobControles = true;
    armarOcioso();
    atualizarControles();
  });
  controles.addEventListener('pointermove', () => {
    if (sobControles) armarOcioso();
  });
  controles.addEventListener('pointerleave', (e) => {
    clearTimeout(ocioso);
    ocioso = 0;
    sobControles = false;
    revelarControles(atrasoDe(e));
  });
  controles.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse') revelarControles(3500);
    else if (sobControles) armarOcioso();
  });
  controles.addEventListener('focusin', (e) => {
    if (!e.target.matches?.(':focus-visible')) return;
    focoNosControles = true;
    atualizarControles();
  });
  controles.addEventListener('focusout', () => {
    focoNosControles = false;
    atualizarControles();
  });
  raiz.querySelectorAll('[data-fechar]').forEach((el) => el.addEventListener('click', fechar));
  anterior.addEventListener('click', () => vizinhos?.ir(-1));
  proximo.addEventListener('click', () => vizinhos?.ir(1));
  play.addEventListener('click', () => {
    if (!iframe) return;
    if (aquecendo()) return aquecimento.encerrar();
    tocando = !tocando;
    enviar(tocando ? 'playVideo' : 'pauseVideo');
    desenhar();
  });
  som.addEventListener('click', () => {
    if (!iframe) return;
    if (aquecendo()) return aquecimento.encerrar();
    mudo = !mudo;
    enviar(mudo ? 'mute' : 'unMute');
    desenhar();
  });
  cheia.addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else tela.requestFullscreen?.().catch(() => {});
  });
  barra.addEventListener('click', (e) => {
    if (!iframe || !duracao || aquecendo()) return;
    const r = barra.getBoundingClientRect();
    const fracao = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    atual = fracao * duracao;
    enviar('seekTo', [atual, true]);
    desenhar();
  });

  return { abrir, fechar };
}
