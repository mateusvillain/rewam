-- Verificação do upsert de título (E3.4).
--
-- O que interessa aqui é a idempotência: selecionar o mesmo título duas vezes
-- precisa atualizar a linha e devolver o mesmo id, nunca criar outra. Quem
-- garante isso é a constraint UNIQUE (tmdb_id, media_type) — o cliente só pede
-- `on conflict`, então é no banco que a promessa se sustenta ou cai.
--
-- Roda em transação e faz rollback: nada persiste. Com o stack local no ar:
--   pnpm db:test:title
--
-- Asserções compartilhadas e o BEGIN vêm de _helpers.sql, concatenado por run.sh.

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
values ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@example.com', '{"name": "Pessoa A"}'::jsonb);

select pg_temp.act_as('11111111-1111-1111-1111-111111111111');

-- ---------------------------------------------------------------------------
-- Primeira seleção cria a linha
-- ---------------------------------------------------------------------------

insert into public.titles (tmdb_id, media_type, title, original_title, poster_path, release_date, runtime_minutes)
values (27205, 'movie', 'A Origem', 'Inception', '/inception.jpg', '2010-07-15', 148)
on conflict (tmdb_id, media_type) do update set
  title = excluded.title,
  original_title = excluded.original_title,
  poster_path = excluded.poster_path,
  release_date = excluded.release_date,
  runtime_minutes = excluded.runtime_minutes;

select pg_temp.expect_count('título criado na primeira seleção',
  $$select count(*) from public.titles where tmdb_id = 27205 and media_type = 'movie'$$, 1);

create temporary table primeiro_id as
select id from public.titles where tmdb_id = 27205 and media_type = 'movie';

-- ---------------------------------------------------------------------------
-- Selecionar de novo atualiza, não duplica
-- ---------------------------------------------------------------------------

insert into public.titles (tmdb_id, media_type, title, original_title, poster_path, release_date, runtime_minutes)
values (27205, 'movie', 'A Origem (title novo)', 'Inception', '/outro.jpg', '2010-07-15', 150)
on conflict (tmdb_id, media_type) do update set
  title = excluded.title,
  original_title = excluded.original_title,
  poster_path = excluded.poster_path,
  release_date = excluded.release_date,
  runtime_minutes = excluded.runtime_minutes;

select pg_temp.expect_count('segunda seleção não duplica a linha',
  $$select count(*) from public.titles where tmdb_id = 27205 and media_type = 'movie'$$, 1);

select pg_temp.expect_count('id permanece o mesmo, para watch_events não perder a referência',
  $$select count(*) from public.titles t join primeiro_id p on p.id = t.id
    where t.tmdb_id = 27205 and t.media_type = 'movie'$$, 1);

select pg_temp.expect_count('campos foram atualizados',
  $$select count(*) from public.titles
    where tmdb_id = 27205 and media_type = 'movie'
      and title = 'A Origem (title novo)' and runtime_minutes = 150 and poster_path = '/outro.jpg'$$, 1);

-- ---------------------------------------------------------------------------
-- Mesmo tmdb_id em mídia diferente é outro título
-- ---------------------------------------------------------------------------
--
-- O TMDB numera filmes e séries em sequências separadas, então o id 27205 pode
-- existir nos dois. A unicidade é do par, e não do tmdb_id sozinho.

insert into public.titles (tmdb_id, media_type, title, runtime_minutes)
values (27205, 'tv', 'Série homônima', 45)
on conflict (tmdb_id, media_type) do update set title = excluded.title;

select pg_temp.expect_count('filme e série com o mesmo tmdb_id coexistem',
  $$select count(*) from public.titles where tmdb_id = 27205$$, 2);

-- ---------------------------------------------------------------------------
-- Duração continua obrigada a ser positiva ou ausente
-- ---------------------------------------------------------------------------
--
-- A normalização já converte o zero do TMDB em NULL. Isto verifica que, se ela
-- falhar, o banco recusa em vez de guardar "filme de zero minuto".

select pg_temp.expect_failure('upsert com duração zero',
  $$insert into public.titles (tmdb_id, media_type, title, runtime_minutes)
    values (99999, 'movie', 'Duração inválida', 0)$$);

select pg_temp.expect_count('duração ausente é aceita, porque significa desconhecida',
  $$with gravado as (
      insert into public.titles (tmdb_id, media_type, title, runtime_minutes)
      values (88888, 'movie', 'Sem duração', null)
      returning 1
    ) select count(*) from gravado$$, 1);

rollback;
