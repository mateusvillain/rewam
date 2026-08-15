import { z } from 'zod';

/**
 * Formato bruto do TMDB, como ele chega na rede.
 *
 * Fica neste pacote, e não em `@rewam/types`, porque não é contrato nosso: é a
 * forma de um fornecedor externo. Os tipos são exportados porque os
 * normalizadores os recebem como entrada, mas quem consome catálogo deve usar
 * as formas normalizadas de `@rewam/types` — estas aqui mudam quando o TMDB
 * mudar.
 *
 * Os schemas são deliberadamente frouxos. O TMDB acrescenta campos sem aviso e
 * devolve `""` e `0` no lugar de "não sei", então validar aqui com rigor
 * quebraria a busca inteira por causa de um campo que nem usamos. A limpeza
 * desses valores acontece na normalização.
 */

const tmdbId = z.number().int().positive();
const looseText = z.string().nullish();

/**
 * Título de um detalhe, já aparado e obrigatório.
 *
 * Diferente da busca, onde um item sem título é descartado e o resto da página
 * segue, um detalhe sem título não tem o que exibir nem o que gravar em
 * `titles` — cujo contrato exige `min(1)`. Recusar aqui, na fronteira, evita
 * produzir um título de catálogo que o nosso próprio schema rejeitaria depois.
 */
const requiredTitle = z.string().trim().min(1);

/** Um item de `/search/*`. Em `/search/multi` também vêm pessoas, filtradas na normalização. */
export const tmdbSearchResultSchema = z.object({
  id: tmdbId,
  // String livre, não enum: um `media_type` novo do TMDB deve ser ignorado, não
  // derrubar a busca toda.
  media_type: z.string().optional(),
  title: looseText,
  name: looseText,
  original_title: looseText,
  original_name: looseText,
  poster_path: looseText,
  release_date: looseText,
  first_air_date: looseText,
});
export type TmdbSearchResult = z.infer<typeof tmdbSearchResultSchema>;

export const tmdbMovieDetailSchema = z.object({
  id: tmdbId,
  title: requiredTitle,
  original_title: looseText,
  poster_path: looseText,
  release_date: looseText,
  overview: looseText,
  runtime: z.number().nullish(),
});
export type TmdbMovieDetail = z.infer<typeof tmdbMovieDetailSchema>;

export const tmdbTvDetailSchema = z.object({
  id: tmdbId,
  name: requiredTitle,
  original_name: looseText,
  poster_path: looseText,
  first_air_date: looseText,
  overview: looseText,
  /** Série não tem duração única: o TMDB devolve uma lista de durações típicas. */
  episode_run_time: z.array(z.number()).nullish(),
});
export type TmdbTvDetail = z.infer<typeof tmdbTvDetailSchema>;

export const tmdbEpisodeSchema = z.object({
  id: tmdbId,
  season_number: z.number().int().nonnegative(),
  episode_number: z.number().int().positive(),
  name: looseText,
  runtime: z.number().nullish(),
  air_date: looseText,
});
export type TmdbEpisode = z.infer<typeof tmdbEpisodeSchema>;
