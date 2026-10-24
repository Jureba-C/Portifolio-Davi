const EX = 'assets/exemplos/';

const previa = (nome) => ({ preview_url: `${EX}${nome}.webm`, poster_url: `${EX}${nome}.jpg` });
const semPrevia = { preview_url: '', poster_url: '' };

export const MOCK = {
  settings: {
    id: 1,
    nome: 'DECXZ',
    email: 'contato@exemplo.com',
    foto_url: 'assets/foto-decxz.webp',
    sobre_pt: "Sou editor de vídeo e motion designer, com *3 anos de experiência profissional*. Especializado em cinematics, vídeos longos, conteúdos verticais e motion design, utilizo Premiere Pro e After Effects para criar projetos com identidade própria.\n\nCombino *movimento, ritmo e sound design* para transformar cada edição em uma experiência audiovisual única. Sem fórmulas prontas, sem padrões engessados.\n\n*Cada projeto tem sua identidade. Meu trabalho é fazer você senti-la.*",
    sobre_en: "I'm a video editor and motion designer with *3 years of professional experience*. Specialized in cinematics, long-form videos, vertical content and motion design, I use Premiere Pro and After Effects to build projects with their own identity.\n\nI combine *movement, rhythm and sound design* to turn every edit into a unique audiovisual experience. No ready-made formulas, no rigid templates.\n\n*Every project has its own identity. My job is to make you feel it.*",
    redes: {
      instagram: 'https://www.instagram.com/exemplo',
      x: 'https://x.com/exemplo',
      youtube: 'https://www.youtube.com/@exemplo',
    },
    discord_nick: 'decxz.editor',
    comissoes_abertas: true,
  },
  categories: [
    { id: 'c-motion', nome_pt: 'Motion', nome_en: 'Motion', slug: 'motion', ordem: 0, formato: 'horizontal' },
    { id: 'c-vertical', nome_pt: 'Vertical', nome_en: 'Vertical', slug: 'vertical', ordem: 1, formato: 'vertical' },
    { id: 'c-long', nome_pt: 'Long Form', nome_en: 'Long Form', slug: 'long-form', ordem: 2, formato: 'horizontal' },
  ],
  longform_filters: [
    { id: 'f-gameplay', nome_pt: 'Gameplay', nome_en: 'Gameplay', ordem: 0 },
    { id: 'f-doc', nome_pt: 'Documentário', nome_en: 'Documentary', ordem: 1 },
    { id: 'f-vlog', nome_pt: 'Vlog', nome_en: 'Vlog', ordem: 2 },
  ],
  videos: [
    { id: 'v-motion-1', titulo: 'Showreel 2026', descricao_pt: 'motion, cor e sound design', descricao_en: 'motion, color and sound design', youtube_id: 'aqz-KE-bpKQ', ...previa('previa-showreel'), category_id: 'c-motion', filter_id: null, destaque: true, ordem: 0, created_at: '2026-01-10T12:00:00Z' },
    { id: 'v-motion-2', titulo: 'Abertura do canal Pixel Torto', descricao_pt: 'Pixel Torto · animação de logo', descricao_en: 'Pixel Torto · logo animation', youtube_id: 'eRsGyueVLvQ', ...previa('previa-motion'), category_id: 'c-motion', filter_id: null, destaque: true, ordem: 1, created_at: '2026-01-12T12:00:00Z' },
    { id: 'v-motion-3', titulo: 'Lyric video — Rota 77', descricao_pt: 'Rota 77 · tipografia animada', descricao_en: 'Rota 77 · kinetic type', youtube_id: 'R6MlUcmOul8', ...previa('previa-showreel'), category_id: 'c-motion', filter_id: null, destaque: false, ordem: 2, created_at: '2026-01-14T12:00:00Z' },
    { id: 'v-motion-4', titulo: 'Vinheta de live', descricao_pt: 'Clã Vermelho · pacote de overlays', descricao_en: 'Clã Vermelho · overlay pack', youtube_id: 'WhWc3b3KhnY', ...semPrevia, category_id: 'c-motion', filter_id: null, destaque: false, ordem: 3, created_at: '2026-01-16T12:00:00Z' },
    { id: 'v-short-1', titulo: 'O bug mais engraçado do ano', descricao_pt: 'Fala Mano', descricao_en: 'Fala Mano', youtube_id: 'Y-rmzh0PI3c', ...previa('previa-vertical'), category_id: 'c-vertical', filter_id: null, destaque: true, ordem: 4, created_at: '2026-02-01T12:00:00Z' },
    { id: 'v-short-2', titulo: '3 atalhos que salvam sua edição', descricao_pt: 'Bit a Bit', descricao_en: 'Bit a Bit', youtube_id: 'mN0zPOpADL4', ...previa('previa-vertical'), category_id: 'c-vertical', filter_id: null, destaque: false, ordem: 5, created_at: '2026-02-03T12:00:00Z' },
    { id: 'v-short-3', titulo: 'Clutch no último segundo', descricao_pt: 'Clã Vermelho', descricao_en: 'Clã Vermelho', youtube_id: 'PVGeM40dABA', ...previa('previa-vertical'), category_id: 'c-vertical', filter_id: null, destaque: false, ordem: 6, created_at: '2026-02-05T12:00:00Z' },
    { id: 'v-short-4', titulo: 'Reagindo ao pior setup', descricao_pt: 'Lua de Lata', descricao_en: 'Lua de Lata', youtube_id: '_cMxraX_5RE', ...previa('previa-vertical'), category_id: 'c-vertical', filter_id: null, destaque: false, ordem: 7, created_at: '2026-02-07T12:00:00Z' },
    { id: 'v-long-1', titulo: 'Zerei o jogo sem tomar dano', descricao_pt: 'Clã Vermelho · 42 min', descricao_en: 'Clã Vermelho · 42 min', youtube_id: 'SkVqJ1SGeL0', ...previa('previa-longform'), category_id: 'c-long', filter_id: 'f-gameplay', destaque: true, ordem: 8, created_at: '2026-03-01T12:00:00Z' },
    { id: 'v-long-2', titulo: 'A história da lan house', descricao_pt: 'Bit a Bit · roteiro e edição', descricao_en: 'Bit a Bit · script and edit', youtube_id: 'pKmSdY56VtY', ...previa('previa-longform'), category_id: 'c-long', filter_id: 'f-doc', destaque: false, ordem: 9, created_at: '2026-03-03T12:00:00Z' },
    { id: 'v-long-3', titulo: 'Um dia na Paulista', descricao_pt: 'Lua de Lata', descricao_en: 'Lua de Lata', youtube_id: 'aqz-KE-bpKQ', ...previa('previa-motion'), category_id: 'c-long', filter_id: 'f-vlog', destaque: false, ordem: 10, created_at: '2026-03-05T12:00:00Z' },
    { id: 'v-long-4', titulo: 'Speedrun comentado', descricao_pt: 'Pixel Torto · com Rota 77', descricao_en: 'Pixel Torto · with Rota 77', youtube_id: 'eRsGyueVLvQ', ...semPrevia, category_id: 'c-long', filter_id: 'f-gameplay', destaque: false, ordem: 11, created_at: '2026-03-07T12:00:00Z' },
  ],
  testimonials: [
    { id: 'dp-1', nome: 'Rafa', canal: 'Pixel Torto', texto_pt: 'Mandei o bruto numa sexta e na segunda tinha um vídeo com ritmo de trailer. A retenção subiu na hora.', texto_en: 'I sent the raw footage on a Friday and by Monday I had a video paced like a trailer. Retention went up right away.', ordem: 0 },
    { id: 'dp-2', nome: 'Bia', canal: 'Fala Mano', texto_pt: 'Ele entende o timing da piada. Corta no lugar certo e o som entra junto, parece que foi ensaiado.', texto_en: 'He gets the timing of a joke. Cuts in the right place and the sound lands with it, like it was rehearsed.', ordem: 1 },
    { id: 'dp-3', nome: 'Léo', canal: 'Clã Vermelho', texto_pt: 'Os shorts dele viraram a nossa vitrine. Identidade própria em cada um, sem cara de modelo pronto.', texto_en: 'His shorts became our storefront. Each one has its own identity, nothing looks like a template.', ordem: 2 },
  ],
  clients: [
    { id: 'cl-1', nome: 'Pixel Torto', canal_url: 'https://www.youtube.com/@exemplo', foto_url: '', ordem: 0 },
    { id: 'cl-2', nome: 'Fala Mano', canal_url: 'https://www.youtube.com/@exemplo', foto_url: '', ordem: 1 },
    { id: 'cl-3', nome: 'Rota 77', canal_url: 'https://www.youtube.com/@exemplo', foto_url: '', ordem: 2 },
    { id: 'cl-4', nome: 'Lua de Lata', canal_url: 'https://www.youtube.com/@exemplo', foto_url: '', ordem: 3 },
    { id: 'cl-5', nome: 'Clã Vermelho', canal_url: 'https://www.youtube.com/@exemplo', foto_url: '', ordem: 4 },
    { id: 'cl-6', nome: 'Bit a Bit', canal_url: 'https://www.youtube.com/@exemplo', foto_url: '', ordem: 5 },
    { id: 'cl-7', nome: 'Neon Quebrado', canal_url: 'https://www.youtube.com/@exemplo', foto_url: '', ordem: 6 },
    { id: 'cl-8', nome: 'Ping Alto', canal_url: 'https://www.youtube.com/@exemplo', foto_url: '', ordem: 7 },
    { id: 'cl-9', nome: 'Toca do Lobo', canal_url: 'https://www.youtube.com/@exemplo', foto_url: '', ordem: 8 },
    { id: 'cl-10', nome: 'Canal do Rafa', canal_url: 'https://www.youtube.com/@exemplo', foto_url: '', ordem: 9 },
    { id: 'cl-11', nome: 'Dois Botões', canal_url: 'https://www.youtube.com/@exemplo', foto_url: '', ordem: 10 },
    { id: 'cl-12', nome: 'Respawn BR', canal_url: 'https://www.youtube.com/@exemplo', foto_url: '', ordem: 11 },
    { id: 'cl-13', nome: 'Café com Bug', canal_url: 'https://www.youtube.com/@exemplo', foto_url: '', ordem: 12 },
    { id: 'cl-14', nome: 'Modo Turbo', canal_url: 'https://www.youtube.com/@exemplo', foto_url: '', ordem: 13 },
    { id: 'cl-15', nome: 'Sala 404', canal_url: 'https://www.youtube.com/@exemplo', foto_url: '', ordem: 14 },
    { id: 'cl-16', nome: 'Zona Morta', canal_url: 'https://www.youtube.com/@exemplo', foto_url: '', ordem: 15 },
  ],
};
