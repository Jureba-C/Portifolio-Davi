import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const raiz = new URL('..', import.meta.url);
const pasta = new URL('assets/exemplos/', raiz);
await mkdir(pasta, { recursive: true });

const anton = (await readFile(new URL('assets/fonts/anton-400-latin.woff2', raiz))).toString('base64');
const barlow = (await readFile(new URL('assets/fonts/barlow-condensed-800-latin.woff2', raiz))).toString('base64');

const CLIPES = [
  { nome: 'previa-showreel', l: 640, a: 360, s: 5, cena: 'showreel' },
  { nome: 'previa-motion', l: 640, a: 360, s: 4, cena: 'motion' },
  { nome: 'previa-longform', l: 640, a: 360, s: 5, cena: 'longform' },
  { nome: 'previa-vertical', l: 360, a: 640, s: 4, cena: 'vertical' },
];

const PAGINA = `<!doctype html><html><head><style>
@font-face{font-family:A;src:url(data:font/woff2;base64,${anton})}
@font-face{font-family:B;font-weight:800;src:url(data:font/woff2;base64,${barlow})}
html,body{margin:0;background:#0B0B0C}
</style></head><body><canvas id="c"></canvas></body></html>`;

function cenas() {
  const V = '#E3162B';
  const BR = '#F4F1EC';
  const PR = '#0B0B0C';
  const onda = (p, f = 1, d = 0) => Math.sin((p * f + d) * Math.PI * 2);
  const selo = (c, l, a) => {
    c.font = '800 15px B';
    c.textAlign = 'right';
    c.fillStyle = 'rgba(244,241,236,.55)';
    c.fillText('PRÉVIA DE EXEMPLO', l - 14, a - 14);
  };
  const tom = (c, l, a, p) => {
    c.fillStyle = 'rgba(227,22,43,.28)';
    for (let y = 0; y < a; y += 14) {
      for (let x = (y / 14) % 2 ? 7 : 0; x < l; x += 14) {
        const r = Math.max(0, 3.2 * (1 - (x + y) / (l + a)) + onda(p, 1, (x + y) / 400) * 0.8);
        c.beginPath();
        c.arc(x, y, r, 0, Math.PI * 2);
        c.fill();
      }
    }
  };
  const caixaLetra = (c, ch, x, y, tam, fundo, cor, ang) => {
    c.save();
    c.translate(x, y);
    c.rotate(ang);
    c.font = `${tam}px A`;
    const w = c.measureText(ch).width + tam * 0.18;
    c.fillStyle = fundo;
    c.fillRect(-w / 2, -tam * 0.82, w, tam * 0.98);
    c.fillStyle = cor;
    c.textAlign = 'center';
    c.fillText(ch, 0, 0);
    c.restore();
    return w;
  };
  return {
    showreel(c, l, a, p) {
      c.fillStyle = PR;
      c.fillRect(0, 0, l, a);
      tom(c, l, a, p);
      c.save();
      c.translate(l / 2, a / 2);
      c.rotate(-0.2);
      const desl = ((p * 2) % 1) * (l * 2) - l;
      c.fillStyle = V;
      c.fillRect(-l, -46, l * 2, 92);
      c.fillStyle = BR;
      c.fillRect(desl - 140, -46, 18, 92);
      c.fillRect(desl - 100, -46, 6, 92);
      c.restore();
      const texto = 'SHOWREEL';
      const cores = [[BR, PR], [PR, BR], [V, BR], [BR, V]];
      let x = l / 2 - 250;
      [...texto].forEach((ch, i) => {
        const pulo = Math.max(0, onda(p, 2, -i / 8)) * 14;
        const [f, t] = cores[i % 4];
        const w = caixaLetra(c, ch, x + 30, a / 2 + 34 - pulo, 92, f, t, (i % 2 ? 0.06 : -0.05));
        x += w + 4;
      });
      c.font = '800 26px B';
      c.textAlign = 'left';
      c.fillStyle = BR;
      c.fillText('2026 ▸ CORTA ▸ COLA ▸ ACELERA', 30, 46);
      selo(c, l, a);
    },
    motion(c, l, a, p) {
      c.fillStyle = PR;
      c.fillRect(0, 0, l, a);
      for (let i = 0; i < 6; i += 1) {
        c.save();
        c.translate(l / 2 + Math.cos(p * Math.PI * 2 + i) * 210, a / 2 + Math.sin(p * Math.PI * 4 + i) * 110);
        c.rotate(p * Math.PI * 2 * (i % 2 ? 1 : -1) + i);
        c.fillStyle = i % 3 === 0 ? V : i % 3 === 1 ? BR : 'rgba(227,22,43,.5)';
        const t = 26 + (i % 3) * 14;
        c.beginPath();
        c.moveTo(0, -t);
        c.lineTo(t, t);
        c.lineTo(-t, t * 0.6);
        c.closePath();
        c.fill();
        c.restore();
      }
      const fase = (p * 2) % 1;
      const x = fase < 0.5 ? -l + fase * 2 * l * 1.0 : 0;
      c.save();
      c.translate(Math.min(0, x), 0);
      c.fillStyle = BR;
      c.fillRect(40, a / 2 - 58, 400, 110);
      c.font = '104px A';
      c.fillStyle = PR;
      c.textAlign = 'left';
      c.fillText('MOTION', 54, a / 2 + 42);
      c.restore();
      c.fillStyle = V;
      c.fillRect(l - 180, a / 2 + 14 + onda(p, 2) * 10, 150, 54);
      c.font = '800 40px B';
      c.fillStyle = BR;
      c.fillText('01', l - 130, a / 2 + 56 + onda(p, 2) * 10);
      selo(c, l, a);
    },
    longform(c, l, a, p) {
      c.fillStyle = PR;
      c.fillRect(0, 0, l, a);
      tom(c, l, a, p + 0.5);
      c.font = '78px A';
      c.textAlign = 'left';
      c.fillStyle = BR;
      c.fillText('LONG FORM', 30, 100);
      c.fillStyle = V;
      c.fillRect(30, 112, 330, 10);
      const trilhas = [[150, V], [190, BR], [230, 'rgba(244,241,236,.45)'], [270, V]];
      trilhas.forEach(([y, cor], i) => {
        const vel = (i + 1) * 0.5;
        for (let k = -1; k < 6; k += 1) {
          const base = ((k * 150 - p * l * vel) % (l + 150) + l + 150) % (l + 150) - 150;
          c.fillStyle = cor;
          c.fillRect(base, y, 110 + (k % 3) * 24, 28);
        }
      });
      const cab = 40 + ((p + 0.25) % 1) * (l - 80);
      c.fillStyle = BR;
      c.fillRect(cab - 2, 136, 4, 180);
      c.beginPath();
      c.moveTo(cab - 10, 132);
      c.lineTo(cab + 10, 132);
      c.lineTo(cab, 146);
      c.fill();
      c.font = '800 22px B';
      c.fillStyle = BR;
      const s = Math.floor(p * 42 * 60);
      c.fillText(`${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')} / 42:00`, 30, a - 20);
      selo(c, l, a);
    },
    vertical(c, l, a, p) {
      c.fillStyle = PR;
      c.fillRect(0, 0, l, a);
      tom(c, l, a, p);
      c.save();
      c.translate(l / 2, a * 0.36);
      c.rotate(-0.12);
      ['SHO', 'RTS'].forEach((linha, i) => {
        let x = -150;
        [...linha].forEach((ch, j) => {
          const cores = [[BR, PR], [V, BR], [PR, BR]];
          const [f, t] = cores[(i + j) % 3];
          const pulo = Math.max(0, onda(p, 2, -(i * 3 + j) / 6)) * 12;
          const w = caixaLetra(c, ch, x + 50, i * 120 - pulo, 110, f, t, (j % 2 ? 0.07 : -0.05));
          x += w + 6;
        });
      });
      c.restore();
      const palavras = ['CORTA', 'COLA', 'ACELERA', 'PRENDE'];
      const idx = Math.floor(p * 4) % 4;
      const local = (p * 4) % 1;
      const esc = local < 0.15 ? 0.6 + local / 0.15 * 0.4 : 1;
      c.save();
      c.translate(l / 2, a * 0.74);
      c.scale(esc, esc);
      c.rotate(-0.05);
      c.font = '800 52px B';
      c.textAlign = 'center';
      const w = c.measureText(palavras[idx]).width + 34;
      c.fillStyle = V;
      c.fillRect(-w / 2, -48, w, 64);
      c.fillStyle = BR;
      c.fillText(palavras[idx], 0, 0);
      c.restore();
      c.fillStyle = BR;
      c.fillRect(24, a - 52, (l - 48) * p, 8);
      c.strokeStyle = BR;
      c.lineWidth = 2;
      c.strokeRect(24, a - 52, l - 48, 8);
      selo(c, l, a - 18);
    },
  };
}

const navegador = await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM } : {});
const aba = await navegador.newPage();
await aba.setContent(PAGINA);
await aba.evaluate(() => Promise.all([document.fonts.load('100px A'), document.fonts.load('800 20px B')]));
await aba.evaluate(`window.CENAS = (${cenas.toString()})()`);

for (const clipe of CLIPES) {
  const { video, poster } = await aba.evaluate(async ({ l, a, s, cena }) => {
    const canvas = document.getElementById('c');
    canvas.width = l;
    canvas.height = a;
    const c = canvas.getContext('2d');
    const desenhar = window.CENAS[cena];
    desenhar(c, l, a, 0.35);
    const poster = canvas.toDataURL('image/jpeg', 0.82);
    const fluxo = canvas.captureStream(30);
    const tipo = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
    const gravador = new MediaRecorder(fluxo, { mimeType: tipo, videoBitsPerSecond: 700000 });
    const pedacos = [];
    gravador.ondataavailable = (e) => e.data.size && pedacos.push(e.data);
    const fim = new Promise((r) => { gravador.onstop = r; });
    const inicio = performance.now();
    gravador.start();
    await new Promise((resolver) => {
      const quadro = () => {
        const t = (performance.now() - inicio) / 1000;
        if (t >= s) return resolver();
        desenhar(c, l, a, t / s);
        requestAnimationFrame(quadro);
      };
      quadro();
    });
    gravador.stop();
    await fim;
    const buffer = new Uint8Array(await new Blob(pedacos, { type: 'video/webm' }).arrayBuffer());
    let binario = '';
    for (let i = 0; i < buffer.length; i += 0x8000) binario += String.fromCharCode(...buffer.subarray(i, i + 0x8000));
    return { video: btoa(binario), poster };
  }, clipe);
  await writeFile(new URL(`${clipe.nome}.webm`, pasta), Buffer.from(video, 'base64'));
  await writeFile(new URL(`${clipe.nome}.jpg`, pasta), Buffer.from(poster.split(',')[1], 'base64'));
}

await navegador.close();
