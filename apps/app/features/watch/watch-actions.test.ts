import type { WatchEvent } from '@rewam/database';
import { describe, expect, it } from 'vitest';

import { mostRecentEvent, watchActionLabel, watchCountLabel } from './watch-actions';

const TITLE_ID = '0100cb59-2893-4ade-9ddc-774981d09586';

function event(id: string, watchedAt: string): WatchEvent {
  return {
    id,
    userId: '48598e6d-6585-41d1-9ccf-7f7620f17e63',
    titleId: TITLE_ID,
    episodeId: null,
    watchedAt,
    durationMinutes: 148,
    notes: null,
  };
}

describe('watchActionLabel', () => {
  it('convida a registrar quando ainda não há exibição', () => {
    expect(watchActionLabel(0)).toBe('Marcar como assistido');
  });

  it('vira reassistido a partir do primeiro registro', () => {
    expect(watchActionLabel(1)).toBe('Marcar como reassistido');
    expect(watchActionLabel(7)).toBe('Marcar como reassistido');
  });
});

describe('watchCountLabel', () => {
  it('não mostra contador para quem não registrou nada', () => {
    // "0 vezes" seria um placar; quem nunca registrou precisa de um convite.
    expect(watchCountLabel(0)).toBe('Você ainda não registrou este filme.');
  });

  it('concorda no singular', () => {
    // "1 vezes" é o detalhe que faz a tela parecer inacabada.
    expect(watchCountLabel(1)).toBe('Você assistiu 1 vez.');
  });

  it('usa o plural do segundo registro em diante', () => {
    expect(watchCountLabel(2)).toBe('Você assistiu 2 vezes.');
  });
});

describe('mostRecentEvent', () => {
  it('não tem o que remover numa lista vazia', () => {
    expect(mostRecentEvent([])).toBeNull();
  });

  it('escolhe pela data, e não pela posição na lista', () => {
    // A consulta devolve em ordem crescente, mas depender disso deixaria a
    // remoção errada no dia em que a ordenação mudasse.
    const events = [
      event('a', '2026-08-10T20:00:00+00:00'),
      event('c', '2026-08-15T20:00:00+00:00'),
      event('b', '2026-08-12T20:00:00+00:00'),
    ];

    expect(mostRecentEvent(events)?.id).toBe('c');
  });

  it('desempata por id quando dois registros são do mesmo instante', () => {
    // Dois toques no mesmo segundo não podem deixar "o último" a cargo da sorte.
    const events = [
      event('a', '2026-08-15T20:00:00+00:00'),
      event('b', '2026-08-15T20:00:00+00:00'),
    ];

    expect(mostRecentEvent(events)?.id).toBe('b');
    expect(mostRecentEvent([...events].reverse())?.id).toBe('b');
  });

  it('com um só registro, é ele mesmo', () => {
    expect(mostRecentEvent([event('a', '2026-08-10T20:00:00+00:00')])?.id).toBe('a');
  });
});
