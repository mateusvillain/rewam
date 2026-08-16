-- Verificação da gravação de temporadas e episódios em lote (E5.1).
--
-- Três promessas se apoiam no banco, não no cliente:
--   1. abrir a mesma temporada duas vezes atualiza, não duplica;
--   2. duração já gravada não é apagada por uma chamada posterior sem o dado —
--      é ela que alimenta o tempo assistido de séries;
--   3. anônimo não grava catálogo, como nas funções singulares da E3.7.
--
-- Roda em transação e faz rollback: nada persiste. Com o stack local no ar:
--   pnpm db:test:batch
--
-- Asserções compartilhadas e o BEGIN vêm de _helpers.sql, concatenado por run.sh.

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
values ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@example.com', '{"name": "Pessoa A"}'::jsonb);

-- `tmdb_id` alto de propósito: um id real colidiria com o catálogo que o app
-- grava ao abrir uma série, e a suíte falharia conforme o banco local fosse
-- usado — verde na CI, vermelha na máquina de quem desenvolve.
insert into public.titles (id, tmdb_id, media_type, title)
values ('aaaaaaaa-0000-4000-8000-000000000001', 99900002, 'tv', 'Série de teste');

select pg_temp.act_as('11111111-1111-1111-1111-111111111111');

-- ---------------------------------------------------------------------------
-- Temporadas
-- ---------------------------------------------------------------------------

select public.upsert_seasons('aaaaaaaa-0000-4000-8000-000000000001', $json$[
  {"season_number": 0, "name": "Especiais", "episode_count": null, "poster_path": null},
  {"season_number": 1, "name": "Temporada 1", "episode_count": 3, "poster_path": "/s1.jpg"}
]$json$::jsonb);

-- Temporada 0 existe no TMDB (especiais), e o schema aceita zero de propósito.
select pg_temp.expect_count('grava as duas temporadas, incluindo a de especiais',
  $$select count(*) from public.seasons
    where title_id = 'aaaaaaaa-0000-4000-8000-000000000001'$$, 2);

-- ---------------------------------------------------------------------------
-- Episódios: idempotência
-- ---------------------------------------------------------------------------

select public.upsert_episodes('aaaaaaaa-0000-4000-8000-000000000001', $json$[
  {"season_number": 1, "episode_number": 1, "tmdb_episode_id": 900001, "name": "Piloto", "runtime_minutes": 45, "air_date": "2020-01-01"},
  {"season_number": 1, "episode_number": 2, "tmdb_episode_id": 900002, "name": "Segundo", "runtime_minutes": null, "air_date": null}
]$json$::jsonb);

select pg_temp.expect_count('grava os dois episódios',
  $$select count(*) from public.episodes
    where title_id = 'aaaaaaaa-0000-4000-8000-000000000001'$$, 2);

-- O episódio é ligado à temporada correspondente quando ela já existe. A coluna
-- é `on delete set null` e não identifica o episódio, mas é o que permite
-- agrupar sem recalcular pelo número.
select pg_temp.expect_count('liga o episódio à temporada já gravada',
  $$select count(*) from public.episodes e
    join public.seasons s on s.id = e.season_id
    where e.title_id = 'aaaaaaaa-0000-4000-8000-000000000001' and s.tmdb_season_number = 1$$, 2);

create temporary table primeiros_ids as
select id, episode_number from public.episodes
where title_id = 'aaaaaaaa-0000-4000-8000-000000000001';

-- Abrir a mesma temporada de novo: o critério central da issue.
select public.upsert_episodes('aaaaaaaa-0000-4000-8000-000000000001', $json$[
  {"season_number": 1, "episode_number": 1, "tmdb_episode_id": 900001, "name": "Piloto (revisado)", "runtime_minutes": null, "air_date": "2020-01-01"},
  {"season_number": 1, "episode_number": 2, "tmdb_episode_id": 900002, "name": "Segundo", "runtime_minutes": 30, "air_date": null}
]$json$::jsonb);

select pg_temp.expect_count('abrir a temporada duas vezes não duplica',
  $$select count(*) from public.episodes
    where title_id = 'aaaaaaaa-0000-4000-8000-000000000001'$$, 2);

select pg_temp.expect_count('e mantém os mesmos ids',
  $$select count(*) from public.episodes e
    join primeiros_ids p on p.id = e.id and p.episode_number = e.episode_number$$, 2);

-- A apresentação é sobrescrita pelo que chegar.
select pg_temp.expect_count('nome é atualizado pela chamada nova',
  $$select count(*) from public.episodes
    where title_id = 'aaaaaaaa-0000-4000-8000-000000000001'
      and episode_number = 1 and name = 'Piloto (revisado)'$$, 1);

-- ---------------------------------------------------------------------------
-- Duração: gravada uma vez, nunca apagada
-- ---------------------------------------------------------------------------

-- A segunda chamada mandou `null` para o episódio 1, que já tinha 45.
select pg_temp.expect_count('duração já gravada sobrevive a uma chamada sem o dado',
  $$select count(*) from public.episodes
    where title_id = 'aaaaaaaa-0000-4000-8000-000000000001'
      and episode_number = 1 and runtime_minutes = 45$$, 1);

-- E o episódio 2, que não tinha duração, passou a ter.
select pg_temp.expect_count('duração ausente é preenchida quando o dado aparece',
  $$select count(*) from public.episodes
    where title_id = 'aaaaaaaa-0000-4000-8000-000000000001'
      and episode_number = 2 and runtime_minutes = 30$$, 1);

-- ---------------------------------------------------------------------------
-- Entrada malformada falha com mensagem própria
-- ---------------------------------------------------------------------------

-- Sem esta guarda, `jsonb_array_elements` reclamaria de tipos, o que não ajuda
-- ninguém a achar a chamada errada.
select pg_temp.expect_failure_code('objeto no lugar de lista',
  $$select public.upsert_episodes('aaaaaaaa-0000-4000-8000-000000000001', '{"season_number": 1}'::jsonb)$$,
  '22023');

-- ---------------------------------------------------------------------------
-- Lote com episódio repetido
-- ---------------------------------------------------------------------------

-- `ON CONFLICT DO UPDATE` recusa tocar a mesma linha duas vezes na mesma
-- instrução (21000). Sem a dedupe, uma temporada com episódio repetido derruba
-- o lote inteiro — e o erro não diz qual linha causou.
select public.upsert_episodes('aaaaaaaa-0000-4000-8000-000000000001', $json$[
  {"season_number": 2, "episode_number": 1, "name": "primeira"},
  {"season_number": 2, "episode_number": 1, "name": "última vence"}
]$json$::jsonb);

select pg_temp.expect_count('episódio repetido no lote grava uma linha só',
  $$select count(*) from public.episodes
    where title_id = 'aaaaaaaa-0000-4000-8000-000000000001' and season_number = 2$$, 1);

select pg_temp.expect_count('e a última ocorrência é a que vale',
  $$select count(*) from public.episodes
    where title_id = 'aaaaaaaa-0000-4000-8000-000000000001'
      and season_number = 2 and name = 'última vence'$$, 1);

select pg_temp.expect_count('a dedupe também vale para temporadas',
  $$select count(*) from public.upsert_seasons('aaaaaaaa-0000-4000-8000-000000000001',
    '[{"season_number": 9, "name": "a"}, {"season_number": 9, "name": "b"}]'::jsonb)$$, 1);

-- ---------------------------------------------------------------------------
-- Anônimo não grava catálogo
-- ---------------------------------------------------------------------------

reset role;
set local role anon;

select pg_temp.expect_failure('anon grava episódios em lote',
  $$select public.upsert_episodes('aaaaaaaa-0000-4000-8000-000000000001', '[]'::jsonb)$$);

select pg_temp.expect_failure('anon grava temporadas em lote',
  $$select public.upsert_seasons('aaaaaaaa-0000-4000-8000-000000000001', '[]'::jsonb)$$);

reset role;
rollback;
