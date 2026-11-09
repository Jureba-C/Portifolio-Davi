# Publicar o site do Decxz (Supabase + Hostinger)

Tudo já está configurado no repositório. O que falta são só os cliques nas contas, marcados com ⚠️. Faça na ordem: primeiro o Supabase (banco e login), depois a Hostinger (o site).

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
7. ⚠️ Em **Project Settings → API**, deixe aberta a página com a **Project URL** e a chave **anon public**. Você vai colar as duas na Hostinger, não no código.
   - A chave nova se chama **Publishable key** (`sb_publishable_…`) e substitui a `anon public`.
   - Nunca use a chave `service_role`: o build recusa essa chave.

## 2. Hostinger: publicação automática pelo GitHub
A Hostinger baixa o repositório **Jureba-C/Portifolio-Davi**, roda `npm run build` e publica a pasta `dist/` a cada envio para a branch `main`.

1. ⚠️ No hPanel, abra o site do domínio e conecte o repositório pelo GitHub (Git → deploy automático), na branch `main`.
2. ⚠️ Nas configurações de build do site, use:

   | Campo | Valor |
   |---|---|
   | Node.js | 22 |
   | Tipo de aplicação | Other |
   | Comando de build | `npm run build` |
   | Pasta de saída | `dist` |

3. ⚠️ Em **Variáveis de ambiente** do mesmo site, cadastre:

   | Nome | Valor |
   |---|---|
   | `SUPABASE_URL` | a Project URL (ex.: `https://abcd1234.supabase.co`) |
   | `SUPABASE_ANON_KEY` | a Publishable key (`sb_publishable_…`) |
   | `SITE_URL` | o endereço final, com `https://` e sem barra no fim (ex.: `https://decxzeditor.com.br`) |

   - Se faltar alguma, o build para e diz qual. Assim o site nunca vai ao ar com o painel de demonstração nem com o endereço errado nas metatags, no `sitemap.xml` e no `robots.txt`.
   - O build gera o `.htaccess` com os cabeçalhos de segurança, o HTTPS, as URLs sem `.html` e a página 404.
4. ⚠️ Em **Segurança → SSL**, confirme que o SSL do domínio está ativo. Ele só sai depois que o domínio aponta para a Hostinger.
5. ⚠️ Volte ao Supabase → **Authentication → URL Configuration**: coloque o domínio em **Site URL** e acrescente-o em **Redirect URLs**.

Para ver um build: hPanel → site → **Deployments**, com o log e o motivo da falha quando der erro.

## 3. Domínio
O `decxzeditor.com.br` está registrado no Registro.br e continua usando o DNS de lá. Em **Meus domínios → decxzeditor.com.br → DNS → Configurar endereçamento** (modo avançado) ficam:

| Tipo | Nome | Valor |
|---|---|---|
| A | `@` | o IP que o hPanel mostra em "Aponte seu domínio para a Hostinger" (hoje `45.152.44.185`) |
| CNAME | `www` | `decxzeditor.com.br` |

Se a Hostinger mudar o IP, o hPanel avisa e é só trocar o registro A.

### Publicar sem o GitHub (alternativa)
Com as mesmas três variáveis na frente do comando:
```bash
SUPABASE_URL=… SUPABASE_ANON_KEY=… SITE_URL=https://decxzeditor.com.br npm run build
npm run zip
```
Envie o `hostinger.zip` em **Arquivos → Gerenciador de arquivos → `public_html`**, extraia ali e apague o zip. A extração substitui os arquivos do site.

## 4. Conferir depois de publicar
- Abra o site: a intro roda, os vídeos aparecem e o PT/EN funciona.
- Abra `/admin`, entre com o e-mail e a senha do passo 1.5, ative o app autenticador (veja "Verificação em duas etapas"), crie um vídeo de teste e veja ele aparecer no site.
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

## Verificação em duas etapas (MFA)
- O painel pede, além da senha, um código de 6 dígitos de um app autenticador (Google Authenticator, Authy ou 1Password).
- ⚠️ No Supabase, em **Authentication → Multi-Factor**, confira se **TOTP (App Authenticator)** está ligado (vem ligado por padrão).
- **Primeiro login:** depois da senha, o painel mostra um QR code e uma chave. Escaneie com o app (ou digite a chave) e confirme com o código que aparecer. Dali em diante, todo login pede o código do app.
- ⚠️ **Projeto que já existia:** depois que cada admin ativou o app no painel novo, rode `supabase/migracoes/2026-11-mfa.sql` no SQL Editor. A partir daí o banco só aceita escrita de quem confirmou o código. Projeto novo não precisa: o `schema.sql` já vem com essa trava.
- **Perdeu o celular:** no Supabase, **Authentication → Users →** o usuário **→ Factors**, apague o fator. No próximo login o painel pede para cadastrar o app de novo.

## Atualizar o site depois
- Conteúdo (vídeos, textos, clientes, depoimentos): sempre pelo painel `/admin`, sem mexer em código e sem publicar de novo.
- Código: envie para a branch `main` do GitHub. A Hostinger faz o build e publica sozinha, em menos de um minuto.

## Testar o build no computador
```bash
SUPABASE_URL=https://abcd1234.supabase.co SUPABASE_ANON_KEY=… SITE_URL=https://seudominio.com.br npm run build
PERMITIR_DEMO=1 npm run build
npm run test:build
```
O segundo comando gera um build sem Supabase, só para olhar. O último confere o build e o `.htaccess`.
