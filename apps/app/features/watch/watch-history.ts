import type { WatchEvent } from '@rewam/database';
import { computeWatchPositions, formatDuration, formatWatchPosition } from '@rewam/utils';

/**
 * Monta a lista de exibições que a tela desenha.
 *
 * A numeração de exibição e reassistida é derivada aqui, a cada render, e nunca
 * persistida: `computeWatchPositions` a calcula pela ordem cronológica dos
 * eventos que existem. É o que faz a renumeração acontecer sozinha quando um
 * registro é removido — sem coluna a corrigir, sem migração, sem o segundo
 * evento continuar dizendo "Reassistida #2" depois que o primeiro sumiu.
 */

export type WatchHistoryItem = {
  id: string;
  /** `Exibição #1`, `Reassistida #2` e assim por diante. */
  position: string;
  /** Data local, como `15/08/2026`. */
  date: string;
  /** Duração legível, ou a ausência dita por extenso. */
  duration: string;
  /** Verdadeiro quando o evento não entra em nenhum total. */
  hasUnknownDuration: boolean;
};

/**
 * Data do evento, no fuso de quem lê.
 *
 * O instante vem em UTC do banco; converter para o fuso local é o certo aqui,
 * porque a pessoa registrou no fuso dela e é nele que a data faz sentido. Sem
 * isso, uma exibição da noite apareceria no dia seguinte.
 */
export function formatEventDate(watchedAt: string): string {
  const date = new Date(watchedAt);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()}`;
}

/**
 * Duração do evento, ou a ausência dita.
 *
 * `null` significa que ninguém sabia quanto durou, e mostrar "0 min" afirmaria
 * que a pessoa não assistiu a nada. O texto também explica a consequência, já
 * que o evento fica de fora do total — sem isso, a soma da tela de início
 * pareceria simplesmente errada.
 */
export function formatEventDuration(durationMinutes: number | null): string {
  return durationMinutes === null
    ? 'Duração desconhecida — fora do total'
    : formatDuration(durationMinutes);
}

/**
 * Da lista crua do banco para o que a tela mostra, da mais recente à mais antiga.
 *
 * A numeração é calculada antes de inverter: `computeWatchPositions` precisa da
 * ordem cronológica para saber qual foi a primeira exibição, enquanto a tela
 * quer a mais recente no topo. Inverter antes trocaria a #1 pela última.
 */
export function toHistoryItems(events: ReadonlyArray<WatchEvent>): WatchHistoryItem[] {
  const positions = computeWatchPositions(events);

  return [...events]
    .sort((a, b) => Date.parse(b.watchedAt) - Date.parse(a.watchedAt) || b.id.localeCompare(a.id))
    .map((event) => ({
      id: event.id,
      // O `?? 1` não deveria acontecer: a posição vem do mesmo conjunto de
      // eventos. Existe para a lista não mostrar `undefined` se algum dia os
      // dois lados saírem de sincronia.
      position: formatWatchPosition(positions.get(event.id) ?? 1),
      date: formatEventDate(event.watchedAt),
      duration: formatEventDuration(event.durationMinutes),
      hasUnknownDuration: event.durationMinutes === null,
    }));
}
