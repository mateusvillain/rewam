-- Exclusão da própria conta.
--
-- Apagar de `auth.users` exige privilégio que o app não tem — e não deve ter,
-- porque a chave capaz disso apagaria qualquer conta. A saída é uma função que
-- roda com privilégio próprio mas não aceita parâmetro algum: ela só sabe
-- apagar quem está chamando.
--
-- A cascata das chaves estrangeiras leva junto o perfil e as exibições, então
-- não há listagem de tabelas aqui para esquecer de atualizar quando o schema
-- crescer.

create function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Só uma sessão autenticada pode excluir a própria conta.'
      using errcode = 'insufficient_privilege';
  end if;

  delete from auth.users where id = current_user_id;
end;
$$;

comment on function public.delete_own_account() is
  'Apaga a conta de quem chama, junto com perfil e exibições, pela cascata.';

-- Sem privilégio para anônimo: exclusão exige sessão.
revoke execute on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;
