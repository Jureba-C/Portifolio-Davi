import { readFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { MOCK } from '../js/mock-data.js';

const raiz = new URL('..', import.meta.url);
const ler = (caminho) => readFile(new URL(caminho, raiz));
const fonte = async (arquivo) => `data:font/woff2;base64,${(await ler(`assets/fonts/${arquivo}`)).toString('base64')}`;

const desenhos = (await ler('assets/desenhos.svg')).toString().replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
const favicon = (await ler('assets/favicon.svg')).toString().replace(' rx="16"', '');
const nome = MOCK.settings.nome || 'DECXZ';

const FONTES = {
  rocker: await fonte('new-rocker-400-latin.woff2'),
  condensada: await fonte('barlow-condensed-800-latin.woff2'),
  mono: await fonte('space-mono-700-latin.woff2'),
};

const pagina = (corpo) => `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:'New Rocker';src:url(${FONTES.rocker}) format('woff2')}
@font-face{font-family:'Barlow Condensed';font-weight:800;src:url(${FONTES.condensada}) format('woff2')}
@font-face{font-family:'Space Mono';font-weight:700;src:url(${FONTES.mono}) format('woff2')}
html,body{margin:0;background:#0B0B0C}
.tag{padding:4px 16px;font-family:'Barlow Condensed';font-weight:800;font-size:34px;letter-spacing:.05em;text-transform:uppercase;clip-path:polygon(8px 0,100% 0,calc(100% - 8px) 100%,0 100%)}
</style></head><body><svg width="0" height="0" style="position:absolute"><defs>${desenhos}</defs></svg>${corpo}</body></html>`;

const og = pagina(`
<div style="position:relative;width:1200px;height:630px;overflow:hidden;background:#E3162B;background-image:radial-gradient(rgba(11,11,12,.16) 1.4px,transparent 1.6px);background-size:12px 12px">
  <svg viewBox="0 0 1200 630" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%"><path d="M820 0 L1200 0 L1200 630 L680 630 Z" fill="#0B0B0C"/></svg>
  <svg viewBox="0 0 400 400" style="position:absolute;left:0;top:0;width:360px;height:360px;--fio-opacidade:.45"><use href="#teia-traje" width="400" height="400"/></svg>
  <svg viewBox="0 0 400 400" style="position:absolute;right:0;top:0;width:300px;height:300px;transform:scaleX(-1);--fio:#F4F1EC;--fio-opacidade:.16"><use href="#teia-traje" width="400" height="400"/></svg>
  <div style="position:absolute;left:0;bottom:0;width:340px;height:340px;background-image:radial-gradient(#0B0B0C 30%,transparent 33%);background-size:15px 15px;-webkit-mask-image:radial-gradient(circle at 0 100%,#000,transparent 68%)"></div>
  <div style="position:absolute;right:130px;top:0;display:flex;flex-direction:column;align-items:center">
    <span style="width:2px;height:170px;background:rgba(244,241,236,.7)"></span>
    <svg viewBox="-40 -40 80 80" style="width:130px;height:130px;margin-top:-14px;overflow:visible;--traco:3;--traco-corpo:2.6;--olhos:#E3162B"><use href="#aranha" x="-40" y="-40" width="80" height="80"/></svg>
  </div>
  <div style="position:absolute;left:76px;top:118px;display:flex;flex-direction:column;align-items:flex-start;gap:18px">
    <span style="padding:6px 18px;background:#0B0B0C;color:#F4F1EC;font-family:'Barlow Condensed';font-weight:800;font-size:30px;letter-spacing:.1em;text-transform:uppercase;transform:rotate(-3deg)">editor de vídeo</span>
    <div style="font-family:'New Rocker';font-size:210px;line-height:.82;color:#fff;text-shadow:.045em .045em 0 #0B0B0C;white-space:nowrap">${nome}</div>
    <div style="display:flex;gap:12px;margin-top:22px">
      <span class="tag" style="background:#0B0B0C;color:#fff">motion</span>
      <span class="tag" style="background:#fff;color:#0B0B0C">shorts</span>
      <span class="tag" style="background:#0B0B0C;color:#fff">long form</span>
    </div>
  </div>
  <div style="position:absolute;right:64px;bottom:72px;font-family:'Space Mono';font-weight:700;font-size:26px;color:#F4F1EC">&gt;&gt; corta ▸ cola ▸ acelera</div>
  <div style="position:absolute;left:0;right:0;bottom:0;height:22px;background:repeating-linear-gradient(-45deg,#0B0B0C 0 14px,#F4F1EC 14px 28px)"></div>
</div>`);

const icone = `<!doctype html><html><head><style>html,body{margin:0}svg{display:block;width:180px;height:180px}</style></head><body>${favicon}</body></html>`;

const navegador = await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM } : {});
const aba = await navegador.newPage({ viewport: { width: 1200, height: 630 } });
await aba.setContent(og);
await aba.evaluate(() => document.fonts.ready);
await aba.screenshot({ path: new URL('assets/og-image.png', raiz).pathname });
await aba.setViewportSize({ width: 180, height: 180 });
await aba.setContent(icone);
await aba.screenshot({ path: new URL('assets/apple-touch-icon.png', raiz).pathname });
await navegador.close();
