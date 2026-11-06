# Relatório de testes

Data: 06/11/2026 · Chromium · código-fonte (`npm test`), build de produção (`PW_DIST=1 npm test`) e site publicado na Vercel.

## Resumo
| Verificação | Resultado |
|---|---|
| Playwright no código-fonte: computador 1440 e celular 390 (site, painel e leitura do Supabase) | **142 passaram**, 6 pulados de propósito (mouse ou toque que não existem naquele aparelho), 0 falhas |
| Playwright no build de produção (`PW_DIST=1`, `dist` servido com os cabeçalhos e a CSP do `vercel.json`) | **142 passaram**, 6 pulados, 0 falhas. Pegou e corrigiu um erro: o CSS empacotado não achava as fontes |
| Banco: SQL, segurança RLS e funções (PGlite) | **13 de 13** passaram |
| Build da Vercel (`npm run test:build`) | **8 de 8**: chaves entram no pacote; nomes com hash existem; todo `url()` do CSS aponta para arquivo que existe; o cliente do Supabase não entra no pacote do site; internos de fora; para sem chaves; recusa `service_role` e `sb_secret_` |
| Comentários no código (43 arquivos) | **nenhum** |
| Acessibilidade (axe, WCAG 2.2 AA): site e cada tela do painel | **0 violações** |
| Lighthouse do build de produção | Celular: Desempenho **96** · Acessibilidade **100** · Boas práticas **100** · SEO **100** (LCP 2,7 s, TBT 40 ms, CLS 0). Computador: **100 · 100 · 100 · 100** (LCP 0,6 s) |
| Celulares (iPhone 14, Pixel 7, Android 360 px) | intro, menu, abas, filtro, player, sem rolagem lateral, sem erros |
| Site publicado (`portifolio-davi-ashen.vercel.app`), só leitura | carrega os dados reais do banco (4 categorias, 2 destaques, 1 cliente, e-mail e YouTube do Decxz), sem rolagem lateral, `/admin` com login de verdade (sem modo demonstração), 404 própria, nenhum erro do site |
| Build novo contra o banco real (servido localmente) | mesmo conteúdo do site publicado, sem baixar o cliente do Supabase |
| Supabase real (só leitura) | visitante **não** lê a lista de admins (401) · cadastro de contas novas **desligado** · colunas de "Textos da página" já existem |

## Otimização (antes → depois)
Medido no build de produção servido com Brotli. Dados do banco simulados iguais nos dois. Celular com CPU 4× mais lenta.

| Medida | Antes | Depois |
|---|---|---|
| JavaScript baixado na página | 63 KB (27 KB só do cliente do Supabase) | **21 KB** (o cliente do Supabase só vai para o painel) |
| CSS baixado | 17 KB em 4 arquivos | **12 KB** em 1 arquivo |
| Pedidos ao abrir | 47 | **32** |
| Cards na tela (computador, 10 Mb/s) | 0,73 s | **0,37 s** |
| Maior conteúdo visível, celular em internet lenta (1,6 Mb/s) | 3,4 s | **2,1 s** |
| Maior conteúdo visível, computador em internet lenta | 1,0 s | **0,7 s** |
| Segunda visita | baixa JS e CSS de novo, espera o banco | JS e CSS em cache por 1 ano (nome muda a cada versão); mostra o que estava guardado na hora e atualiza se o banco mudou |

## O que a suíte cobre (`npm test`)
Site: carrega sem erros nem 4xx/5xx e sem rolagem lateral · intro aparece uma vez por sessão e some sozinha · intro pula com tecla · PT/EN troca tudo e lembra a escolha · abas e sub-filtros do Long Form · setas do teclado nas abas · player abre com `youtube-nocookie.com` e fecha com ESC · player fecha clicando fora e abre Shorts em 9:16 · player passa para o próximo e volta (botão e seta do teclado) · Discord copia o nick e mostra "NICK COPIADO!" · **pedir orçamento** avisa quando falta nome ou tipo, monta a mensagem certa para o Discord e fecha com ESC · clientes mostram 6 no cartaz e o resto em "ver todos" · botão de pausar animações para tudo e lembra a escolha · links que abrem em nova aba avisam · links perigosos (`javascript:`, `data:`) são descartados · aranha foge e volta · destaques tocam sozinhos, sem som e sem botão de play · prévias tocam só quando aparecem e pausam ao abrir o player · vídeo sem clipe mostra a capa · sobre mim com foto e texto · menu leva às âncoras · carimbo vem dos dados · mira do cursor só com mouse e trava em botões · com "reduzir animações" ligado no sistema, o site continua animado (intro, letras, vídeos) · botão de pausar: sem intro, sem mira e sem animações, e a pausa vale só para a visita · navegador sem animação ligada à rolagem (Safari antigo, Firefox): os blocos aparecem pelo plano B · depoimento sem inglês aparece em português no site em inglês · endereço que não existe mostra a 404 própria e volta ao início · banco recém-criado mostra a foto e o texto do Decxz · contato sem redes esconde a legenda e o orçamento · prévias e player do YouTube em HD (capa maxres, player de 1080 pixels, aquecimento até a qualidade alvo, prévia no mouse e no card do meio no celular).

Leitura do Supabase (`tests/nuvem.spec.js`, com um Supabase de mentira): dados do banco aparecem e vêm só pela API REST, sem baixar o cliente · chave antiga (`eyJ…`) vai com `Authorization`, a nova (`sb_publishable_…`) só no `apikey` · quem volta vê o que estava guardado e o site se atualiza se o banco mudou · banco fora do ar mostra o guardado com aviso · banco fora do ar na primeira visita não mostra vídeos de exemplo · o painel publicado mostra o login sem modo demonstração.

Painel: `noindex` · senha errada mostra "credenciais incorretas!" · mostrar senha · gaveta de novo vídeo → aparece no site → reordenar pelo teclado com busca ligada → excluir com confirmação · editar vídeo pela gaveta · fechar a gaveta com mudanças pede confirmação · filtro por categoria · estrela coloca e tira dos destaques · link que não é do YouTube é recusado · clipe e destaque aparecem tocando na abertura · Shorts deixa a prévia 9:16 · foto do sobre mim por link · comissões ON/OFF · salvar textos (barra de não salvo aparece e some) · sair de Textos com mudanças avisa e descartar volta ao salvo · ver como fica mostra o negrito · textos da página (frase e chamada) mudam o site em PT e EN · endereço com # abre a tela certa e o voltar funciona · categorias e filtros · cliente novo (etiqueta em ver todos) · cliente com foto enviada do computador aparece no site, é renomeado e excluído · redes, e-mail e Discord aparecem no contato do site · foto do sobre mim enviada do computador · depoimento criado, editado e excluído · sair volta ao login.

Banco (`npm run test:db`): esquema roda duas vezes sem erro e sem apagar dados · visitante só lê · quem está logado mas não é admin não altera nada · admin cria, reordena, destaca e exclui · links de clipe e foto só `https://` · redes e e-mail não aceitam link perigoso · depoimentos: visitante lê, só admin escreve · `reordenar` recusa tabela fora da lista · excluir categoria leva os vídeos junto.

## Conferência visual
Capturas em `docs/prints/`. Computador: `desktop-1-abertura` … `desktop-8-404`. Celular: `celular-1-abertura` … `celular-4-menu`. Painel: `admin-1-login-erro`, `admin-2-painel`, `admin-3-novo-video`, `admin-4-textos`.

Problema achado nesta rodada e já corrigido: a janela de orçamento, depois de fechada, continuava desenhada atrás da página (a regra da `.janela` vencia o `display: none` do `<dialog>` fechado). O teste novo pegou o erro.

## Não testado aqui (e por quê)
- **Firefox e Safari de verdade:** esta máquina só tem o Chromium, e a rede daqui bloqueia o download dos outros navegadores de teste. O plano B que esses navegadores usam para as animações de rolagem foi testado simulando a falta do recurso no Chromium. Rodar com `TODOS_NAVEGADORES=1 npm test` depois de `npx playwright install`.
- **Vídeo tocando de verdade e miniaturas reais:** a rede bloqueia o YouTube. O teste confere o endereço do iframe.
- **Enviar por e-mail:** abre o programa de e-mail da pessoa, o que não dá para testar sozinho. O teste confere a mensagem pelo botão do Discord, que usa o mesmo texto.
- **Entrar no painel de verdade e gravar no banco publicado:** não peço senha, e a permissão desta sessão bloqueou até uma tentativa de gravação inofensiva no banco de produção. A gravação foi testada no modo local e as regras de segurança no PGlite, com os papéis `anon` e `authenticated` simulados.
