-- Verificação do trigger que cria o perfil no cadastro.
--
-- Roda em transação e faz rollback: nada persiste. Com o stack local no ar:
--   pnpm db:test:profile
--
-- Asserções compartilhadas e o BEGIN vêm de _helpers.sql, concatenado por run.sh.

create or replace function pg_temp.expect_name(label text, user_id uuid, expected text)
returns void language plpgsql as $$
declare
  found_name text;
begin
  select name into found_name from public.profiles where id = user_id;
  if found_name is distinct from expected then
    raise exception 'FALHOU: % gravou %, esperado %', label, coalesce(quote_literal(found_name), 'NULL'), coalesce(quote_literal(expected), 'NULL');
  end if;
  raise notice 'ok (%) — %', coalesce(quote_literal(found_name), 'NULL'), label;
end;
$$;

-- Cadastro com nome
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
values ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'com-nome@example.com', '{"name": "Pessoa A"}'::jsonb);
select pg_temp.expect_name('cadastro com nome grava o nome', '11111111-1111-1111-1111-111111111111', 'Pessoa A');

-- Cadastro sem metadado algum não pode quebrar
insert into auth.users (id, instance_id, aud, role, email)
values ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'sem-metadado@example.com');
select pg_temp.expect_name('cadastro sem metadado cria perfil com nome nulo', '22222222-2222-2222-2222-222222222222', null);

-- Metadado presente mas sem a chave name
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
values ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'outra-chave@example.com', '{"apelido": "X"}'::jsonb);
select pg_temp.expect_name('metadado sem a chave name resulta em nome nulo', '33333333-3333-3333-3333-333333333333', null);

-- Nome em branco não vira nome vazio
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
values ('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'branco@example.com', '{"name": "   "}'::jsonb);
select pg_temp.expect_name('nome só com espaços vira nulo', '44444444-4444-4444-4444-444444444444', null);

-- Nome absurdamente longo é cortado, não rejeitado
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
values ('55555555-5555-5555-5555-555555555555', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'longo@example.com', jsonb_build_object('name', repeat('a', 500)));
select pg_temp.expect_name('nome longo é truncado em 100 caracteres', '55555555-5555-5555-5555-555555555555', repeat('a', 100));

-- Todo cadastro produz exatamente um perfil (contando só as contas desta suíte,
-- para a asserção não depender do que mais exista no banco).
select pg_temp.expect_count('cada conta criada tem um perfil',
  $$select count(*) from public.profiles where id in (
      '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222',
      '33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444',
      '55555555-5555-5555-5555-555555555555')$$, 5);

select pg_temp.expect_count('nenhuma conta ficou sem perfil',
  'select count(*) from auth.users u where not exists (select 1 from public.profiles p where p.id = u.id)', 0);

-- A função de trigger não é chamável por quem usa o app.
select pg_temp.act_as('22222222-2222-2222-2222-222222222222');
select pg_temp.expect_failure('authenticated executa handle_new_user diretamente',
  'select public.handle_new_user()');
reset role;

-- A constraint da tabela vale também para quem edita o nome pelo PostgREST,
-- não só para o caminho do trigger.
select pg_temp.act_as('22222222-2222-2222-2222-222222222222');
select pg_temp.expect_failure('nome acima de 100 caracteres no update do próprio perfil',
  $$update public.profiles set name = repeat('b', 101)
    where id = '22222222-2222-2222-2222-222222222222'$$);
reset role;

-- Excluir a conta leva o perfil junto
delete from auth.users where id = '11111111-1111-1111-1111-111111111111';
select pg_temp.expect_count('perfil some com a conta',
  $$select count(*) from public.profiles where id = '11111111-1111-1111-1111-111111111111'$$, 0);

rollback;
