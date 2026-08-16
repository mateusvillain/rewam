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
 * Quantas temporadas a série tem, para efeito de contagem na tela.
 *
 * Os especiais (temporada 0) ficam de fora: o próprio TMDB não os inclui em
 * `number_of_seasons`, e "6 temporadas" para uma série de 5 mais os extras é
 * simplesmente errado. Eles continuam contando no *progresso*, porque um
 * especial assistido é um episódio assistido — as duas perguntas são
 * diferentes e a mesma lista não responde às duas.
 */
export function countRegularSeasons(seasons: ReadonlyArray<CatalogSeason>): number {
  return seasons.filter((season) => season.seasonNumber > 0).length;
}

/**
 * A contagem de um episódio por extenso.
 *
 * "não assistido" em vez de "assistido 0 vezes": zero não é um placar, e a
 * linha precisa dizer o estado, não um número que ninguém acumulou.
 */
export function describeEpisodeCount(count: number): string {
  if (count <= 0) return 'não assistido';
  return count === 1 ? 'assistido 1 vez' : `assistido ${count} vezes`;
}

/** Contagem de temporadas por extenso, com o singular concordando. */
export function formatSeasonCount(total: number): string {
  if (total <= 0) return 'Sem temporadas listadas';
  return total === 1 ? '1 temporada' : `${total} temporadas`;
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

  // Limitado ao total: um episódio assistido cuja temporada o TMDB deixou de
  // listar ainda conta como assistido, e sem o limite a tela diria "63 de 62".
  // O passado da pessoa não muda quando o catálogo muda.
  return `${Math.min(progress.watched, progress.total)} de ${progress.total}`;
}

/**
 * Índice das contagens por `episodes.id`, para a lista decidir item a item.
 *
 * Guarda a contagem inteira, e não só o número: a linha precisa também do id da
 * exibição mais recente para poder desfazê-la, e buscá-lo depois seria uma
 * consulta por toque num dado que já chegou.
 */
export function indexByEpisode(
  counts: ReadonlyArray<EpisodeWatchCount>,
): Map<string, EpisodeWatchCount> {
  return new Map(counts.map((count) => [count.episodeId, count]));
}
