# Decxz Editor — portfólio de editor de vídeo

Site-portfólio em cartaz vermelho, preto e branco (Persona 5 + Deadlock, janelas anos 2000, visor de câmera e aranhas), com um painel para o editor cuidar de tudo sozinho.

- Site: `index.html` · Painel: `admin.html` (abre em `/admin`) · Página de erro: `404.html`
- HTML, CSS e JavaScript puros, sem framework e sem etapa de build.
- Banco, login e arquivos: Supabase (plano grátis). Hospedagem: Vercel (plano grátis).

---

## Para o editor

### Entrar no painel
1. Abra `seusite.com/admin`.
2. Entre com o e-mail e a senha que foram criados para você.
3. Errou? Aparece "credenciais incorretas!". É só tentar de novo.

### Adicionar um vídeo
1. No menu do painel, clique em **novo vídeo**.
2. Escolha o **tipo**: Motion, Vertical (Shorts) ou Long Form.
3. Escreva o **título** e cole o **link do YouTube** (vale `youtube.com/watch?v=…`, `youtu.be/…` ou `/shorts/…`). Vídeos não listados também funcionam.
4. Se for Long Form, escolha o **filtro** (Gameplay, Documentário…), se quiser.
5. Envie um **clipe de prévia** (mp4 ou webm, até 15 MB). Ele toca sozinho, sem som e em loop no card e nos destaques. Sem clipe, o site usa a miniatura do YouTube. A **capa** é opcional.
6. Preencha a descrição em português e em inglês (ex.: o canal e quem participou).
7. Marque **mostrar nos destaques da abertura** para ele aparecer no topo do site.
8. Clique em **ADICIONAR VÍDEO**. A prévia ao lado mostra como vai ficar.

### Reordenar, editar e excluir
- Em **seus trabalhos**, arraste pela alça (os seis pontinhos). No teclado: foque a alça e use as setas.
- O lápis abre a edição na própria linha. O **X** exclui (o painel pede confirmação).
- A busca filtra a lista. Dá para reordenar com a busca ligada: a ordem dos outros vídeos não muda.

### Clientes
- Em **clientes**, preencha nome e link do canal. A foto pode ser enviada (até 3 MB) ou colada como link.
- O site mostra 6 clientes no cartaz. Se houver mais, aparece o botão **ver todos**, que abre a lista completa.
- Arraste para mudar a ordem: os 6 primeiros são os do cartaz.

### Depoimentos
- Em **depoimentos**, escreva o nome, o canal e o texto (PT e EN). Eles aparecem como balões de quadrinho.
- Arraste para mudar a ordem. Sem nenhum depoimento, a seção some do site.

### Textos, redes, números e comissões
- Em **textos e redes**: nome, e-mail, foto e texto do "sobre mim" (PT e EN), Discord, Instagram, X e YouTube. Clique em **SALVAR NA NUVEM**.
- No "sobre mim", `*entre asteriscos*` fica em negrito e uma linha em branco separa parágrafos.
- **Números do site**: até 4 linhas com número e legenda (ex.: `120+` · "vídeos entregues"). Os números contam do zero quando aparecem na tela. Linha em branco não aparece; tudo em branco esconde a seção.
- A chave **comissões abertas** muda na hora o carimbo do site entre "COMMISSIONS: ON" e "OFF".

### Categorias e filtros
- **Ordem das categorias**: arraste, renomeie (lápis) ou exclua. Excluir uma categoria apaga os vídeos dela (o painel avisa quantos).
- O formato 9:16 serve para categorias de vídeos verticais.
- **Filtros do Long Form**: adicione, remova e arraste. Remover um filtro deixa os vídeos dele sem filtro.

### Pedidos de orçamento
- Os botões **CONTRATAR** (cabeçalho) e **PEDIR ORÇAMENTO** (contato) abrem uma janela onde o cliente escreve nome, tipo de vídeo, prazo, referência e detalhes.
- O cliente escolhe: **enviar por e-mail** (abre o e-mail dele já preenchido para o seu endereço) ou **copiar pro Discord** (copia a mensagem pronta e mostra o seu nick).
- Nada fica guardado no site. O pedido chega pelo e-mail ou pelo Discord.

---

## Para manutenção

### Estrutura
```
index.html · admin.html · 404.html · styleguide.html (guia visual, não é publicado)
css/      fonts.css · base.css (cores, fontes, janela) · formas.css (recortes, aranhas, intro, animações) · site.css · admin.css
js/       config.js (chaves públicas e endereço do site) · supabase.js · data.js (banco + modo local) · i18n.js (textos PT/EN)
          site.js · animations.js · cursor.js (mira) · player.js · previa.js (clipes) · admin.js · dom.js · boot.js (intro) · mock-data.js
          vendor/ (supabase-js e SortableJS empacotados; licenças em LICENCAS.txt)
assets/   desenhos.svg (aranha, teia, faísca…) · favicon.svg · og-image.png · apple-touch-icon.png · foto-decxz.webp · exemplos/ · fonts/
supabase/ schema.sql (tabelas + segurança) · seed.sql (dados de exemplo)
tests/    site.spec.js · admin.spec.js (Playwright) · db/banco.test.mjs (SQL e segurança)
scripts/  gerar-seed.mjs · gerar-imagens.mjs · gerar-previas.mjs · vendor.mjs · sem-comentarios.mjs · trocar-endereco.mjs
```

### Rodar no computador
```bash
cd editor-video
npm install
npm run dev            # abre em http://localhost:4500
```
Sem o Supabase configurado, o site usa os dados de exemplo e o painel entra no **modo local**: login `demo@local` / `demo1234`. As mudanças ficam só naquele navegador. Isso não é uma senha de verdade e não protege nada; some assim que o Supabase for ligado.

### Testes
```bash
npm test                         # Playwright: computador 1440 e celular 390
TODOS_NAVEGADORES=1 npm test     # também Firefox e iPhone (precisa de "npx playwright install")
npm run test:db                  # SQL, segurança (RLS) e funções do banco
npm run check:comments           # garante que o código não tem comentários
```

### Ligar o Supabase (uma vez só)
1. Em [supabase.com](https://supabase.com), crie um projeto (plano Free).
2. Em **SQL Editor**, cole e rode `supabase/schema.sql`. Depois cole e rode `supabase/seed.sql` (dados de exemplo; pode pular).
3. Ainda no SQL Editor, cadastre o e-mail do admin:
   `insert into public.admins (email) values ('email-do-editor@exemplo.com');` (em minúsculas)
4. Em **Authentication → Users → Add user**, crie o usuário com esse e-mail e uma senha forte (marque "Auto Confirm User").
5. Em **Project Settings → API**, copie a **Project URL** e a chave **anon public** para `js/config.js`. Nunca use a chave `service_role` no site.
6. Em **Authentication → URL Configuration**, coloque o endereço do site em **Site URL**.
7. Em **Authentication → Sign In / Providers**, desligue **Allow new users to sign up**. Assim ninguém cria conta sozinho; só o admin que você cadastrou entra.
8. Se já tinha rodado o `schema.sql` antes, rode de novo: ele só acrescenta o que falta (depoimentos, números, travas de links `https://` e de e-mail válido) sem apagar nada.

Segurança: todas as tabelas têm Row Level Security. Qualquer pessoa lê. Só quem está logado **e** está na tabela `admins` escreve, reordena ou envia arquivos.

### Publicar (Vercel)
```bash
npx vercel login
npx vercel --prod
```
O `.vercelignore` deixa de fora testes, scripts, SQL e o guia de estilo. A Vercel usa o `404.html` sozinha para endereços que não existem.

Depois do primeiro deploy (ou quando tiver um domínio próprio), troque o endereço do site em todos os lugares com um comando só:
```bash
npm run endereco -- https://decxz.com.br
```
Ele atualiza `index.html` (canonical, Open Graph, dados para o Google), `robots.txt`, `sitemap.xml` e `js/config.js`.

Alternativas: Netlify ou Cloudflare Pages também servem (é só publicar a pasta). Copie os cabeçalhos do `vercel.json` para o `_headers` deles.

### Trocar cores, fontes e nome
- Cores: variáveis no topo de `css/base.css` (`--vermelho`, `--preto`, `--branco`…).
- Fontes: arquivos em `assets/fonts/` e `css/fonts.css` (New Rocker, Space Mono, Barlow e Barlow Condensed, todas com licença OFL).
- Nome e textos: pelo painel. O nome também está fixo nas metatags do `index.html` (para Google e redes sociais). Depois de mudar o nome, rode `npm run imagens` para refazer a imagem de compartilhamento e o ícone.
- Textos fixos do site (menu, botões, faixas, "como eu trabalho", janela de orçamento): `js/i18n.js`.

### Google
- O `index.html` traz os dados da pessoa (nome, profissão, redes) para o Google.
- O site também gera, com os vídeos do banco, uma lista de `VideoObject` (título, miniatura, link). Assim o Google entende que cada trabalho é um vídeo.

### Limites do plano grátis
- **Supabase** pausa projetos grátis depois de cerca de 1 semana sem nenhum acesso. O site continua mostrando a última versão salva no navegador de quem já visitou e, se não houver, os dados de exemplo. Para reativar, entre no painel do Supabase e clique em **Restore project**. Leva alguns minutos.
- Supabase Free: 500 MB de banco e 1 GB de arquivos. Os clipes de prévia são o que mais ocupa (até 15 MB cada).
- Vercel Hobby: uso pessoal e não comercial. Para um portfólio, ok.
