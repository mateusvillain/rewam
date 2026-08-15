import type { CatalogTitle } from '@rewam/types';
import { describe, expect, it, vi } from 'vitest';

import type { RewamSupabaseClient } from './client';
import { upsertTitle } from './titles';

/**
 * O invariante de não duplicar e a preservação da duração são do banco, e estão
 * verificados em `supabase/tests/title_upsert.sql`. O que falta cobrir é o
 * outro lado: se o cliente chamar a função errada, ou mandar `null` onde a
 * função espera ausência, o banco não tem como salvar — e a suíte SQL passaria
 * verde do mesmo jeito.
 */
function fakeClient(row: Record<string, unknown>) {
  const rpc = vi.fn(async (_fn: string, _args: Record<string, unknown>) => ({
    data: row,
    error: null,
  }));

  return { client: { rpc } as unknown as RewamSupabaseClient, rpc };
}

const TITLE_ID = '3f8c1c2e-9b7a-4d5e-8f21-6a0b9c7d1e23';

const row = {
  id: TITLE_ID,
  tmdb_id: 27205,
  media_type: 'movie',
  title: 'A Origem',
  original_title: 'Inception',
  poster_path: '/inception.jpg',
  release_date: '2010-07-15',
  runtime_minutes: 148,
};

const entrada: CatalogTitle = {
  tmdbId: 27205,
  mediaType: 'movie',
  title: 'A Origem',
  originalTitle: 'Inception',
  posterPath: '/inception.jpg',
  releaseDate: '2010-07-15',
  runtimeMinutes: 148,
};

describe('upsertTitle', () => {
  it('grava pela função, e não pela tabela', async () => {
    const { client, rpc } = fakeClient(row);
    await upsertTitle(client, entrada);

    // Escrever direto em `titles` seria recusado desde a E3.7: `authenticated`
    // só tem leitura em catálogo.
    expect(rpc.mock.calls[0]![0]).toBe('upsert_title');
  });

  it('manda todos os campos normalizados como argumentos da função', async () => {
    const { client, rpc } = fakeClient(row);
    await upsertTitle(client, entrada);

    expect(rpc.mock.calls[0]![1]).toEqual({
      p_tmdb_id: 27205,
      p_media_type: 'movie',
      p_title: 'A Origem',
      p_original_title: 'Inception',
      p_poster_path: '/inception.jpg',
      p_release_date: '2010-07-15',
      p_runtime_minutes: 148,
    });
  });

  it('devolve a linha gravada em camelCase, com o id que as telas usam', async () => {
    const { client } = fakeClient(row);

    await expect(upsertTitle(client, entrada)).resolves.toEqual({
      id: TITLE_ID,
      tmdbId: 27205,
      mediaType: 'movie',
      title: 'A Origem',
      originalTitle: 'Inception',
      posterPath: '/inception.jpg',
      releaseDate: '2010-07-15',
      runtimeMinutes: 148,
    });
  });

  it('omite a duração ausente em vez de mandar null', async () => {
    const { client, rpc } = fakeClient({ ...row, runtime_minutes: null });
    const semDuracao = await upsertTitle(client, { ...entrada, runtimeMinutes: null });

    // A diferença importa: `null` explícito apagaria a duração já gravada,
    // enquanto omitir cai no default e o `coalesce` da função a preserva.
    expect(rpc.mock.calls[0]![1]).not.toHaveProperty('p_runtime_minutes', null);
    expect(rpc.mock.calls[0]![1].p_runtime_minutes).toBeUndefined();
    expect(semDuracao.runtimeMinutes).toBeNull();
  });

  it('recusa duração zero antes de ir ao banco, com erro legível', async () => {
    const { client, rpc } = fakeClient(row);

    // Sem isto, o que chegaria à tela seria o nome da constraint do Postgres.
    await expect(upsertTitle(client, { ...entrada, runtimeMinutes: 0 })).rejects.toThrow();
    expect(rpc).not.toHaveBeenCalled();
  });
});
