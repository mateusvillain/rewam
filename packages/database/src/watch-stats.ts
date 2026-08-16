import { watchStatsSchema, type WatchStats } from '@rewam/types';

import type { RewamSupabaseClient } from './client';
import { throwIfError } from './errors';
import { requireRow } from './rows';

export type { WatchStats };

/**
 * Total de tempo assistido da própria conta.
 *
 * Passa por uma função no banco, e não por uma consulta, porque as duas
 * alternativas não servem:
 *
 *   - somar no cliente exigiria baixar todas as exibições da conta para
 *     produzir um número, e o custo cresce com o uso inteiro;
 *   - os agregados do PostgREST (`select=duration_minutes.sum()`) resolveriam
 *     sem função, mas estão desabilitados no servidor — a requisição volta
 *     `PGRST123, Use of aggregate functions is not allowed`.
 *
 * Sem parâmetro de usuário, como o resto do pacote: a função é `security
 * invoker`, então é o RLS de `watch_events` que limita a soma às linhas de quem
 * chama. Um parâmetro aqui daria a impressão de que é ele quem autoriza.
 */
export async function getWatchStats(client: RewamSupabaseClient): Promise<WatchStats> {
  const { data, error } = await client.rpc('watch_stats');

  throwIfError(error);

  // `returns table` chega como lista, mesmo sendo sempre uma linha: agregado
  // sem `group by` não tem como devolver zero nem duas. `requireRow` cobre o
  // caso de vir vazia mesmo assim, com o mesmo erro nomeado do resto do pacote.
  const stats = requireRow(Array.isArray(data) ? data[0] : data);

  return watchStatsSchema.parse({
    // `bigint` do Postgres chega como número aqui porque os valores cabem com
    // folga em `Number`: seriam precisos mais de 17 bilhões de anos assistidos
    // para chegar perto do limite seguro.
    totalMinutes: Number(stats.total_minutes),
    totalEvents: Number(stats.total_events),
    unknownDurationEvents: Number(stats.unknown_duration_events),
  });
}
