-- Verificação da exclusão da própria conta.
--
-- Roda em transação e faz rollback: nada persiste. Com o stack local no ar:
--   pnpm db:test:delete
--
-- Asserções compartilhadas e o BEGIN vêm de _helpers.sql, concatenado por run.sh.

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
values ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@example.com', '{"name": "Pessoa A"}'::jsonb),
       ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@example.com', '{"name": "Pessoa B"}'::jsonb);

insert into public.titles (id, tmdb_id, media_type, title, runtime_minutes)
values ('aaaaaaaa-0000-0000-0000-000000000001', 27205, 'movie', 'A Origem', 148);

insert into public.watch_events (user_id, title_id, duration_minutes)
values ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000001', 148),
       ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000001', 148),
       ('22222222-2222-2222-2222-222222222222', 'aaaaaaaa-0000-0000-0000-000000000001', 148);

-- ---------------------------------------------------------------------------
-- Sem sessão não há exclusão
-- ---------------------------------------------------------------------------
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

select pg_temp.expect_failure('anônimo executa a exclusão',
  'select public.delete_own_account()');

reset role;

-- ---------------------------------------------------------------------------
-- Pessoa A apaga a própria conta
-- ---------------------------------------------------------------------------
select pg_temp.act_as('11111111-1111-1111-1111-111111111111');
select public.delete_own_account();
reset role;

select pg_temp.expect_count('conta de A removida de auth.users',
  $$select count(*) from auth.users where id = '11111111-1111-1111-1111-111111111111'$$, 0);

select pg_temp.expect_count('perfil de A removido pela cascata',
  $$select count(*) from public.profiles where id = '11111111-1111-1111-1111-111111111111'$$, 0);

select pg_temp.expect_count('exibições de A removidas pela cascata',
  $$select count(*) from public.watch_events where user_id = '11111111-1111-1111-1111-111111111111'$$, 0);

-- ---------------------------------------------------------------------------
-- Nada de B foi tocado
-- ---------------------------------------------------------------------------
select pg_temp.expect_count('conta de B intacta',
  $$select count(*) from auth.users where id = '22222222-2222-2222-2222-222222222222'$$, 1);

select pg_temp.expect_count('perfil de B intacto',
  $$select count(*) from public.profiles where id = '22222222-2222-2222-2222-222222222222'$$, 1);

select pg_temp.expect_count('exibição de B intacta',
  $$select count(*) from public.watch_events where user_id = '22222222-2222-2222-2222-222222222222'$$, 1);

-- O catálogo é compartilhado e não pertence a ninguém: excluir conta não o apaga.
select pg_temp.expect_count('catálogo preservado',
  $$select count(*) from public.titles where id = 'aaaaaaaa-0000-0000-0000-000000000001'$$, 1);

rollback;
