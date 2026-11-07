# Publicar o site do Decxz (Supabase + Hostinger)

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

## 2. Gerar o site (build na sua máquina)
A Hostinger só serve arquivos prontos, então o build roda aqui, com as chaves do passo 1.7:
```bash
npm install
SUPABASE_URL=https://abcd1234.supabase.co SUPABASE_ANON_KEY=… SITE_URL=https://seudominio.com.br npm run build
npm run zip
```
- `SITE_URL` é o endereço final, com `https://` e sem barra no fim. Sem ele o build para: as metatags, o `sitemap.xml` e o `robots.txt` ficariam com o endereço provisório.
- Se faltar alguma chave, o build para e diz qual. Assim o site nunca vai ao ar com o painel de demonstração.
- O build gera a pasta `dist/` e o arquivo `hostinger.zip` com tudo dentro, inclusive o `.htaccess` (cabeçalhos de segurança, HTTPS, URLs sem `.html` e a página 404).

## 3. Hostinger: subir o site
1. ⚠️ No hPanel, abra o site do domínio → **Arquivos → Gerenciador de arquivos** e entre em `public_html`.
2. ⚠️ O envio apaga o que já está lá: confira o que existe e guarde o que precisar.
3. ⚠️ Envie o `hostinger.zip`, clique com o botão direito nele → **Extrair** na própria `public_html` e apague o `.zip`.
   - O `.htaccess` fica escondido no gerenciador. Ative **Mostrar arquivos ocultos** para conferir que ele está lá.
4. ⚠️ Em **Segurança → SSL**, confirme que o SSL do domínio está ativo.
5. ⚠️ Volte ao Supabase → **Authentication → URL Configuration**: coloque o domínio em **Site URL** e acrescente-o em **Redirect URLs**.

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
- Código: rode de novo os passos 2 e 3 (build, zip e envio). O envio para o GitHub não publica nada sozinho.

## Testar o build no computador
```bash
SUPABASE_URL=https://abcd1234.supabase.co SUPABASE_ANON_KEY=… SITE_URL=https://seudominio.com.br npm run build
PERMITIR_DEMO=1 npm run build
npm run test:build
```
O segundo comando gera um build sem Supabase, só para olhar. O último confere o build e o `.htaccess`.
