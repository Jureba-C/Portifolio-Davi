const mq = (q) => window.matchMedia?.(q).matches ?? false;

export const reduzMovimento = () => document.documentElement.classList.contains('parado') || mq('(prefers-reduced-motion: reduce)');
export const temMouse = () => mq('(hover: hover) and (pointer: fine)');

export function iniciarRevelacao() {
  if (window.CSS?.supports?.('animation-timeline: view()')) return undefined;
  if (reduzMovimento() || !('IntersectionObserver' in window)) return undefined;
  document.documentElement.classList.add('io');
  const observador = new IntersectionObserver(
    (entradas) => {
      entradas.forEach((entrada) => {
        if (!entrada.isIntersecting) return;
        entrada.target.classList.add('visto');
        observador.unobserve(entrada.target);
      });
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0.05 },
  );
  const observar = () => {
    document
      .querySelectorAll('.reveal:not(.visto), .reveal-l:not(.visto), .reveal-r:not(.visto), .stamp-in:not(.visto)')
      .forEach((el) => observador.observe(el));
  };
  observar();
  return observar;
}

export function iniciarAranhaHero() {
  const botao = document.querySelector('.aranha-hero');
  const fuga = document.querySelector('.fuga');
  const ei = document.querySelector('.ei');
  if (!botao || !fuga) return;
  let timer;
  botao.addEventListener('click', () => {
    if (fuga.classList.contains('flee-up')) return;
    fuga.classList.replace('flee-down', 'flee-up');
    if (ei) ei.hidden = false;
    clearTimeout(timer);
    timer = setTimeout(() => {
      fuga.classList.replace('flee-up', 'flee-down');
      if (ei) ei.hidden = true;
    }, 2600);
  });
}

export function iniciarRodape() {
  const rodape = document.querySelector('.rodape');
  if (!rodape) return;
  rodape.addEventListener('click', () => {
    if (temMouse()) return;
    rodape.classList.toggle('tocado');
  });
}

export function letrasSoltas(el, texto, { atraso = 0, passo = 0 } = {}) {
  el.textContent = '';
  let n = 0;
  [...texto].forEach((ch) => {
    const span = document.createElement('span');
    span.setAttribute('aria-hidden', 'true');
    if (ch === ' ') {
      span.className = 'espaco';
      span.textContent = ' ';
    } else {
      span.className = 'l';
      span.textContent = ch;
      if (passo) span.style.animationDelay = `${(atraso + n * passo).toFixed(2)}s`;
      n += 1;
    }
    el.append(span);
  });
}

const ESTILOS_RECORTE = ['r1', 'r2', 'r5'];
const GIROS = [-3, 2.5, -1.5, 3];

export function recorte(el, texto) {
  el.textContent = '';
  texto.trim().split(/\s+/).forEach((palavra, n) => {
    const span = document.createElement('span');
    span.className = `r ${ESTILOS_RECORTE[n % ESTILOS_RECORTE.length]}`;
    span.setAttribute('aria-hidden', 'true');
    span.textContent = palavra.toUpperCase();
    span.style.setProperty('--g', `${GIROS[n % GIROS.length]}deg`);
    el.append(span);
  });
}
