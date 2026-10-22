# Portfólio de editor de vídeo — DAVI

Site-portfólio no estilo "papel e tinta" (papel rasgado, rabiscos de caneta, aranhas) com um painel para o editor cuidar de tudo sozinho.

- Site: `index.html` · Painel: `admin.html` (abre em `/admin`)
- HTML, CSS e JavaScript puros, sem framework e sem etapa de build.
- Banco, login e fotos: Supabase (plano grátis). Hospedagem: Vercel (plano grátis).

---

## Para o editor

### Entrar no painel
1. Abra `seusite.com/admin`.
2. Entre com o e-mail e a senha que foram criados para você.
3. Errou? Aparece "credenciais incorretas!". É só tentar de novo.

### Adicionar um vídeo
1. No menu do painel, clique em **novo vídeo**.
2. Escolha o **tipo**: Motion, Vertical (Shorts) ou Long Form.
3. Escreva o **título** e cole o **link do YouTube** (vale qualquer formato: `youtube.com/watch?v=…`, `youtu.be/…`, `/shorts/…`).
4. Se for Long Form, escolha o **filtro** (Gameplay, Documentário…), se quiser.
5. Preencha a descrição em português e em inglês (ex.: o canal e quem participou).
6. Marque **usar como showreel** se ele deve aparecer grande no topo do site.
7. Clique em **ADICIONAR VÍDEO**. A prévia ao lado mostra como vai ficar.

Vídeos não listados do YouTube também funcionam.

### Reordenar, editar e excluir
- Em **seus trabalhos**, arraste pela alça (os seis pontinhos). No teclado: foque a alça e use as setas.
- O lápis abre a edição na própria linha. O **X** exclui (o painel pede confirmação).
- A busca filtra a lista. Dá para reordenar com a busca ligada: a ordem dos outros vídeos não muda.

### Clientes
- Em **clientes**, preencha nome e link do canal. A foto pode ser enviada (até 3 MB) ou colada como link.
- Sem foto, o site mostra as iniciais.
- Arraste a foto redonda para mudar a ordem.

### Textos, redes e comissões
- Em **textos e redes**: nome, e-mail, "sobre mim" (PT e EN), Discord, Instagram, X e YouTube. Clique em **SALVAR NA NUVEM**.
- A chave **comissões abertas** muda na hora o carimbo do site entre "COMMISSIONS: ON" (verde) e "OFF".

### Categorias e filtros
- **Ordem das categorias**: arraste, renomeie (lápis) ou exclua. Excluir uma categoria apaga os vídeos dela (o painel avisa quantos).
- O formato 9:16 serve para categorias de vídeos verticais.
- **Filtros do Long Form**: adicione, remova e arraste. Remover um filtro deixa os vídeos dele sem filtro.

---

## Para manutenção

### Estrutura
```
index.html · admin.html · styleguide.html (guia visual, não é publicado)
css/      fonts.css · base.css (cores e regras gerais) · paper.css (papel rasgado e animações) · site.css · admin.css
js/       config.js (chaves públicas) · supabase.js · data.js (banco + modo local) · i18n.js (textos PT/EN)
          site.js · animations.js · cursor.js · player.js · admin.js · dom.js · boot.js (intro) · mock-data.js
          vendor/ (supabase-js e SortableJS empacotados; licenças em LICENCAS.txt)
assets/   desenhos.svg (aranha, teia, estrela…) · favicon.svg · og-image.png · apple-touch-icon.png · fonts/
supabase/ schema.sql (tabelas + segurança) · seed.sql (dados de exemplo)
tests/    site.spec.js · admin.spec.js (Playwright) · db/banco.test.mjs (SQL e segurança)
scripts/  gerar-seed.mjs · gerar-imagens.mjs · vendor.mjs · sem-comentarios.mjs
design/   mockups aprovados (referência, não é publicado)
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
8. Se já tinha rodado o `schema.sql` antes, rode de novo: ele só acrescenta as travas novas (links das redes só com `https://` e e-mail válido) sem apagar nada.

Segurança: todas as tabelas têm Row Level Security. Qualquer pessoa lê. Só quem está logado **e** está na tabela `admins` escreve, reordena ou envia fotos.

### Publicar (Vercel)
```bash
npx vercel login
npx vercel --prod
```
O `.vercelignore` deixa de fora `design/`, testes, scripts e SQL. Depois do primeiro deploy, troque `https://portfolio-editor.vercel.app` pelo endereço real em `index.html` (canonical, Open Graph, JSON-LD), `robots.txt`, `sitemap.xml` e `js/config.js`.
Alternativas: Netlify ou Cloudflare Pages também servem (é só publicar a pasta). Copie os cabeçalhos do `vercel.json` para o `_headers` deles.

### Trocar cores, fontes e nome
- Cores: variáveis no topo de `css/base.css` (`--roxo`, `--coral`, `--papel`…).
- Fontes: arquivos em `assets/fonts/` e `css/fonts.css` (todas com licença OFL).
- Nome e textos: pelo painel. O nome também está fixo nas metatags do `index.html` (para Google e redes sociais). Depois de mudar o nome, rode `npm run imagens` para refazer a imagem de compartilhamento.
- Textos fixos do site (menu, botões, faixas): `js/i18n.js`.

### Limites do plano grátis
- **Supabase** pausa projetos grátis depois de cerca de 1 semana sem nenhum acesso. O site continua mostrando a última versão salva no navegador de quem já visitou e, se não houver, os dados de exemplo. Para reativar, entre no painel do Supabase e clique em **Restore project**. Leva alguns minutos.
- Supabase Free: 500 MB de banco e 1 GB de arquivos, bem mais que o necessário.
- Vercel Hobby: uso pessoal e não comercial. Para um portfólio, ok.
