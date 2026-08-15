import type { MediaType } from '@rewam/types';

/**
 * Filtro de tipo da busca, e o que a tela mostra quando não há resultado.
 *
 * Separado da tela para poder ser testado — o app ainda não tem teste de
 * componente (E8.1).
 */

export const SEARCH_FILTERS = [
  { id: 'todos', label: 'Todos' },
  { id: 'movie', label: 'Filmes' },
  { id: 'tv', label: 'Séries' },
] as const;

export type SearchFilterId = (typeof SEARCH_FILTERS)[number]['id'];

/** `undefined` é o que faz o cliente usar `/search/multi`, com os dois tipos. */
export function filterToMediaType(filter: SearchFilterId): MediaType | undefined {
  return filter === 'todos' ? undefined : filter;
}

export type SearchPlaceholder = 'digite' | 'nenhum' | null;

/**
 * Qual recado a lista mostra quando está vazia.
 *
 * "Nenhum resultado" só vale depois de alguém ter buscado alguma coisa: dizer
 * isso com o campo em branco acusaria a pessoa de uma busca que ela não fez. O
 * cliente devolve página vazia para termo em branco justamente para não ir à
 * rede, e é o próprio termo que separa os dois casos.
 */
export function searchPlaceholder(term: string, resultCount: number): SearchPlaceholder {
  if (term.trim().length === 0) return 'digite';
  return resultCount === 0 ? 'nenhum' : null;
}
