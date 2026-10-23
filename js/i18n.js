const TEXTOS = {
  pt: {
    'pular': 'pular para os trabalhos',
    'movimento.pausar': 'Pausar animações',
    'novaAba': '(abre em nova aba)',
    'pagina.titulo': 'Decxz Editor — editor de vídeo · motion, shorts e long form',
    'player.abrirYoutubeAria': 'abrir no YouTube (abre em nova aba)',
    'menu.abrir': 'Abrir menu',
    'menu.fechar': 'Fechar menu',
    'menu.principal': 'Principal',
    'idioma.grupo': 'Idioma',
    'nav.destaques': 'DESTAQUES',
    'nav.trabalhos': 'TRABALHOS',
    'nav.sobre': 'SOBRE MIM',
    'nav.contato': 'CONTATO',
    'btn.contratar': 'CONTRATAR',
    'aranha.aria': 'Aranha (clique pra assustar)',
    'aranha.ei': 'ei!!',
    'hero.selo': 'editor de vídeo',
    'hero.frase': 'que cortam, aceleram e prendem até o último segundo.',
    'hero.janela': '>> o_que_eu_faço.txt',
    'destaques.aria': 'Vídeos em destaque',
    'destaques.titulo': 'Destaques',
    'destaques.mais': '>> MAIS DESTAQUES',
    'destaques.selo': 'DESTAQUE {n}',
    'destaques.assistir': 'assistir com som ↗',
    'destaques.vazio': 'os destaques estão chegando…',
    'hero.verProjetos': 'VER PROJETOS',
    'hero.comecaAqui': 'começa por aqui',
    'faixa.a': ['MOTION', 'SHORTS', 'LONG FORM', 'EDIÇÃO', 'COR', 'SOUND DESIGN', 'RETENÇÃO'],
    'faixa.b': ['corta', 'cola', 'acelera', 'respira', 'surpreende', 'prende', 'entrega'],
    'clientes.titulo': 'CLIENTES',
    'clientes.vazio': 'a lista de clientes tá sendo tecida…',
    'clientes.canal': '(abre o canal em outra aba)',
    'clientes.verTodos': 'VER TODOS OS CLIENTES ({n})',
    'clientes.verMenos': 'MOSTRAR MENOS',
    'trabalhos.titulo': 'TRABALHOS',
    'trabalhos.categorias': 'Categorias',
    'trabalhos.filtrar': '>> filtrar',
    'trabalhos.todos': 'todos',
    'trabalhos.vazio': 'nada por aqui ainda… a aranha tá tecendo',
    'trabalhos.verVideo': 'assistir ↗',
    'trabalhos.semPrevia': 'PRÉVIA EM BREVE',
    'sobre.titulo': 'SOBRE MIM',
    'sobre.fotoSelo': 'OI, EU SOU O {nome}',
    'sobre.fotoAlt': 'Foto de {nome}',
    'numeros.aria': 'Em números',
    'depo.titulo': 'O QUE DIZEM',
    'processo.titulo': 'COMO EU TRABALHO',
    'processo.p1t': 'BRIEFING',
    'processo.p1': 'Você me manda o material bruto e a ideia. Eu pergunto o que importa: público, ritmo, referências e prazo.',
    'processo.p2t': 'EDIÇÃO',
    'processo.p2': 'Corte, motion, cor e sound design. Você vê uma prévia e pede ajustes sem burocracia.',
    'processo.p3t': 'ENTREGA',
    'processo.p3': 'Arquivo final no formato certo pra cada plataforma, no prazo combinado e pronto pra subir.',
    'orc.abrir': 'PEDIR ORÇAMENTO',
    'orc.janela': '>> orcamento.exe',
    'orc.fechar': 'Fechar',
    'orc.titulo': 'BORA FAZER SEU PRÓXIMO VÍDEO?',
    'orc.nome': 'seu nome ou canal',
    'orc.tipo': 'tipo de vídeo',
    'orc.outro': 'Outro',
    'orc.prazo': 'prazo',
    'orc.prazo1': 'sem pressa',
    'orc.prazo2': 'até 2 semanas',
    'orc.prazo3': 'até 1 semana',
    'orc.prazo4': 'urgente (até 3 dias)',
    'orc.referencia': 'link de referência (opcional)',
    'orc.detalhes': 'conta mais (opcional)',
    'orc.email': 'ENVIAR POR E-MAIL',
    'orc.discord': 'COPIAR PRO DISCORD',
    'orc.faltou': 'preenche seu nome e escolhe o tipo de vídeo!',
    'orc.abrindoEmail': 'abrindo seu e-mail… se não abrir, escreve pra {email}',
    'orc.copiado': 'mensagem copiada! cola no Discord pra {nick}',
    'orc.copiaFalhou': 'não deu pra copiar. Chama {nick} no Discord.',
    'orc.assunto': 'Orçamento: {tipo}',
    'orc.ola': 'Oi! Quero um orçamento.',
    'orc.rotNome': 'Nome/canal',
    'orc.rotTipo': 'Tipo',
    'orc.rotPrazo': 'Prazo',
    'orc.rotRef': 'Referência',
    'orc.rotDetalhes': 'Detalhes',
    'contato.titulo': 'CONTATO',
    'contato.redes': 'ENTRE EM CONTATO POR UMA DESSAS REDES',
    'contato.chamada': 'Tem um vídeo em mente? Bora deixar ele impossível de pular.',
    'contato.janela': '>> contato.exe',
    'contato.ouEscreva': 'ou escreve direto:',
    'contato.discord': 'Copiar nick do Discord ({nick})',
    'contato.email': 'Enviar e-mail',
    'toast.nick': 'NICK COPIADO!',
    'toast.nickFalhou': 'NICK: {nick}',
    'rodape.psiu': 'psiu… passa o mouse aqui',
    'rodape.psiuToque': 'psiu… toca aqui',
    'rodape.tchau': 'tchau!',
    'rodape.direitos': 'TODOS OS DIREITOS RESERVADOS.',
    'rodape.offline': 'mostrando a última versão salva',
    'intro.p1': 'CORTA',
    'intro.p2': 'COLA',
    'intro.p3': 'ACELERA',
    'player.fechar': 'Fechar player',
    'player.anterior': 'Vídeo anterior',
    'player.proximo': 'Próximo vídeo',
    'player.reproduzir': 'Reproduzir',
    'player.pausar': 'Pausar',
    'player.volume': 'Volume',
    'player.mudo': 'Tirar o som',
    'player.comSom': 'Ligar o som',
    'player.telaCheia': 'Tela cheia',
    'player.abrirYoutube': 'abrir no YouTube ↗',
    'player.dialogo': 'Player do vídeo',
    'player.semVideo': 'esse vídeo ainda não tem link',
  },
  en: {
    'pular': 'skip to the work',
    'movimento.pausar': 'Pause animations',
    'novaAba': '(opens in a new tab)',
    'pagina.titulo': 'Decxz Editor — video editor · motion, shorts and long form',
    'player.abrirYoutubeAria': 'open on YouTube (opens in a new tab)',
    'menu.abrir': 'Open menu',
    'menu.fechar': 'Close menu',
    'menu.principal': 'Main',
    'idioma.grupo': 'Language',
    'nav.destaques': 'HIGHLIGHTS',
    'nav.trabalhos': 'WORK',
    'nav.sobre': 'ABOUT ME',
    'nav.contato': 'CONTACT',
    'btn.contratar': 'HIRE ME',
    'aranha.aria': 'Spider (click to scare it)',
    'aranha.ei': 'hey!!',
    'hero.selo': 'video editor',
    'hero.frase': 'that cut, speed up and hold attention to the very last second.',
    'hero.janela': '>> what_i_do.txt',
    'destaques.aria': 'Highlighted videos',
    'destaques.titulo': 'Highlights',
    'destaques.mais': '>> MORE HIGHLIGHTS',
    'destaques.selo': 'HIGHLIGHT {n}',
    'destaques.assistir': 'watch with sound ↗',
    'destaques.vazio': 'highlights are on their way…',
    'hero.verProjetos': 'SEE PROJECTS',
    'hero.comecaAqui': 'start here',
    'faixa.a': ['MOTION', 'SHORTS', 'LONG FORM', 'EDITING', 'COLOR', 'SOUND DESIGN', 'RETENTION'],
    'faixa.b': ['cut', 'paste', 'speed up', 'breathe', 'surprise', 'hook', 'deliver'],
    'clientes.titulo': 'CLIENTS',
    'clientes.vazio': 'the client list is still being woven…',
    'clientes.canal': '(opens the channel in a new tab)',
    'clientes.verTodos': 'SEE ALL CLIENTS ({n})',
    'clientes.verMenos': 'SHOW LESS',
    'trabalhos.titulo': 'WORK',
    'trabalhos.categorias': 'Categories',
    'trabalhos.filtrar': '>> filter',
    'trabalhos.todos': 'all',
    'trabalhos.vazio': 'nothing here yet… the spider is still weaving',
    'trabalhos.verVideo': 'watch ↗',
    'trabalhos.semPrevia': 'PREVIEW SOON',
    'sobre.titulo': 'ABOUT ME',
    'sobre.fotoSelo': "HI, I'M {nome}",
    'sobre.fotoAlt': 'Photo of {nome}',
    'numeros.aria': 'In numbers',
    'depo.titulo': 'WHAT THEY SAY',
    'processo.titulo': 'HOW I WORK',
    'processo.p1t': 'BRIEFING',
    'processo.p1': 'You send me the raw footage and the idea. I ask what matters: audience, pacing, references and deadline.',
    'processo.p2t': 'EDIT',
    'processo.p2': 'Cutting, motion, color and sound design. You watch a preview and ask for changes, no red tape.',
    'processo.p3t': 'DELIVERY',
    'processo.p3': 'Final file in the right format for each platform, on time and ready to upload.',
    'orc.abrir': 'GET A QUOTE',
    'orc.janela': '>> quote.exe',
    'orc.fechar': 'Close',
    'orc.titulo': 'READY FOR YOUR NEXT VIDEO?',
    'orc.nome': 'your name or channel',
    'orc.tipo': 'type of video',
    'orc.outro': 'Other',
    'orc.prazo': 'deadline',
    'orc.prazo1': 'no rush',
    'orc.prazo2': 'within 2 weeks',
    'orc.prazo3': 'within 1 week',
    'orc.prazo4': 'urgent (within 3 days)',
    'orc.referencia': 'reference link (optional)',
    'orc.detalhes': 'tell me more (optional)',
    'orc.email': 'SEND BY E-MAIL',
    'orc.discord': 'COPY FOR DISCORD',
    'orc.faltou': 'fill in your name and pick a type of video!',
    'orc.abrindoEmail': 'opening your e-mail… if it does not open, write to {email}',
    'orc.copiado': 'message copied! paste it on Discord to {nick}',
    'orc.copiaFalhou': 'could not copy. Reach {nick} on Discord.',
    'orc.assunto': 'Quote: {tipo}',
    'orc.ola': 'Hi! I would like a quote.',
    'orc.rotNome': 'Name/channel',
    'orc.rotTipo': 'Type',
    'orc.rotPrazo': 'Deadline',
    'orc.rotRef': 'Reference',
    'orc.rotDetalhes': 'Details',
    'contato.titulo': 'CONTACT',
    'contato.redes': 'REACH OUT ON ONE OF THESE',
    'contato.chamada': 'Got a video in mind? Let’s make it impossible to skip.',
    'contato.janela': '>> contact.exe',
    'contato.ouEscreva': 'or write directly:',
    'contato.discord': 'Copy Discord nick ({nick})',
    'contato.email': 'Send an e-mail',
    'toast.nick': 'NICK COPIED!',
    'toast.nickFalhou': 'NICK: {nick}',
    'rodape.psiu': 'psst… hover here',
    'rodape.psiuToque': 'psst… tap here',
    'rodape.tchau': 'bye!',
    'rodape.direitos': 'ALL RIGHTS RESERVED.',
    'rodape.offline': 'showing the last saved version',
    'intro.p1': 'CUT',
    'intro.p2': 'PASTE',
    'intro.p3': 'SPEED UP',
    'player.fechar': 'Close player',
    'player.anterior': 'Previous video',
    'player.proximo': 'Next video',
    'player.reproduzir': 'Play',
    'player.pausar': 'Pause',
    'player.volume': 'Volume',
    'player.mudo': 'Mute',
    'player.comSom': 'Unmute',
    'player.telaCheia': 'Full screen',
    'player.abrirYoutube': 'open on YouTube ↗',
    'player.dialogo': 'Video player',
    'player.semVideo': "this video doesn't have a link yet",
  },
};

const ouvintes = new Set();

function lerIdioma() {
  try {
    const salvo = localStorage.getItem('idioma');
    if (salvo === 'pt' || salvo === 'en') return salvo;
  } catch {}
  return document.documentElement.lang === 'en' ? 'en' : 'pt';
}

let atual = lerIdioma();

export function idioma() {
  return atual;
}

export function t(chave, vars = {}) {
  const valor = TEXTOS[atual][chave] ?? TEXTOS.pt[chave] ?? chave;
  if (typeof valor !== 'string') return valor;
  return valor.replace(/\{(\w+)\}/g, (_, nome) => vars[nome] ?? '');
}

export function campo(registro, base) {
  if (!registro) return '';
  const preferido = registro[`${base}_${atual}`];
  return preferido && String(preferido).trim() ? preferido : registro[`${base}_pt`] ?? '';
}

export function aplicar(raiz = document) {
  raiz.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  raiz.querySelectorAll('[data-i18n-aria]').forEach((el) => {
    el.setAttribute('aria-label', t(el.dataset.i18nAria));
  });
  raiz.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    el.setAttribute('placeholder', t(el.dataset.i18nPlaceholder));
  });
}

export function definirIdioma(novo) {
  if (novo !== 'pt' && novo !== 'en') return;
  atual = novo;
  try { localStorage.setItem('idioma', novo); } catch {}
  document.documentElement.lang = novo === 'en' ? 'en' : 'pt-BR';
  aplicar();
  ouvintes.forEach((fn) => fn(novo));
}

export function aoMudarIdioma(fn) {
  ouvintes.add(fn);
}
