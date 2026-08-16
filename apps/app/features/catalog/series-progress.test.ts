import type { EpisodeWatchCount } from '@rewam/database';
import type { CatalogSeason } from '@rewam/types';
import { describe, expect, it } from 'vitest';

import {
  countRegularSeasons,
  describeEpisodeCount,
  formatProgress,
  formatSeasonCount,
  indexByEpisode,
  seasonProgress,
  seriesProgress,
} from './series-progress';

function season(seasonNumber: number, episodeCount: number | null): CatalogSeason {
  return { seasonNumber, name: `Temporada ${seasonNumber}`, episodeCount, posterPath: null };
}

function count(episodeId: string, seasonNumber: number, watchCount = 1): EpisodeWatchCount {
  return {
    episodeId,
    seasonNumber,
    watchCount,
    latestEventId: `dddddddd-0000-4000-8000-00000000000${episodeId.charCodeAt(0) % 10}`,
  };
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

describe('countRegularSeasons', () => {
  it('não conta os especiais', () => {
    // O próprio TMDB exclui a temporada 0 de `number_of_seasons`; dizer "6
    // temporadas" para uma série de 5 mais os extras é simplesmente errado.
    expect(countRegularSeasons([season(0, 3), season(1, 10), season(2, 8)])).toBe(2);
  });

  it('série só com especiais não tem temporada para contar', () => {
    expect(countRegularSeasons([season(0, 3)])).toBe(0);
  });

  it('mas os especiais continuam contando no progresso', () => {
    // As duas perguntas são diferentes, e a mesma lista não responde às duas:
    // um especial assistido é um episódio assistido.
    const seasons = [season(0, 3), season(1, 10)];
    expect(seriesProgress(seasons, [count('a', 0)]).watched).toBe(1);
    expect(countRegularSeasons(seasons)).toBe(1);
  });
});

describe('describeEpisodeCount', () => {
  it('zero não é um placar', () => {
    // "assistido 0 vezes" trata como número o que é estado.
    expect(describeEpisodeCount(0)).toBe('não assistido');
  });

  it('concorda no singular', () => {
    expect(describeEpisodeCount(1)).toBe('assistido 1 vez');
  });

  it('usa o plural a partir de duas', () => {
    expect(describeEpisodeCount(3)).toBe('assistido 3 vezes');
  });
});

describe('formatSeasonCount', () => {
  it('concorda no singular', () => {
    expect(formatSeasonCount(1)).toBe('1 temporada');
  });

  it('usa o plural a partir de duas', () => {
    expect(formatSeasonCount(3)).toBe('3 temporadas');
  });

  it('sem temporada, diz isso em vez de "0 temporadas"', () => {
    expect(formatSeasonCount(0)).toBe('Sem temporadas listadas');
  });
});

describe('formatProgress, com o catálogo encolhendo', () => {
  it('não passa do total quando uma temporada some do catálogo', () => {
    // O passado da pessoa não muda quando o TMDB muda: sem o limite, a tela
    // diria "63 de 62".
    expect(formatProgress({ watched: 63, total: 62 })).toBe('62 de 62');
  });
});

describe('indexByEpisode', () => {
  it('permite a lista decidir item a item', () => {
    const index = indexByEpisode([count('a', 1, 2), count('b', 1, 1)]);

    expect(index.get('a')?.watchCount).toBe(2);
    // O id do último evento vem junto: sem ele, desfazer custaria uma consulta
    // por toque num dado que já chegou.
    expect(index.get('a')?.latestEventId).toBeDefined();
    // Ausente significa nunca assistido: devolver zero para cada episódio
    // exigiria conhecer todos, que é o que o carregamento sob demanda evita.
    expect(index.get('c')).toBeUndefined();
  });
});
