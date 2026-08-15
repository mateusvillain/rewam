/** Eventos sem duração válida não entram em nenhum total. */
export function sumDurations(durations: ReadonlyArray<number | null | undefined>): number {
  return durations.reduce<number>(
    (total, minutes) => (isValidDuration(minutes) ? total + minutes : total),
    0,
  );
}

export function isValidDuration(minutes: number | null | undefined): minutes is number {
  return typeof minutes === 'number' && Number.isFinite(minutes) && minutes > 0;
}

export type DurationBreakdown = {
  days: number;
  hours: number;
  minutes: number;
  totalMinutes: number;
};

export function breakdownMinutes(totalMinutes: number): DurationBreakdown {
  const safeTotal = Math.max(0, Math.floor(totalMinutes));
  return {
    days: Math.floor(safeTotal / 1440),
    hours: Math.floor((safeTotal % 1440) / 60),
    minutes: safeTotal % 60,
    totalMinutes: safeTotal,
  };
}

/** Formato curto para UI: `2 d 3 h 10 min`, omitindo unidades zeradas. */
export function formatDuration(totalMinutes: number): string {
  const { days, hours, minutes } = breakdownMinutes(totalMinutes);
  const parts: string[] = [];
  if (days > 0) parts.push(`${days} d`);
  if (hours > 0) parts.push(`${hours} h`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes} min`);
  return parts.join(' ');
}
