import {
  catalogEpisodeSchema,
  catalogSeasonSchema,
  episodeWatchCountIdSchema,
  type CatalogEpisode,
  type CatalogSeason,
  type Episode,
  type Season,
} from '@rewam/types';

import type { RewamSupabaseClient } from './client';
import { throwIfError } from './errors';
import { requireRows, toEpisode, toSeason } from './rows';

export type { Episode, Season };

/**
 * Cópia local do catálogo de uma série: temporadas e episódios.
 *
 * `watch_events` referencia `episodes.id`, então o episódio precisa existir
 * aqui antes de ser marcado — como o título precisa existir antes de um filme
 * ser registrado. A diferença é a escala: um filme é uma linha, uma temporada
 * são dezenas, e o briefing proíbe baixar o catálogo inteiro. Daí a gravação
 * por temporada, sob demanda.
 *
 * Ambas passam por função no banco, e não pelas tabelas: desde a E3.7 o papel
 * `authenticated` só tem leitura em catálogo.
 */

/**
 * Grava as temporadas de uma série numa chamada só.
 *
 * Em lote porque uma série longa passa de vinte temporadas, e o detalhe grava
 * todas ao abrir: uma requisição por temporada faria a tela esperar por um
 * dado que o TMDB já entregou inteiro.
 */
export async function upsertSeasons(
  client: RewamSupabaseClient,
  titleId: string,
  seasons: ReadonlyArray<CatalogSeason>,
): Promise<Season[]> {
  // Nada a gravar não é erro: série sem temporada listada continua exibível, e
  // uma chamada com lista vazia só gastaria a ida ao banco.
  if (seasons.length === 0) return [];

  const payload = seasons.map((season) => {
    const parsed = catalogSeasonSchema.parse(season);
    return {
      season_number: parsed.seasonNumber,
      name: parsed.name,
      episode_count: parsed.episodeCount,
      poster_path: parsed.posterPath,
    };
  });

  const { data, error } = await client.rpc('upsert_seasons', {
    p_title_id: titleId,
    p_seasons: payload,
  });

  throwIfError(error);

  return requireRows(data, 'temporadas').map(toSeason);
}

/**
 * Grava os episódios de uma temporada numa chamada só.
 *
 * Idempotente por `(title_id, season_number, episode_number)`: abrir a mesma
 * temporada duas vezes atualiza a cópia local em vez de duplicar. A duração já
 * gravada nunca é apagada por uma chamada posterior sem o dado — é ela que
 * alimenta o tempo assistido de séries.
 */
export async function upsertEpisodes(
  client: RewamSupabaseClient,
  titleId: string,
  episodes: ReadonlyArray<CatalogEpisode>,
): Promise<Episode[]> {
  if (episodes.length === 0) return [];

  const payload = episodes.map((episode) => {
    // Validar na entrada evita que a constraint `episodes_runtime_minutes_check`
    // chegue à tela como se fosse mensagem para gente ler.
    const parsed = catalogEpisodeSchema.parse(episode);
    return {
      season_number: parsed.seasonNumber,
      episode_number: parsed.episodeNumber,
      tmdb_episode_id: parsed.tmdbId,
      name: parsed.name,
      runtime_minutes: parsed.runtimeMinutes,
      air_date: parsed.airDate,
    };
  });

  const { data, error } = await client.rpc('upsert_episodes', {
    p_title_id: titleId,
    p_episodes: payload,
  });

  throwIfError(error);

  return (
    requireRows(data, 'episódios')
      .map(toEpisode)
      // A ordem de retorno de um `insert ... returning` não é garantida, e a tela
      // lista episódios em ordem. Ordenar aqui evita que cada consumidor lembre.
      .sort((a, b) => a.episodeNumber - b.episodeNumber)
  );
}

/**
 * Quantas vezes cada episódio da série foi assistido.
 *
 * Devolve um mapa por `episodes.id`, com `season_number` junto — é ele que
 * permite mostrar o progresso de uma temporada ainda fechada, sem carregar os
 * episódios dela.
 *
 * Episódio ausente do mapa significa nunca assistido. Devolver zero para cada
 * episódio existente exigiria conhecer todos eles, que é justamente o que o
 * carregamento sob demanda evita.
 */
export type EpisodeWatchCount = {
  episodeId: string;
  seasonNumber: number;
  watchCount: number;
};

export async function getEpisodeWatchCounts(
  client: RewamSupabaseClient,
  titleId: string,
): Promise<EpisodeWatchCount[]> {
  const { data, error } = await client.rpc('episode_watch_counts', { p_title_id: titleId });

  throwIfError(error);

  return requireRows(data, 'contagens de episódio').map((row) => ({
    episodeId: episodeWatchCountIdSchema.parse(row.episode_id),
    seasonNumber: Number(row.season_number),
    watchCount: Number(row.watch_count),
  }));
}
