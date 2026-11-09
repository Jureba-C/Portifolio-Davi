export const QUALIDADES = ['tiny', 'small', 'medium', 'large', 'hd720', 'hd1080', 'hd1440', 'hd2160', 'highres'];
export const ALTURAS = { tiny: 144, small: 240, medium: 360, large: 480, hd720: 720, hd1080: 1080, hd1440: 1440, hd2160: 2160, highres: 4320 };

export const nivel = (qualidade) => QUALIDADES.indexOf(qualidade);

export function alturaReal(el) {
  return Math.min(el.offsetWidth, el.offsetHeight) * (window.devicePixelRatio || 1);
}

export function qualidadeAlvo(altura, disponiveis = []) {
  const lista = (Array.isArray(disponiveis) ? disponiveis : []).filter((q) => q in ALTURAS);
  if (lista.length) {
    const cabem = lista.filter((q) => ALTURAS[q] <= altura * 1.05);
    const pool = cabem.length ? cabem : lista;
    const escolher = cabem.length ? (a, b) => (nivel(b) > nivel(a) ? b : a) : (a, b) => (nivel(b) < nivel(a) ? b : a);
    return pool.reduce(escolher);
  }
  return altura >= 1000 ? 'hd1080' : 'hd720';
}

export function encaixarGrande(caixa, iframe, { recorte = 1, alturaMinima = 1080, exata = false } = {}) {
  const ajustar = () => {
    const largura = caixa.clientWidth;
    const altura = caixa.clientHeight;
    if (!largura || !altura) return;
    const minimo = alturaMinima / (window.devicePixelRatio || 1);
    const fator = exata ? minimo / Math.min(largura, altura) : Math.max(1, minimo / Math.min(largura, altura));
    iframe.style.width = `${Math.ceil(largura * fator)}px`;
    iframe.style.height = `${Math.ceil(altura * fator)}px`;
    iframe.style.setProperty('--escala', String(recorte / fator));
  };
  ajustar();
  if (!('ResizeObserver' in window)) return () => {};
  const observador = new ResizeObserver(ajustar);
  observador.observe(caixa);
  return () => observador.disconnect();
}

const ouvintes = new Map();
let escutando = false;

function aoMensagem(e) {
  const aoInfo = ouvintes.get(e.source);
  if (!aoInfo) return;
  let dados;
  try { dados = typeof e.data === 'string' ? JSON.parse(e.data) : e.data; } catch { return; }
  const info = dados?.info;
  if (info && typeof info === 'object') aoInfo(info);
}

export function ouvirYoutube(iframe, aoInfo) {
  if (!escutando) {
    window.addEventListener('message', aoMensagem);
    escutando = true;
  }
  let janela = null;
  const registrar = () => {
    if (janela) ouvintes.delete(janela);
    janela = iframe.contentWindow;
    if (!janela) return;
    ouvintes.set(janela, aoInfo);
    janela.postMessage(JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }), '*');
  };
  iframe.addEventListener('load', registrar);
  return () => {
    iframe.removeEventListener('load', registrar);
    if (janela) ouvintes.delete(janela);
  };
}

export function comandoYoutube(iframe, func, args = []) {
  iframe?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args }), '*');
}

export function aquecerQualidade({ alvo, aoPronto, maximo = 6000, semResposta = 2500, minimo = 3000, estavel = 1500 }) {
  const inicio = performance.now();
  let ouviu = false;
  let tocando = false;
  let atual = '';
  let mudouEm = inicio;
  let disponiveis = [];
  let feito = false;
  const terminar = (motivo) => {
    if (feito) return;
    feito = true;
    clearInterval(relogio);
    aoPronto(motivo);
  };
  const relogio = setInterval(() => {
    const agora = performance.now();
    if (!ouviu && agora - inicio >= semResposta) terminar('sem-resposta');
    else if (agora - inicio >= maximo) terminar('tempo');
    else if (tocando && atual && agora - inicio >= minimo && agora - mudouEm >= estavel) terminar('estavel');
  }, 200);
  return {
    info(info) {
      if (feito) return;
      ouviu = true;
      if (typeof info.playerState === 'number') tocando = info.playerState === 1;
      if (Array.isArray(info.availableQualityLevels) && info.availableQualityLevels.length) disponiveis = info.availableQualityLevels;
      if (typeof info.playbackQuality === 'string' && info.playbackQuality !== atual) {
        atual = info.playbackQuality;
        mudouEm = performance.now();
      }
      if (atual && nivel(atual) >= nivel(alvo(disponiveis))) terminar('alvo');
    },
    encerrar() { terminar('pessoa'); },
    cancelar() {
      feito = true;
      clearInterval(relogio);
    },
    get pronto() { return feito; },
  };
}
