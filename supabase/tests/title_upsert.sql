-- Verificação da escrita de catálogo (E3.4 e E3.7).
--
-- Duas promessas se apoiam no banco, não no cliente:
--   1. o upsert é idempotente, porque UNIQUE (tmdb_id, media_type) existe;
--   2. `authenticated` não escreve catálogo direto — só pela função.
--
-- Roda em transação e faz rollback: nada persiste. Com o stack local no ar:
--   pnpm db:test:title
--
-- Asserções compartilhadas e o BEGIN vêm de _helpers.sql, concatenado por run.sh.

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
values ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@example.com', '{"name": "Pessoa A"}'::jsonb);

select pg_temp.act_as('11111111-1111-1111-1111-111111111111');

-- ---------------------------------------------------------------------------
-- Escrita direta em catálogo é recusada
-- ---------------------------------------------------------------------------
--
-- O motivo da E3.7: `titles.runtime_minutes` alimenta as estatísticas de todas
-- as contas. Com update aberto, uma conta qualquer distorceria o total de quem
-- nunca ouviu falar dela.

select pg_temp.expect_failure('authenticated insere em titles direto',
  $$insert into public.titles (tmdb_id, media_type, title) values (1, 'movie', 'Direto')$$);

select pg_temp.expect_failure('authenticated insere em seasons direto',
  $$insert into public.seasons (title_id, tmdb_season_number)
    values ('00000000-0000-0000-0000-000000000000', 1)$$);

select pg_temp.expect_failure('authenticated insere em episodes direto',
  $$insert into public.episodes (title_id, season_number, episode_number)
    values ('00000000-0000-0000-0000-000000000000', 1, 1)$$);

-- ---------------------------------------------------------------------------
-- Pela função, grava
-- ---------------------------------------------------------------------------

select pg_temp.expect_count('primeira seleção cria o título',
  $$with gravado as (
      select public.upsert_title(27205, 'movie', 'A Origem', 'Inception', '/inception.jpg', '2010-07-15', 148)
    ) select count(*) from gravado$$, 1);

create temporary table primeiro_id as
select id from public.titles where tmdb_id = 27205 and media_type = 'movie';

-- ---------------------------------------------------------------------------
-- Selecionar de novo atualiza, não duplica
-- ---------------------------------------------------------------------------

select public.upsert_title(27205, 'movie', 'A Origem (corrigido)', 'Inception', '/outro.jpg', '2010-07-15', 150);

select pg_temp.expect_count('segunda seleção não duplica a linha',
  $$select count(*) from public.titles where tmdb_id = 27205 and media_type = 'movie'$$, 1);

select pg_temp.expect_count('id permanece o mesmo, para watch_events não perder a referência',
  $$select count(*) from public.titles t join primeiro_id p on p.id = t.id
    where t.tmdb_id = 27205 and t.media_type = 'movie'$$, 1);

select pg_temp.expect_count('campos foram atualizados',
  $$select count(*) from public.titles
    where tmdb_id = 27205 and media_type = 'movie'
      and title = 'A Origem (corrigido)' and runtime_minutes = 150 and poster_path = '/outro.jpg'$$, 1);

-- ---------------------------------------------------------------------------
-- Com o título existindo, alterá-lo direto continua recusado
-- ---------------------------------------------------------------------------
--
-- Esta é a asserção que dá nome à E3.7: o `insert` aberto era tolerável, o
-- `update` não. Sem ela, a suíte provaria só que não dá para criar catálogo.

select pg_temp.expect_failure('authenticated altera runtime_minutes direto',
  $$update public.titles set runtime_minutes = 1 where tmdb_id = 27205$$);

select pg_temp.expect_count('a duração continua a que a função gravou',
  $$select count(*) from public.titles
    where tmdb_id = 27205 and media_type = 'movie' and runtime_minutes = 150$$, 1);

-- ---------------------------------------------------------------------------
-- Duração já gravada não é apagada por quem não a conhece
-- ---------------------------------------------------------------------------
--
-- Quem chega pela busca não tem a duração, e omiti-la não pode significar
-- "apague". Correção com valor presente continua valendo.

select public.upsert_title(27205, 'movie', 'A Origem', 'Inception', '/inception.jpg', '2010-07-15');

select pg_temp.expect_count('duração sobrevive a upsert que não a informa',
  $$select count(*) from public.titles
    where tmdb_id = 27205 and media_type = 'movie' and runtime_minutes = 150$$, 1);

-- ---------------------------------------------------------------------------
-- A promessa é da constraint, não do `on conflict`
-- ---------------------------------------------------------------------------
--
-- A função pede `on conflict`; se a unicidade caísse, nenhum upsert seria
-- idempotente por mais correta que ela estivesse. Aqui roda como postgres,
-- porque `authenticated` já não tem insert.

set local role postgres;

select pg_temp.expect_failure('inserir o par repetido sem on conflict',
  $$insert into public.titles (tmdb_id, media_type, title)
    values (27205, 'movie', 'Duplicata')$$);

select pg_temp.act_as('11111111-1111-1111-1111-111111111111');

-- ---------------------------------------------------------------------------
-- Mesmo tmdb_id em mídia diferente é outro título
-- ---------------------------------------------------------------------------
--
-- O TMDB numera filmes e séries em sequências separadas, então o id 27205 pode
-- existir nos dois. A unicidade é do par, e não do tmdb_id sozinho.

select public.upsert_title(27205, 'tv', 'Série homônima', null, null, null, 45);

select pg_temp.expect_count('filme e série com o mesmo tmdb_id coexistem',
  $$select count(*) from public.titles where tmdb_id = 27205$$, 2);

-- ---------------------------------------------------------------------------
-- A função valida o que a tabela não valida sozinha
-- ---------------------------------------------------------------------------

select pg_temp.expect_failure('título vazio pela função',
  $$select public.upsert_title(99999, 'movie', '   ')$$);

select pg_temp.expect_failure('duração zero pela função',
  $$select public.upsert_title(99999, 'movie', 'Duração inválida', null, null, null, 0)$$);

-- ---------------------------------------------------------------------------
-- Sem sessão não há escrita de catálogo
-- ---------------------------------------------------------------------------

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

select pg_temp.expect_failure('anônimo executa a função',
  $$select public.upsert_title(12345, 'movie', 'Anônimo')$$);

reset role;
rollback;
