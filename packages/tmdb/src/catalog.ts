import type { CatalogSearchResult, CatalogTitleDetail, MediaType } from '@rewam/types';

import type { TmdbClient } from './client';
import { normalizeMovieDetail, normalizeSearchResults, normalizeTvDetail } from './normalize';
import { tmdbMovieDetailSchema, tmdbSearchResponseSchema, tmdbTvDetailSchema } from './payloads';

/**
 * As chamadas concretas do TMDB, já normalizadas.
 *
 * Vivem no pacote, e não na tela, porque app e MCP fazem as mesmas perguntas ao
 * catálogo. Cada função valida o payload e devolve as formas de `@rewam/types`,
 * de modo que nenhum consumidor precise conhecer o formato do fornecedor.
 *
 * O cliente vem por parâmetro em vez de ser criado aqui: o app monta o dele com
 * o token público e o MCP com o token de servidor, e o teste injeta um `fetch`
 * falso sem tocar em rede.
 */

export type CatalogSearchPage = {
  page: number;
  /** Já limitado ao que o TMDB deixa alcançar: pedir além de 500 devolve erro. */
  totalPages: number;
  /**
   * Total que o TMDB diz ter, **antes** do nosso filtro.
   *
   * `results` pode vir vazio com `totalResults` alto — uma página de
   * `/search/multi` só com pessoas é o caso comum. Quem exibe deve decidir
   * "acabou?" por `page >= totalPages`, e nunca por `results.length === 0`,
   * senão para de paginar no meio e ainda mostra "nenhum resultado" mentindo.
   */
  totalResults: number;
  results: CatalogSearchResult[];
};

export type SearchCatalogOptions = {
  query: string;
  /** Ausente busca filmes e séries juntos; presente restringe a um tipo. */
  mediaType?: MediaType;
  page?: number;
};

/** O TMDB recusa página fora de 1..500, por mais resultados que diga ter. */
const MAX_PAGE = 500;

function clampPage(page: number): number {
  return Math.min(Math.max(Math.trunc(page), 1), MAX_PAGE);
}

/**
 * Página vazia nova a cada chamada, e não uma constante compartilhada.
 *
 * A paginação infinita acumula resultados; um consumidor que faça
 * `page.results.push(...)` numa constante contaminaria toda busca vazia
 * seguinte.
 */
function emptyPage(): CatalogSearchPage {
  return { page: 1, totalPages: 0, totalResults: 0, results: [] };
}

/** Sem tipo, busca filme e série juntos. Escrito por extenso: o caminho do TMDB
 * coincidir com o valor de `MediaType` é coincidência, não contrato. */
function searchPath(mediaType: MediaType | undefined): string {
  if (!mediaType) return '/search/multi';
  return mediaType === 'movie' ? '/search/movie' : '/search/tv';
}

export async function searchCatalog(
  client: TmdbClient,
  { query, mediaType, page = 1 }: SearchCatalogOptions,
): Promise<CatalogSearchPage> {
  const term = query.trim();

  // O TMDB responde 422 para busca vazia, e a tela de busca chama a cada tecla
  // digitada. Devolver a página vazia aqui evita transformar um campo limpo em
  // erro na cara de quem está digitando.
  if (!term) return emptyPage();

  const path = searchPath(mediaType);
  const payload = tmdbSearchResponseSchema.parse(
    await client.request(path, { query: term, page: clampPage(page) }),
  );

  return {
    page: payload.page,
    // Sem o teto, uma busca genérica anuncia milhares de páginas e a rolagem
    // infinita caminha até tomar 400 do TMDB na página 501.
    totalPages: Math.min(payload.total_pages, MAX_PAGE),
    totalResults: payload.total_results,
    // `/search/multi` traz `media_type` em cada item; `/search/movie` e
    // `/search/tv` não trazem, e aí o tipo vem de quem perguntou.
    results: normalizeSearchResults(payload.results, mediaType),
  };
}

export async function getMovieDetail(
  client: TmdbClient,
  tmdbId: number,
): Promise<CatalogTitleDetail> {
  return normalizeMovieDetail(
    tmdbMovieDetailSchema.parse(await client.request(`/movie/${tmdbId}`)),
  );
}

export async function getTvDetail(client: TmdbClient, tmdbId: number): Promise<CatalogTitleDetail> {
  return normalizeTvDetail(tmdbTvDetailSchema.parse(await client.request(`/tv/${tmdbId}`)));
}

/**
 * Detalhe sem o chamador precisar ramificar por tipo.
 *
 * A rota de detalhe carrega o tipo de mídia junto do id, então a escolha entre
 * `/movie` e `/tv` é sempre a mesma — concentrá-la aqui evita repeti-la na tela
 * e no MCP.
 */
export function getTitleDetail(
  client: TmdbClient,
  mediaType: MediaType,
  tmdbId: number,
): Promise<CatalogTitleDetail> {
  return mediaType === 'movie' ? getMovieDetail(client, tmdbId) : getTvDetail(client, tmdbId);
}
