# Decisões

Decisões tomadas durante a construção, com o motivo de cada uma.

## Pedidas pelo Caio
1. **Projeto separado em `editor-video/`**, sem mexer no site de fotos que já está no repositório.
2. **Nome DAVI** no lugar de "[NOME]". E-mail, redes e clientes são exemplos realistas: `contato@exemplo.com`, `@exemplo`, canais fictícios.
3. **Nenhum comentário no código** (HTML, CSS, JS, SVG e SQL). O pedido do Caio vale mais que o "comentado em português" do prompt. O `npm run check:comments` confere isso.
4. **Cursor de tinta e faixas de papel rolando mantidos**, como pede o prompt (o Caio confirmou). Os dois somem com "reduzir movimento". O cursor também não existe em tela de toque.

## Técnicas
5. **Fontes hospedadas no próprio site** (`assets/fonts`, só latim e latim estendido) em vez do Google Fonts. Carrega mais rápido, não depende de terceiros e funcionou mesmo com a rede de testes bloqueando o Google. Licença OFL.
6. **supabase-js e SortableJS empacotados em `js/vendor/`** em vez de CDN. O site continua funcionando se um CDN cair, e o supabase-js só carrega quando o banco está configurado. `npm run vendor` refaz os arquivos (versões fixas: 2.49.4 e 1.15.6).
7. **Modo local.** Sem `js/config.js` preenchido, o site usa `mock-data.js` e o painel aceita `demo@local / demo1234`, gravando no `localStorage` do próprio navegador. Não é uma senha de verdade e não dá acesso a nada de ninguém; serve para testar e demonstrar. Com o Supabase ligado, o modo local desliga sozinho.
8. **Fallback do banco.** Se o Supabase não responder em 8 s, o site mostra a última versão salva no navegador (ou os exemplos) e escreve, discretamente no rodapé, "mostrando a última versão salva".
9. **Vídeos de exemplo** usam IDs de filmes abertos da Blender Foundation (Big Buck Bunny, Sintel, Tears of Steel…, licença CC-BY), só para o player e as miniaturas terem conteúdo. Trocar pelos vídeos reais do editor.
10. **Qual categoria tem sub-filtros:** a de slug `long-form`. Renomear a categoria não muda o slug.
11. **Vídeo novo entra no topo** da lista (o trabalho mais recente aparece primeiro).
12. **Showreel em destaque:** `settings.video_destaque_id`. A função `definir_destaque` marca um só vídeo de cada vez.
13. **Reordenar numa chamada só:** função `reordenar(tabela, ids[])` no banco, que só aceita as quatro tabelas reordenáveis e só roda para admins.
14. **Player** sem o script `iframe_api` do YouTube: o iframe (`youtube-nocookie.com`, só criado ao abrir) recebe comandos por `postMessage`. Os controles desenhados (play, barra roxa, som, tela cheia) substituem os do YouTube (`controls=0`). Clicar no próprio vídeo também pausa e retoma.
15. **Miniaturas:** `hqdefault.jpg` do `i.ytimg.com`. Nos Shorts, o recorte 9:16 do centro mostra exatamente o vídeo vertical. Se a miniatura não carregar, aparece "thumb a caminho".
16. **Contato:** além dos quatro quadrados do design, entrou um quinto com e-mail (o prompt pede `EMAIL_CONTATO`).
17. **Cabeçalho** numa linha só até 761 px (letras e espaços encolhem). Abaixo disso, botão de menu.
18. **Celular**, seguindo `Mobile.dc.html`: sem o nome gigante no topo (o `<h1>` continua lá para leitores de tela e Google), frase curta, sem o botão CONTRATAR no cabeçalho, sem a aranha andando na moldura e na linha roxa. No rodapé, a aranha desce com um toque ("psiu… toca aqui").
19. **Filtro `#boil` (traço fervendo)** só no computador. No celular vira `#rough`, parado.
20. **Intro** controlada por `js/boot.js`, um script pequeno no `<head>`. Se ele falhar, a intro simplesmente não aparece; o conteúdo nunca fica bloqueado. Ela aparece uma vez por sessão, sai sozinha em 3,3 s e pode ser pulada com clique ou tecla.
21. **Entrada ao rolar:** CSS `animation-timeline: view()`. Nos navegadores que ainda não suportam (como o Firefox), entra o fallback com `IntersectionObserver`.
22. **Admin:** exclusões pedem confirmação num diálogo próprio (`<dialog>`), não no `confirm()` do navegador. O menu lateral marca a seção visível.
23. **Testes no Chromium** (computador 1440 e celular 390, como pede o prompt). Firefox e iPhone ficam opcionais (`TODOS_NAVEGADORES=1`), porque esta máquina só tem o Chromium.
24. **Endereço provisório** `https://portfolio-editor.vercel.app` em canonical, Open Graph, JSON-LD, robots e sitemap. Trocar depois do primeiro deploy.

## Pendente (depende do Caio)
- **Supabase** (Fase 2): criar o projeto e passar só a Project URL, a chave anon e o e-mail do admin. Passo a passo no README.
- **Vercel** (Fase 4): `npx vercel login` na conta dele.
- **Site de inspiração** (portfolio.cultproduction.com.br): não foi possível abrir, porque a rede deste ambiente bloqueia o endereço. A estrutura (seções, categorias, sub-filtros do Long Form, toast do Discord) foi tirada do prompt e do design.
