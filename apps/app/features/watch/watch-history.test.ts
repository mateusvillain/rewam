import type { WatchEvent } from '@rewam/database';
import { describe, expect, it } from 'vitest';

import { formatEventDuration, toHistoryItems } from './watch-history';

const TITLE_ID = '0100cb59-2893-4ade-9ddc-774981d09586';

function event(id: string, watchedAt: string, durationMinutes: number | null = 148): WatchEvent {
  return {
    id,
    userId: '48598e6d-6585-41d1-9ccf-7f7620f17e63',
    titleId: TITLE_ID,
    episodeId: null,
    watchedAt,
    durationMinutes,
    notes: null,
  };
}

/** Três exibições do mesmo filme, em ordem crescente como o banco devolve. */
const tres = [
  event('a', '2026-08-10T20:00:00+00:00'),
  event('b', '2026-08-12T20:00:00+00:00'),
  event('c', '2026-08-15T20:00:00+00:00'),
];

describe('toHistoryItems', () => {
  it('mostra a mais recente no topo', () => {
    expect(toHistoryItems(tres).map((item) => item.id)).toEqual(['c', 'b', 'a']);
  });

  it('numera pela ordem cronológica, não pela ordem da tela', () => {
    // O item do topo é o mais recente e, por isso, o de maior número. Numerar
    // depois de inverter trocaria a primeira exibição pela última.
    expect(toHistoryItems(tres).map((item) => item.position)).toEqual([
      'Reassistida #3',
      'Reassistida #2',
      'Exibição #1',
    ]);
  });

  it('a primeira exibição é sempre a mais antiga', () => {
    const items = toHistoryItems(tres);
    expect(items[items.length - 1]).toMatchObject({ id: 'a', position: 'Exibição #1' });
  });

  it('renumera sozinho quando um evento é removido', () => {
    // O critério central da issue. A numeração é derivada, então apagar a
    // primeira exibição promove a seguinte — sem coluna a corrigir e sem que
    // sobre um "Reassistida #2" órfão.
    const semA = tres.filter((e) => e.id !== 'a');

    expect(toHistoryItems(semA).map((item) => item.position)).toEqual([
      'Reassistida #2',
      'Exibição #1',
    ]);
  });

  it('remover a mais recente não mexe nas anteriores', () => {
    const semC = tres.filter((e) => e.id !== 'c');

    expect(toHistoryItems(semC).map((item) => item.position)).toEqual([
      'Reassistida #2',
      'Exibição #1',
    ]);
  });

  it('não inventa ordem quando dois registros são do mesmo instante', () => {
    // Dois toques no mesmo segundo precisam de posições distintas e estáveis,
    // senão a lista mostraria duas "Exibição #1".
    const empate = [
      event('a', '2026-08-15T20:00:00+00:00'),
      event('b', '2026-08-15T20:00:00+00:00'),
    ];
    const posicoes = toHistoryItems(empate).map((item) => item.position);

    expect(new Set(posicoes).size).toBe(2);
    expect(posicoes).toEqual(['Reassistida #2', 'Exibição #1']);
  });

  it('devolve lista vazia sem eventos', () => {
    expect(toHistoryItems([])).toEqual([]);
  });

  it('leva data e duração já prontas para a tela', () => {
    const [item] = toHistoryItems([event('a', '2026-08-15T20:00:00+00:00', 148)]);

    expect(item).toMatchObject({
      date: '15/08/2026',
      duration: '2 h 28 min',
      hasUnknownDuration: false,
    });
  });

  it('marca a duração desconhecida e diz a consequência', () => {
    const [item] = toHistoryItems([event('a', '2026-08-15T20:00:00+00:00', null)]);

    expect(item).toMatchObject({ hasUnknownDuration: true });
    // Dizer só "desconhecida" faria a soma da tela de início parecer errada.
    expect(item?.duration).toContain('fora do total');
  });
});

describe('formatEventDuration', () => {
  it('nunca mostra zero para duração ausente', () => {
    // "0 min" afirmaria que a pessoa não assistiu a nada; `null` significa que
    // ninguém sabe quanto durou.
    expect(formatEventDuration(null)).not.toContain('0 min');
  });

  it('formata a duração conhecida', () => {
    expect(formatEventDuration(90)).toBe('1 h 30 min');
  });
});
