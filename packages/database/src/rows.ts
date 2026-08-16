import {
  episodeSchema,
  seasonSchema,
  titleSchema,
  type Episode,
  type Season,
  type Title,
} from '@rewam/types';

import { DatabaseError } from './errors';

/**
 * Linha do PostgREST antes de ser validada.
 *
 * O tipo gerado descreve as colunas que o `select` pediu, não o que de fato
 * voltou na resposta. Quem garante a forma é o Zod logo abaixo, então a linha
 * trafega como dado cru em vez de fingir um tipo que ninguém checou.
 */
export type RawRow = Record<string, unknown>;

/**
 * A linha que uma consulta com `single()` prometeu devolver.
 *
 * Existe para não afirmar com um cast o que ninguém checou: `data` é anulável
 * no tipo, e `data as RawRow` faria a asserção provar o que o código deveria
 * provar. Hoje o caminho é inalcançável — sem erro, `single()` traz a linha —
 * mas quem garante isso é o `throwIfError` da chamada, não este módulo.
 */
export function requireRow(data: unknown): RawRow {
  if (typeof data !== 'object' || data === null) {
    throw new DatabaseError('indisponivel', 'O banco confirmou a operação sem devolver a linha.');
  }
  return data as RawRow;
}

/**
 * Conversão das linhas de catálogo do PostgREST para os tipos do domínio.
 *
 * Aqui ficam só os conversores que mais de um módulo usa: `titles` é lido tanto
 * pelo upsert de catálogo quanto aninhado no histórico, e `episodes` seguirá o
 * mesmo caminho na E5. Conversores de uma tabela só — o de `watch_events`, por
 * exemplo — moram junto das consultas que os usam, onde a forma do `select` que
 * os alimenta está à vista.
 *
 * Cada função valida com o schema de `@rewam/types` em vez de confiar no tipo
 * gerado: o gerado descreve o schema que o `select` pediu, não o que de fato
 * voltou — e uma coluna esquecida no `select` viraria `undefined` silencioso lá
 * na tela.
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

export function toSeason(row: RawRow): Season {
  return seasonSchema.parse({
    id: row.id,
    titleId: row.title_id,
    // A coluna se chama `tmdb_season_number` porque o número vem do TMDB e é
    // ele que identifica a temporada; do lado do domínio o prefixo só ecoaria
    // o fornecedor.
    seasonNumber: row.tmdb_season_number,
    name: row.name,
    episodeCount: row.episode_count,
    posterPath: row.poster_path,
  });
}
