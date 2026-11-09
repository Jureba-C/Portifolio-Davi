export const PASTA_LEVE = 'previas/leve';
const LIMITE_LEVE = 3 * 1024 * 1024;
const BITRATE = 2_500_000;
const LADO_MENOR = 720;
const GANHO_MINIMO = 0.9;
const QUADROS_MAXIMOS = 60;
const NAO_DECODIFICA = 'este navegador não decodifica o vídeo';

const falha = (motivo) => Object.assign(new Error(motivo), { motivo });

function comoMp4(bytes, arquivo) {
  if (bytes.byteLength >= arquivo.size * GANHO_MINIMO) throw falha('o resultado não ficou menor');
  return new File([bytes], `${arquivo.name.replace(/\.[^.]+$/, '')}.mp4`, { type: 'video/mp4' });
}

async function converter(arquivo, aoProgresso) {
  const { Input, Output, Conversion, MP4, WEBM, BlobSource, BufferTarget, Mp4OutputFormat } = await import('./vendor/mediabunny.js');
  const input = new Input({ formats: [MP4, WEBM], source: new BlobSource(arquivo) });
  const faixa = await input.getPrimaryVideoTrack();
  if (!faixa) return null;
  const saida = new Output({ format: new Mp4OutputFormat({ fastStart: 'in-memory' }), target: new BufferTarget() });
  const video = { bitrate: BITRATE };
  if (Math.min(faixa.displayWidth, faixa.displayHeight) > LADO_MENOR) {
    video[faixa.displayWidth >= faixa.displayHeight ? 'height' : 'width'] = LADO_MENOR;
  }
  const conversao = await Conversion.init({ input, output: saida, video, audio: { discard: true } });
  if (!conversao.isValid) return null;
  conversao.onProgress = aoProgresso;
  await conversao.execute();
  return saida.target.buffer;
}

export async function otimizarClipe(arquivo, aoProgresso = () => {}, aoMotivo = () => {}) {
  const bytes = await converter(arquivo, aoProgresso).catch(() => null);
  if (!bytes) return recodificarPeloVideo(arquivo, aoProgresso, aoMotivo);
  try {
    return comoMp4(bytes, arquivo);
  } catch (erro) {
    aoMotivo(erro.motivo);
    return arquivo;
  }
}

async function quadrosPorSegundo(arquivo) {
  try {
    const { Input, MP4, WEBM, BlobSource } = await import('./vendor/mediabunny.js');
    const faixa = await new Input({ formats: [MP4, WEBM], source: new BlobSource(arquivo) }).getPrimaryVideoTrack();
    const taxa = (await faixa.computePacketStats(60)).averagePacketRate;
    return taxa > 0 ? Math.min(QUADROS_MAXIMOS, Math.round(taxa)) : undefined;
  } catch {
    return undefined;
  }
}

export async function recodificarPeloVideo(arquivo, aoProgresso = () => {}, aoMotivo = () => {}) {
  const endereco = URL.createObjectURL(arquivo);
  const video = Object.assign(document.createElement('video'), { muted: true, playsInline: true, preload: 'auto' });
  video.style.cssText = 'position:fixed;left:0;top:0;width:2px;height:2px;opacity:0;pointer-events:none';
  let relogio;
  try {
    const { Output, Mp4OutputFormat, BufferTarget, CanvasSource, getFirstEncodableVideoCodec } = await import('./vendor/mediabunny.js');
    const taxa = await quadrosPorSegundo(arquivo);
    document.body.append(video);
    await new Promise((pronto, erro) => {
      video.onloadeddata = pronto;
      video.onerror = () => erro(falha(NAO_DECODIFICA));
      video.src = endereco;
    });
    if (!video.videoWidth || !video.videoHeight) throw falha(NAO_DECODIFICA);
    const escala = Math.min(1, LADO_MENOR / Math.min(video.videoWidth, video.videoHeight));
    const largura = Math.round((video.videoWidth * escala) / 2) * 2;
    const altura = Math.round((video.videoHeight * escala) / 2) * 2;
    const codec = await getFirstEncodableVideoCodec(['avc', 'vp9', 'av1'], { width: largura, height: altura, bitrate: BITRATE });
    if (!codec) throw falha('nenhum codificador de vídeo disponível');
    const tela = Object.assign(document.createElement('canvas'), { width: largura, height: altura });
    const pincel = tela.getContext('2d');
    const fonte = new CanvasSource(tela, { codec, bitrate: BITRATE });
    const saida = new Output({ format: new Mp4OutputFormat({ fastStart: 'in-memory' }), target: new BufferTarget() });
    saida.addVideoTrack(fonte, { frameRate: taxa });
    await saida.start();
    let ultimo = -1;
    let intervalo = 1 / (taxa || 30);
    let pendente = null;
    let erroFonte = null;
    const capturar = (tempo) => {
      if (tempo <= ultimo || pendente || erroFonte) return;
      if (ultimo >= 0) intervalo = tempo - ultimo;
      ultimo = tempo;
      pincel.drawImage(video, 0, 0, largura, altura);
      pendente = fonte.add(tempo, intervalo).catch((e) => { erroFonte = e; }).finally(() => { pendente = null; });
      if (Number.isFinite(video.duration) && video.duration > 0) aoProgresso(Math.min(1, video.currentTime / video.duration));
    };
    await new Promise((fim, erro) => {
      const limite = Number.isFinite(video.duration) ? video.duration : 600;
      relogio = setTimeout(() => erro(falha('erro ao recodificar')), (limite * 3 + 10) * 1000);
      video.onerror = () => erro(falha(NAO_DECODIFICA));
      video.onended = fim;
      if (video.requestVideoFrameCallback) {
        const quadro = (_, dados) => {
          capturar(dados.mediaTime);
          if (!video.ended) video.requestVideoFrameCallback(quadro);
        };
        video.requestVideoFrameCallback(quadro);
      } else {
        video.ontimeupdate = () => capturar(video.currentTime);
      }
      video.playbackRate = 1;
      video.play().catch(() => erro(falha(NAO_DECODIFICA)));
    });
    await pendente;
    if (erroFonte || ultimo < 0) throw falha('erro ao recodificar');
    await saida.finalize();
    aoProgresso(1);
    return comoMp4(saida.target.buffer, arquivo);
  } catch (erro) {
    aoMotivo(erro?.motivo ?? 'erro ao recodificar');
    return arquivo;
  } finally {
    clearTimeout(relogio);
    video.pause();
    video.remove();
    video.removeAttribute('src');
    video.load();
    URL.revokeObjectURL(endereco);
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
