import { reduzMovimento, temMouse } from './animations.js';

const TAMANHOS = [12, 10, 8, 6];
const CORES = ['var(--coral)', 'var(--roxo)', 'var(--roxo)', 'var(--roxo)'];
const OPACIDADES = [1, 0.75, 0.6, 0.45];

function criar(tamanho, extra = {}) {
  const el = document.createElement('span');
  el.className = 'ink-cursor';
  el.setAttribute('aria-hidden', 'true');
  Object.assign(el.style, { width: `${tamanho}px`, height: `${tamanho}px`, ...extra });
  return el;
}

export function iniciarCursor() {
  if (!temMouse() || reduzMovimento()) return;
  const pingos = TAMANHOS.map((t, i) =>
    criar(t, { borderRadius: '50%', background: CORES[i], opacity: String(OPACIDADES[i]) }),
  );
  const anel = criar(44, { mixBlendMode: 'difference', color: 'var(--creme)' });
  anel.innerHTML = '<svg viewBox="0 0 44 44" style="width:100%;height:100%;overflow:visible"><path d="M22 3 C 34 2, 42 11, 41 22 C 40 34, 31 42, 20 41 C 9 40, 2 31, 3 20 C 4 10, 12 3, 25 4" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>';
  [...pingos].reverse().forEach((p) => document.body.append(p));
  document.body.append(anel);
  [...pingos, anel].forEach((p) => { p.style.opacity = '0'; });

  const alvo = { x: -200, y: -200 };
  const centro = { x: -200, y: -200 };
  const pontos = TAMANHOS.map(() => ({ x: -200, y: -200 }));
  let escala = 1;
  let quente = false;
  let visivel = false;
  let raf = 0;

  const passo = () => {
    centro.x += (alvo.x - centro.x) * 0.35;
    centro.y += (alvo.y - centro.y) * 0.35;
    escala += ((quente ? 1.8 : 1) - escala) * 0.2;
    anel.style.transform = `translate(${centro.x - 22}px, ${centro.y - 22}px) scale(${escala.toFixed(3)})`;
    let anterior = alvo;
    pontos.forEach((pt, i) => {
      pt.x += (anterior.x - pt.x) * 0.32;
      pt.y += (anterior.y - pt.y) * 0.32;
      pingos[i].style.transform = `translate(${pt.x - TAMANHOS[i] / 2}px, ${pt.y - TAMANHOS[i] / 2}px)`;
      anterior = pt;
    });
    const parado = Math.abs(alvo.x - pontos[3].x) < 0.3 && Math.abs(alvo.y - pontos[3].y) < 0.3 && Math.abs(escala - (quente ? 1.8 : 1)) < 0.01;
    raf = parado ? 0 : requestAnimationFrame(passo);
  };

  const mostrar = (sim) => {
    if (visivel === sim) return;
    visivel = sim;
    const opacidade = sim ? '' : '0';
    anel.style.opacity = opacidade;
    pingos.forEach((p, i) => { p.style.opacity = sim ? String(OPACIDADES[i]) : '0'; });
  };

  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    alvo.x = e.clientX;
    alvo.y = e.clientY;
    quente = Boolean(e.target?.closest?.('a, button, .card, [role="tab"], input, label'));
    mostrar(true);
    if (!raf) raf = requestAnimationFrame(passo);
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => mostrar(false));
  document.documentElement.classList.add('cursor-on');
}
