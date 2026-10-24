# Relatório de testes

Data: 23/10/2026 · Site rodando localmente em modo local (sem Supabase), Chromium.

## Resumo
| Verificação | Resultado |
|---|---|
| Playwright: computador 1440 e celular 390 | **72 passaram**, 2 pulados de propósito (teclado e mouse não existem no celular), 0 falhas |
| Banco: SQL, segurança RLS e funções (PGlite) | **12 de 12** passaram |
| Comentários no código (37 arquivos) | **nenhum** |
| Acessibilidade (axe, WCAG 2.2 AA): site em PT e EN, clientes, Long Form, player, orçamento, menu do celular, 404 e painel | **0 violações** |
| Lighthouse celular, site | Desempenho **95** · Acessibilidade **100** · Boas práticas **100** · SEO **100** |
| Celulares (iPhone 14, Pixel 7, Android 360 px) | intro aparece e some, menu, abas, filtro, player, sem rolagem lateral, sem erros |
| Frase da abertura (320 a 412 px) | cabe em 1 linha |
| Erros no console | nenhum do site. Só o YouTube, que a rede deste ambiente bloqueia |

## O que a suíte cobre (`npm test`)
Site: carrega sem erros nem 4xx/5xx e sem rolagem lateral · intro aparece uma vez por sessão e some sozinha · intro pula com tecla · PT/EN troca tudo e lembra a escolha · abas e sub-filtros do Long Form · setas do teclado nas abas · player abre com `youtube-nocookie.com` e fecha com ESC · player fecha clicando fora e abre Shorts em 9:16 · player passa para o próximo e volta (botão e seta do teclado) · Discord copia o nick e mostra "NICK COPIADO!" · **pedir orçamento** avisa quando falta nome ou tipo, monta a mensagem certa para o Discord e fecha com ESC · clientes mostram 6 no cartaz e o resto em "ver todos" · botão de pausar animações para tudo e lembra a escolha · links que abrem em nova aba avisam · links perigosos (`javascript:`, `data:`) são descartados · aranha foge e volta · destaques tocam sozinhos, sem som e sem botão de play · prévias tocam só quando aparecem e pausam ao abrir o player · vídeo sem clipe mostra a capa · sobre mim com foto e texto · menu leva às âncoras · carimbo vem dos dados · mira do cursor só com mouse e trava em botões · movimento reduzido: sem intro, sem mira e sem animações.

Admin: `noindex` · senha errada mostra "credenciais incorretas!" · login → adicionar vídeo → aparece no site → reordenar pelo teclado com busca ligada → excluir com confirmação · link que não é do YouTube é recusado · vídeo com clipe e destaque aparece tocando na abertura · foto do sobre mim por link · Shorts deixa a prévia 9:16 · comissões ON/OFF · textos atualizam o site · categorias e filtros · cliente novo · depoimento novo aparece no site e pode ser excluído · sair volta ao login.

Banco (`npm run test:db`): esquema roda duas vezes sem erro e sem apagar dados · visitante só lê · quem está logado mas não é admin não altera nada · admin cria, reordena, destaca e exclui · links de clipe e foto só `https://` · redes e e-mail não aceitam link perigoso · depoimentos: visitante lê, só admin escreve · `reordenar` recusa tabela fora da lista · excluir categoria leva os vídeos junto.

## Conferência visual
Capturas em `docs/prints/`. Computador: `desktop-1-abertura` … `desktop-9-404`. Celular: `celular-1-abertura` … `celular-4-menu`. Admin: `admin-1-login-erro`, `admin-2-painel`, `admin-3-novo-video`.

Problema achado nesta rodada e já corrigido: a janela de orçamento, depois de fechada, continuava desenhada atrás da página (a regra da `.janela` vencia o `display: none` do `<dialog>` fechado). O teste novo pegou o erro.

## Não testado aqui (e por quê)
- **Firefox e Safari/iPhone de verdade:** esta máquina só tem o Chromium (os celulares foram simulados nele). Rodar com `TODOS_NAVEGADORES=1 npm test` depois de `npx playwright install`.
- **Vídeo tocando de verdade e miniaturas reais:** a rede bloqueia o YouTube. O teste confere o endereço do iframe.
- **Enviar por e-mail:** abre o programa de e-mail da pessoa, o que não dá para testar sozinho. O teste confere a mensagem pelo botão do Discord, que usa o mesmo texto.
- **Supabase de verdade e o site publicado:** aguardam o projeto Supabase e a Vercel. As regras de segurança foram testadas no PGlite, com os papéis `anon` e `authenticated` simulados.
