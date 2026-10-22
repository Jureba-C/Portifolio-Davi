# Relatório de testes

Data: 22/10/2026 · Site rodando localmente em modo local (sem Supabase), Chromium.

## Resumo
| Verificação | Resultado |
|---|---|
| Playwright: computador 1440 e celular 390 | **47 passaram**, 3 pulados de propósito (teclado e mouse não existem no celular), 0 falhas |
| Banco: SQL, segurança RLS e funções (PGlite) | **8 de 8** passaram |
| Comentários no código (32 arquivos) | **nenhum** |
| Lighthouse celular, site | Desempenho **99** · Acessibilidade **97** · Boas práticas **96** · SEO **100** |
| Lighthouse celular, admin | Desempenho **99** · Acessibilidade **100** · Boas práticas **100** · SEO 54 (de propósito: `noindex`) |
| Rolagem lateral no celular | não rola (testado tentando rolar de verdade) |
| Erros no console | nenhum do site. Só as miniaturas do YouTube, que a rede deste ambiente bloqueia |

### O que o Lighthouse ainda aponta
- **Contraste dos nomes dos clientes:** ele mede no meio da animação de entrada, com o texto ainda semitransparente. Parado, o nome é creme (#F5E6C4) sobre #0A0909, com contraste acima de 15:1.
- **Erros no console e "boas práticas" 96:** são as miniaturas `i.ytimg.com` bloqueadas pela rede de testes. Num navegador comum, elas carregam.

## O que a suíte cobre (`npm test`)
Site: carrega sem erros nem 4xx/5xx · intro aparece uma vez por sessão e some sozinha · intro pula com tecla · PT/EN troca tudo e lembra a escolha · abas e sub-filtros (Vlog mostra 1 vídeo, "todos" volta para 4) · setas do teclado nas abas · player abre com `youtube-nocookie.com`, fecha com ESC e remove o iframe · player fecha clicando fora e abre Shorts em 9:16 · Discord copia `davi.edits` e mostra "NICK COPIADO!" · aranha foge ("ei!!") e volta · olho segue o mouse para os dois lados · menu leva às âncoras (no celular pelo botão de menu) · carimbo vem dos dados · cursor de tinta só com mouse · movimento reduzido: sem intro, sem cursor, sem animações e sem `#boil`.

Admin: `noindex` · senha errada mostra "credenciais incorretas!" · login → adicionar vídeo Long Form/Vlog → aparece no site em outra aba → reordenar pelo teclado com busca ligada → ordem muda no site → excluir com confirmação → some do site · link que não é do YouTube é recusado · link de Shorts deixa a prévia 9:16 · desligar comissões muda o carimbo do site para OFF · salvar "sobre mim" muda o site · criar e excluir categoria, criar filtro · cliente novo · sair volta ao login.

## Conferência visual (lado a lado com `design/`)
Capturas em `docs/prints/`. Computador: `desktop-0-intro` … `desktop-6-player`. Celular 390: `celular-1-hero` … `celular-4-menu`. Admin: `admin-1-login-erro`, `admin-2-painel`, `admin-3-novo-video`.

Problemas achados na conferência e já corrigidos:
1. O rabisco vermelho atrás do play ficava menor e fora do centro: `svg { max-width: 100% }` encolhia o desenho. A moldura do showreel tinha o mesmo problema.
2. Miniatura quebrada aparecia mesmo marcada como escondida: `img { display: block }` vencia o `hidden`.
3. Celular: botão de menu à esquerda, frase longa quebrando, abas em duas linhas, aspas sobre o texto e 5º ícone de contato numa linha sozinho.
4. Abaixo de 900 px o cabeçalho perdia o menu e o CONTRATAR. Agora ele fica numa linha só, como no design, até 761 px (letras e espaços diminuem um pouco). O botão de menu aparece só no celular, abaixo de 760 px.
5. Player de Shorts cortado no topo em telas baixas.
6. Admin mostrava "null" na lista de trabalhos.
7. Leitores de tela: o nome acessível dos links de cliente e da moldura do showreel não incluía o texto visível.

## Não testado aqui (e por quê)
- **Firefox e Safari/iPhone:** esta máquina só tem o Chromium. Rodar com `TODOS_NAVEGADORES=1 npm test` depois de `npx playwright install`.
- **Vídeo tocando de verdade e miniaturas reais:** a rede bloqueia o YouTube. O teste confere o endereço do iframe.
- **Supabase de verdade e o site publicado:** aguardam o projeto Supabase e o login na Vercel (Fases 2 e 4). As regras de segurança foram testadas no PGlite, com os papéis `anon` e `authenticated` simulados.
- **Site de inspiração:** bloqueado pela rede deste ambiente.
