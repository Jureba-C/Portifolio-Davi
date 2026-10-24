# Decisões

Decisões tomadas durante a construção, com o motivo de cada uma.

## Pedidas pelo Caio
1. **Projeto separado em `editor-video/`**, sem mexer no site de fotos que já está no repositório. Uma cópia fica no repositório `Jureba-C/Portifolio-Davi`.
2. **Nome artístico Decxz Editor.** O logo e o nome grande mostram "DECXZ". Títulos e metatags usam "Decxz Editor". E-mail, redes, clientes e depoimentos ainda são exemplos e devem ser trocados pelos reais no painel.
3. **Nenhum comentário no código** (HTML, CSS, JS, SVG e SQL), nem no que aparece no "inspecionar". O `npm run check:comments` confere isso.
4. **Identidade de cartaz** (briefing do editor: Persona 5 + Deadlock): vermelho #E3162B, preto e branco. Títulos em New Rocker (a mais parecida com a Goblin entre as fontes livres), janelas anos 2000 (`.janela`) só nas caixas de texto, e um único ponto de destaque por seção.
5. **Abertura limpa:** nome, frase em janela, botão e showreel. O "papel e tinta" do primeiro protótipo saiu inteiro (`paper.css` e os mockups de `design/` foram apagados).
6. **Mira de câmera no lugar do cursor de tinta.** A seta do sistema continua visível; a mira acompanha o mouse e "trava" em botões, links e cards, abraçando o elemento. Some com movimento reduzido e não existe em tela de toque.
7. **Antes e depois** (comparar o bruto com o editado) e a seção de **números** ficaram de fora, a pedido.

## Técnicas
8. **Fontes hospedadas no próprio site** (`assets/fonts`, só latim e latim estendido) em vez do Google Fonts. Carrega mais rápido e não depende de terceiros. Licença OFL.
9. **supabase-js e SortableJS empacotados em `js/vendor/`** em vez de CDN. O site continua funcionando se um CDN cair, e o supabase-js só carrega quando o banco está configurado. `npm run vendor` refaz os arquivos (versões fixas: 2.49.4 e 1.15.6).
10. **Modo local.** Sem `js/config.js` preenchido, o site usa `mock-data.js` e o painel aceita `demo@local / demo1234`, gravando no `localStorage` do próprio navegador. Não é uma senha de verdade; serve para testar e demonstrar. Com o Supabase ligado, o modo local desliga sozinho.
11. **Fallback do banco.** Se o Supabase não responder em 8 s, o site mostra a última versão salva no navegador (ou os exemplos).
12. **Vídeos de exemplo** usam filmes abertos da Blender Foundation (licença CC-BY), só para o player, as miniaturas e os clipes terem conteúdo.
13. **Clipes de prévia** (mp4/webm enviados pelo painel) tocam sem som, em loop, só quando aparecem na tela, e pausam quando o player abre ou a pessoa pausa as animações. Sem clipe, entra a miniatura do YouTube.
14. **Qual categoria tem sub-filtros:** a de slug `long-form`. Renomear a categoria não muda o slug.
15. **Reordenar numa chamada só:** função `reordenar(tabela, ids[])` no banco, que só aceita as tabelas reordenáveis (inclusive depoimentos) e só roda para admins.
16. **Player** sem o script `iframe_api` do YouTube: o iframe (`youtube-nocookie.com`, só criado ao abrir) recebe comandos por `postMessage`. Tem **anterior/próximo** (botões e setas do teclado) que seguem a lista de onde o vídeo foi aberto: a aba atual, os destaques ou só aquele vídeo.
17. **Troca de abas** com um corte diagonal em duas faixas e o nome da categoria (some com movimento reduzido).
18. **Depoimentos** numa tabela própria (`testimonials`), com as mesmas regras de segurança das outras.
19. **Pedido de orçamento** sem guardar nada: a janela monta a mensagem e o cliente manda por e-mail (`mailto:`) ou copia para o Discord. Assim não há formulário para spam nem dado pessoal guardado.
20. **Intro** controlada por `js/boot.js`, um script pequeno no `<head>`: claquete de edição (timecode, REC, cortes) que se quebra em cacos. Aparece uma vez por sessão, sai sozinha em cerca de 3 s e pode ser pulada com clique ou tecla. Se o script falhar, ela simplesmente não aparece.
21. **Botão de pausar animações** no cabeçalho, além do "reduzir movimento" do sistema. A escolha fica salva no navegador.
22. **Entrada ao rolar:** CSS `animation-timeline: view()`. Nos navegadores que ainda não suportam, entra o fallback com `IntersectionObserver`.
23. **Links seguros:** `urlSegura()` só aceita `http(s)`, arquivos do próprio site e `blob:`; `data:` só para imagem e vídeo enviados no modo local. O banco também recusa redes sem `https://` e e-mail inválido.
24. **Endereço do site num lugar só:** `SITE_URL` em `js/config.js`. `npm run endereco -- https://…` troca em todos os arquivos.
25. **Dados para o Google:** `Person` fixo no `index.html` e uma lista de `VideoObject` gerada com os vídeos do banco.
26. **Página 404 própria**, sem depender do resto do site (estilo e aranha dentro do próprio arquivo).
27. **Testes no Chromium** (computador 1440 e celular 390). Firefox e iPhone ficam opcionais (`TODOS_NAVEGADORES=1`), porque esta máquina só tem o Chromium.

## Pendente (depende do Caio ou do editor)
- **Dados reais:** e-mail, redes, Discord, clientes, vídeos, clipes e depoimentos.
- **Supabase:** criar o projeto e seguir o passo a passo do README.
- **Vercel e domínio:** publicar e depois rodar `npm run endereco -- https://endereco-real`.
