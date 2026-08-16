import type { WatchStats } from '@rewam/database';
import { describe, expect, it } from 'vitest';

import { describeIncompleteTotal, formatTotal, hasNothingYet } from './watch-total';

function stats(partial: Partial<WatchStats> = {}): WatchStats {
  return { totalMinutes: 0, totalEvents: 0, unknownDurationEvents: 0, ...partial };
}

describe('formatTotal', () => {
  it('mostra dias, horas e minutos', () => {
    expect(formatTotal(3070)).toBe('2 d 3 h 10 min');
  });

  it('conta nova mostra zero, e não vazio', () => {
    expect(formatTotal(0)).toBe('0 min');
  });
});

describe('describeIncompleteTotal', () => {
  it('cala quando não há nada de fora', () => {
    expect(describeIncompleteTotal(stats({ totalEvents: 3, totalMinutes: 300 }))).toBeNull();
  });

  it('avisa quando um registro ficou de fora, no singular', () => {
    // Sem esta ressalva o total pareceria simplesmente menor do que deveria, e
    // a pessoa procuraria um defeito que não existe.
    expect(describeIncompleteTotal(stats({ totalEvents: 2, unknownDurationEvents: 1 }))).toContain(
      '1 registro está fora',
    );
  });

  it('concorda no plural', () => {
    expect(describeIncompleteTotal(stats({ totalEvents: 5, unknownDurationEvents: 3 }))).toContain(
      '3 registros estão fora',
    );
  });
});

describe('hasNothingYet', () => {
  it('conta nova está começando do zero', () => {
    expect(hasNothingYet(stats())).toBe(true);
  });

  it('quem registrou algo não está mais no estado vazio', () => {
    expect(hasNothingYet(stats({ totalEvents: 1, totalMinutes: 120 }))).toBe(false);
  });

  it('registrar só filmes sem duração tira do estado vazio', () => {
    // Decidir pelos minutos diria "você ainda não registrou nada" para quem
    // acabou de registrar dois filmes — só que sem duração conhecida.
    expect(hasNothingYet(stats({ totalEvents: 2, unknownDurationEvents: 2 }))).toBe(false);
  });
});
