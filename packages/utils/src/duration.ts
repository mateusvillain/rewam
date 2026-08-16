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

type DurationUnit = {
  value: number;
  short: string;
  singular: string;
  plural: string;
};

/**
 * As unidades que entram no texto, da maior para a menor, já sem as zeradas.
 *
 * A regra do zero mora aqui, e não em cada formatador, porque é a mesma para
 * os dois e é sutil o bastante para não querer duas cópias: unidade zerada
 * some — 1470 minutos é "1 dia e 30 minutos", já que dizer "0 horas" no meio
 * faria a pessoa ler um zero que não significa nada —, exceto quando não
 * sobrou nenhuma. Quem ainda não registrou nada tem zero minutos, e um texto
 * vazio não diria isso.
 */
function significantUnits(totalMinutes: number): ReadonlyArray<DurationUnit> {
  const { days, hours, minutes } = breakdownMinutes(totalMinutes);
  const smallest: DurationUnit = {
    value: minutes,
    short: 'min',
    singular: 'minuto',
    plural: 'minutos',
  };
  const units: DurationUnit[] = [
    { value: days, short: 'd', singular: 'dia', plural: 'dias' },
    { value: hours, short: 'h', singular: 'hora', plural: 'horas' },
    smallest,
  ];

  const significant = units.filter((unit) => unit.value > 0);
  return significant.length > 0 ? significant : [smallest];
}

/**
 * Formato por extenso: `1 dia, 10 horas e 30 minutos`.
 *
 * Existe ao lado do compacto porque as duas formas servem a leituras
 * diferentes. `1 d 10 h 30 min` é notação de tabela: economiza espaço ao custo
 * de a pessoa decifrar abreviações. Numa linha de lista, ao lado de outros
 * dados, essa economia paga. No total da tela de início — o único número que o
 * app apresenta, e a resposta da única pergunta que o produto faz — não paga.
 */
export function formatLongDuration(totalMinutes: number): string {
  const parts = significantUnits(totalMinutes).map(
    ({ value, singular, plural }) => `${value} ${value === 1 ? singular : plural}`,
  );

  return joinInSentence(parts);
}

/**
 * Junta as unidades como se escreve em português: vírgula entre as primeiras e
 * "e" antes da última. `parts.join(', ')` daria "1 dia, 10 horas, 30 minutos",
 * que se lê como lista, não como duração.
 */
function joinInSentence(parts: ReadonlyArray<string>): string {
  // `parts` nunca chega vazio: `significantUnits` sempre devolve ao menos uma
  // unidade. O `?? ''` é o preço do índice dinâmico sob
  // `noUncheckedIndexedAccess`, não um estado que a tela alcance.
  const last = parts[parts.length - 1] ?? '';
  const leading = parts.slice(0, -1);

  return leading.length > 0 ? `${leading.join(', ')} e ${last}` : last;
}

/**
 * Formato curto para UI: `2 d 3 h 10 min`, omitindo unidades zeradas.
 *
 * Para linha de lista, onde a duração divide espaço com outros dados. O total
 * da tela de início usa `formatLongDuration`.
 */
export function formatDuration(totalMinutes: number): string {
  return significantUnits(totalMinutes)
    .map(({ value, short }) => `${value} ${short}`)
    .join(' ');
}
