import { describe, expect, it } from 'vitest';
import {
  breakdownMinutes,
  formatDuration,
  formatLongDuration,
  isValidDuration,
  sumDurations,
} from './duration';

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

describe('formatLongDuration', () => {
  it('liga a última unidade com "e" e as anteriores com vírgula', () => {
    expect(formatLongDuration(2070)).toBe('1 dia, 10 horas e 30 minutos');
    expect(formatLongDuration(95)).toBe('1 hora e 35 minutos');
    expect(formatLongDuration(35)).toBe('35 minutos');
  });

  it('concorda em singular e plural', () => {
    expect(formatLongDuration(1440)).toBe('1 dia');
    expect(formatLongDuration(2880)).toBe('2 dias');
    expect(formatLongDuration(60)).toBe('1 hora');
    expect(formatLongDuration(120)).toBe('2 horas');
    expect(formatLongDuration(1)).toBe('1 minuto');
    expect(formatLongDuration(2)).toBe('2 minutos');
  });

  it('omite unidades zeradas do meio', () => {
    expect(formatLongDuration(1470)).toBe('1 dia e 30 minutos');
    expect(formatLongDuration(1500)).toBe('1 dia e 1 hora');
  });

  it('diz zero minutos para quem não registrou nada', () => {
    expect(formatLongDuration(0)).toBe('0 minutos');
  });
});
