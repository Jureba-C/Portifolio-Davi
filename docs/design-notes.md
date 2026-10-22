# Notas de design — "papel e tinta"

Fonte da verdade: `design/*.dc.html` e `design/paper.css`. Os SVGs e paths foram copiados exatamente. A marcação da ferramenta de design (`<x-dc>`, `<sc-for>`, `{{…}}`) foi reescrita em HTML, CSS e JS puros.

## Tokens (`css/base.css`)
| Token | Cor | Uso |
|---|---|---|
| `--fundo` | #0A0909 | fundo, com riscos de `feTurbulence` (`.textura`, fixa) |
| `--papel` | #F2E3C1 | cabeçalho, bilhete, moldura, abas inativas |
| `--creme` | #F5E6C4 | texto sobre o fundo escuro |
| `--tinta` | #141112 | texto no papel, contorno dos botões |
| `--roxo` / `--roxo-hover` | #7C33CF / #9147E8 | botões, aba ativa, sombra dos avatares, risco |
| `--coral` | #E8505B | título TRABALHOS, rabisco do play, sublinhados |
| `--cinza-papel` / `--cinza-papel-2` | #BFB39A / #9C917C | legendas e filtros inativos |
| `--verde` | #3DDC84 | carimbo COMMISSIONS: ON |

Contraste: todo texto fica acima de 4,5:1. No cabeçalho, o idioma inativo usa `--marrom` (#5C5246), porque o #8E826C do mockup ficava em 3:1 sobre o papel.

## Fontes
Londrina Solid 900 (títulos e botões) · Kalam 400/700 (texto, menu, interface) · Permanent Marker (carimbo e toast) · Covered By Your Grace (anotações). Todas hospedadas no próprio site.

## Componentes
- **Papel rasgado:** `.torn`, `.torn2` (grandes), `.scrap`, `.scrap2` (cards), `.rough`, `.rough2` (botões e campos). Polígonos de `clip-path` do `paper.css`.
- **Botão de pincel:** `.ink-btn.rough2` preto com `.ink-fill.rough` roxo dentro, levemente girado. O roxo clareia no hover.
- **Card com fita:** `.card` + `.fita.tape` + `.scrap.thumb`. As inclinações alternam entre `tilt-l`, `tilt-r` e `tilt-0`.
- **Aranha:** símbolo único `assets/desenhos.svg#aranha`, pintado por variáveis CSS (`--perna`, `--corpo`, `--marca`, `--olhos`, `--traco`), o que dá as seis variações do design com um desenho só.
- **Teia, estrela, play, alça, lápis, X:** também símbolos em `desenhos.svg`.
- **Filtros SVG:** `#rough` (borda irregular parada), `#boil` (o `seed` troca a cada 0,12 s), `#streaks` e `#grain` (textura do fundo).

## Animações (seção 3 do prompt)
| # | O quê | Como |
|---|---|---|
| 1 | Intro: aranha cai, nome se desenha, tela rasga | `boot.js` liga `.intro-on`; `stroke-dashoffset` no `<text>`, metades `.torn` saem com `tearUp` e `tearDown`; uma vez por sessão (`sessionStorage`); pula com clique ou tecla |
| 2 | Cabeçalho de papel fixo, links tremendo, PT/EN no oval, CONTRATAR | `position: sticky`, `.shake-hover`, SVG do oval com `non-scaling-stroke` |
| 3 | Nome com letras pulando, estrelas piscando, moldura, REC, aranha na moldura | `.letter` com atraso de 0,12 s por letra; `.twinkle`; `.rec` em `steps(2)`; `.walker` com `offset-path` recalculado por `ResizeObserver` |
| 4 | Aranha pendurada que foge ("ei!!") | `.swing` + troca `.flee-down` / `.flee-up`; volta em 2,6 s com mola |
| 5 | Risco roxo com pingos e aranha atravessando | path serrilhado, pingos com `scaleY`, `.crawl` (26 s) |
| 6 | Faixas em X | `.strip-l` e `.strip-r` (`translateX(-50%)`), palavras repetidas 4 vezes para emendar sem buraco; estrelas `.spin` |
| 7 | Clientes flutuando | `.float` com atraso de 0,45 s por cliente; avatar gira no hover |
| 8 | Abas, sub-filtros, cards pulando | `.pop` com atraso de 0,08 s por card; no hover a fita descola, o play gira, o rabisco `.scrib` se desenha e a thumb ganha `#boil` |
| 9 | Olho que segue o mouse e pisca | `pointermove` em `requestAnimationFrame` move `.pupil`; `.blink` a cada 5 s; bilhetes `.reveal-l` e `.reveal-r` |
| 10 | CONTATO tremendo, carimbo, ícones, toast | letras `.shake-hover`; `.stamp-in` (escala 2,6 → 1); toast de papel `.rough` |
| 11 | Aranha do rodapé ("tchau!") | `footer:hover`; no toque, `.tocado` |
| 12 | Cursor de tinta | 4 pingos + anel com `mix-blend-mode: difference`, só `transform` em `requestAnimationFrame`; para quando o mouse para |
| 13 | Entrada ao rolar | `animation-timeline: view()` com fallback `IntersectionObserver` (`.io` + `.visto`) |
| 14 | Player | modal com teia e aranha, iframe `youtube-nocookie` criado só ao abrir, barra roxa por `stroke-dashoffset`, ESC, clique fora, prende o foco, 9:16 para Shorts |

**Movimento reduzido:** desliga intro, cursor, `#boil` e todas as animações e transições. O site fica completo parado.
**Celular:** sem cursor, `#boil` vira `#rough`, menos aranhas.
