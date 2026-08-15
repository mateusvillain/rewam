import { describe, expect, it } from 'vitest';

import {
  formatDate,
  fromWatchedAt,
  isFuture,
  maskDate,
  parseDate,
  toWatchedAt,
  today,
  yesterday,
} from './watch-date';

const AGORA = new Date(2026, 7, 15, 9, 30); // 15/08/2026, 09:30 local

describe('maskDate', () => {
  it('insere as barras conforme se digita', () => {
    expect(maskDate('1')).toBe('1');
    expect(maskDate('15')).toBe('15');
    expect(maskDate('1508')).toBe('15/08');
    expect(maskDate('15082026')).toBe('15/08/2026');
  });

  it('ignora o que não é dígito, em vez de recusar a tecla', () => {
    // Quem cola "15-08-2026" não deveria ver o campo rejeitar a colagem.
    expect(maskDate('15-08-2026')).toBe('15/08/2026');
  });

  it('para de aceitar depois do ano completo', () => {
    expect(maskDate('150820261234')).toBe('15/08/2026');
  });

  it('deixa apagar sem reinserir a barra que se acabou de apagar', () => {
    // Sem o corte por comprimento, apagar o '2' de '15/08/2' devolveria
    // '15/08/' e a barra travaria o backspace.
    expect(maskDate('15/08/')).toBe('15/08');
  });
});

describe('parseDate', () => {
  it('lê uma data completa', () => {
    expect(parseDate('15/08/2026')).toEqual({ year: 2026, month: 8, day: 15 });
  });

  it('recusa data pela metade', () => {
    expect(parseDate('15/08')).toBeNull();
    expect(parseDate('')).toBeNull();
  });

  it('recusa dia que não existe no mês', () => {
    // `new Date(2026, 1, 31)` não reclama: transborda para 03/03 em silêncio, e
    // a exibição teria sido registrada em outro dia.
    expect(parseDate('31/02/2026')).toBeNull();
    expect(parseDate('31/04/2026')).toBeNull();
  });

  it('aceita 29 de fevereiro em ano bissexto e recusa fora dele', () => {
    expect(parseDate('29/02/2024')).toEqual({ year: 2024, month: 2, day: 29 });
    expect(parseDate('29/02/2026')).toBeNull();
  });

  it('recusa mês inexistente', () => {
    expect(parseDate('15/13/2026')).toBeNull();
    expect(parseDate('15/00/2026')).toBeNull();
  });
});

describe('isFuture', () => {
  it('aceita hoje, mesmo antes da hora neutra que gravamos', () => {
    // Comparar instantes recusaria a data de hoje até o relógio passar do
    // meio-dia, que é a hora com que o evento é gravado.
    expect(isFuture({ year: 2026, month: 8, day: 15 }, AGORA)).toBe(false);
  });

  it('aceita o passado', () => {
    expect(isFuture({ year: 2026, month: 8, day: 14 }, AGORA)).toBe(false);
    expect(isFuture({ year: 1999, month: 1, day: 1 }, AGORA)).toBe(false);
  });

  it('recusa amanhã', () => {
    expect(isFuture({ year: 2026, month: 8, day: 16 }, AGORA)).toBe(true);
  });
});

describe('toWatchedAt', () => {
  it('grava ao meio-dia local, para o dia não escorregar na conversão', () => {
    const iso = toWatchedAt({ year: 2026, month: 8, day: 15 });
    const saved = new Date(iso);

    // O dia lido de volta no fuso local tem de ser o mesmo que foi informado.
    // À meia-noite, em fuso negativo, isto viraria 14/08 em UTC.
    expect(saved.getDate()).toBe(15);
    expect(saved.getMonth()).toBe(7);
    expect(saved.getHours()).toBe(12);
  });

  it('devolve ISO que o schema de `watch_events` aceita', () => {
    expect(toWatchedAt({ year: 2026, month: 8, day: 15 })).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    );
  });
});

describe('ida e volta', () => {
  it('o que foi gravado reabre o campo com a mesma data', () => {
    const valor = '15/08/2026';
    const parsed = parseDate(valor);

    expect(fromWatchedAt(toWatchedAt(parsed!))).toBe(valor);
  });
});

describe('atalhos', () => {
  it('hoje e ontem saem prontos para o campo', () => {
    expect(today(AGORA)).toBe('15/08/2026');
    expect(yesterday(AGORA)).toBe('14/08/2026');
  });

  it('ontem atravessa a virada do mês', () => {
    expect(yesterday(new Date(2026, 8, 1, 10))).toBe('31/08/2026');
  });

  it('formatDate preenche com zero à esquerda', () => {
    expect(formatDate(new Date(2026, 0, 5))).toBe('05/01/2026');
  });
});
