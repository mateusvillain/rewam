import { describe, expect, it, vi } from 'vitest';

import type { RewamSupabaseClient } from './client';
import { DatabaseError } from './errors';
import { getWatchStats } from './watch-stats';

/**
 * A soma em si está verificada em `supabase/tests/watch_stats.sql`, contra o
 * banco, que é onde ela mora. O que falta cobrir é a fronteira: a função do
 * Postgres devolve `returns table`, então a resposta chega como lista mesmo
 * sendo sempre uma linha — e `bigint` chega como número, não como string.
 */
function fakeClient(resultado: { data?: unknown; error?: unknown }) {
  // A assinatura aceita argumentos que a chamada real não passa: é assim que o
  // teste abaixo consegue afirmar que nenhum foi enviado.
  const rpc = vi.fn(async (_fn: string, _args?: Record<string, unknown>) => ({
    data: resultado.data ?? null,
    error: resultado.error ?? null,
  }));

  return { client: { rpc } as unknown as RewamSupabaseClient, rpc };
}

const row = { total_minutes: 252, total_events: 3, unknown_duration_events: 1 };

describe('getWatchStats', () => {
  it('chama a função do banco, e não uma consulta agregada', async () => {
    const { client, rpc } = fakeClient({ data: [row] });
    await getWatchStats(client);

    // Agregado direto pelo PostgREST volta `PGRST123` neste servidor.
    expect(rpc.mock.calls[0]![0]).toBe('watch_stats');
  });

  it('não recebe usuário: o RLS é quem limita a soma', async () => {
    const { client, rpc } = fakeClient({ data: [row] });
    await getWatchStats(client);

    // A função é `security invoker` e não tem parâmetro. Um argumento aqui
    // daria a impressão de que é ele quem autoriza.
    expect(rpc.mock.calls[0]![1]).toBeUndefined();
  });

  it('desembrulha a lista que `returns table` devolve', async () => {
    const { client } = fakeClient({ data: [row] });

    await expect(getWatchStats(client)).resolves.toEqual({
      totalMinutes: 252,
      totalEvents: 3,
      unknownDurationEvents: 1,
    });
  });

  it('conta nova soma zero, e não devolve nulo', async () => {
    // O `coalesce` da função é quem garante isto; aqui se verifica que o zero
    // atravessa a validação em vez de ser recusado como ausente.
    const { client } = fakeClient({
      data: [{ total_minutes: 0, total_events: 0, unknown_duration_events: 0 }],
    });

    await expect(getWatchStats(client)).resolves.toEqual({
      totalMinutes: 0,
      totalEvents: 0,
      unknownDurationEvents: 0,
    });
  });

  it('aceita `bigint` que venha como texto', async () => {
    // O PostgREST serializa `bigint` como número, mas o `Number()` existe para
    // que uma mudança nisso não vire `NaN` silencioso na tela.
    const { client } = fakeClient({
      data: [{ total_minutes: '252', total_events: '3', unknown_duration_events: '1' }],
    });

    await expect(getWatchStats(client)).resolves.toMatchObject({ totalMinutes: 252 });
  });

  it('falha com nome próprio se a função não devolver linha', async () => {
    const { client } = fakeClient({ data: [] });

    const erro = await getWatchStats(client).catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(DatabaseError);
  });

  it('traduz o erro do PostgREST em erro tipado', async () => {
    const { client } = fakeClient({ error: { code: '42501', message: 'permission denied' } });

    const erro = await getWatchStats(client).catch((e: unknown) => e);
    expect((erro as DatabaseError).code).toBe('sem-permissao');
  });
});
