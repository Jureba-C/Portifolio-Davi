const mq = (q) => window.matchMedia?.(q).matches ?? false;

export const reduzMovimento = () => mq('(prefers-reduced-motion: reduce)');
export const temMouse = () => mq('(hover: hover) and (pointer: fine)');

export function iniciarRevelacao() {
  if (window.CSS?.supports?.('animation-timeline: view()')) return;
  const raiz = document.documentElement;
  if (reduzMovimento() || !('IntersectionObserver' in window)) return;
  raiz.classList.add('io');
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
      .querySelectorAll('.reveal:not(.visto), .reveal-l:not(.visto), .reveal-r:not(.visto), .stamp-in:not(.visto), .scribble-in:not(.visto)')
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

export function iniciarWalker() {
  const moldura = document.querySelector('.moldura');
  const walker = document.querySelector('.walker');
  if (!moldura || !walker) return;
  const ajustar = () => {
    const l = moldura.offsetWidth;
    const a = moldura.offsetHeight;
    if (!l || !a) return;
    walker.style.offsetPath = `path('M12,12 L${l - 12},12 L${l - 12},${a - 12} L12,${a - 12} Z')`;
  };
  ajustar();
  if ('ResizeObserver' in window) new ResizeObserver(ajustar).observe(moldura);
  else window.addEventListener('resize', ajustar);
}

export function iniciarOlho() {
  const svg = document.querySelector('.olho-svg');
  const pupila = svg?.querySelector('.pupil');
  if (!svg || !pupila || reduzMovimento()) return;
  let alvoX = 0;
  let alvoY = 0;
  let pendente = false;
  const aplicar = () => {
    pendente = false;
    pupila.style.transform = `translate(${alvoX}px, ${alvoY}px)`;
  };
  const olhar = (x, y) => {
    const r = svg.getBoundingClientRect();
    if (!r.width) return;
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const dx = Math.max(-1, Math.min(1, (x - cx) / (r.width * 0.9)));
    const dy = Math.max(-1, Math.min(1, (y - cy) / (r.height * 1.4)));
    alvoX = Math.round(dx * 80);
    alvoY = Math.round(dy * 34);
    if (!pendente) {
      pendente = true;
      requestAnimationFrame(aplicar);
    }
  };
  window.addEventListener('pointermove', (e) => olhar(e.clientX, e.clientY), { passive: true });
  document.documentElement.addEventListener('pointerleave', () => olhar(innerWidth / 2, svg.getBoundingClientRect().top + 100));
}

export function iniciarRodape() {
  const rodape = document.querySelector('.rodape');
  if (!rodape) return;
  rodape.addEventListener('click', () => {
    if (temMouse()) return;
    rodape.classList.toggle('tocado');
  });
}

export function letrasPulando(el, texto, classe = 'letter', passo = 0.12) {
  el.textContent = '';
  [...texto].forEach((ch, i) => {
    if (ch === ' ') {
      const espaco = document.createElement('span');
      espaco.className = 'espaco';
      espaco.setAttribute('aria-hidden', 'true');
      el.append(espaco);
      return;
    }
    const span = document.createElement('span');
    span.className = classe;
    span.setAttribute('aria-hidden', 'true');
    span.textContent = ch;
    if (passo) span.style.animationDelay = `${(i * passo).toFixed(2)}s`;
    el.append(span);
  });
}
