-- Gravação de temporadas e episódios em lote.
--
-- `upsert_episode` (singular) resolve um episódio por vez, e é isso que a torna
-- inadequada aqui: abrir uma temporada de 24 episódios seriam 24 requisições ao
-- PostgREST, cada uma com sua ida e volta de rede. A pessoa esperaria por um
-- dado que o TMDB já entregou inteiro numa resposta só.
--
-- A entrada é `jsonb` em vez de arrays paralelos de propósito: sete arrays que
-- precisam ter o mesmo comprimento é um invariante que ninguém consegue
-- garantir do lado do cliente, e cujo erro seria episódio com o nome do
-- vizinho.
--
-- `security definer` pelo mesmo motivo de `upsert_episode`: desde a E3.7 o papel
-- `authenticated` só lê catálogo, e a escrita passa por função. A guarda de
-- sessão é a mesma.

create function public.upsert_episodes(p_title_id uuid, p_episodes jsonb)
returns setof public.episodes
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Só uma sessão autenticada pode gravar catálogo.'
      using errcode = 'insufficient_privilege';
  end if;

  -- Um payload que não seja lista é erro de programação, não dado ausente:
  -- `jsonb_array_elements` falharia com uma mensagem sobre tipos, que não
  -- ajudaria ninguém a achar a chamada errada.
  if p_episodes is null or jsonb_typeof(p_episodes) <> 'array' then
    raise exception 'p_episodes precisa ser uma lista JSON de episódios.'
      using errcode = 'invalid_parameter_value';
  end if;

  return query
  insert into public.episodes as e (
    title_id, season_id, season_number, episode_number, tmdb_episode_id, name,
    runtime_minutes, air_date
  )
  select
    p_title_id,
    -- A temporada correspondente, quando já gravada. Nulo se ainda não existir:
    -- a coluna é `on delete set null` e o episódio não depende dela para ser
    -- identificado.
    (select s.id from public.seasons s
      where s.title_id = p_title_id
        and s.tmdb_season_number = (item->>'season_number')::integer),
    (item->>'season_number')::integer,
    (item->>'episode_number')::integer,
    (item->>'tmdb_episode_id')::integer,
    item->>'name',
    (item->>'runtime_minutes')::integer,
    (item->>'air_date')::date
  from jsonb_array_elements(p_episodes) as item
  on conflict (title_id, season_number, episode_number) do update set
    season_id = coalesce(excluded.season_id, e.season_id),
    tmdb_episode_id = coalesce(excluded.tmdb_episode_id, e.tmdb_episode_id),
    name = excluded.name,
    -- Mesma regra da duração de título e da versão singular, pelo mesmo motivo:
    -- duração de episódio alimenta o tempo assistido de séries, e uma chamada
    -- posterior sem o dado não pode apagar o que já se sabia.
    runtime_minutes = coalesce(e.runtime_minutes, excluded.runtime_minutes),
    air_date = excluded.air_date
  returning e.*;
end;
$$;

comment on function public.upsert_episodes(uuid, jsonb) is
  'Grava ou atualiza vários episódios de uma vez. Idempotente por (title_id, season_number, episode_number).';

revoke execute on function public.upsert_episodes(uuid, jsonb) from public, anon;
grant execute on function public.upsert_episodes(uuid, jsonb) to authenticated;


-- As temporadas têm o mesmo problema em menor escala: uma série longa passa de
-- vinte, e o detalhe grava todas ao abrir. Mesmo formato de entrada e mesma
-- guarda de sessão da função de episódios acima.

create function public.upsert_seasons(p_title_id uuid, p_seasons jsonb)
returns setof public.seasons
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Só uma sessão autenticada pode gravar catálogo.'
      using errcode = 'insufficient_privilege';
  end if;

  if p_seasons is null or jsonb_typeof(p_seasons) <> 'array' then
    raise exception 'p_seasons precisa ser uma lista JSON de temporadas.'
      using errcode = 'invalid_parameter_value';
  end if;

  return query
  insert into public.seasons as s (title_id, tmdb_season_number, name, episode_count, poster_path)
  select
    p_title_id,
    (item->>'season_number')::integer,
    item->>'name',
    (item->>'episode_count')::integer,
    item->>'poster_path'
  from jsonb_array_elements(p_seasons) as item
  on conflict (title_id, tmdb_season_number) do update set
    name = excluded.name,
    -- `episode_count` não entra em cálculo de tempo assistido, mas orienta a
    -- listagem: preservá-lo evita que uma chamada sem o dado esvazie a lista.
    episode_count = coalesce(excluded.episode_count, s.episode_count),
    poster_path = excluded.poster_path
  returning s.*;
end;
$$;

comment on function public.upsert_seasons(uuid, jsonb) is
  'Grava ou atualiza várias temporadas de uma vez. Idempotente por (title_id, tmdb_season_number).';

revoke execute on function public.upsert_seasons(uuid, jsonb) from public, anon;
grant execute on function public.upsert_seasons(uuid, jsonb) to authenticated;
