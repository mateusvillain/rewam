import { describe, expect, it } from 'vitest';
import { breakdownMinutes, formatDuration, isValidDuration, sumDurations } from './duration';

describe('sumDurations', () => {
  it('ignora durações ausentes ou inválidas', () => {
    expect(sumDurations([120, null, undefined, 0, -30, 45])).toBe(165);
  });

  it('retorna zero sem eventos válidos', () => {
    expect(sumDurations([null, undefined])).toBe(0);
  });
});

describe('isValidDuration', () => {
  it('aceita apenas minutos positivos e finitos', () => {
    expect(isValidDuration(1)).toBe(true);
    expect(isValidDuration(0)).toBe(false);
    expect(isValidDuration(Number.NaN)).toBe(false);
    expect(isValidDuration(null)).toBe(false);
  });
});

describe('breakdownMinutes', () => {
  it('converte minutos em dias, horas e minutos', () => {
    expect(breakdownMinutes(1500)).toEqual({
      days: 1,
      hours: 1,
      minutes: 0,
      totalMinutes: 1500,
    });
  });
});

describe('formatDuration', () => {
  it('omite unidades zeradas', () => {
    expect(formatDuration(1500)).toBe('1 d 1 h');
    expect(formatDuration(95)).toBe('1 h 35 min');
    expect(formatDuration(0)).toBe('0 min');
  });
});
