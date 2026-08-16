-- Total de tempo assistido.
--
-- A tela de início responde "quanto tempo eu já dediquei", e essa soma precisa
-- vir do banco somada. As alternativas foram descartadas por motivo, não por
-- gosto:
--
--   1. Somar no cliente exigiria baixar todas as exibições da conta para
--      produzir um número. O custo cresce com o uso inteiro, e a tela de início
--      é a primeira coisa que abre depois do login.
--   2. Os agregados do PostgREST (`select=duration_minutes.sum()`) resolveriam
--      sem função, mas estão desabilitados neste servidor — a requisição volta
--      `PGRST123, Use of aggregate functions is not allowed`.
--
-- `security invoker` de propósito, ao contrário de `delete_own_account`: esta
-- função não precisa de privilégio nenhum além do que a pessoa já tem, e rodando
-- como quem chama é o próprio RLS de `watch_events` que limita a soma às linhas
-- da conta. Um `security definer` aqui somaria o banco inteiro se o `where`
-- fosse esquecido — e não haveria `where`, porque não há parâmetro.

create function public.watch_stats()
returns table (
  total_minutes bigint,
  total_events bigint,
  unknown_duration_events bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    -- `coalesce` no lugar certo: `sum` de conjunto vazio devolve NULL, e quem
    -- nunca registrou nada tem zero minutos, não "desconhecido".
    coalesce(sum(w.duration_minutes), 0)::bigint,
    count(*)::bigint,
    -- Duração ausente fica fora da soma pela própria semântica de `sum`, que
    -- ignora NULL. Contá-las à parte é o que permite a tela dizer que o total
    -- está incompleto, em vez de apresentá-lo como a verdade inteira.
    count(*) filter (where w.duration_minutes is null)::bigint
  from public.watch_events w;
$$;

comment on function public.watch_stats() is
  'Total assistido de quem chama. O RLS de watch_events é quem limita as linhas.';

revoke execute on function public.watch_stats() from public, anon;
grant execute on function public.watch_stats() to authenticated;
