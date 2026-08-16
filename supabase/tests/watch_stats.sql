-- Verificação do total de tempo assistido (E4.6).
--
-- Três promessas se apoiam no banco, não no cliente:
--   1. a soma é só das exibições de quem chama — o isolamento é do RLS, e a
--      função roda como `security invoker` justamente para depender dele;
--   2. exibição sem duração não entra no total, mas é contada à parte;
--   3. quem nunca registrou nada tem zero, e não NULL.
--
-- Roda em transação e faz rollback: nada persiste. Com o stack local no ar:
--   pnpm db:test:stats
--
-- Asserções compartilhadas e o BEGIN vêm de _helpers.sql, concatenado por run.sh.

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
values ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@example.com', '{"name": "Pessoa A"}'::jsonb),
       ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@example.com', '{"name": "Pessoa B"}'::jsonb);

-- `tmdb_id` alto de propósito: um id real colidiria com o catálogo que o app
-- grava ao abrir um filme, e a suíte falharia conforme o banco local fosse
-- usado — verde na CI, vermelha na máquina de quem desenvolve.
insert into public.titles (id, tmdb_id, media_type, title, runtime_minutes)
values ('aaaaaaaa-0000-4000-8000-000000000001', 99900671, 'movie', 'Um filme', 152);

-- ---------------------------------------------------------------------------
-- Sem exibição alguma, o total é zero — não NULL
-- ---------------------------------------------------------------------------

select pg_temp.act_as('11111111-1111-1111-1111-111111111111');

select pg_temp.expect_count('conta nova soma zero minutos',
  $$select count(*) from public.watch_stats() where total_minutes = 0 and total_events = 0$$, 1);

-- `sum` de conjunto vazio devolve NULL; sem o coalesce a tela mostraria
-- "desconhecido" para quem simplesmente ainda não registrou nada.
select pg_temp.expect_count('total de conta nova não é nulo',
  $$select count(*) from public.watch_stats() where total_minutes is not null$$, 1);

-- ---------------------------------------------------------------------------
-- Duração ausente fica fora da soma, mas é contada
-- ---------------------------------------------------------------------------

insert into public.watch_events (user_id, title_id, duration_minutes)
values ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-4000-8000-000000000001', 152),
       ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-4000-8000-000000000001', 100),
       ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-4000-8000-000000000001', null);

select pg_temp.expect_count('soma ignora a exibição sem duração',
  $$select count(*) from public.watch_stats() where total_minutes = 252$$, 1);

select pg_temp.expect_count('mas conta os três eventos',
  $$select count(*) from public.watch_stats() where total_events = 3$$, 1);

-- É o que permite a tela dizer que o total está incompleto, em vez de
-- apresentá-lo como a verdade inteira.
select pg_temp.expect_count('e informa quantos ficaram de fora',
  $$select count(*) from public.watch_stats() where unknown_duration_events = 1$$, 1);

-- ---------------------------------------------------------------------------
-- A soma é de quem chama, e de mais ninguém
-- ---------------------------------------------------------------------------

-- Volta a postgres para semear a outra conta: como A, o próprio RLS recusaria
-- esta inserção — o que já é a política funcionando, mas não é o que esta
-- seção quer provar.
reset role;

insert into public.watch_events (user_id, title_id, duration_minutes)
values ('22222222-2222-2222-2222-222222222222', 'aaaaaaaa-0000-4000-8000-000000000001', 999);

select pg_temp.act_as('11111111-1111-1111-1111-111111111111');

select pg_temp.expect_count('exibição de outra conta não entra no total',
  $$select count(*) from public.watch_stats() where total_minutes = 252 and total_events = 3$$, 1);

select pg_temp.act_as('22222222-2222-2222-2222-222222222222');

select pg_temp.expect_count('cada conta vê o próprio total',
  $$select count(*) from public.watch_stats() where total_minutes = 999 and total_events = 1$$, 1);

-- ---------------------------------------------------------------------------
-- Anônimo não soma nada
-- ---------------------------------------------------------------------------

reset role;
set local role anon;

-- Sem privilégio de execução: o total é dado pessoal, e a função não tem
-- parâmetro que pudesse restringi-lo se ela fosse aberta.
select pg_temp.expect_failure('anon executa watch_stats', $$select * from public.watch_stats()$$);

reset role;
rollback;
