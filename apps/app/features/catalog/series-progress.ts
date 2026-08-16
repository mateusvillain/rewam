import type { EpisodeWatchCount } from '@rewam/database';
import type { CatalogSeason } from '@rewam/types';

/**
 * Progresso de uma série, derivado dos eventos existentes.
 *
 * Nada é persistido: o progresso é sempre recalculado, como a contagem por
 * título. É o que faz o número acertar sozinho quando um registro é removido.
 *
 * Separado da tela para poder ser testado — o app ainda não tem teste de
 * componente (E8.1).
 */

export type Progress = {
  /** Episódios distintos com ao menos uma exibição. */
  watched: number;
  /** Total conhecido de episódios, ou `null` quando o TMDB não informa. */
  total: number | null;
};

/**
 * Progresso de uma temporada.
 *
 * Conta episódios distintos, não exibições: quem assistiu o mesmo episódio três
 * vezes avançou um episódio na temporada, e um progresso de 3/10 por causa
 * disso seria mentira. A contagem por episódio existe para outra pergunta.
 */
export function seasonProgress(
  season: CatalogSeason,
  counts: ReadonlyArray<EpisodeWatchCount>,
): Progress {
  const watched = counts.filter(
    (count) => count.seasonNumber === season.seasonNumber && count.watchCount > 0,
  ).length;

  return { watched, total: season.episodeCount };
}

/**
 * Progresso da série inteira.
 *
 * O total é a soma das temporadas, e vira `null` se qualquer uma não informar a
 * contagem: dizer "12 de 40" quando 40 é a soma parcial afirmaria um
 * denominador que não é o verdadeiro. Melhor mostrar o que se sabe — quantos
 * foram assistidos — e omitir o resto.
 *
 * A temporada 0 (especiais) entra na conta como qualquer outra: quem assistiu
 * um especial assistiu um episódio, e excluí-la faria o progresso passar de
 * 100% em séries com muitos extras.
 */
export function seriesProgress(
  seasons: ReadonlyArray<CatalogSeason>,
  counts: ReadonlyArray<EpisodeWatchCount>,
): Progress {
  const watched = counts.filter((count) => count.watchCount > 0).length;

  const anyUnknown = seasons.some((season) => season.episodeCount === null);
  const total = anyUnknown
    ? null
    : seasons.reduce((sum, season) => sum + (season.episodeCount ?? 0), 0);

  return { watched, total };
}

/**
 * O progresso dito na tela.
 *
 * Sem total conhecido, diz só o que foi assistido: "3 episódios assistidos" é
 * verdade, enquanto "3 de 0" ou "3 de ?" são ruído ou mentira.
 */
export function formatProgress(progress: Progress): string {
  if (progress.total === null) {
    return progress.watched === 1
      ? '1 episódio assistido'
      : `${progress.watched} episódios assistidos`;
  }

  return `${progress.watched} de ${progress.total}`;
}

/** Fração de 0 a 1 para a barra de progresso, ou `null` sem total conhecido. */
export function progressRatio(progress: Progress): number | null {
  if (progress.total === null || progress.total <= 0) return null;

  // Limitado a 1: o TMDB às vezes informa menos episódios do que a temporada
  // tem, e uma barra passando da borda pareceria defeito da tela.
  return Math.min(progress.watched / progress.total, 1);
}

/** Índice das contagens por `episodes.id`, para a lista decidir item a item. */
export function indexByEpisode(counts: ReadonlyArray<EpisodeWatchCount>): Map<string, number> {
  return new Map(counts.map((count) => [count.episodeId, count.watchCount]));
}
