# Publicar o site do Decxz (Supabase + Vercel)

Tudo já está configurado no repositório. O que falta são só os cliques nas contas, marcados com ⚠️. Faça na ordem: primeiro o Supabase (banco e login), depois a Vercel (o site).

## 1. Supabase: banco, login e arquivos (uma vez só)
1. ⚠️ Em [supabase.com](https://supabase.com), crie um projeto (plano Free). Anote a senha do banco num lugar seguro.
2. ⚠️ Em **SQL Editor → New query**, cole todo o `supabase/schema.sql` e clique em **Run**. Ele cria:
   - as tabelas;
   - as travas de segurança (só o admin escreve);
   - o bucket `midia` para fotos e clipes.

   Rodar de novo não apaga nada.
3. Opcional: rode também `supabase/seed.sql` para começar com os exemplos. Pode pular e cadastrar tudo direto pelo painel.
4. ⚠️ Ainda no SQL Editor, cadastre o e-mail de quem vai administrar (em minúsculas):
   ```sql
   insert into public.admins (email) values ('email-do-decxz@exemplo.com');
   ```
5. ⚠️ Em **Authentication → Users → Add user → Create new user**, crie o usuário com esse mesmo e-mail e uma senha forte. Marque **Auto Confirm User**.
   - Para ter mais de um admin (ex.: você e o Decxz), repita os passos 4 e 5 para cada e-mail.
6. ⚠️ Em **Authentication → Sign In / Providers**, desligue **Allow new users to sign up**. Assim ninguém cria conta sozinho.
7. ⚠️ Em **Project Settings → API**, deixe aberta a página com a **Project URL** e a chave **anon public**. Você vai colar as duas na Vercel, não no código.
   - Nunca use a chave `service_role`: o build recusa essa chave.

## 2. Vercel: o site
1. ⚠️ Em [vercel.com](https://vercel.com), clique em **Add New → Project** e importe o repositório **Jureba-C/Portifolio-Davi**.
2. Não precisa mexer em **Framework**, **Build** nem **Output**: o `vercel.json` já define tudo.
   - Build: `node scripts/build.mjs`.
   - Saída: `dist`.
   - Instalação: só o esbuild, que empacota o site (`installCommand` do `vercel.json`).
3. ⚠️ Antes de clicar em Deploy, abra **Environment Variables** e cadastre:

   | Nome | Valor |
   |---|---|
   | `SUPABASE_URL` | a Project URL (ex.: `https://abcd1234.supabase.co`) |
   | `SUPABASE_ANON_KEY` | a chave **anon public** |
   | `SITE_URL` | opcional agora; quando tiver domínio, ex.: `https://decxz.com.br` |

4. Clique em **Deploy**. Se faltar alguma chave, o build para e diz qual. Assim o site nunca vai ao ar com o painel de demonstração.
5. ⚠️ Volte ao Supabase → **Authentication → URL Configuration** e coloque o endereço do site (o `.vercel.app` ou o domínio) em **Site URL**.

## 3. Domínio próprio (quando tiver)
1. ⚠️ Vercel → **Settings → Domains → Add**, e siga as instruções de DNS do seu registrador.
2. ⚠️ Vercel → **Environment Variables**: coloque `SITE_URL` com o domínio (`https://…`, sem barra no fim) e clique em **Redeploy**. O build troca o endereço:
   - nas metatags;
   - nos dados para o Google;
   - no `robots.txt` e no `sitemap.xml`.
3. ⚠️ Supabase → **Site URL**: troque para o domínio.

## 4. Conferir depois de publicar
- Abra o site: a intro roda, os vídeos aparecem e o PT/EN funciona.
- Abra `/admin`, entre com o e-mail e a senha do passo 1.5, crie um vídeo de teste e veja ele aparecer no site.
- Exclua o vídeo de teste.
- Abra um endereço que não existe (ex.: `/teste`): aparece a página 404 da aranha.

## Login do cliente no painel
- O Decxz entra em `seusite.com/admin` com o e-mail e a senha criados nos passos 1.4 e 1.5.
- Pelo painel ele muda tudo o que aparece no site, sem mexer em código:
  - vídeos, clipes, capas e destaques;
  - textos do "Sobre mim" e a foto;
  - selo e frase da abertura e chamada do contato;
  - redes, e-mail, Discord e comissões;
  - clientes, depoimentos e categorias.
- As mudanças aparecem no site na hora, para todo mundo.
- **Trocar a senha:** no Supabase, Authentication → Users, apague o usuário e crie de novo com a senha nova. O e-mail continua na lista de admins, então o acesso volta igual.

## Atualizar o site depois
- Conteúdo (vídeos, textos, clientes, depoimentos): sempre pelo painel `/admin`, sem mexer em código e sem publicar de novo.
- Código: cada envio para o GitHub (repositório Portifolio-Davi) publica sozinho na Vercel.

## Testar o build no computador
```bash
SUPABASE_URL=https://abcd1234.supabase.co SUPABASE_ANON_KEY=… npm run build
PERMITIR_DEMO=1 npm run build
npm run test:build
```
O segundo comando gera um build sem Supabase, só para olhar. O último confere o build.
