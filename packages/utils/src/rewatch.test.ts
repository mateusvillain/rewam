import { describe, expect, it } from 'vitest';
import { computeWatchPositions, formatWatchPosition, isRewatch } from './rewatch';

const events = [
  { id: 'c', titleId: 't1', episodeId: null, watchedAt: '2026-03-01T20:00:00.000Z' },
  { id: 'a', titleId: 't1', episodeId: null, watchedAt: '2026-01-01T20:00:00.000Z' },
  { id: 'b', titleId: 't2', episodeId: 'e1', watchedAt: '2026-02-01T20:00:00.000Z' },
  { id: 'd', titleId: 't2', episodeId: 'e2', watchedAt: '2026-02-02T20:00:00.000Z' },
];

describe('computeWatchPositions', () => {
  it('numera por ordem cronológica dentro do mesmo alvo', () => {
    const positions = computeWatchPositions(events);
    expect(positions.get('a')).toBe(1);
    expect(positions.get('c')).toBe(2);
  });

  it('trata episódios da mesma série como alvos distintos', () => {
    const positions = computeWatchPositions(events);
    expect(positions.get('b')).toBe(1);
    expect(positions.get('d')).toBe(1);
  });
});

describe('formatWatchPosition', () => {
  it('rotula primeira exibição e reassistidas', () => {
    expect(isRewatch(1)).toBe(false);
    expect(formatWatchPosition(1)).toBe('Exibição #1');
    expect(formatWatchPosition(3)).toBe('Reassistida #3');
  });
});
