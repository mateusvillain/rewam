import { describe, expect, it } from 'vitest';

import { DatabaseError, canRetry, translateDatabaseError } from './errors';

/**
 * A tradução decide duas coisas que a tela não tem como decidir sozinha: o que
 * aconteceu e se vale insistir. Errar a segunda é o defeito silencioso — um
 * botão de "tentar de novo" que nunca vai funcionar.
 */

describe('translateDatabaseError', () => {
  it.each([
    ['23503', 'referencia-inexistente'],
    ['23514', 'dados-invalidos'],
    ['42501', 'sem-permissao'],
    ['PGRST301', 'nao-autenticado'],
    ['PGRST116', 'nao-encontrado'],
    ['PGRST201', 'consulta-invalida'],
  ])('mapeia %s para %s', (code, esperado) => {
    expect(translateDatabaseError({ code }).code).toBe(esperado);
  });

  it('trata como indisponível o que não sabe classificar', () => {
    // Um erro sem classificação é do servidor até prova em contrário: essa é a
    // leitura que não culpa a pessoa por um dado que ela informou certo.
    expect(translateDatabaseError({ code: '99999' }).code).toBe('indisponivel');
    expect(translateDatabaseError(new Error('rede caiu')).code).toBe('indisponivel');
  });

  it('não vaza a mensagem do Postgres para a tela', () => {
    const erro = translateDatabaseError({
      code: '23514',
      message: 'new row violates check constraint "watch_events_duration_minutes_check"',
    });

    expect(erro.message).not.toContain('watch_events_duration_minutes_check');
    // A original continua alcançável para quem depura.
    expect(erro.cause).toMatchObject({ code: '23514' });
  });

  it('não reembrulha o que já foi traduzido', () => {
    const original = new DatabaseError('nao-encontrado', 'Este registro não existe mais.');

    // Reembrulhar a cada camada enterraria a causa original sob camadas de si
    // mesma, e o código do domínio viraria `indisponivel` no caminho.
    expect(translateDatabaseError(original)).toBe(original);
  });
});

describe('canRetry', () => {
  it('só oferece repetir quando repetir pode dar outro resultado', () => {
    expect(canRetry(translateDatabaseError({ code: 'ECONNRESET' }))).toBe(true);
  });

  it('não oferece repetir para consulta malformada', () => {
    // É defeito de programação: o aninhamento ambíguo de `episodes` falharia
    // igual todas as vezes, e o botão só faria a pessoa insistir à toa.
    expect(canRetry(translateDatabaseError({ code: 'PGRST201' }))).toBe(false);
  });

  it('não oferece repetir para dado recusado nem para registro ausente', () => {
    expect(canRetry(translateDatabaseError({ code: '23514' }))).toBe(false);
    expect(canRetry(translateDatabaseError({ code: 'PGRST116' }))).toBe(false);
  });
});
