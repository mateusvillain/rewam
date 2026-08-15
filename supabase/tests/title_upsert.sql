-- Verificação da escrita de catálogo (E3.4 e E3.7).
--
-- Três promessas se apoiam no banco, não no cliente:
--   1. o upsert é idempotente, porque UNIQUE (tmdb_id, media_type) existe;
--   2. `authenticated` não escreve catálogo direto — só pela função;
--   3. duração gravada não é reescrita por ninguém, que é o risco que motivou
--      a E3.7.
--
-- Roda em transação e faz rollback: nada persiste. Com o stack local no ar:
--   pnpm db:test:title
--
-- Asserções compartilhadas e o BEGIN vêm de _helpers.sql, concatenado por run.sh.

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
values ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@example.com', '{"name": "Pessoa A"}'::jsonb),
       ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@example.com', '{"name": "Pessoa B"}'::jsonb);

-- Título existente, criado aqui como postgres. Sem ele, as asserções de escrita
-- direta em seasons e episodes usariam um title_id inventado e seriam recusadas
-- por chave estrangeira — que o expect_failure também aceita. Passariam verdes
-- mesmo se os privilégios fossem reabertos, provando nada.
insert into public.titles (id, tmdb_id, media_type, title)
values ('aaaaaaaa-0000-4000-8000-000000000001', 550, 'tv', 'Série existente');

select pg_temp.act_as('11111111-1111-1111-1111-111111111111');

-- ---------------------------------------------------------------------------
-- Escrita direta em catálogo é recusada
-- ---------------------------------------------------------------------------

select pg_temp.expect_failure('authenticated insere em titles direto',
  $$insert into public.titles (tmdb_id, media_type, title) values (1, 'movie', 'Direto')$$);

select pg_temp.expect_failure('authenticated insere em seasons direto',
  $$insert into public.seasons (title_id, tmdb_season_number)
    values ('aaaaaaaa-0000-4000-8000-000000000001', 1)$$);

select pg_temp.expect_failure('authenticated insere em episodes direto',
  $$insert into public.episodes (title_id, season_number, episode_number)
    values ('aaaaaaaa-0000-4000-8000-000000000001', 1, 1)$$);

select pg_temp.expect_failure('authenticated altera runtime_minutes direto',
  $$update public.titles set runtime_minutes = 1 where tmdb_id = 550$$);

-- ---------------------------------------------------------------------------
-- Pela função, grava
-- ---------------------------------------------------------------------------

select public.upsert_title(27205, 'movie', 'A Origem', 'Inception', '/inception.jpg', '2010-07-15', 148);

select pg_temp.expect_count('primeira seleção cria o título com os campos informados',
  $$select count(*) from public.titles
    where tmdb_id = 27205 and media_type = 'movie'
      and title = 'A Origem' and runtime_minutes = 148 and poster_path = '/inception.jpg'$$, 1);

create temporary table primeiro_id as
select id from public.titles where tmdb_id = 27205 and media_type = 'movie';

-- ---------------------------------------------------------------------------
-- Selecionar de novo atualiza apresentação, não duplica
-- ---------------------------------------------------------------------------

select public.upsert_title(27205, 'movie', 'A Origem (corrigido)', 'Inception', '/outro.jpg', '2010-07-15', 148);

select pg_temp.expect_count('segunda seleção não duplica a linha',
  $$select count(*) from public.titles where tmdb_id = 27205 and media_type = 'movie'$$, 1);

select pg_temp.expect_count('id permanece o mesmo, para watch_events não perder a referência',
  $$select count(*) from public.titles t join primeiro_id p on p.id = t.id
    where t.tmdb_id = 27205 and t.media_type = 'movie'$$, 1);

select pg_temp.expect_count('título e pôster foram atualizados',
  $$select count(*) from public.titles
    where tmdb_id = 27205 and title = 'A Origem (corrigido)' and poster_path = '/outro.jpg'$$, 1);

-- ---------------------------------------------------------------------------
-- Duração gravada é imutável, mesmo pela função
-- ---------------------------------------------------------------------------
--
-- Esta é a asserção que dá nome à E3.7. Fechar o `update` direto não bastaria:
-- se a função aceitasse a duração que chega, o ataque seria o mesmo, só que por
-- RPC. Quem observa primeiro grava; ninguém reescreve depois.

select pg_temp.act_as('22222222-2222-2222-2222-222222222222');

select public.upsert_title(27205, 'movie', 'A Origem', 'Inception', '/inception.jpg', '2010-07-15', 1);

select pg_temp.expect_count('outra conta não rebaixa a duração pela função',
  $$select count(*) from public.titles
    where tmdb_id = 27205 and media_type = 'movie' and runtime_minutes = 148$$, 1);

select public.upsert_title(27205, 'movie', 'A Origem', 'Inception', '/inception.jpg', '2010-07-15');

select pg_temp.expect_count('duração sobrevive a upsert que não a informa',
  $$select count(*) from public.titles
    where tmdb_id = 27205 and media_type = 'movie' and runtime_minutes = 148$$, 1);

select pg_temp.act_as('11111111-1111-1111-1111-111111111111');

-- ---------------------------------------------------------------------------
-- Duração ausente na criação pode ser preenchida depois
-- ---------------------------------------------------------------------------
--
-- Imutável não é o mesmo que "só na criação": um título gravado sem duração
-- ainda não tem o que proteger, então a primeira duração que aparecer vale.

select public.upsert_title(77777, 'movie', 'Sem duração ainda');
select public.upsert_title(77777, 'movie', 'Sem duração ainda', null, null, null, 95);

select pg_temp.expect_count('primeira duração observada preenche o que estava nulo',
  $$select count(*) from public.titles
    where tmdb_id = 77777 and media_type = 'movie' and runtime_minutes = 95$$, 1);

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
-- Temporada e episódio seguem as mesmas regras
-- ---------------------------------------------------------------------------

select public.upsert_season('aaaaaaaa-0000-4000-8000-000000000001', 1, 'Primeira temporada', 7, '/t1.jpg');

select pg_temp.expect_count('temporada gravada pela função',
  $$select count(*) from public.seasons
    where title_id = 'aaaaaaaa-0000-4000-8000-000000000001' and tmdb_season_number = 1
      and episode_count = 7$$, 1);

select public.upsert_season('aaaaaaaa-0000-4000-8000-000000000001', 1, 'Primeira temporada');

select pg_temp.expect_count('temporada não duplica e mantém a contagem que não veio',
  $$select count(*) from public.seasons
    where title_id = 'aaaaaaaa-0000-4000-8000-000000000001' and episode_count = 7$$, 1);

select public.upsert_episode('aaaaaaaa-0000-4000-8000-000000000001', 1, 1, 62085, 'Piloto', 58, '2008-01-20');

select pg_temp.expect_count('episódio gravado e ligado à temporada',
  $$select count(*) from public.episodes e
    join public.seasons s on s.id = e.season_id
    where e.title_id = 'aaaaaaaa-0000-4000-8000-000000000001'
      and e.episode_number = 1 and e.runtime_minutes = 58 and s.tmdb_season_number = 1$$, 1);

select public.upsert_episode('aaaaaaaa-0000-4000-8000-000000000001', 1, 1, 62085, 'Piloto', 1);

select pg_temp.expect_count('duração de episódio também é imutável',
  $$select count(*) from public.episodes
    where title_id = 'aaaaaaaa-0000-4000-8000-000000000001'
      and episode_number = 1 and runtime_minutes = 58$$, 1);

-- ---------------------------------------------------------------------------
-- Sem sessão não há escrita de catálogo
-- ---------------------------------------------------------------------------

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

select pg_temp.expect_failure('anônimo executa upsert_title',
  $$select public.upsert_title(12345, 'movie', 'Anônimo')$$);

select pg_temp.expect_failure('anônimo executa upsert_season',
  $$select public.upsert_season('aaaaaaaa-0000-4000-8000-000000000001', 9)$$);

select pg_temp.expect_failure('anônimo executa upsert_episode',
  $$select public.upsert_episode('aaaaaaaa-0000-4000-8000-000000000001', 9, 1)$$);

reset role;
rollback;
