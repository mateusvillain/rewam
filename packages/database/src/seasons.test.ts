import type { CatalogEpisode, CatalogSeason } from '@rewam/types';
import { describe, expect, it, vi } from 'vitest';

import type { RewamSupabaseClient } from './client';
import { DatabaseError } from './errors';
import { upsertEpisodes, upsertSeasons } from './seasons';

/**
 * A idempotência é do banco, e está verificada em `supabase/tests/catalog_batch.sql`.
 * O que falta cobrir é a fronteira: se este módulo mandar as chaves com outro
 * nome, chamar a função errada ou deixar passar um episódio inválido, o banco
 * não tem como salvar — e a suíte SQL passaria verde do mesmo jeito.
 */

const TITLE_ID = '0100cb59-2893-4ade-9ddc-774981d09586';

function fakeClient(resultado: { data?: unknown; error?: unknown }) {
  const rpc = vi.fn(async (_fn: string, _args?: Record<string, unknown>) => ({
    data: resultado.data ?? null,
    error: resultado.error ?? null,
  }));

  return { client: { rpc } as unknown as RewamSupabaseClient, rpc };
}

const season: CatalogSeason = {
  seasonNumber: 1,
  name: 'Temporada 1',
  episodeCount: 10,
  posterPath: '/s1.jpg',
};

const seasonRow = {
  id: 'aaaaaaaa-0000-4000-8000-000000000001',
  title_id: TITLE_ID,
  tmdb_season_number: 1,
  name: 'Temporada 1',
  episode_count: 10,
  poster_path: '/s1.jpg',
};

const episode: CatalogEpisode = {
  tmdbId: 63056,
  seasonNumber: 1,
  episodeNumber: 1,
  name: 'O Inverno Está Chegando',
  runtimeMinutes: 62,
  airDate: '2011-04-17',
};

function episodeRow(episodeNumber: number, runtime: number | null = 62) {
  return {
    id: `bbbbbbbb-0000-4000-8000-00000000000${episodeNumber}`,
    title_id: TITLE_ID,
    season_number: 1,
    episode_number: episodeNumber,
    name: `Episódio ${episodeNumber}`,
    runtime_minutes: runtime,
    air_date: '2011-04-17',
  };
}

describe('upsertSeasons', () => {
  it('grava pela função, e não pela tabela', async () => {
    const { client, rpc } = fakeClient({ data: [seasonRow] });
    await upsertSeasons(client, TITLE_ID, [season]);

    // Escrever direto em `seasons` seria recusado desde a E3.7.
    expect(rpc.mock.calls[0]![0]).toBe('upsert_seasons');
  });

  it('manda a temporada inteira numa chamada só', async () => {
    const { client, rpc } = fakeClient({
      data: [seasonRow, { ...seasonRow, tmdb_season_number: 2 }],
    });
    await upsertSeasons(client, TITLE_ID, [season, { ...season, seasonNumber: 2 }]);

    // Uma requisição por temporada faria a tela esperar por um dado que o TMDB
    // já entregou inteiro.
    expect(rpc).toHaveBeenCalledTimes(1);
    expect((rpc.mock.calls[0]![1] as { p_seasons: unknown[] }).p_seasons).toHaveLength(2);
  });

  it('usa as chaves que a função espera', async () => {
    const { client, rpc } = fakeClient({ data: [seasonRow] });
    await upsertSeasons(client, TITLE_ID, [season]);

    expect(rpc.mock.calls[0]![1]).toEqual({
      p_title_id: TITLE_ID,
      p_seasons: [
        { season_number: 1, name: 'Temporada 1', episode_count: 10, poster_path: '/s1.jpg' },
      ],
    });
  });

  it('lista vazia não vai ao banco', async () => {
    const { client, rpc } = fakeClient({ data: [] });

    await expect(upsertSeasons(client, TITLE_ID, [])).resolves.toEqual([]);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('converte a coluna do banco para o número de temporada do domínio', async () => {
    const { client } = fakeClient({ data: [seasonRow] });
    const [saved] = await upsertSeasons(client, TITLE_ID, [season]);

    // No banco é `tmdb_season_number`; no domínio o prefixo só ecoaria o
    // fornecedor.
    expect(saved).toMatchObject({ seasonNumber: 1, episodeCount: 10 });
  });
});

describe('upsertEpisodes', () => {
  it('manda a temporada inteira numa chamada só', async () => {
    const { client, rpc } = fakeClient({
      data: [episodeRow(1), episodeRow(2), episodeRow(3)],
    });

    await upsertEpisodes(client, TITLE_ID, [
      episode,
      { ...episode, tmdbId: 63057, episodeNumber: 2 },
      { ...episode, tmdbId: 63058, episodeNumber: 3 },
    ]);

    // 24 episódios seriam 24 idas e voltas de rede com a versão singular.
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc.mock.calls[0]![0]).toBe('upsert_episodes');
  });

  it('usa as chaves que a função espera', async () => {
    const { client, rpc } = fakeClient({ data: [episodeRow(1)] });
    await upsertEpisodes(client, TITLE_ID, [episode]);

    expect((rpc.mock.calls[0]![1] as { p_episodes: unknown[] }).p_episodes[0]).toEqual({
      season_number: 1,
      episode_number: 1,
      tmdb_episode_id: 63056,
      name: 'O Inverno Está Chegando',
      runtime_minutes: 62,
      air_date: '2011-04-17',
    });
  });

  it('aceita duração ausente, que é como se registra o que não se sabe', async () => {
    const { client, rpc } = fakeClient({ data: [episodeRow(1, null)] });
    const [saved] = await upsertEpisodes(client, TITLE_ID, [{ ...episode, runtimeMinutes: null }]);

    expect(
      (rpc.mock.calls[0]![1] as { p_episodes: { runtime_minutes: unknown }[] }).p_episodes[0],
    ).toMatchObject({ runtime_minutes: null });
    expect(saved!.runtimeMinutes).toBeNull();
  });

  it('recusa duração zero antes de ir ao banco', async () => {
    const { client, rpc } = fakeClient({ data: [episodeRow(1)] });

    // Sem isto, o que chegaria à tela seria `episodes_runtime_minutes_check`.
    await expect(
      upsertEpisodes(client, TITLE_ID, [{ ...episode, runtimeMinutes: 0 }]),
    ).rejects.toThrow();
    expect(rpc).not.toHaveBeenCalled();
  });

  it('devolve em ordem de episódio, mesmo se o banco não devolver', async () => {
    const { client } = fakeClient({ data: [episodeRow(3), episodeRow(1), episodeRow(2)] });
    const saved = await upsertEpisodes(client, TITLE_ID, [episode]);

    // A ordem de um `insert ... returning` não é garantida, e a tela lista
    // episódios em ordem.
    expect(saved.map((e) => e.episodeNumber)).toEqual([1, 2, 3]);
  });

  it('lista vazia não vai ao banco', async () => {
    const { client, rpc } = fakeClient({ data: [] });

    await expect(upsertEpisodes(client, TITLE_ID, [])).resolves.toEqual([]);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('falha com nome próprio se a função não devolver lista', async () => {
    const { client } = fakeClient({ data: null });

    // Gravar N e receber outra coisa é a função ou o payload errados, não dado
    // ausente — e sem isto seria uma lista vazia a depurar na tela.
    await expect(upsertEpisodes(client, TITLE_ID, [episode])).rejects.toBeInstanceOf(DatabaseError);
  });

  it('traduz o erro do PostgREST em erro tipado', async () => {
    const { client } = fakeClient({ error: { code: '42501', message: 'permission denied' } });

    const erro = await upsertEpisodes(client, TITLE_ID, [episode]).catch((e: unknown) => e);
    expect((erro as DatabaseError).code).toBe('sem-permissao');
  });
});
