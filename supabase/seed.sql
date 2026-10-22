begin;

insert into public.categories (id, nome_pt, nome_en, slug, ordem, formato) values
  ('7c3dbebd-3c0f-574a-990b-76e89d58da64', 'Motion', 'Motion', 'motion', 0, 'horizontal'),
  ('3495256f-4a8f-55f5-bce1-2f21174b44a0', 'Vertical', 'Vertical', 'vertical', 1, 'vertical'),
  ('37a4feca-48a4-5a94-a44e-1f121f639ef4', 'Long Form', 'Long Form', 'long-form', 2, 'horizontal')
on conflict (id) do nothing;

insert into public.longform_filters (id, nome_pt, nome_en, ordem) values
  ('18e97558-0405-5283-8bec-a3b78d4d3045', 'Gameplay', 'Gameplay', 0),
  ('b0ef217d-5e43-5331-b896-dc3d1b77aabb', 'Documentário', 'Documentary', 1),
  ('568028ab-be05-5ea2-93ec-90ba1e59b0d4', 'Vlog', 'Vlog', 2)
on conflict (id) do nothing;

insert into public.videos (id, titulo, descricao_pt, descricao_en, youtube_id, category_id, filter_id, destaque, ordem) values
  ('fbfcaf4b-6d2f-57c2-a6ae-be4736c61065', 'Showreel 2026', 'motion, cor e sound design', 'motion, color and sound design', 'aqz-KE-bpKQ', '7c3dbebd-3c0f-574a-990b-76e89d58da64', null, true, 0),
  ('915bc005-7ba2-589e-acbe-d2fbba5aae7e', 'Abertura do canal Pixel Torto', 'Pixel Torto · animação de logo', 'Pixel Torto · logo animation', 'eRsGyueVLvQ', '7c3dbebd-3c0f-574a-990b-76e89d58da64', null, true, 1),
  ('50d10942-3d9d-55ba-9a83-6240c2244a11', 'Lyric video — Rota 77', 'Rota 77 · tipografia animada', 'Rota 77 · kinetic type', 'R6MlUcmOul8', '7c3dbebd-3c0f-574a-990b-76e89d58da64', null, false, 2),
  ('badb5aa9-4c4a-56b8-a943-080e7dcf5610', 'Vinheta de live', 'Clã Vermelho · pacote de overlays', 'Clã Vermelho · overlay pack', 'WhWc3b3KhnY', '7c3dbebd-3c0f-574a-990b-76e89d58da64', null, false, 3),
  ('cc437e86-f08a-5429-9cb8-031ad6a34e2d', 'O bug mais engraçado do ano', 'Fala Mano', 'Fala Mano', 'Y-rmzh0PI3c', '3495256f-4a8f-55f5-bce1-2f21174b44a0', null, true, 4),
  ('dd426a00-38f0-5f7f-8940-9fa90761de11', '3 atalhos que salvam sua edição', 'Bit a Bit', 'Bit a Bit', 'mN0zPOpADL4', '3495256f-4a8f-55f5-bce1-2f21174b44a0', null, false, 5),
  ('ce949f77-cb5b-571c-8efe-8b26ac9efea8', 'Clutch no último segundo', 'Clã Vermelho', 'Clã Vermelho', 'PVGeM40dABA', '3495256f-4a8f-55f5-bce1-2f21174b44a0', null, false, 6),
  ('0b1112b7-48be-5a28-9bbc-255fb6728686', 'Reagindo ao pior setup', 'Lua de Lata', 'Lua de Lata', '_cMxraX_5RE', '3495256f-4a8f-55f5-bce1-2f21174b44a0', null, false, 7),
  ('72b83d71-e5e3-5634-ba3a-657cccd0c685', 'Zerei o jogo sem tomar dano', 'Clã Vermelho · 42 min', 'Clã Vermelho · 42 min', 'SkVqJ1SGeL0', '37a4feca-48a4-5a94-a44e-1f121f639ef4', '18e97558-0405-5283-8bec-a3b78d4d3045', true, 8),
  ('60a46ab6-9d99-5c2b-97a0-6f4c263bcd54', 'A história da lan house', 'Bit a Bit · roteiro e edição', 'Bit a Bit · script and edit', 'pKmSdY56VtY', '37a4feca-48a4-5a94-a44e-1f121f639ef4', 'b0ef217d-5e43-5331-b896-dc3d1b77aabb', false, 9),
  ('547703dd-5183-505f-9d98-6e0186b40af9', 'Um dia na Paulista', 'Lua de Lata', 'Lua de Lata', 'aqz-KE-bpKQ', '37a4feca-48a4-5a94-a44e-1f121f639ef4', '568028ab-be05-5ea2-93ec-90ba1e59b0d4', false, 10),
  ('c2e5cd9a-27c2-5950-85a3-f48566b3e483', 'Speedrun comentado', 'Pixel Torto · com Rota 77', 'Pixel Torto · with Rota 77', 'eRsGyueVLvQ', '37a4feca-48a4-5a94-a44e-1f121f639ef4', '18e97558-0405-5283-8bec-a3b78d4d3045', false, 11)
on conflict (id) do nothing;

insert into public.clients (id, nome, canal_url, foto_url, ordem) values
  ('5640472c-3f0c-58b9-bd72-d894dababe52', 'Pixel Torto', 'https://www.youtube.com/@exemplo', '', 0),
  ('4404f964-d878-570b-a7ad-1d3bb3c10525', 'Fala Mano', 'https://www.youtube.com/@exemplo', '', 1),
  ('cc6c4236-790c-51c9-8dfa-f2725884046b', 'Rota 77', 'https://www.youtube.com/@exemplo', '', 2),
  ('afa3f9d3-e2d8-505e-9486-87f30ee88b24', 'Lua de Lata', 'https://www.youtube.com/@exemplo', '', 3),
  ('2f202edf-6c6e-5e4e-bae1-87966f93e535', 'Clã Vermelho', 'https://www.youtube.com/@exemplo', '', 4),
  ('570060c7-a65c-5498-9c6c-cbfb099bccac', 'Bit a Bit', 'https://www.youtube.com/@exemplo', '', 5)
on conflict (id) do nothing;

insert into public.settings (id, nome, email, sobre_pt, sobre_en, redes, discord_nick, comissoes_abertas) values
  (1, 'DECXZ', 'contato@exemplo.com', 'Edito desde 2019. Comecei cortando gameplay pros amigos e hoje faço motion, shorts e vídeos longos pra canais de games, tecnologia e humor. Gosto de ritmo, som no lugar certo e de segurar o público até o último segundo.', 'I''ve been editing since 2019. I started cutting gameplay for friends and now I make motion, shorts and long form for gaming, tech and comedy channels. I care about pacing, sound in the right place and holding the audience to the last second.', '{"instagram":"https://www.instagram.com/exemplo","x":"https://x.com/exemplo","youtube":"https://www.youtube.com/@exemplo"}'::jsonb, 'decxz.editor', true)
on conflict (id) do update set nome = excluded.nome, email = excluded.email, sobre_pt = excluded.sobre_pt, sobre_en = excluded.sobre_en, redes = excluded.redes, discord_nick = excluded.discord_nick, comissoes_abertas = excluded.comissoes_abertas;

commit;
