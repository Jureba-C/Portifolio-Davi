(function () {
  var raiz = document.documentElement;
  raiz.classList.add('js');
  try {
    if (localStorage.getItem('idioma') === 'en') raiz.lang = 'en';
  } catch (e) {}
  try {
    if (localStorage.getItem('movimento') === 'parado') raiz.classList.add('parado');
  } catch (e) {}
  var reduz = raiz.classList.contains('parado') || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
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
  setTimeout(fim, 3300);
})();
