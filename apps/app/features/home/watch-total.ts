import type { WatchStats } from '@rewam/database';
import { formatDuration } from '@rewam/utils';

/**
 * Como o total assistido é dito na tela de início.
 *
 * Separado da tela para poder ser testado — o app ainda não tem teste de
 * componente (E8.1).
 */

/** O número grande da tela: `2 d 3 h 10 min`, ou zero por extenso. */
export function formatTotal(totalMinutes: number): string {
  // `formatDuration` já devolve "0 min" para zero, que é o certo aqui: quem
  // ainda não registrou nada tem zero minutos, não um total desconhecido.
  return formatDuration(totalMinutes);
}

/**
 * A ressalva sobre o que ficou de fora, ou `null` quando não há ressalva.
 *
 * Eventos sem duração não entram na soma — o briefing proíbe inventar número —,
 * e omitir isso faria o total parecer simplesmente menor do que deveria. Dizer
 * quantos ficaram de fora transforma um erro aparente numa informação.
 */
export function describeIncompleteTotal(stats: WatchStats): string | null {
  if (stats.unknownDurationEvents === 0) return null;

  return stats.unknownDurationEvents === 1
    ? '1 registro está fora da conta por não ter duração conhecida.'
    : `${stats.unknownDurationEvents} registros estão fora da conta por não terem duração conhecida.`;
}

/** Verdadeiro quando a pessoa ainda não registrou exibição alguma. */
export function hasNothingYet(stats: WatchStats): boolean {
  // Pelo número de eventos, e não pelos minutos: quem registrou só filmes sem
  // duração conhecida tem zero minutos e não está começando do zero.
  return stats.totalEvents === 0;
}
