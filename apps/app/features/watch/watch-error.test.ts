import { DatabaseError } from '@rewam/database';
import { describe, expect, it } from 'vitest';

import { describeWatchError } from './watch-error';

describe('describeWatchError', () => {
  it('usa a mensagem que o erro do banco já traz', () => {
    const erro = new DatabaseError('sem-permissao', 'Você não tem permissão para esta operação.');

    expect(describeWatchError(erro).message).toBe('Você não tem permissão para esta operação.');
  });

  it('não oferece repetir quando repetir daria o mesmo resultado', () => {
    // O julgamento vem de `canRetry`, na E4.1, e não de um switch refeito aqui.
    expect(describeWatchError(new DatabaseError('dados-invalidos', 'x')).canRetry).toBe(false);
    expect(describeWatchError(new DatabaseError('consulta-invalida', 'x')).canRetry).toBe(false);
  });

  it('oferece repetir quando o servidor está fora do ar', () => {
    expect(describeWatchError(new DatabaseError('indisponivel', 'x')).canRetry).toBe(true);
  });

  it('dá uma frase legível para o que não veio do banco', () => {
    const apresentacao = describeWatchError(new TypeError('Network request failed'));

    // Nunca a mensagem crua: "Network request failed" não é recado para gente.
    expect(apresentacao.message).not.toContain('Network');
    expect(apresentacao.canRetry).toBe(true);
  });
});
