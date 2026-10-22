const EX = 'assets/exemplos/';

const previa = (nome) => ({ preview_url: `${EX}${nome}.webm`, poster_url: `${EX}${nome}.jpg` });
const semPrevia = { preview_url: '', poster_url: '' };

export const MOCK = {
  settings: {
    id: 1,
    nome: 'DAVI',
    email: 'contato@exemplo.com',
    foto_url: 'assets/foto-davi.jpg',
    sobre_pt: 'Edito desde 2019. Comecei cortando gameplay pros amigos e hoje faço motion, shorts e vídeos longos pra canais de games, tecnologia e humor. Gosto de ritmo, som no lugar certo e de segurar o público até o último segundo.',
    sobre_en: "I've been editing since 2019. I started cutting gameplay for friends and now I make motion, shorts and long form for gaming, tech and comedy channels. I care about pacing, sound in the right place and holding the audience to the last second.",
    redes: {
      instagram: 'https://www.instagram.com/exemplo',
      x: 'https://x.com/exemplo',
      youtube: 'https://www.youtube.com/@exemplo',
    },
    discord_nick: 'davi.edits',
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
  clients: [
    { id: 'cl-1', nome: 'Pixel Torto', canal_url: 'https://www.youtube.com/@exemplo', foto_url: '', ordem: 0 },
    { id: 'cl-2', nome: 'Fala Mano', canal_url: 'https://www.youtube.com/@exemplo', foto_url: '', ordem: 1 },
    { id: 'cl-3', nome: 'Rota 77', canal_url: 'https://www.youtube.com/@exemplo', foto_url: '', ordem: 2 },
    { id: 'cl-4', nome: 'Lua de Lata', canal_url: 'https://www.youtube.com/@exemplo', foto_url: '', ordem: 3 },
    { id: 'cl-5', nome: 'Clã Vermelho', canal_url: 'https://www.youtube.com/@exemplo', foto_url: '', ordem: 4 },
    { id: 'cl-6', nome: 'Bit a Bit', canal_url: 'https://www.youtube.com/@exemplo', foto_url: '', ordem: 5 },
  ],
};
