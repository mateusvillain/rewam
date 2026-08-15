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
--
-- Duas consequências que valem estar escritas:
--   1. Exceção aqui aborta o INSERT em auth.users e o cadastro inteiro falha.
--      É a semântica desejada — conta sem perfil seria pior —, mas exige que a
--      função permaneça mínima e sem I/O.
--   2. A função roda como o dono (`postgres`), que também é dono de profiles e
--      por isso não passa por RLS. Habilitar `force row level security` em
--      profiles quebraria todo signUp; se um dia isso for necessário, esta
--      função precisa de política própria antes.

-- Limite de tamanho do nome mora na tabela, não só no trigger: quem edita o
-- próprio nome pelo PostgREST passa pela mesma regra.
alter table public.profiles
  add constraint profiles_name_length_check check (name is null or char_length(name) <= 100);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
-- search_path vazio evita sequestro de resolução de nomes por schema no caminho;
-- daí todas as referências abaixo serem qualificadas.
set search_path = ''
as $$
begin
  -- Sem ON CONFLICT: o id vem de uma linha recém-criada em auth.users, então
  -- colisão significaria estado inconsistente e é melhor falhar alto do que
  -- seguir em silêncio com um perfil que não corresponde à conta.
  insert into public.profiles (id, name)
  values (
    new.id,
    -- Metadado é conteúdo controlado pelo cliente: espaços fora, corte no limite
    -- da constraint, e string vazia vira NULL em vez de nome em branco.
    nullif(left(trim(coalesce(new.raw_user_meta_data ->> 'name', '')), 100), '')
  );

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
