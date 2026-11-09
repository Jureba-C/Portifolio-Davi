-- Verificação em duas etapas (MFA) no banco.
-- Rode SÓ DEPOIS que o admin entrou no painel novo e ativou o app autenticador
-- (Google Authenticator, Authy ou 1Password). A partir daqui o banco só aceita
-- escrita de quem confirmou o código de 6 dígitos.
-- Como rodar: Supabase → SQL Editor → cole este arquivo inteiro → Run. Pode rodar de novo sem problema.
-- Perdeu o celular? Supabase → Authentication → Users → o usuário → Factors → apague o fator.
-- No próximo login o painel pede para cadastrar o app de novo.

create or replace function public.eh_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(auth.jwt() ->> 'aal', '') = 'aal2' and exists (
    select 1 from public.admins
    where email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

revoke all on function public.eh_admin() from public, anon;
grant execute on function public.eh_admin() to authenticated;
