import { describe, expect, it } from 'vitest';

import { filterToMediaType, SEARCH_FILTERS, searchPlaceholder } from './search-filters';

describe('filterToMediaType', () => {
  it('não restringe o tipo em "todos", para cair no /search/multi', () => {
    expect(filterToMediaType('all')).toBeUndefined();
  });

  it('repassa o tipo escolhido', () => {
    expect(filterToMediaType('movie')).toBe('movie');
    expect(filterToMediaType('tv')).toBe('tv');
  });

  it('cobre todos os filtros oferecidos', () => {
    // Um filtro novo sem tradução aqui viraria busca sem filtro, em silêncio.
    for (const filter of SEARCH_FILTERS) {
      const mediaType = filterToMediaType(filter.id);
      expect(filter.id === 'all' ? mediaType === undefined : mediaType === filter.id).toBe(true);
    }
  });
});

describe('searchPlaceholder', () => {
  it('pede um termo enquanto o campo está em branco', () => {
    expect(searchPlaceholder('', 0)).toBe('empty-term');
    expect(searchPlaceholder('   ', 0)).toBe('empty-term');
  });

  it('só diz "nenhum resultado" depois de alguém ter buscado', () => {
    // Sem esta separação, abrir a tela já acusaria uma busca fracassada que
    // ninguém fez.
    expect(searchPlaceholder('origem', 0)).toBe('no-results');
  });

  it('não mostra recado quando há resultados', () => {
    expect(searchPlaceholder('origem', 3)).toBeNull();
  });
});
