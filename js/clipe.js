export const PASTA_LEVE = 'previas/leve';
const LIMITE_LEVE = 3 * 1024 * 1024;
const BITRATE = 2_500_000;
const LADO_MENOR = 720;
const GANHO_MINIMO = 0.9;

export async function otimizarClipe(arquivo, aoProgresso = () => {}) {
  try {
    const { Input, Output, Conversion, MP4, WEBM, BlobSource, BufferTarget, Mp4OutputFormat } = await import('./vendor/mediabunny.js');
    const input = new Input({ formats: [MP4, WEBM], source: new BlobSource(arquivo) });
    const faixa = await input.getPrimaryVideoTrack();
    if (!faixa) return arquivo;
    const saida = new Output({ format: new Mp4OutputFormat({ fastStart: 'in-memory' }), target: new BufferTarget() });
    const video = { bitrate: BITRATE };
    if (Math.min(faixa.displayWidth, faixa.displayHeight) > LADO_MENOR) {
      video[faixa.displayWidth >= faixa.displayHeight ? 'height' : 'width'] = LADO_MENOR;
    }
    const conversao = await Conversion.init({ input, output: saida, video, audio: { discard: true } });
    if (!conversao.isValid) return arquivo;
    conversao.onProgress = aoProgresso;
    await conversao.execute();
    const bytes = saida.target.buffer;
    if (bytes.byteLength >= arquivo.size * GANHO_MINIMO) return arquivo;
    return new File([bytes], `${arquivo.name.replace(/\.[^.]+$/, '')}.mp4`, { type: 'video/mp4' });
  } catch {
    return arquivo;
  }
}

export async function clipePesado(url) {
  if (!url || url.includes(`/${PASTA_LEVE}/`)) return false;
  try {
    const resposta = await fetch(url, { method: 'HEAD' });
    return Number(resposta.headers.get('content-length')) > LIMITE_LEVE;
  } catch {
    return false;
  }
}
