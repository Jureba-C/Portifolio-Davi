# Notas de design — cartaz Decxz

Referências do briefing: Persona 5 (cartaz vermelho, cortes diagonais, letras recortadas), Deadlock (preto pesado, sujeira de impressão), fonte Goblin e o 3proutspace (janelas anos 2000). Guia visual ao vivo: `styleguide.html`.

**Regra que guia tudo:** um ponto de destaque por seção; o resto fica quieto.

## Tokens (`css/base.css`)
| Token | Cor | Uso |
|---|---|---|
| `--vermelho` | #E3162B | cartaz (abertura, clientes), botões, aba ativa, sombra das janelas |
| `--vermelho-vivo` | #FF2A3D | brilho pontual (hover, REC, mira travada) |
| `--vermelho-escuro` | #8A0E1A | segunda sombra dos títulos, avisos sobre fundo claro |
| `--preto` / `--preto-2` / `--preto-3` | #0B0B0C / #151517 / #222225 | fundo, faixas, cards |
| `--branco` / `--branco-puro` | #F4F1EC / #FFFFFF | texto sobre preto, corpo das janelas |
| `--cinza` / `--cinza-claro` | #A3A09A / #D9D5CE | legendas |

Contraste: todo texto fica acima de 4,5:1 (axe sem violações no site e no painel).

## Fontes
| Fonte | Uso |
|---|---|
| New Rocker 400 | nome DECXZ, títulos de seção, intro, 404 |
| Space Mono 700 | barras das janelas (`>> contato.exe`), HUD da intro, etiquetas |
| Barlow Condensed 600/800 | menu, botões, rótulos, abas |
| Barlow 500/700 | texto corrido |

## Componentes
- **Janela anos 2000** (`.janela`): borda preta, barra em Space Mono com três quadradinhos e corpo branco. Usada no Sobre mim, na frase da abertura, no Contato, nos filtros do Long Form, em "Como eu trabalho" e na janela de orçamento.
- **Sombra torta** (`.caixa-sombra`): bloco vermelho inclinado atrás da foto e do texto do Sobre mim.
- **Botão de corte** (`.botao`): paralelogramo com miolo deslocado; o vermelho acende no hover.
- **Quadro de vídeo** (`.quadro`): moldura com sombra deslocada, REC piscando e rótulo; o clipe de prévia toca dentro.
- **Letras recortadas** (`.recorte`): só nos nomes dos clientes ("procurados").
- **Aranha:** símbolo `assets/desenhos.svg#aranha` com partes separadas (pernas, palpos, cabeça, abdômen, olhos). O site coloca o desenho dentro da página para animar cada parte. O fio sai de dentro do próprio desenho (`.fio-ponta`), então sempre encosta na cabeça.
- **Outros símbolos:** teia, teia-traje, estrela, faísca, play, alça, lápis, X.
- **Mira** (`.mira`): quatro cantoneiras de visor de câmera.

## Animações
| O quê | Como |
|---|---|
| Intro | claquete com timecode a 24 fps, REC e `decxz_edit.prproj`; aranha desce, letras do nome entram uma a uma, a agulha da linha do tempo corre, palavras CORTA/COLA/ACELERA batem, a tela se corta e quebra em três cacos (2,2 s). Uma vez por sessão; pula com clique ou tecla |
| Nome DECXZ | cada letra balança devagar (`onda`, 4,2 s) e pula com mola no hover, inclinando as vizinhas |
| Aranhas | balançam no fio (`balanca` + `contrapeso`), sobem e descem (`ioio`), mexem as patas (`pata`) e respiram (`respira`). Clique: susto, encolhe as patas e foge. No rodapé, acena |
| Entrada ao rolar | `animation-timeline: view()`, com fallback `IntersectionObserver` |
| Troca de abas | duas faixas diagonais varrem a tela com o nome da categoria (`varre`) |
| Player | troca de vídeo com corte (`troca-video`); anterior/próximo pelas setas |
| Mira | aparece só sobre botões, links e cards: sai da ponta da seta e abraça o elemento; pisca ao clicar e volta para a seta ao sair |
| Orçamento | a janela entra com mola (`orc-entra`) |

**Movimento reduzido** (sistema ou botão de pausa no cabeçalho): sem intro, sem mira, sem varredura de abas e sem animações contínuas. Os clipes de prévia pausam. O site fica completo parado.
**Celular:** sem mira, aranhas menores, títulos e nome em tamanho de tela, sem rolagem lateral.
