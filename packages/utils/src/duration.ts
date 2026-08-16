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

/**
 * Formato por extenso: `1 dia, 10 horas e 30 minutos`.
 *
 * Existe ao lado do compacto porque as duas formas servem a leituras
 * diferentes. `1 d 10 h 30 min` é notação de tabela: economiza espaço ao custo
 * de a pessoa decifrar abreviações. Numa linha de lista, ao lado de outros
 * dados, essa economia paga. No total da tela de início — o único número que o
 * app apresenta, e a resposta da única pergunta que o produto faz — não paga.
 *
 * Unidades zeradas somem, então 1470 minutos é "1 dia e 30 minutos": dizer
 * "0 horas" no meio faria a pessoa ler um zero que não significa nada.
 */
export function formatLongDuration(totalMinutes: number): string {
  const { days, hours, minutes } = breakdownMinutes(totalMinutes);
  const parts: string[] = [];

  if (days > 0) parts.push(pluralize(days, 'dia', 'dias'));
  if (hours > 0) parts.push(pluralize(hours, 'hora', 'horas'));
  // Zero minutos entra quando não há mais nada: quem não registrou nada tem
  // zero minutos, e uma frase vazia não diria isso.
  if (minutes > 0 || parts.length === 0) parts.push(pluralize(minutes, 'minuto', 'minutos'));

  return joinInSentence(parts);
}

function pluralize(value: number, singular: string, plural: string): string {
  return `${value} ${value === 1 ? singular : plural}`;
}

/**
 * Junta as unidades como se escreve em português: vírgula entre as primeiras e
 * "e" antes da última. `parts.join(', ')` daria "1 dia, 10 horas, 30 minutos",
 * que se lê como lista, não como duração.
 */
function joinInSentence(parts: ReadonlyArray<string>): string {
  if (parts.length <= 1) return parts[0] ?? '';

  return `${parts.slice(0, -1).join(', ')} e ${parts[parts.length - 1]}`;
}

/**
 * Formato curto para UI: `2 d 3 h 10 min`, omitindo unidades zeradas.
 *
 * Para linha de lista, onde a duração divide espaço com outros dados. O total
 * da tela de início usa `formatLongDuration`.
 */
export function formatDuration(totalMinutes: number): string {
  const { days, hours, minutes } = breakdownMinutes(totalMinutes);
  const parts: string[] = [];
  if (days > 0) parts.push(`${days} d`);
  if (hours > 0) parts.push(`${hours} h`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes} min`);
  return parts.join(' ');
}
