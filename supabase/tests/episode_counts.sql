-- Verificação da contagem de exibições por episódio (E5.2).
--
-- Quatro promessas se apoiam no banco, não no cliente:
--   1. a contagem é só das exibições de quem chama — a função é
--      `security invoker` justamente para depender do RLS;
--   2. episódio nunca assistido não aparece, e é isso que a tela lê como zero;
--   3. o registro agregado de série (`episode_id` nulo) não conta como episódio;
--   4. o número da temporada vem junto, para o progresso de uma temporada
--      fechada não exigir carregar os episódios dela.
--
-- Roda em transação e faz rollback: nada persiste. Com o stack local no ar:
--   pnpm db:test:episodes

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
values ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@example.com', '{"name": "Pessoa A"}'::jsonb),
       ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@example.com', '{"name": "Pessoa B"}'::jsonb);

-- `tmdb_id` alto de propósito: um id real colidiria com o catálogo que o app
-- grava ao abrir uma série.
insert into public.titles (id, tmdb_id, media_type, title)
values ('aaaaaaaa-0000-4000-8000-000000000001', 99900004, 'tv', 'Série de teste');

insert into public.episodes (id, title_id, season_number, episode_number, name, runtime_minutes)
values ('cccccccc-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 1, 1, 'S1E1', 50),
       ('cccccccc-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000001', 1, 2, 'S1E2', 50),
       ('cccccccc-0000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', 2, 1, 'S2E1', 50);

-- A: assiste S1E1 duas vezes e S2E1 uma. S1E2 fica intocado.
insert into public.watch_events (user_id, title_id, episode_id, duration_minutes, watched_at)
values ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-4000-8000-000000000001', 'cccccccc-0000-4000-8000-000000000001', 50, '2026-08-01T20:00:00Z'),
       ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-4000-8000-000000000001', 'cccccccc-0000-4000-8000-000000000001', 50, '2026-08-10T20:00:00Z'),
       ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-4000-8000-000000000001', 'cccccccc-0000-4000-8000-000000000003', 50, '2026-08-05T20:00:00Z'),
       -- Registro agregado da série, sem episódio.
       ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-4000-8000-000000000001', null, 50, '2026-08-06T20:00:00Z');

-- B assiste S1E2, que A não assistiu.
insert into public.watch_events (user_id, title_id, episode_id, duration_minutes, watched_at)
values ('22222222-2222-2222-2222-222222222222', 'aaaaaaaa-0000-4000-8000-000000000001', 'cccccccc-0000-4000-8000-000000000002', 50, '2026-08-02T20:00:00Z');

select pg_temp.act_as('11111111-1111-1111-1111-111111111111');

-- ---------------------------------------------------------------------------
-- Conta por episódio, não por exibição
-- ---------------------------------------------------------------------------

-- Dois episódios distintos, ainda que um deles tenha sido visto duas vezes.
select pg_temp.expect_count('A tem dois episódios com exibição',
  $$select count(*) from public.episode_watch_counts('aaaaaaaa-0000-4000-8000-000000000001')$$, 2);

select pg_temp.expect_count('e a contagem do reassistido é dois',
  $$select count(*) from public.episode_watch_counts('aaaaaaaa-0000-4000-8000-000000000001')
    where episode_id = 'cccccccc-0000-4000-8000-000000000001' and watch_count = 2$$, 1);

-- Ausente significa nunca assistido: devolver zero para cada episódio exigiria
-- conhecer todos, que é o que o carregamento sob demanda evita.
select pg_temp.expect_count('episódio nunca assistido não aparece',
  $$select count(*) from public.episode_watch_counts('aaaaaaaa-0000-4000-8000-000000000001')
    where episode_id = 'cccccccc-0000-4000-8000-000000000002'$$, 0);

-- ---------------------------------------------------------------------------
-- A exibição mais recente vem junto
-- ---------------------------------------------------------------------------

-- É ela que a ação de desfazer apaga. Buscá-la numa consulta à parte abriria a
-- chance de a contagem e o "último" virem de estados diferentes do banco.
select pg_temp.expect_count('o último evento do episódio reassistido é o mais recente',
  $$select count(*) from public.episode_watch_counts('aaaaaaaa-0000-4000-8000-000000000001') c
    join public.watch_events w on w.id = c.latest_event_id
    where c.episode_id = 'cccccccc-0000-4000-8000-000000000001'
      and w.watched_at = (
        select max(watched_at) from public.watch_events
        where episode_id = 'cccccccc-0000-4000-8000-000000000001'
          and user_id = '11111111-1111-1111-1111-111111111111')$$, 1);

-- `max(id)` daria o maior uuid, que não tem relação com o mais recente.
select pg_temp.expect_count('e nunca é nulo quando há exibição',
  $$select count(*) from public.episode_watch_counts('aaaaaaaa-0000-4000-8000-000000000001')
    where latest_event_id is null$$, 0);

-- ---------------------------------------------------------------------------
-- O registro agregado da série não é um episódio
-- ---------------------------------------------------------------------------

-- Ele diz que a pessoa viu a série, não qual episódio: contá-lo inflaria o
-- progresso sem que nenhum episódio tivesse sido assistido.
select pg_temp.expect_count('exibição sem episódio fica de fora',
  $$select count(*) from public.episode_watch_counts('aaaaaaaa-0000-4000-8000-000000000001')
    where episode_id is null$$, 0);

-- ---------------------------------------------------------------------------
-- O número da temporada vem junto
-- ---------------------------------------------------------------------------

select pg_temp.expect_count('a temporada 1 tem um episódio assistido',
  $$select count(*) from public.episode_watch_counts('aaaaaaaa-0000-4000-8000-000000000001')
    where season_number = 1$$, 1);

select pg_temp.expect_count('e a temporada 2 também',
  $$select count(*) from public.episode_watch_counts('aaaaaaaa-0000-4000-8000-000000000001')
    where season_number = 2$$, 1);

-- ---------------------------------------------------------------------------
-- Cada conta vê só o que assistiu
-- ---------------------------------------------------------------------------

-- S1E2 foi assistido por B; se aparecesse aqui, o progresso de A contaria
-- episódio que ela nunca viu.
select pg_temp.act_as('22222222-2222-2222-2222-222222222222');

select pg_temp.expect_count('B vê só o episódio que assistiu',
  $$select count(*) from public.episode_watch_counts('aaaaaaaa-0000-4000-8000-000000000001')
    where episode_id = 'cccccccc-0000-4000-8000-000000000002' and watch_count = 1$$, 1);

select pg_temp.expect_count('e não vê os de A',
  $$select count(*) from public.episode_watch_counts('aaaaaaaa-0000-4000-8000-000000000001')$$, 1);

-- ---------------------------------------------------------------------------
-- Anônimo não conta nada
-- ---------------------------------------------------------------------------

reset role;
set local role anon;

select pg_temp.expect_failure('anon executa episode_watch_counts',
  $$select * from public.episode_watch_counts('aaaaaaaa-0000-4000-8000-000000000001')$$);

reset role;
rollback;
