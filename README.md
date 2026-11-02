# Decxz Editor — portfólio de editor de vídeo

Site-portfólio em cartaz vermelho, preto e branco (Persona 5 + Deadlock, janelas anos 2000, visor de câmera e aranhas), com um painel para o editor cuidar de tudo sozinho.

- Site: `index.html` · Painel: `admin.html` (abre em `/admin`) · Página de erro: `404.html`
- HTML, CSS e JavaScript puros, sem framework e sem etapa de build.
- Banco, login e arquivos: Supabase (plano grátis). Hospedagem: Vercel (plano grátis).

---

## Para o editor

### Entrar no painel
1. Abra `seusite.com/admin`.
2. Entre com o e-mail e a senha que foram criados para você. O olho ao lado da senha mostra o que você digitou.
3. Errou? Aparece "credenciais incorretas!". É só tentar de novo.

O painel tem um menu com cinco telas: **Vídeos**, **Textos e redes**, **Clientes**, **Depoimentos** e **Categorias**. No celular, o menu fica embaixo. O número ao lado de cada item mostra quantos itens existem.

### Vídeos
- **Novo vídeo** abre uma gaveta do lado direito:
  1. Escolha o **tipo** (Motion, Vertical/Shorts, Long Form).
  2. Cole o **link do YouTube** (`youtube.com/watch?v=…`, `youtu.be/…` ou `/shorts/…`; vídeo não listado também vale). O painel avisa se reconheceu o link.
  3. Escreva o **título**. No Long Form, escolha o **filtro** se quiser.
  4. Envie o **clipe de prévia** (mp4 ou webm, até 15 MB) e, se quiser, a **capa**. A lixeira ao lado tira o arquivo.
  5. Preencha a descrição em português e em inglês e ligue **Mostrar nos destaques** se ele deve aparecer no topo do site.
  6. O cartão no topo da gaveta mostra como vai ficar. Clique em **Adicionar vídeo**.
- Na lista, cada vídeo tem: **estrela** (coloca ou tira dos destaques), **lápis** (abre a mesma gaveta para editar) e **lixeira** (exclui, com confirmação).
- Arraste pela alça (os seis pontinhos) para mudar a ordem. No teclado: foque a alça e use as setas.
- A busca (atalho `/`) e os botões Todos / Motion / Vertical / Long Form filtram a lista.
- Se você fechar a gaveta com algo mudado, o painel pergunta se quer descartar.

### Textos e redes
- **Perfil:** foto do "sobre mim" (enviar ou colar link), nome artístico, e-mail e a chave **Comissões abertas**. A chave muda o selo do site na hora.
- **Sobre mim:** português e inglês lado a lado, com contador de letras. `*entre asteriscos*` fica em negrito e uma linha em branco separa parágrafos. **Ver como fica** mostra o texto já formatado.
- **Textos da página:** o selo e a frase da abertura e a chamada do contato, em português e em inglês. Em branco, o site usa o texto padrão, que aparece em cinza dentro do campo.
- **Redes:** Discord, Instagram, X e YouTube. Embaixo de cada link aparece para onde ele vai.
- Quando algo muda, aparece a barra **Alterações não salvas** com **Descartar** e **Salvar alterações**. Se você tentar sair da tela ou fechar a aba sem salvar, o painel avisa.

### Clientes
- **Novo cliente** abre uma janela com nome, link do canal e foto (enviar até 3 MB ou colar link). Sem foto, o site mostra as iniciais.
- Os 6 primeiros têm a etiqueta **no cartaz**. Os outros ficam em **ver todos** no site. Arraste para mudar a ordem.

### Depoimentos
- **Novo depoimento** abre uma janela com nome, canal e o texto em português e em inglês.
- O lápis edita e a lixeira exclui. Arraste para mudar a ordem. Sem nenhum depoimento, a seção some do site.
- Depoimento sem versão em inglês ganha um aviso na lista.

### Categorias
- **Abas do site:** arraste para ordenar, renomeie (lápis, com nome em português e em inglês e o formato 16:9 ou 9:16) ou exclua. Excluir uma categoria apaga os vídeos dela (o painel avisa quantos).
- **Filtros do Long Form:** adicione, remova e arraste. O número em cada filtro mostra quantos vídeos usam. Remover um filtro deixa os vídeos dele sem filtro.

### Pedidos de orçamento
- Os botões **CONTRATAR** (cabeçalho) e **PEDIR ORÇAMENTO** (contato) abrem uma janela onde o cliente escreve nome, tipo de vídeo, prazo, referência e detalhes.
- O cliente escolhe: **enviar por e-mail** (abre o e-mail dele já preenchido para o seu endereço) ou **copiar pro Discord** (copia a mensagem pronta e mostra o seu nick).
- Nada fica guardado no site. O pedido chega pelo e-mail ou pelo Discord.

---

## Para manutenção

### Estrutura
```
index.html · admin.html · 404.html · styleguide.html (guia visual, não é publicado)
css/      fonts.css · base.css (cores, fontes, janela) · formas.css (recortes, aranhas, intro, animações) · site.css · admin.css (painel, independente do visual do site)
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
5. Em **Project Settings → API**, pegue a **Project URL** e a chave **anon public**. Elas vão nas variáveis de ambiente da Vercel (veja o `DEPLOY.md`), não no código. Nunca use a chave `service_role` no site.
6. Em **Authentication → URL Configuration**, coloque o endereço do site em **Site URL**.
7. Em **Authentication → Sign In / Providers**, desligue **Allow new users to sign up**. Assim ninguém cria conta sozinho; só o admin que você cadastrou entra.
8. Se já tinha rodado o `schema.sql` antes, rode de novo: ele só acrescenta o que falta (depoimentos, travas de links `https://` e de e-mail válido) sem apagar nada.

Segurança: todas as tabelas têm Row Level Security. Qualquer pessoa lê. Só quem está logado **e** está na tabela `admins` escreve, reordena ou envia arquivos.

### Publicar (Vercel)
O passo a passo completo está no **`DEPLOY.md`**. Em resumo:
- importar o repositório na Vercel;
- cadastrar `SUPABASE_URL`, `SUPABASE_ANON_KEY` e, com domínio, `SITE_URL` nas variáveis de ambiente;
- clicar em Deploy.

O `vercel.json` já define o build (`node scripts/build.mjs`), a pasta de saída (`dist`) e os cabeçalhos de segurança.

O build:
- copia só o que vai ao ar;
- gera o `js/config.js` com as chaves;
- troca o endereço do site nas metatags, no `robots.txt` e no `sitemap.xml`;
- para com um aviso se faltar alguma chave.

A Vercel usa o `404.html` sozinha para endereços que não existem.

Para trocar o endereço provisório também no código (opcional): `npm run endereco -- https://decxz.com.br`.

### Trocar cores, fontes e nome
- Cores: variáveis no topo de `css/base.css` (`--vermelho`, `--preto`, `--branco`…).
- Fontes: arquivos em `assets/fonts/` e `css/fonts.css` (New Rocker, Space Mono, Barlow e Barlow Condensed, todas com licença OFL).
- Nome e textos: pelo painel. O nome também está fixo nas metatags do `index.html` (para Google e redes sociais). Depois de mudar o nome, rode `npm run imagens` para refazer a imagem de compartilhamento e o ícone.
- Textos fixos do site (menu, botões, faixas, janela de orçamento): `js/i18n.js`.

### Ícone da aba (favicon)
- Para trocar: substitua `assets/favicon.svg` (de preferência um desenho quadrado e simples) e rode `npm run imagens`. Ele refaz o `apple-touch-icon.png` a partir do novo ícone.

### Google
- O `index.html` traz os dados da pessoa (nome, profissão, redes) para o Google.
- O site também gera, com os vídeos do banco, uma lista de `VideoObject` (título, miniatura, link). Assim o Google entende que cada trabalho é um vídeo.

### Limites do plano grátis
- **Supabase** pausa projetos grátis depois de cerca de 1 semana sem nenhum acesso. O site continua mostrando a última versão salva no navegador de quem já visitou e, se não houver, os dados de exemplo. Para reativar, entre no painel do Supabase e clique em **Restore project**. Leva alguns minutos.
- Supabase Free: 500 MB de banco e 1 GB de arquivos. Os clipes de prévia são o que mais ocupa (até 15 MB cada).
- Vercel Hobby: uso pessoal e não comercial. Para um portfólio, ok.
