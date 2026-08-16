import type { Episode } from '@rewam/database';
import { formatDuration, isValidDuration, sumDurations } from '@rewam/utils';

/**
 * Seleção múltipla de episódios e o resumo que antecede a gravação.
 *
 * O briefing exige mostrar a soma de minutos antes de gravar, para a pessoa
 * saber o que está entrando no total. Marcar uma temporada episódio a episódio
 * é inviável; marcar sem ver o que se está marcando é pior.
 *
 * Separado da tela para poder ser testado — o app ainda não tem teste de
 * componente (E8.1).
 */

export type SelectionSummary = {
  /** Quantos episódios entram na gravação. */
  count: number;
  /** Soma das durações conhecidas, em minutos. */
  totalMinutes: number;
  /** Quantos entram sem duração, e por isso ficam de fora dos totais. */
  withoutDuration: number;
};

export function summarizeSelection(
  episodes: ReadonlyArray<Episode>,
  selected: ReadonlySet<string>,
): SelectionSummary {
  const chosen = episodes.filter((episode) => selected.has(episode.id));

  return {
    count: chosen.length,
    // `sumDurations` já ignora o que não é duração válida — o mesmo critério
    // que monta os totais, para o resumo não prometer minutos que a soma da
    // tela de início não vai contar.
    totalMinutes: sumDurations(chosen.map((episode) => episode.runtimeMinutes)),
    withoutDuration: chosen.filter((episode) => !isValidDuration(episode.runtimeMinutes)).length,
  };
}

/**
 * O resumo dito na tela, antes de confirmar.
 *
 * A ressalva sobre duração ausente não é detalhe: sem ela, a pessoa confirma
 * "10 episódios · 7 h" e vê o total subir menos do que o anunciado, sem saber
 * por quê.
 */
export function describeSelection(summary: SelectionSummary): string {
  if (summary.count === 0) return 'Nenhum episódio selecionado';

  const episodes = summary.count === 1 ? '1 episódio' : `${summary.count} episódios`;
  const duration = summary.totalMinutes > 0 ? ` · ${formatDuration(summary.totalMinutes)}` : '';

  if (summary.withoutDuration === 0) return `${episodes}${duration}`;

  const missing =
    summary.withoutDuration === 1
      ? '1 sem duração conhecida'
      : `${summary.withoutDuration} sem duração conhecida`;

  return `${episodes}${duration} · ${missing}`;
}

/** Alterna um episódio na seleção. */
export function toggleSelection(
  selected: ReadonlySet<string>,
  episodeId: string,
): ReadonlySet<string> {
  const next = new Set(selected);
  if (next.has(episodeId)) next.delete(episodeId);
  else next.add(episodeId);
  return next;
}

/** Se a temporada toda está selecionada. Decide o rótulo do atalho e o que ele faz. */
export function isWholeSeasonSelected(
  selected: ReadonlySet<string>,
  episodes: ReadonlyArray<Episode>,
): boolean {
  return episodes.length > 0 && episodes.every((episode) => selected.has(episode.id));
}

/**
 * O atalho de temporada inteira, que também serve para limpar.
 *
 * Alterna: com a temporada toda marcada, o mesmo toque desmarca. Um botão que
 * só marca deixaria a pessoa desfazendo episódio a episódio o que fez com um
 * toque.
 */
export function toggleWholeSeason(
  selected: ReadonlySet<string>,
  episodes: ReadonlyArray<Episode>,
): ReadonlySet<string> {
  if (isWholeSeasonSelected(selected, episodes)) {
    const next = new Set(selected);
    for (const episode of episodes) next.delete(episode.id);
    return next;
  }

  const next = new Set(selected);
  for (const episode of episodes) next.add(episode.id);
  return next;
}
