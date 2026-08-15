import {
  createWatchEventInputSchema,
  updateWatchEventInputSchema,
  watchEventSchema,
  watchEventWithContextSchema,
  timestampSchema,
  type CreateWatchEventInput,
  type UpdateWatchEventInput,
  type WatchEvent,
  type WatchEventWithContext,
} from '@rewam/types';

import type { RewamSupabaseClient } from './client';
import { DatabaseError, throwIfError } from './errors';
import { requireRow, toEpisode, toTitle, type RawRow } from './rows';

export type { WatchEvent, WatchEventWithContext };

/**
 * Consultas e mutações de exibições.
 *
 * App e MCP precisam exatamente das mesmas operações, então elas vivem aqui e
 * não na tela: duplicar isso seria duplicar contrato.
 *
 * Nenhuma função recebe `user_id`. Na leitura, o RLS já limita as linhas às da
 * própria conta; na escrita, a coluna tem `default auth.uid()` e a política
 * recusa qualquer outro valor. Aceitar o parâmetro só criaria a chance de
 * mandar o valor errado — e a ilusão de que ele é quem autoriza.
 */

const WATCH_EVENT_COLUMNS =
  'id, user_id, title_id, episode_id, watched_at, duration_minutes, notes';

const TITLE_COLUMNS =
  'id, tmdb_id, media_type, title, original_title, poster_path, release_date, runtime_minutes';

const EPISODE_COLUMNS =
  'id, title_id, season_number, episode_number, name, runtime_minutes, air_date';

/**
 * O nome da chave estrangeira não é decorativo: `watch_events` tem dois
 * caminhos até `episodes` — o `episode_id` simples e o composto que garante que
 * o episódio pertence ao título. Sem escolher um, o PostgREST recusa a consulta
 * inteira com `PGRST201`, em tempo de execução e não de compilação.
 */
const WATCH_EVENT_WITH_CONTEXT_COLUMNS = `${WATCH_EVENT_COLUMNS}, titles(${TITLE_COLUMNS}), episodes!watch_events_episode_id_fkey(${EPISODE_COLUMNS})`;

/** Página padrão do histórico. Cabe numa tela sem pedir mais do que se lê. */
export const DEFAULT_LIMIT = 20;

/** Teto de segurança: um `limit` absurdo puxaria o histórico inteiro de uma vez. */
export const MAX_LIMIT = 100;

export type ListWatchEventsOptions = {
  limit?: number;
  offset?: number;
  /** Início do período, inclusive, em ISO-8601. */
  from?: string;
  /** Fim do período, inclusive, em ISO-8601. */
  to?: string;
};

export type WatchEventPage = {
  events: WatchEventWithContext[];
  /** Offset da próxima página, ou `null` quando esta é a última. */
  nextOffset: number | null;
};

function toWatchEvent(row: RawRow): WatchEvent {
  return watchEventSchema.parse({
    id: row.id,
    userId: row.user_id,
    titleId: row.title_id,
    episodeId: row.episode_id,
    watchedAt: row.watched_at,
    durationMinutes: row.duration_minutes,
    notes: row.notes,
  });
}

function toWatchEventWithContext(row: RawRow): WatchEventWithContext {
  const title = row.titles;
  if (typeof title !== 'object' || title === null) {
    // O `title_id` é NOT NULL, então isto não é dado faltando: é o `select` sem
    // o aninhamento, ou o PostgREST devolvendo outra forma. Falhar com nome
    // próprio evita depurar um `undefined` três camadas acima, na tela.
    throw new DatabaseError('indisponivel', 'A consulta de exibições voltou sem o título.');
  }

  const episode = row.episodes;

  return watchEventWithContextSchema.parse({
    ...toWatchEvent(row),
    title: toTitle(title as RawRow),
    episode: typeof episode === 'object' && episode !== null ? toEpisode(episode as RawRow) : null,
  });
}

function clampLimit(limit: number | undefined): number {
  if (limit === undefined) return DEFAULT_LIMIT;
  return Math.min(Math.max(Math.trunc(limit), 1), MAX_LIMIT);
}

/**
 * Instante de filtro, validado antes de virar consulta.
 *
 * Uma string qualquer aqui não daria erro de tipo e chegaria ao PostgREST como
 * filtro malformado, cujo erro fala de sintaxe SQL e não do parâmetro errado.
 */
function parseBoundary(value: string, field: 'from' | 'to'): string {
  const parsed = timestampSchema.safeParse(value);
  if (!parsed.success) {
    throw new DatabaseError('dados-invalidos', `O período informado em "${field}" não é uma data.`);
  }
  return parsed.data;
}

/**
 * Registra uma exibição.
 *
 * A duração vem congelada da entrada, e não é lida do título aqui de propósito:
 * quem registra decide qual duração vale para aquele evento, e uma correção
 * posterior no TMDB não pode reescrever o histórico. `null` significa duração
 * desconhecida — nunca zero, que a constraint recusaria.
 */
export async function createWatchEvent(
  client: RewamSupabaseClient,
  input: CreateWatchEventInput,
): Promise<WatchEvent> {
  // Validar na entrada evita a ida ao banco e, principalmente, evita que o
  // nome de uma constraint (`watch_events_notes_length_check`) chegue à tela
  // como se fosse mensagem para gente ler.
  const event = createWatchEventInputSchema.parse(input);

  const { data, error } = await client
    .from('watch_events')
    .insert({
      title_id: event.titleId,
      episode_id: event.episodeId,
      watched_at: event.watchedAt,
      duration_minutes: event.durationMinutes,
      notes: event.notes,
    })
    .select(WATCH_EVENT_COLUMNS)
    .single();

  throwIfError(error);

  return toWatchEvent(requireRow(data));
}

/**
 * Histórico completo, do mais recente para o mais antigo.
 *
 * A ordenação desempata por `id` porque `watched_at` não é único: dois
 * registros no mesmo instante poderiam trocar de posição entre uma página e a
 * seguinte, e a paginação por deslocamento repetiria um e engoliria o outro.
 *
 * O fim da lista é decidido buscando uma linha a mais do que o pedido, e não
 * por página incompleta: uma página cheia que por acaso esgota o histórico
 * deixaria a tela oferecendo um "carregar mais" que não traz nada.
 */
export async function listWatchEvents(
  client: RewamSupabaseClient,
  options: ListWatchEventsOptions = {},
): Promise<WatchEventPage> {
  const limit = clampLimit(options.limit);
  const offset = Math.max(Math.trunc(options.offset ?? 0), 0);

  let query = client
    .from('watch_events')
    .select(WATCH_EVENT_WITH_CONTEXT_COLUMNS)
    .order('watched_at', { ascending: false })
    .order('id', { ascending: false })
    .range(offset, offset + limit);

  if (options.from) query = query.gte('watched_at', parseBoundary(options.from, 'from'));
  if (options.to) query = query.lte('watched_at', parseBoundary(options.to, 'to'));

  const { data, error } = await query;

  throwIfError(error);

  const rows = (data ?? []) as RawRow[];
  const hasMore = rows.length > limit;

  return {
    events: rows.slice(0, limit).map(toWatchEventWithContext),
    nextOffset: hasMore ? offset + limit : null,
  };
}

/**
 * Exibições de um título, em ordem cronológica crescente.
 *
 * Crescente porque é a ordem em que `computeWatchPositions` numera exibição e
 * reassistida; inverter para exibir é trabalho da tela. Sem paginação: o
 * histórico de um título é curto por natureza, e a numeração precisa de todos
 * os eventos para estar certa — uma página só diria a posição dentro da página.
 */
export async function listWatchEventsByTitle(
  client: RewamSupabaseClient,
  titleId: string,
): Promise<WatchEvent[]> {
  const { data, error } = await client
    .from('watch_events')
    .select(WATCH_EVENT_COLUMNS)
    .eq('title_id', titleId)
    .order('watched_at', { ascending: true })
    .order('id', { ascending: true });

  throwIfError(error);

  return ((data ?? []) as RawRow[]).map(toWatchEvent);
}

/**
 * Edita uma exibição já registrada.
 *
 * O filtro por `id` é defesa em profundidade, como em `updateOwnProfileName`:
 * sem ele a operação dependeria só do RLS para não virar um update em massa se
 * a política mudasse um dia.
 */
export async function updateWatchEvent(
  client: RewamSupabaseClient,
  id: string,
  input: UpdateWatchEventInput,
): Promise<WatchEvent> {
  const patch = updateWatchEventInputSchema.parse(input);

  // Só o que de fato veio. `undefined` significa "não mexer neste campo" e some
  // daqui; `null` significa "apagar este campo" e precisa chegar ao banco — é
  // assim que se remove uma nota ou se volta a duração para desconhecida.
  const payload = {
    ...(patch.watchedAt !== undefined ? { watched_at: patch.watchedAt } : {}),
    ...(patch.durationMinutes !== undefined ? { duration_minutes: patch.durationMinutes } : {}),
    ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
  };

  if (Object.keys(payload).length === 0) {
    // Um PATCH sem campos passaria pelo PostgREST sem alterar nada e voltaria
    // como sucesso. Recusar aqui deixa claro que a chamada é que está errada.
    throw new DatabaseError('dados-invalidos', 'Nada a alterar nesta exibição.');
  }

  const { data, error } = await client
    .from('watch_events')
    .update(payload)
    .eq('id', id)
    .select(WATCH_EVENT_COLUMNS)
    .single();

  throwIfError(error);

  return toWatchEvent(requireRow(data));
}

/**
 * Remove uma exibição.
 *
 * Pede a linha de volta para saber se algo foi apagado: sem `select`, apagar um
 * evento inexistente — ou de outra conta, que o RLS esconde — devolveria
 * sucesso, e a tela removeria da lista um registro que continua lá.
 */
export async function deleteWatchEvent(client: RewamSupabaseClient, id: string): Promise<void> {
  const { error } = await client.from('watch_events').delete().eq('id', id).select('id').single();

  // `single()` sem linha vira `PGRST116`, que a tradução já entrega como
  // `nao-encontrado` — a distinção que a tela precisa para não anunciar uma
  // exclusão que não aconteceu.
  throwIfError(error);
}
