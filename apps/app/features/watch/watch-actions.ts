import type { WatchEvent } from '@rewam/database';

/**
 * Regras da ação de registrar, separadas da tela para poderem ser testadas — o
 * app ainda não tem teste de componente (E8.1).
 *
 * Registrar é um toque só: data, duração e notas não são perguntadas. A data é
 * o instante do toque, e a duração vem do catálogo. Perguntar as três a cada
 * filme cobrava três decisões por um gesto que é sempre o mesmo, e o custo
 * caía justo no caminho mais percorrido do app.
 */

/** O que o botão principal diz, conforme já exista registro ou não. */
export function watchActionLabel(count: number): string {
  return count > 0 ? 'Marcar como reassistido' : 'Marcar como assistido';
}

/**
 * A contagem, dita por extenso.
 *
 * Zero não vira "0 vezes": quem nunca registrou não quer um contador, quer um
 * convite. E o singular importa — "1 vezes" é o tipo de detalhe que faz a tela
 * parecer inacabada.
 */
export function watchCountLabel(count: number): string {
  if (count <= 0) return 'Você ainda não registrou este filme.';
  if (count === 1) return 'Você assistiu 1 vez.';
  return `Você assistiu ${count} vezes.`;
}

/**
 * O registro que a remoção apaga: sempre o mais recente.
 *
 * A remoção existe para desfazer o toque errado, e o toque errado é o último —
 * daí escolher pela data, e não pela posição na lista. O desempate por `id`
 * repete o da consulta, para que dois registros no mesmo instante não tornem
 * "o último" uma questão de sorte.
 */
export function mostRecentEvent(events: ReadonlyArray<WatchEvent>): WatchEvent | null {
  if (events.length === 0) return null;

  return events.reduce((latest, event) => {
    const diff = Date.parse(event.watchedAt) - Date.parse(latest.watchedAt);
    if (diff > 0) return event;
    if (diff < 0) return latest;
    return event.id > latest.id ? event : latest;
  });
}
