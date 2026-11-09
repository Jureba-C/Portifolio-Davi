(function () {
  var raiz = document.documentElement;
  raiz.classList.add('js');
  try {
    if (localStorage.getItem('idioma') === 'en') raiz.lang = 'en';
  } catch (e) {}
  try {
    if (sessionStorage.getItem('movimento') === 'parado') raiz.classList.add('parado');
  } catch (e) {}
  var reduz = raiz.classList.contains('parado');
  var temTimeline = window.CSS && CSS.supports && CSS.supports('animation-timeline: view()');
  if (!reduz && !temTimeline && 'IntersectionObserver' in window) {
    raiz.classList.add('io');
    setTimeout(function () {
      if (!raiz.classList.contains('io-ok')) raiz.classList.remove('io');
    }, 4000);
  }
  var vista = false;
  try { vista = sessionStorage.getItem('intro-vista') === '1'; } catch (e) {}
  if (reduz || vista || /[?&]intro=0\b/.test(location.search)) return;
  raiz.classList.add('intro-on');
  try { sessionStorage.setItem('intro-vista', '1'); } catch (e) {}
  var terminou = false;
  var fim = function () {
    if (terminou) return;
    terminou = true;
    raiz.classList.remove('intro-on', 'intro-pulando');
    window.removeEventListener('keydown', pular);
    window.removeEventListener('pointerdown', pular);
    document.dispatchEvent(new CustomEvent('intro:fim'));
  };
  var pular = function () {
    if (terminou || raiz.classList.contains('intro-pulando')) return;
    raiz.classList.add('intro-pulando');
    setTimeout(fim, 480);
  };
  window.addEventListener('keydown', pular);
  window.addEventListener('pointerdown', pular);
  var inicio = Date.now();
  var relogio = setInterval(function () {
    var tc = document.querySelector('[data-intro-tc]');
    if (terminou) clearInterval(relogio);
    if (terminou || !tc) return;
    var quadros = Math.floor((Date.now() - inicio) * 0.024);
    var seg = Math.floor(quadros / 24);
    var q = quadros % 24;
    var texto = '00:00:' + (seg < 10 ? '0' : '') + seg + ':' + (q < 10 ? '0' : '') + q;
    if (tc.textContent !== texto) tc.textContent = texto;
  }, 1000 / 24);
  setTimeout(fim, 3050);
})();
