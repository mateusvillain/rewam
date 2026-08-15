/**
 * Regras da data de exibição.
 *
 * O campo aceita `DD/MM/AAAA` digitado, e não um seletor nativo, porque o
 * seletor é justamente o que não existe igual nas três plataformas: o
 * `DateTimePicker` da comunidade não roda na web, e o `<input type="date">` da
 * web não existe no iOS nem no Android. Seriam duas implementações, dois
 * comportamentos e dois conjuntos de defeitos. O campo mascarado é um só, e os
 * atalhos ("Hoje", "Ontem") cobrem o caso de longe mais comum sem digitação.
 *
 * Tudo aqui é função pura, separada da tela para poder ser testada — o app
 * ainda não tem teste de componente (E8.1).
 */

/** Meio-dia, e não meia-noite. Ver `toWatchedAt` para o porquê. */
const HORA_NEUTRA = 12;

export type CalendarDate = { year: number; month: number; day: number };

/**
 * Formata enquanto se digita, sem nunca recusar a tecla.
 *
 * Mantém só os dígitos e insere as barras: assim a pessoa digita `15082026` e
 * lê `15/08/2026`. Validar a cada tecla marcaria como erro toda data pela
 * metade, que é o estado normal de quem está digitando.
 */
export function maskDate(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);

  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/**
 * Converte `DD/MM/AAAA` em data de calendário, ou `null` se não for uma.
 *
 * A conferência de volta (`getDate()` etc.) é o que recusa 31/02: o construtor
 * do `Date` não reclama de dia inexistente, ele transborda para 03/03 em
 * silêncio — e a pessoa teria registrado uma exibição em outro dia.
 */
export function parseDate(value: string): CalendarDate | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);

  const date = new Date(year, month - 1, day);
  const transbordou =
    date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day;

  return transbordou ? null : { year, month, day };
}

export function formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()}`;
}

/** Data de hoje já no formato do campo. */
export function today(now: Date = new Date()): string {
  return formatDate(now);
}

export function yesterday(now: Date = new Date()): string {
  const date = new Date(now);
  date.setDate(date.getDate() - 1);
  return formatDate(date);
}

/**
 * Se a data informada ainda não chegou.
 *
 * Compara o dia, não o instante: registrar hoje de manhã uma sessão da noite
 * passada é legítimo, e comparar horas recusaria a data de hoje até o relógio
 * passar do meio-dia — que é a hora neutra que gravamos.
 */
export function isFuture(value: CalendarDate, now: Date = new Date()): boolean {
  const informada = new Date(value.year, value.month - 1, value.day);
  const hoje = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return informada.getTime() > hoje.getTime();
}

/**
 * Instante que vai para o banco.
 *
 * Gravado ao meio-dia local, e não à meia-noite. O motivo é o mesmo que fez
 * `releaseYear` cortar a string em vez de converter para `Date`: meia-noite em
 * fuso negativo vira o dia anterior ao ser convertida para UTC, e a exibição
 * registrada em 15/08 apareceria como 14/08 para quem lesse em UTC. O meio-dia
 * tem doze horas de folga para cada lado, o que cobre todos os fusos habitados.
 */
export function toWatchedAt(value: CalendarDate): string {
  return new Date(value.year, value.month - 1, value.day, HORA_NEUTRA, 0, 0, 0).toISOString();
}

/** Caminho inverso, para a edição reabrir o campo com o que foi gravado. */
export function fromWatchedAt(iso: string): string {
  return formatDate(new Date(iso));
}
