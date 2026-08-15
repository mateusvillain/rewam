import { NOTES_MAX_LENGTH, type CreateWatchEventInput } from '@rewam/types';
import { z } from 'zod';

import { isFuture, parseDate, toWatchedAt, today } from './watch-date';

/**
 * Contrato do formulário de registro.
 *
 * Separado de `createWatchEventInputSchema` de propósito: aquele descreve o que
 * o banco aceita, este descreve o que a pessoa digita — data como `DD/MM/AAAA`
 * e duração como texto, porque campo de texto devolve texto. `toCreateInput`
 * abaixo é a única ponte entre os dois, e é onde a conversão pode ser testada.
 */

/**
 * Um dia. Não é regra de negócio, é peneira de dedo escorregado.
 *
 * O teto é alto de propósito: filmes longos de verdade existem — *La Flor* tem
 * 808 minutos —, e um limite apertado recusaria um registro legítimo, que é
 * pior do que deixar passar um número digitado errado. Acima de um dia inteiro,
 * porém, é quase certo que sobrou um dígito.
 */
const MAX_DURATION_MINUTES = 1440;

/**
 * As regras são checadas em cascata, com saída na primeira que falha.
 *
 * `superRefine`, e não `refine` encadeado, porque os encadeados rodam todos: a
 * pessoa que digitasse "cento e vinte" veria a mensagem sobre o limite de
 * duração, que é a última a falhar — nada a ver com o que ela errou. Como a
 * tela mostra uma mensagem por campo, a que sobra tem de ser a primeira.
 */
const dateField = z.string().superRefine((value, ctx) => {
  if (value.trim().length === 0) {
    ctx.addIssue({ code: 'custom', message: 'Informe a data.' });
    return;
  }

  const parsed = parseDate(value);
  if (parsed === null) {
    ctx.addIssue({ code: 'custom', message: 'Use o formato DD/MM/AAAA.' });
    return;
  }

  if (isFuture(parsed)) {
    ctx.addIssue({ code: 'custom', message: 'A data não pode estar no futuro.' });
  }
});

/**
 * Duração em minutos, digitada.
 *
 * Vazia é recusada aqui porque este é o formulário de quem tem a duração — o
 * caso de duração desconhecida é da E4.3, e tratá-lo por engano com string
 * vazia gravaria zero, que a constraint do banco recusa.
 */
const durationField = z.string().superRefine((value, ctx) => {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    ctx.addIssue({ code: 'custom', message: 'Informe a duração.' });
    return;
  }

  if (!/^\d+$/.test(trimmed)) {
    ctx.addIssue({ code: 'custom', message: 'Use apenas números.' });
    return;
  }

  const minutes = Number(trimmed);

  if (minutes <= 0) {
    ctx.addIssue({ code: 'custom', message: 'A duração precisa ser maior que zero.' });
    return;
  }

  if (minutes > MAX_DURATION_MINUTES) {
    ctx.addIssue({
      code: 'custom',
      message: `Duração acima de ${MAX_DURATION_MINUTES} minutos: confira o número.`,
    });
  }
});

/**
 * Nota opcional, medida já sem os espaços das pontas.
 *
 * Medir o texto cru recusaria 500 caracteres seguidos de um espaço, mesmo sendo
 * exatamente o que o banco aceitaria depois do `trim` de `toCreateInput`.
 */
const notesField = z
  .string()
  .refine(
    (value) => value.trim().length <= NOTES_MAX_LENGTH,
    `Use no máximo ${NOTES_MAX_LENGTH} caracteres.`,
  );

export const watchFormSchema = z.object({
  date: dateField,
  duration: durationField,
  notes: notesField,
});

export type WatchFormValues = z.infer<typeof watchFormSchema>;

/** Valores iniciais: hoje e a duração que o TMDB informou. */
export function watchFormDefaults(
  runtimeMinutes: number | null,
  now: Date = new Date(),
): WatchFormValues {
  return {
    date: today(now),
    duration: runtimeMinutes === null ? '' : String(runtimeMinutes),
    notes: '',
  };
}

/**
 * Traduz o que foi digitado para o que o banco espera.
 *
 * Nota vazia vira `null`, e não string vazia: a coluna é anulável justamente
 * para distinguir "não escreveu nada" de "escreveu nada", e uma string vazia
 * apareceria no histórico como uma nota em branco.
 */
export function toCreateInput(values: WatchFormValues, titleId: string): CreateWatchEventInput {
  const date = parseDate(values.date);
  if (date === null) {
    // Inalcançável pelo formulário, que valida antes. Existe para que uma
    // chamada direta falhe aqui, e não com uma data inválida no banco.
    throw new Error('Data inválida ao montar o registro de exibição.');
  }

  const notes = values.notes.trim();

  return {
    titleId,
    episodeId: null,
    watchedAt: toWatchedAt(date),
    durationMinutes: Number(values.duration),
    notes: notes.length > 0 ? notes : null,
  };
}
