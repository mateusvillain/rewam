import type { CreateWatchEventInput } from '@rewam/types';
import { describe, expect, it, vi } from 'vitest';

import type { RewamSupabaseClient } from './client';
import { DatabaseError } from './errors';
import {
  MAX_LIMIT,
  createWatchEvent,
  getTitleWatchSummary,
  deleteWatchEvent,
  listWatchEvents,
  listWatchEventsByTitle,
  updateWatchEvent,
} from './watch-events';

/**
 * O RLS de `watch_events` está verificado em `supabase/tests/rls.sql`, e é lá
 * que ele deve estar. O que falta cobrir é o outro lado da fronteira: se este
 * módulo mandar `user_id`, pedir o aninhamento ambíguo de `episodes` ou aceitar
 * um instante que o Postgres devolve mas o schema recusa, o banco não tem como
 * salvar — e a suíte SQL passaria verde do mesmo jeito.
 */

const USER_ID = '48598e6d-6585-41d1-9ccf-7f7620f17e63';
const TITLE_ID = '0100cb59-2893-4ade-9ddc-774981d09586';
const EVENT_ID = '43b65bdb-937d-461b-8688-17f0a037698f';
const EPISODE_ID = 'c1d2e3f4-0000-4000-8000-000000000001';

const tituloRow = {
  id: TITLE_ID,
  tmdb_id: 27205,
  media_type: 'movie',
  title: 'A Origem',
  original_title: 'Inception',
  poster_path: '/inception.jpg',
  release_date: '2010-07-15',
  runtime_minutes: 148,
};

/**
 * Instante exatamente como o PostgREST o devolve: com deslocamento `+00:00`, e
 * não com `Z`. Uma fixture escrita com `Z` esconderia justamente o formato que
 * quebraria a validação em produção.
 */
const eventoRow = {
  id: EVENT_ID,
  user_id: USER_ID,
  title_id: TITLE_ID,
  episode_id: null,
  watched_at: '2026-08-10T20:00:00+00:00',
  duration_minutes: 148,
  notes: 'primeira',
};

const entrada: CreateWatchEventInput = {
  titleId: TITLE_ID,
  episodeId: null,
  watchedAt: '2026-08-10T20:00:00Z',
  durationMinutes: 148,
  notes: 'primeira',
};

/**
 * Dublê do encadeamento do PostgREST.
 *
 * Cada método devolve o próprio objeto, então a cadeia se monta como no cliente
 * real; `resultado` decide o que a espera final resolve. Os `vi.fn` ficam
 * expostos para as asserções olharem o que foi de fato pedido ao banco — que é
 * o objeto destes testes.
 */
function fakeClient(resultado: { data?: unknown; error?: unknown; count?: number }) {
  const calls = {
    from: vi.fn(),
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    range: vi.fn(),
    gte: vi.fn(),
    lte: vi.fn(),
    limit: vi.fn(),
  };

  // `count` acompanha a resposta como no cliente real, onde ele vem do
  // cabeçalho `Content-Range` e não do corpo.
  const resolved = {
    data: resultado.data ?? null,
    error: resultado.error ?? null,
    count: resultado.count ?? null,
  };

  const builder: Record<string, unknown> = {
    then: (resolve: (value: typeof resolved) => unknown) => Promise.resolve(resolve(resolved)),
    single: () => Promise.resolve(resolved),
  };

  for (const [name, spy] of Object.entries(calls)) {
    builder[name] = (...args: unknown[]) => {
      spy(...args);
      return builder;
    };
  }

  return { client: builder as unknown as RewamSupabaseClient, calls };
}

describe('createWatchEvent', () => {
  it('não manda user_id: a coluna vem de auth.uid()', async () => {
    const { client, calls } = fakeClient({ data: eventoRow });
    await createWatchEvent(client, entrada);

    // Mandar user_id não daria erro — a política aceita o próprio id. Daria
    // algo pior: a impressão de que é o cliente quem decide de quem é o evento.
    expect(calls.insert.mock.calls[0]![0]).not.toHaveProperty('user_id');
  });

  it('manda os campos em snake_case, com a duração congelada da entrada', async () => {
    const { client, calls } = fakeClient({ data: eventoRow });
    await createWatchEvent(client, entrada);

    expect(calls.insert.mock.calls[0]![0]).toEqual({
      title_id: TITLE_ID,
      episode_id: null,
      watched_at: '2026-08-10T20:00:00Z',
      duration_minutes: 148,
      notes: 'primeira',
    });
  });

  it('aceita o instante com deslocamento que o Postgres devolve', async () => {
    const { client } = fakeClient({ data: eventoRow });

    // `z.iso.datetime()` sem `offset` recusaria `+00:00`, e toda linha real do
    // banco falharia na validação de retorno.
    await expect(createWatchEvent(client, entrada)).resolves.toMatchObject({
      id: EVENT_ID,
      userId: USER_ID,
      watchedAt: '2026-08-10T20:00:00+00:00',
    });
  });

  it('usa agora como data padrão quando ela não é informada', async () => {
    const { client, calls } = fakeClient({ data: eventoRow });
    const antes = Date.now();

    await createWatchEvent(client, {
      titleId: TITLE_ID,
      episodeId: null,
      durationMinutes: 148,
      notes: null,
    } as CreateWatchEventInput);

    const enviado = calls.insert.mock.calls[0]![0] as { watched_at: string };
    expect(Date.parse(enviado.watched_at)).toBeGreaterThanOrEqual(antes);
  });

  it('recusa duração zero antes de ir ao banco', async () => {
    const { client, calls } = fakeClient({ data: eventoRow });

    // Sem isto, o que chegaria à tela seria `watch_events_duration_minutes_check`.
    await expect(createWatchEvent(client, { ...entrada, durationMinutes: 0 })).rejects.toThrow();
    expect(calls.insert).not.toHaveBeenCalled();
  });

  it('aceita duração nula, que é como se registra o que não se sabe quanto durou', async () => {
    const { client, calls } = fakeClient({ data: { ...eventoRow, duration_minutes: null } });
    const salvo = await createWatchEvent(client, { ...entrada, durationMinutes: null });

    expect(calls.insert.mock.calls[0]![0]).toMatchObject({ duration_minutes: null });
    expect(salvo.durationMinutes).toBeNull();
  });

  it('traduz o erro do PostgREST em erro tipado, sem vazar a constraint', async () => {
    const { client } = fakeClient({
      error: { code: '23503', message: 'violates foreign key constraint' },
    });

    const erro = await createWatchEvent(client, entrada).catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(DatabaseError);
    expect((erro as DatabaseError).code).toBe('referencia-inexistente');
    expect((erro as DatabaseError).message).not.toContain('constraint');
  });
});

describe('listWatchEvents', () => {
  const linhaComContexto = { ...eventoRow, titles: tituloRow, episodes: null };

  it('desambigua o aninhamento de episodes pelo nome da chave estrangeira', async () => {
    const { client, calls } = fakeClient({ data: [linhaComContexto] });
    await listWatchEvents(client);

    // Sem o nome, o PostgREST recusa a consulta inteira com PGRST201: existem
    // dois caminhos de watch_events até episodes.
    const select = calls.select.mock.calls[0]![0] as string;
    expect(select).toContain('episodes!watch_events_episode_id_fkey');
  });

  it('ordena por data decrescente e desempata por id', async () => {
    const { client, calls } = fakeClient({ data: [linhaComContexto] });
    await listWatchEvents(client);

    // Sem o desempate, dois eventos no mesmo instante trocariam de posição
    // entre uma página e a seguinte: uma some, a outra aparece duas vezes.
    expect(calls.order.mock.calls).toEqual([
      ['watched_at', { ascending: false }],
      ['id', { ascending: false }],
    ]);
  });

  it('pede uma linha a mais do que o limite para saber se há próxima página', async () => {
    const { client, calls } = fakeClient({ data: [linhaComContexto] });
    await listWatchEvents(client, { limit: 20 });

    expect(calls.range.mock.calls[0]).toEqual([0, 20]);
  });

  it('devolve o limite pedido e o offset seguinte quando sobra linha', async () => {
    const tres = [1, 2, 3].map((n) => ({
      ...linhaComContexto,
      id: `43b65bdb-937d-461b-8688-17f0a03769f${n}`,
    }));
    const { client } = fakeClient({ data: tres });

    const page = await listWatchEvents(client, { limit: 2 });

    expect(page.events).toHaveLength(2);
    expect(page.nextOffset).toBe(2);
  });

  it('fecha a paginação quando a linha extra não vem', async () => {
    const { client } = fakeClient({ data: [linhaComContexto] });

    // Página cheia que esgota o histórico: sem a linha extra como critério, a
    // tela ofereceria um "carregar mais" que não traz nada.
    const page = await listWatchEvents(client, { limit: 1 });

    expect(page.events).toHaveLength(1);
    expect(page.nextOffset).toBeNull();
  });

  it('limita o tamanho de página pedido, para não puxar o histórico inteiro', async () => {
    const { client, calls } = fakeClient({ data: [] });
    await listWatchEvents(client, { limit: 5000 });

    expect(calls.range.mock.calls[0]).toEqual([0, MAX_LIMIT]);
  });

  it('aplica o filtro de período nas duas pontas', async () => {
    const { client, calls } = fakeClient({ data: [] });
    await listWatchEvents(client, { from: '2026-01-01T00:00:00Z', to: '2026-12-31T23:59:59Z' });

    expect(calls.gte.mock.calls[0]).toEqual(['watched_at', '2026-01-01T00:00:00Z']);
    expect(calls.lte.mock.calls[0]).toEqual(['watched_at', '2026-12-31T23:59:59Z']);
  });

  it('recusa um período que não é data, em vez de mandar filtro torto ao banco', async () => {
    const { client, calls } = fakeClient({ data: [] });

    // Chegando ao PostgREST, o erro falaria de sintaxe SQL — nunca do parâmetro
    // que veio errado.
    const erro = await listWatchEvents(client, { from: 'ontem' }).catch((e: unknown) => e);
    expect((erro as DatabaseError).code).toBe('dados-invalidos');
    expect(calls.gte).not.toHaveBeenCalled();
  });

  it('não filtra por período quando ele não é informado', async () => {
    const { client, calls } = fakeClient({ data: [] });
    await listWatchEvents(client);

    expect(calls.gte).not.toHaveBeenCalled();
    expect(calls.lte).not.toHaveBeenCalled();
  });

  it('traz o título junto, para a lista não pedir um por linha', async () => {
    const { client } = fakeClient({ data: [linhaComContexto] });
    const page = await listWatchEvents(client);

    expect(page.events[0]!.title).toMatchObject({ id: TITLE_ID, title: 'A Origem' });
    expect(page.events[0]!.episode).toBeNull();
  });

  it('converte o episódio aninhado quando ele existe', async () => {
    const { client } = fakeClient({
      data: [
        {
          ...linhaComContexto,
          episode_id: EPISODE_ID,
          episodes: {
            id: EPISODE_ID,
            title_id: TITLE_ID,
            season_number: 1,
            episode_number: 3,
            name: 'O terceiro',
            runtime_minutes: 48,
            air_date: '2020-01-03',
          },
        },
      ],
    });

    const page = await listWatchEvents(client);

    expect(page.events[0]!.episode).toMatchObject({ seasonNumber: 1, episodeNumber: 3 });
  });

  it('falha com nome próprio se a consulta voltar sem o título', async () => {
    const { client } = fakeClient({ data: [{ ...eventoRow, titles: null, episodes: null }] });

    // `title_id` é NOT NULL: isto é o `select` sem o aninhamento, não dado
    // faltando. Sem a mensagem, seria um `undefined` a depurar na tela.
    await expect(listWatchEvents(client)).rejects.toThrow(/sem o título/);
  });
});

describe('listWatchEventsByTitle', () => {
  it('traz em ordem crescente, que é a ordem da numeração de reassistida', async () => {
    const { client, calls } = fakeClient({ data: [eventoRow] });
    await listWatchEventsByTitle(client, TITLE_ID);

    expect(calls.eq.mock.calls[0]).toEqual(['title_id', TITLE_ID]);
    expect(calls.order.mock.calls).toEqual([
      ['watched_at', { ascending: true }],
      ['id', { ascending: true }],
    ]);
  });

  it('não filtra por usuário: quem faz isso é o RLS', async () => {
    const { client, calls } = fakeClient({ data: [eventoRow] });
    await listWatchEventsByTitle(client, TITLE_ID);

    const filtros = calls.eq.mock.calls.map(([coluna]) => coluna);
    expect(filtros).not.toContain('user_id');
  });
});

describe('updateWatchEvent', () => {
  it('manda só os campos informados', async () => {
    const { client, calls } = fakeClient({ data: { ...eventoRow, notes: 'revisada' } });
    await updateWatchEvent(client, EVENT_ID, { notes: 'revisada' });

    expect(calls.update.mock.calls[0]![0]).toEqual({ notes: 'revisada' });
    expect(calls.eq.mock.calls[0]).toEqual(['id', EVENT_ID]);
  });

  it('distingue apagar o valor de não mexer nele', async () => {
    const { client, calls } = fakeClient({ data: { ...eventoRow, duration_minutes: null } });
    await updateWatchEvent(client, EVENT_ID, { durationMinutes: null });

    // `null` precisa chegar ao banco: é assim que a duração volta a ser
    // desconhecida. Se virasse omissão, o campo ficaria como estava.
    expect(calls.update.mock.calls[0]![0]).toEqual({ duration_minutes: null });
  });

  it('informar a duração depois é uma edição comum', async () => {
    const { client, calls } = fakeClient({ data: { ...eventoRow, duration_minutes: 92 } });
    const salvo = await updateWatchEvent(client, EVENT_ID, { durationMinutes: 92 });

    expect(calls.update.mock.calls[0]![0]).toEqual({ duration_minutes: 92 });
    expect(salvo.durationMinutes).toBe(92);
  });

  it('recusa um patch vazio em vez de fingir sucesso', async () => {
    const { client, calls } = fakeClient({ data: eventoRow });

    await expect(updateWatchEvent(client, EVENT_ID, {})).rejects.toBeInstanceOf(DatabaseError);
    expect(calls.update).not.toHaveBeenCalled();
  });

  it('não deixa trocar o título do evento', async () => {
    const { client, calls } = fakeClient({ data: eventoRow });

    // Mudar o alvo não é editar o registro: é registrar outra coisa, e a
    // numeração de reassistida dos dois títulos mudaria em silêncio.
    await updateWatchEvent(client, EVENT_ID, {
      notes: 'ok',
      titleId: 'outro',
    } as never);

    expect(calls.update.mock.calls[0]![0]).not.toHaveProperty('title_id');
  });
});

describe('deleteWatchEvent', () => {
  it('confirma que apagou alguma linha', async () => {
    const { client, calls } = fakeClient({ data: { id: EVENT_ID } });
    await deleteWatchEvent(client, EVENT_ID);

    // Sem pedir a linha de volta, apagar algo inexistente devolveria sucesso e
    // a tela removeria da lista um registro que continua lá.
    expect(calls.select).toHaveBeenCalled();
    expect(calls.eq.mock.calls[0]).toEqual(['id', EVENT_ID]);
  });

  it('avisa quando não havia o que apagar', async () => {
    const { client } = fakeClient({ error: { code: 'PGRST116', message: 'no rows' } });

    const erro = await deleteWatchEvent(client, EVENT_ID).catch((e: unknown) => e);
    expect((erro as DatabaseError).code).toBe('nao-encontrado');
  });
});

describe('getTitleWatchSummary', () => {
  it('pede contagem exata e uma linha só', () => {
    const { client, calls } = fakeClient({ data: [eventoRow], count: 3 });
    void getTitleWatchSummary(client, TITLE_ID);

    // A contagem vem do cabeçalho, então `limit(1)` não a reduz: é assim que
    // uma requisição só entrega o número e o último registro.
    expect(calls.select.mock.calls[0]![1]).toEqual({ count: 'exact' });
    expect(calls.limit.mock.calls[0]).toEqual([1]);
  });

  it('não baixa a lista para contar', async () => {
    const { client, calls } = fakeClient({ data: [eventoRow], count: 42 });
    const resumo = await getTitleWatchSummary(client, TITLE_ID);

    // O ponto da issue: 42 exibições e uma linha trafegada.
    expect(resumo.count).toBe(42);
    expect(calls.range).not.toHaveBeenCalled();
  });

  it('traz a exibição mais recente, com desempate por id', async () => {
    const { client, calls } = fakeClient({ data: [eventoRow], count: 3 });
    const resumo = await getTitleWatchSummary(client, TITLE_ID);

    expect(resumo.latest?.id).toBe(EVENT_ID);
    // Sem o desempate, "o último" variaria entre chamadas quando dois
    // registros caíssem no mesmo instante — e o botão de remover apagaria um
    // evento diferente do que a contagem sugere.
    expect(calls.order.mock.calls).toEqual([
      ['watched_at', { ascending: false }],
      ['id', { ascending: false }],
    ]);
  });

  it('título nunca assistido devolve zero e nada a remover', async () => {
    const { client } = fakeClient({ data: [], count: 0 });

    await expect(getTitleWatchSummary(client, TITLE_ID)).resolves.toEqual({
      count: 0,
      latest: null,
    });
  });

  it('filtra pelo título, e não por usuário: quem faz isso é o RLS', async () => {
    const { client, calls } = fakeClient({ data: [eventoRow], count: 1 });
    await getTitleWatchSummary(client, TITLE_ID);

    expect(calls.eq.mock.calls[0]).toEqual(['title_id', TITLE_ID]);
    expect(calls.eq.mock.calls.map(([coluna]) => coluna)).not.toContain('user_id');
  });

  it('cai para o tamanho da página se a contagem não vier', async () => {
    // `count` é anulável no tipo do cliente. Assumir zero diria "nunca
    // assistido" para um título que acabou de devolver uma exibição.
    const { client } = fakeClient({ data: [eventoRow] });
    const resumo = await getTitleWatchSummary(client, TITLE_ID);

    expect(resumo.count).toBe(1);
  });

  it('traduz o erro do PostgREST em erro tipado', async () => {
    const { client } = fakeClient({ error: { code: 'PGRST301', message: 'jwt expired' } });

    const erro = await getTitleWatchSummary(client, TITLE_ID).catch((e: unknown) => e);
    expect((erro as DatabaseError).code).toBe('nao-autenticado');
  });
});
