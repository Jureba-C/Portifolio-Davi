import { readFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { MOCK } from '../js/mock-data.js';

const raiz = new URL('..', import.meta.url);
const ler = (caminho) => readFile(new URL(caminho, raiz));
const fonte = async (arquivo) => `data:font/woff2;base64,${(await ler(`assets/fonts/${arquivo}`)).toString('base64')}`;

const css = await ler('css/paper.css');
const desenhos = (await ler('assets/desenhos.svg')).toString().replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
const nome = MOCK.settings.nome || 'DAVI';

const pagina = (corpo) => `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:'Londrina Solid';font-weight:900;src:url(${FONTES.londrina}) format('woff2')}
@font-face{font-family:'Covered By Your Grace';src:url(${FONTES.rabisco}) format('woff2')}
@font-face{font-family:'Permanent Marker';src:url(${FONTES.marcador}) format('woff2')}
${css}
html,body{margin:0;background:#0A0909}
</style></head><body><svg width="0" height="0" style="position:absolute"><defs>${desenhos}
<filter id="streaks"><feTurbulence type="fractalNoise" baseFrequency="0.006 0.55" numOctaves="3" seed="9"/><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 0.95  0 0 0 0 0.9  0 0 0 0.09 0"/></filter>
<filter id="rough"><feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="4"/><feDisplacementMap in="SourceGraphic" scale="5"/></filter>
</defs></svg>${corpo}</body></html>`;

const FONTES = {
  londrina: await fonte('londrina-solid-900-latin.woff2'),
  rabisco: await fonte('covered-by-your-grace-400-latin.woff2'),
  marcador: await fonte('permanent-marker-400-latin.woff2'),
};

const og = pagina(`
<div style="position:relative;width:1200px;height:630px;overflow:hidden;background:#0A0909;color:#F5E6C4">
  <svg style="position:absolute;inset:0;width:100%;height:100%"><rect width="100%" height="100%" filter="url(#streaks)"/></svg>
  <svg viewBox="0 0 200 200" style="position:absolute;right:0;top:0;width:240px;height:240px"><use href="#teia" width="200" height="200"/></svg>
  <div style="position:absolute;left:150px;top:0;display:flex;flex-direction:column;align-items:center;transform:rotate(-4deg);transform-origin:top">
    <span style="width:2px;height:190px;background:rgba(245,230,196,.55)"></span>
    <svg viewBox="-40 -40 80 80" style="width:84px;height:84px;margin-top:-10px;overflow:visible;--corpo:#141112;--marca:#7C33CF;--olhos:#E3162B"><use href="#aranha" x="-40" y="-40" width="80" height="80"/></svg>
  </div>
  <div class="torn" style="position:absolute;left:-30px;right:-30px;bottom:70px;height:78px;background:#7C33CF;transform:rotate(-3deg)"></div>
  <div class="torn2" style="position:absolute;left:-30px;right:-30px;bottom:46px;height:52px;background:#F2E3C1;transform:rotate(2deg);display:flex;align-items:center;gap:34px;padding-left:80px;font-family:'Permanent Marker';font-size:30px;color:#141112;white-space:nowrap">corta ★ cola ★ acelera ★ respira ★ surpreende ★ prende ★ entrega</div>
  <div style="position:absolute;left:0;right:0;top:120px;text-align:center">
    <div style="font-family:'Londrina Solid';font-weight:900;font-size:230px;line-height:.86;filter:url(#rough)">${nome}</div>
    <div style="margin-top:22px;font-family:'Covered By Your Grace';font-size:48px;transform:rotate(-2deg)">editor de vídeo — motion, shorts &amp; long form</div>
  </div>
</div>`);

const icone = pagina(`
<div style="width:180px;height:180px;background:#0B0B0C;display:flex;align-items:center;justify-content:center">
  <svg viewBox="-40 -40 80 80" style="width:140px;height:140px;overflow:visible;--traco:3.4;--traco-corpo:3;--olhos:#E3162B"><use href="#aranha" x="-40" y="-40" width="80" height="80"/></svg>
</div>`);

const navegador = await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM } : {});
const aba = await navegador.newPage({ viewport: { width: 1200, height: 630 } });
await aba.setContent(og);
await aba.evaluate(() => document.fonts.ready);
await aba.screenshot({ path: new URL('assets/og-image.png', raiz).pathname });
await aba.setViewportSize({ width: 180, height: 180 });
await aba.setContent(icone);
await aba.screenshot({ path: new URL('assets/apple-touch-icon.png', raiz).pathname });
await navegador.close();
