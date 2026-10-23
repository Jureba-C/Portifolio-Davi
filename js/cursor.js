import { reduzMovimento, temMouse } from './animations.js';

const ALVOS = 'a[href], button, [role="tab"], .card, input, select, textarea, label';
const TAM = 34;
const FOLGA = 7;

export function iniciarCursor() {
  if (!temMouse() || reduzMovimento()) return;
  const mira = document.createElement('div');
  mira.className = 'mira';
  mira.setAttribute('aria-hidden', 'true');
  ['ne', 'nd', 'se', 'sd'].forEach((canto) => {
    const span = document.createElement('span');
    span.className = `mira-canto mira-${canto}`;
    mira.append(span);
  });
  document.body.append(mira);

  const ponteiro = { x: -200, y: -200 };
  const atual = { x: -200, y: -200, w: TAM, h: TAM };
  let travado = null;
  let visivel = false;
  let batida = 0;
  let raf = 0;

  const destino = () => {
    if (travado && travado.isConnected) {
      const r = travado.getBoundingClientRect();
      return { x: r.left - FOLGA, y: r.top - FOLGA, w: r.width + FOLGA * 2, h: r.height + FOLGA * 2 };
    }
    const lado = TAM * (1 - batida * 0.35);
    return { x: ponteiro.x - lado / 2, y: ponteiro.y - lado / 2, w: lado, h: lado };
  };

  const passo = () => {
    const d = destino();
    const k = travado ? 0.28 : 0.34;
    let parado = true;
    ['x', 'y', 'w', 'h'].forEach((eixo) => {
      const delta = d[eixo] - atual[eixo];
      atual[eixo] += delta * k;
      if (Math.abs(delta) > 0.2) parado = false;
    });
    batida *= 0.82;
    if (batida > 0.01) parado = false;
    mira.style.transform = `translate(${atual.x.toFixed(1)}px, ${atual.y.toFixed(1)}px)`;
    mira.style.width = `${atual.w.toFixed(1)}px`;
    mira.style.height = `${atual.h.toFixed(1)}px`;
    raf = parado && !travado ? 0 : requestAnimationFrame(passo);
  };
  const animar = () => { if (!raf) raf = requestAnimationFrame(passo); };

  const mostrar = (sim) => {
    if (visivel === sim) return;
    visivel = sim;
    mira.classList.toggle('visivel', sim);
  };

  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    if (reduzMovimento()) {
      mostrar(false);
      return;
    }
    ponteiro.x = e.clientX;
    ponteiro.y = e.clientY;
    const alvo = e.target?.closest?.(ALVOS) ?? null;
    if (alvo !== travado) {
      travado = alvo;
      mira.classList.toggle('travada', Boolean(alvo));
    }
    if (!visivel) {
      Object.assign(atual, destino());
      mostrar(true);
    }
    animar();
  }, { passive: true });
  window.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || !visivel) return;
    batida = 1;
    mira.classList.remove('clique');
    void mira.offsetWidth;
    mira.classList.add('clique');
    animar();
  });
  window.addEventListener('scroll', () => {
    if (!visivel) return;
    const alvo = document.elementFromPoint(ponteiro.x, ponteiro.y)?.closest?.(ALVOS) ?? null;
    if (alvo !== travado) {
      travado = alvo;
      mira.classList.toggle('travada', Boolean(alvo));
    }
    animar();
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => mostrar(false));
}
