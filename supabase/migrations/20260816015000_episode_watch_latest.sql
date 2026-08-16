-- A contagem por episódio passa a trazer também a exibição mais recente.
--
-- A E5.2 usava esta função só para o progresso, e contar bastava. Com a ação de
-- marcar episódio (E5.3) vem a de desfazer, e desfazer precisa saber *qual*
-- evento apagar.
--
-- Trazer o id junto, e não numa consulta à parte, poupa uma requisição por
-- episódio no momento do toque — e, mais importante, evita que a contagem e o
-- "último" venham de estados diferentes do banco: a tela diria "assistido 3
-- vezes" e apagaria um evento que a contagem não viu.
--
-- `array_agg` ordenado em vez de `max(id)`: o maior uuid não é o mais recente.
-- O desempate por `id` repete o de `getTitleWatchSummary`, para que dois toques
-- no mesmo segundo não deixem "o último" a cargo da sorte.
--
-- `drop` antes de `create`: mudar o tipo de retorno de uma função não é
-- possível com `create or replace`.

drop function if exists public.episode_watch_counts(uuid);

create function public.episode_watch_counts(p_title_id uuid)
returns table (
  episode_id uuid,
  season_number integer,
  watch_count bigint,
  latest_event_id uuid
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    w.episode_id,
    e.season_number,
    count(*)::bigint,
    (array_agg(w.id order by w.watched_at desc, w.id desc))[1]
  from public.watch_events w
  join public.episodes e on e.id = w.episode_id
  where w.title_id = p_title_id
    -- Registro agregado de série (`episode_id` nulo) não conta como episódio
    -- assistido: ele diz que a pessoa viu a série, não qual episódio.
    and w.episode_id is not null
  group by w.episode_id, e.season_number;
$$;

comment on function public.episode_watch_counts(uuid) is
  'Contagem e exibição mais recente por episódio. O RLS de watch_events limita as linhas a quem chama.';

revoke execute on function public.episode_watch_counts(uuid) from public, anon;
grant execute on function public.episode_watch_counts(uuid) to authenticated;
