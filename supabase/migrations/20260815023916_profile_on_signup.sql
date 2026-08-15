-- Criação automática do perfil no cadastro.
--
-- O app manda o nome como metadado do signUp. Depender de uma segunda chamada do
-- cliente para criar o perfil deixaria contas sem perfil sempre que essa chamada
-- falhasse, então a criação acontece no banco, junto com a inserção em auth.users.
--
-- A função é security definer porque `authenticated` não tem privilégio sobre
-- auth.users nem sobre a linha de outro usuário no momento do cadastro. Por isso
-- ela é deliberadamente burra: escreve uma linha, com um id que vem do próprio
-- registro criado, e nada mais.

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
-- search_path vazio evita sequestro de resolução de nomes por schema no caminho;
-- daí todas as referências abaixo serem qualificadas.
set search_path = ''
as $$
begin
  insert into public.profiles (id, name)
  values (
    new.id,
    -- Metadado é conteúdo controlado pelo cliente: espaços fora, tamanho limitado,
    -- e string vazia vira NULL em vez de virar um nome em branco.
    nullif(left(trim(coalesce(new.raw_user_meta_data ->> 'name', '')), 100), '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

comment on function public.handle_new_user() is
  'Cria public.profiles para cada novo auth.users, com o nome vindo dos metadados do cadastro.';

-- Função de trigger não precisa ser chamável por ninguém além do próprio trigger.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
