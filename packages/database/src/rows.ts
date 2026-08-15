import { episodeSchema, titleSchema, type Episode, type Title } from '@rewam/types';

/**
 * Conversão de linha do PostgREST para os tipos do domínio.
 *
 * O banco fala `snake_case` e o app fala `camelCase`; a fronteira entre os dois
 * fica aqui, num lugar só. Cada função valida com o schema de `@rewam/types` em
 * vez de confiar no tipo gerado: o gerado descreve o schema que o `select`
 * pediu, não o que de fato voltou — e uma coluna esquecida no `select` viraria
 * `undefined` silencioso lá na tela.
 */

export function toTitle(row: Record<string, unknown>): Title {
  return titleSchema.parse({
    id: row.id,
    tmdbId: row.tmdb_id,
    mediaType: row.media_type,
    title: row.title,
    originalTitle: row.original_title,
    posterPath: row.poster_path,
    releaseDate: row.release_date,
    runtimeMinutes: row.runtime_minutes,
  });
}

export function toEpisode(row: Record<string, unknown>): Episode {
  return episodeSchema.parse({
    id: row.id,
    titleId: row.title_id,
    seasonNumber: row.season_number,
    episodeNumber: row.episode_number,
    name: row.name,
    runtimeMinutes: row.runtime_minutes,
    airDate: row.air_date,
  });
}
