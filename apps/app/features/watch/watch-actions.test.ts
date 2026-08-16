import { describe, expect, it } from 'vitest';

import { watchActionLabel, watchCountLabel } from './watch-actions';

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
