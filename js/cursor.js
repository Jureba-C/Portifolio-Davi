import { reduzMovimento, temMouse } from './animations.js';

const ALVOS = 'a[href], button, [role="tab"], .card, input, select, textarea, label';
const TAM = 18;
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
  let raf = 0;

  const naPonta = () => ({ x: ponteiro.x - TAM / 2, y: ponteiro.y - TAM / 2, w: TAM, h: TAM });

  const destino = () => {
    if (travado && travado.isConnected) {
      const r = travado.getBoundingClientRect();
      return { x: r.left - FOLGA, y: r.top - FOLGA, w: r.width + FOLGA * 2, h: r.height + FOLGA * 2 };
    }
    return naPonta();
  };

  const passo = () => {
    const d = destino();
    let parado = true;
    ['x', 'y', 'w', 'h'].forEach((eixo) => {
      const delta = d[eixo] - atual[eixo];
      atual[eixo] += delta * 0.26;
      if (Math.abs(delta) > 0.2) parado = false;
    });
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

  const mirar = (alvo) => {
    if (alvo === travado) return;
    if (alvo && !visivel) Object.assign(atual, naPonta());
    travado = alvo;
    mira.classList.toggle('travada', Boolean(alvo));
    mostrar(Boolean(alvo));
    animar();
  };

  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    if (reduzMovimento()) {
      mirar(null);
      return;
    }
    ponteiro.x = e.clientX;
    ponteiro.y = e.clientY;
    mirar(e.target?.closest?.(ALVOS) ?? null);
    animar();
  }, { passive: true });
  window.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || !visivel) return;
    mira.classList.remove('clique');
    void mira.offsetWidth;
    mira.classList.add('clique');
  });
  window.addEventListener('scroll', () => {
    if (ponteiro.x < 0) return;
    mirar(document.elementFromPoint(ponteiro.x, ponteiro.y)?.closest?.(ALVOS) ?? null);
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => mirar(null));
}
