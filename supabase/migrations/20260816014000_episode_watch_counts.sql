-- Quantas vezes cada episódio de uma série foi assistido.
--
-- O detalhe de série mostra progresso: episódios assistidos sobre o total, por
-- temporada e da série inteira. Isso é uma agregação, e as três formas de
-- obtê-la sem função no banco não servem:
--
--   1. baixar os eventos da série e contar no cliente cresce com o uso — uma
--      série longa reassistida tem centenas de eventos para produzir um par de
--      números;
--   2. uma consulta por episódio seriam dezenas de requisições por temporada;
--   3. os agregados do PostgREST estão desabilitados neste servidor (`PGRST123`).
--
-- Devolve `season_number` junto de propósito: sem ele, o progresso por
-- temporada exigiria ter carregado os episódios de todas as temporadas só para
-- saber a qual cada evento pertence — e o briefing carrega uma temporada por
-- vez. Com ele, a tela mostra o progresso de uma temporada fechada.
--
-- `security invoker`, como `watch_stats`: a função não precisa de privilégio
-- além do que a pessoa já tem, e é o RLS de `watch_events` que limita a
-- contagem aos eventos dela. Um `security definer` contaria os de todo mundo.

create function public.episode_watch_counts(p_title_id uuid)
returns table (
  episode_id uuid,
  season_number integer,
  watch_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select w.episode_id, e.season_number, count(*)::bigint
  from public.watch_events w
  join public.episodes e on e.id = w.episode_id
  where w.title_id = p_title_id
    -- Registro agregado de série (`episode_id` nulo) não conta como episódio
    -- assistido: ele diz que a pessoa viu a série, não qual episódio.
    and w.episode_id is not null
  group by w.episode_id, e.season_number;
$$;

comment on function public.episode_watch_counts(uuid) is
  'Contagem de exibições por episódio de uma série. O RLS de watch_events limita as linhas a quem chama.';

revoke execute on function public.episode_watch_counts(uuid) from public, anon;
grant execute on function public.episode_watch_counts(uuid) to authenticated;
