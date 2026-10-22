const mq = (q) => window.matchMedia?.(q).matches ?? false;

export const reduzMovimento = () => mq('(prefers-reduced-motion: reduce)');
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

const ESTILOS_RECORTE = ['r1', 'r2', 'r3', 'r4', 'r5'];
const TAMANHOS = [1, 1.18, 0.9, 1.08, 0.96, 1.22, 0.88];
const GIROS = [-6, 4, -2, 7, -5, 3, -8, 5];

export function recorte(el, texto) {
  el.textContent = '';
  let n = 0;
  let palavra = null;
  [...texto].forEach((ch) => {
    if (ch === ' ') {
      palavra = null;
      const espaco = document.createElement('span');
      espaco.className = 'espaco';
      espaco.setAttribute('aria-hidden', 'true');
      el.append(espaco);
      return;
    }
    if (!palavra) {
      palavra = document.createElement('span');
      palavra.className = 'palavra';
      palavra.setAttribute('aria-hidden', 'true');
      el.append(palavra);
    }
    const span = document.createElement('span');
    const semente = (n * 7 + ch.charCodeAt(0)) % 97;
    span.className = `r ${ESTILOS_RECORTE[semente % ESTILOS_RECORTE.length]}`;
    span.textContent = n % 3 === 1 || n % 5 === 3 ? ch.toLowerCase() : ch.toUpperCase();
    span.style.setProperty('--t', `${TAMANHOS[semente % TAMANHOS.length]}em`);
    span.style.setProperty('--g', `${GIROS[(semente + n) % GIROS.length]}deg`);
    span.style.setProperty('--y', `${((semente % 5) - 2) * 0.03}em`);
    palavra.append(span);
    n += 1;
  });
}
