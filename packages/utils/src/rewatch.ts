/**
 * Reassistida é derivada, nunca persistida: a posição de um evento é a ordem
 * cronológica dele dentro do mesmo alvo (episódio quando houver, senão título).
 */
export type WatchOccurrence = {
  id: string;
  titleId: string;
  episodeId?: string | null;
  watchedAt: string;
};

export function watchTargetKey(event: WatchOccurrence): string {
  return event.episodeId ? `episode:${event.episodeId}` : `title:${event.titleId}`;
}

/** Retorna a posição (1 = primeira exibição) de cada evento, por id. */
export function computeWatchPositions(events: ReadonlyArray<WatchOccurrence>): Map<string, number> {
  const ordered = [...events].sort(
    (a, b) => Date.parse(a.watchedAt) - Date.parse(b.watchedAt) || a.id.localeCompare(b.id),
  );
  const seen = new Map<string, number>();
  const positions = new Map<string, number>();
  for (const event of ordered) {
    const key = watchTargetKey(event);
    const position = (seen.get(key) ?? 0) + 1;
    seen.set(key, position);
    positions.set(event.id, position);
  }
  return positions;
}

export function isRewatch(position: number): boolean {
  return position > 1;
}

export function formatWatchPosition(position: number): string {
  return isRewatch(position) ? `Reassistida #${position}` : 'Exibição #1';
}
