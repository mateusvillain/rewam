import type { CatalogTitle } from '@rewam/types';
import { describe, expect, it, vi } from 'vitest';

import type { RewamSupabaseClient } from './client';
import { upsertTitle } from './titles';

/**
 * O invariante de não duplicar é do banco, e está verificado em
 * `supabase/tests/title_upsert.sql`. O que falta cobrir é o outro lado: se o
 * cliente pedir a coluna de conflito errada, ou esquecer um campo no payload, o
 * banco não tem como salvar — e a suíte SQL passaria verde do mesmo jeito.
 */
function fakeClient(row: Record<string, unknown>) {
  const single = vi.fn(async () => ({ data: row, error: null }));
  const select = vi.fn((_columns: string) => ({ single }));
  const upsert = vi.fn((_values: Record<string, unknown>, _options: { onConflict: string }) => ({
    select,
  }));
  const from = vi.fn((_table: string) => ({ upsert }));

  return { client: { from } as unknown as RewamSupabaseClient, from, upsert, select };
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
  it('resolve o conflito pelo par que a constraint protege', async () => {
    const { client, from, upsert } = fakeClient(row);
    await upsertTitle(client, entrada);

    expect(from).toHaveBeenCalledWith('titles');
    // Errar esta string faria o upsert virar insert e estourar em unique_violation
    // no primeiro título repetido — em produção, não no teste.
    expect(upsert.mock.calls[0]![1]).toEqual({ onConflict: 'tmdb_id,media_type' });
  });

  it('manda todos os campos normalizados, em snake_case', async () => {
    const { client, upsert } = fakeClient(row);
    await upsertTitle(client, entrada);

    expect(upsert.mock.calls[0]![0]).toEqual({
      tmdb_id: 27205,
      media_type: 'movie',
      title: 'A Origem',
      original_title: 'Inception',
      poster_path: '/inception.jpg',
      release_date: '2010-07-15',
      runtime_minutes: 148,
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

  it('aceita duração ausente, que significa desconhecida', async () => {
    const { client, upsert } = fakeClient({ ...row, runtime_minutes: null });
    const semDuracao = await upsertTitle(client, { ...entrada, runtimeMinutes: null });

    expect(upsert.mock.calls[0]![0]).toMatchObject({ runtime_minutes: null });
    expect(semDuracao.runtimeMinutes).toBeNull();
  });

  it('recusa duração zero antes de ir ao banco, com erro legível', async () => {
    const { client, upsert } = fakeClient(row);

    // Sem isto, o que chegaria à tela seria o nome da constraint do Postgres.
    await expect(upsertTitle(client, { ...entrada, runtimeMinutes: 0 })).rejects.toThrow();
    expect(upsert).not.toHaveBeenCalled();
  });
});
