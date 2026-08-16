import type { EpisodeWatchCount } from '@rewam/database';
import type { CatalogSeason } from '@rewam/types';
import { describe, expect, it } from 'vitest';

import {
  formatProgress,
  indexByEpisode,
  progressRatio,
  seasonProgress,
  seriesProgress,
} from './series-progress';

function season(seasonNumber: number, episodeCount: number | null): CatalogSeason {
  return { seasonNumber, name: `Temporada ${seasonNumber}`, episodeCount, posterPath: null };
}

function count(episodeId: string, seasonNumber: number, watchCount = 1): EpisodeWatchCount {
  return { episodeId, seasonNumber, watchCount };
}

describe('seasonProgress', () => {
  it('conta episódios distintos, não exibições', () => {
    // Quem assistiu o mesmo episódio três vezes avançou um episódio na
    // temporada; 3 de 10 por causa disso seria mentira.
    const counts = [count('a', 1, 3), count('b', 1, 1)];

    expect(seasonProgress(season(1, 10), counts)).toEqual({ watched: 2, total: 10 });
  });

  it('ignora episódios de outra temporada', () => {
    const counts = [count('a', 1), count('b', 2), count('c', 2)];

    expect(seasonProgress(season(2, 8), counts).watched).toBe(2);
  });

  it('temporada sem nada assistido começa em zero', () => {
    expect(seasonProgress(season(1, 10), [])).toEqual({ watched: 0, total: 10 });
  });

  it('total desconhecido atravessa como nulo', () => {
    expect(seasonProgress(season(1, null), [count('a', 1)])).toEqual({ watched: 1, total: null });
  });
});

describe('seriesProgress', () => {
  const seasons = [season(1, 10), season(2, 8)];

  it('soma o total das temporadas', () => {
    expect(seriesProgress(seasons, [count('a', 1), count('b', 2)])).toEqual({
      watched: 2,
      total: 18,
    });
  });

  it('inclui os especiais, que também são episódios assistidos', () => {
    // Excluí-los faria o progresso passar de 100% em séries com muitos extras.
    const comEspeciais = [season(0, 3), ...seasons];

    expect(seriesProgress(comEspeciais, [count('a', 0)])).toEqual({ watched: 1, total: 21 });
  });

  it('uma temporada sem contagem torna o total desconhecido', () => {
    // "12 de 40" com 40 sendo soma parcial afirmaria um denominador falso.
    const parcial = [season(1, 10), season(2, null)];

    expect(seriesProgress(parcial, [count('a', 1)])).toEqual({ watched: 1, total: null });
  });

  it('série sem nada assistido começa em zero', () => {
    expect(seriesProgress(seasons, [])).toEqual({ watched: 0, total: 18 });
  });
});

describe('formatProgress', () => {
  it('mostra assistidos sobre total quando o total é conhecido', () => {
    expect(formatProgress({ watched: 3, total: 10 })).toBe('3 de 10');
  });

  it('sem total, diz só o que é verdade', () => {
    expect(formatProgress({ watched: 3, total: null })).toBe('3 episódios assistidos');
  });

  it('concorda no singular', () => {
    expect(formatProgress({ watched: 1, total: null })).toBe('1 episódio assistido');
  });
});

describe('progressRatio', () => {
  it('devolve a fração da barra', () => {
    expect(progressRatio({ watched: 5, total: 10 })).toBe(0.5);
  });

  it('sem total, não há barra', () => {
    expect(progressRatio({ watched: 5, total: null })).toBeNull();
    expect(progressRatio({ watched: 0, total: 0 })).toBeNull();
  });

  it('não passa de 1 quando o catálogo informa menos do que se assistiu', () => {
    // O TMDB às vezes lista menos episódios do que a temporada tem, e uma barra
    // passando da borda pareceria defeito da tela.
    expect(progressRatio({ watched: 12, total: 10 })).toBe(1);
  });
});

describe('indexByEpisode', () => {
  it('permite a lista decidir item a item', () => {
    const index = indexByEpisode([count('a', 1, 2), count('b', 1, 1)]);

    expect(index.get('a')).toBe(2);
    // Ausente significa nunca assistido: devolver zero para cada episódio
    // exigiria conhecer todos, que é o que o carregamento sob demanda evita.
    expect(index.get('c')).toBeUndefined();
  });
});
