import {
  mediaTypeSchema,
  type CatalogEpisode,
  type CatalogSearchResult,
  type CatalogTitleDetail,
  type MediaType,
} from '@rewam/types';
import { isValidDuration } from '@rewam/utils';

import type { TmdbEpisode, TmdbMovieDetail, TmdbSearchResult, TmdbTvDetail } from './payloads';

/**
 * Traduz o formato do TMDB para uma forma única, igual para filme e série.
 *
 * Sem isto, a diferença entre `title`/`name` e `release_date`/`first_air_date`
 * vazaria para cada tela e para o MCP, e cada um resolveria do seu jeito.
 */

/** O TMDB usa `""` como "não sei". String vazia não é dado — vira `null`. */
function toNullableText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/**
 * Duração ausente é `null`, nunca um número inventado.
 *
 * O TMDB devolve `0` para filme sem duração cadastrada, e zero minutos não é uma
 * duração — some junto com `null` e `undefined`. A regra de validade é a mesma
 * que soma durações no resto do produto, por isso vem de `@rewam/utils`.
 *
 * A validade é conferida duas vezes de propósito: o TMDB às vezes manda fração,
 * e um valor como `0.4` é positivo mas arredonda para zero. Sem a segunda
 * checagem sairia `runtimeMinutes: 0`, que o `titleSchema` rejeita.
 */
function toRuntimeMinutes(value: number | null | undefined): number | null {
  if (!isValidDuration(value)) return null;
  const minutes = Math.round(value);
  return isValidDuration(minutes) ? minutes : null;
}

/** Série não tem duração única: usamos a primeira duração típica que seja válida. */
function toEpisodeRuntimeMinutes(values: number[] | null | undefined): number | null {
  return toRuntimeMinutes(values?.find((value) => isValidDuration(value)));
}

/**
 * Um resultado de busca, ou `null` quando não há o que registrar.
 *
 * Devolve `null` em vez de lançar porque uma página de busca com um item
 * estranho ainda é uma busca útil: o item some, o resto aparece.
 *
 * `fallbackMediaType` cobre `/search/movie` e `/search/tv`, que não mandam
 * `media_type` — só `/search/multi` manda, e lá também vêm pessoas.
 */
export function normalizeSearchResult(
  raw: TmdbSearchResult,
  fallbackMediaType?: MediaType,
): CatalogSearchResult | null {
  const declared = mediaTypeSchema.safeParse(raw.media_type);
  const mediaType = declared.success ? declared.data : fallbackMediaType;
  if (!mediaType) return null;

  const isMovie = mediaType === 'movie';
  const title = toNullableText(isMovie ? raw.title : raw.name);
  // Sem título não há o que mostrar na lista nem o que gravar em `titles`.
  if (!title) return null;

  return {
    tmdbId: raw.id,
    mediaType,
    title,
    originalTitle: toNullableText(isMovie ? raw.original_title : raw.original_name),
    posterPath: toNullableText(raw.poster_path),
    releaseDate: toNullableText(isMovie ? raw.release_date : raw.first_air_date),
  };
}

/** Descarta em silêncio o que não é filme nem série, ou o que veio sem título. */
export function normalizeSearchResults(
  raws: readonly TmdbSearchResult[],
  fallbackMediaType?: MediaType,
): CatalogSearchResult[] {
  return raws
    .map((raw) => normalizeSearchResult(raw, fallbackMediaType))
    .filter((result): result is CatalogSearchResult => result !== null);
}

export function normalizeMovieDetail(raw: TmdbMovieDetail): CatalogTitleDetail {
  return {
    tmdbId: raw.id,
    mediaType: 'movie',
    title: raw.title,
    originalTitle: toNullableText(raw.original_title),
    posterPath: toNullableText(raw.poster_path),
    releaseDate: toNullableText(raw.release_date),
    runtimeMinutes: toRuntimeMinutes(raw.runtime),
    overview: toNullableText(raw.overview),
  };
}

export function normalizeTvDetail(raw: TmdbTvDetail): CatalogTitleDetail {
  return {
    tmdbId: raw.id,
    mediaType: 'tv',
    title: raw.name,
    originalTitle: toNullableText(raw.original_name),
    posterPath: toNullableText(raw.poster_path),
    releaseDate: toNullableText(raw.first_air_date),
    runtimeMinutes: toEpisodeRuntimeMinutes(raw.episode_run_time),
    overview: toNullableText(raw.overview),
  };
}

export function normalizeEpisode(raw: TmdbEpisode): CatalogEpisode {
  return {
    tmdbId: raw.id,
    seasonNumber: raw.season_number,
    episodeNumber: raw.episode_number,
    name: toNullableText(raw.name),
    runtimeMinutes: toRuntimeMinutes(raw.runtime),
    airDate: toNullableText(raw.air_date),
  };
}
