import { searchCatalog } from '@rewam/tmdb';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { tmdb } from '@/lib/tmdb';

import { filterToMediaType, type SearchFilterId } from './search-filters';

/** Espera antes de consultar. Curto o bastante para não parecer travado, longo
 *  o bastante para não gastar uma consulta por tecla. */
const DEBOUNCE_MS = 350;

/**
 * Atrasa o valor até ele parar de mudar.
 *
 * Sem isto, "origem" dispararia seis consultas ao TMDB — e as cinco primeiras
 * seriam descartadas assim que a sexta chegasse.
 */
export function useDebouncedValue<T>(value: T, delayMs = DEBOUNCE_MS): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

export function searchQueryKey(filter: SearchFilterId, term: string) {
  return ['search', filter, term] as const;
}

/**
 * Busca no catálogo, já atrasada e normalizada.
 *
 * A consulta fica desligada com o termo em branco: o cliente devolveria página
 * vazia sem tocar a rede, mas desligar evita até a entrada de cache, e deixa a
 * tela distinguir "ainda não digitou" de "buscou e não achou".
 *
 * Traz só a primeira página. Rolagem infinita não é pedida nesta tela; quando
 * for, o cliente já devolve `totalPages` e o fim se decide por `page`, nunca
 * por lista vazia — uma página de `/search/multi` só com pessoas volta vazia
 * com mais páginas por vir.
 */
export function useSearch(term: string, filter: SearchFilterId) {
  const debouncedTerm = useDebouncedValue(term.trim());

  const query = useQuery({
    queryKey: searchQueryKey(filter, debouncedTerm),
    queryFn: () =>
      searchCatalog(tmdb, { query: debouncedTerm, mediaType: filterToMediaType(filter) }),
    enabled: debouncedTerm.length > 0,
  });

  return {
    ...query,
    /** O termo que a lista na tela representa, que não é o que está sendo digitado. */
    debouncedTerm,
    /** Verdadeiro entre a tecla e a consulta, para a tela não piscar "nenhum resultado". */
    isDebouncing: term.trim() !== debouncedTerm,
  };
}
