import { describe, expect, it, vi } from 'vitest';

import { getMovieDetail, getTitleDetail, getTvDetail, searchCatalog } from './catalog';
import { createTmdbClient, TmdbError } from './client';

/** `fetch` falso: nenhum teste aqui toca a rede. */
function clientRespondingWith(body: unknown, { ok = true, status = 200 } = {}) {
  const fetchImpl = vi.fn(async () => ({
    ok,
    status,
    json: async () => body,
  })) as unknown as typeof fetch;

  return { client: createTmdbClient({ readToken: 'token-de-teste', fetchImpl }), fetchImpl };
}

function requestedUrl(fetchImpl: typeof fetch): URL {
  return new URL(vi.mocked(fetchImpl).mock.calls[0]![0] as string);
}

const searchBody = {
  page: 1,
  total_pages: 3,
  total_results: 42,
  results: [
    { id: 27205, media_type: 'movie', title: 'A Origem', release_date: '2010-07-15' },
    { id: 2, media_type: 'person', name: 'Christopher Nolan' },
  ],
};

describe('searchCatalog', () => {
  it('devolve resultados normalizados junto da paginação', async () => {
    const { client } = clientRespondingWith(searchBody);

    await expect(searchCatalog(client, { query: 'origem' })).resolves.toEqual({
      page: 1,
      totalPages: 3,
      totalResults: 42,
      results: [
        {
          tmdbId: 27205,
          mediaType: 'movie',
          title: 'A Origem',
          originalTitle: null,
          posterPath: null,
          releaseDate: '2010-07-15',
        },
      ],
    });
  });

  it('usa /search/multi quando não há tipo', async () => {
    const { client, fetchImpl } = clientRespondingWith(searchBody);
    await searchCatalog(client, { query: 'origem' });

    expect(requestedUrl(fetchImpl).pathname).toBe('/3/search/multi');
  });

  it('restringe o caminho quando o tipo é informado', async () => {
    const filmes = clientRespondingWith(searchBody);
    await searchCatalog(filmes.client, { query: 'origem', mediaType: 'movie' });
    expect(requestedUrl(filmes.fetchImpl).pathname).toBe('/3/search/movie');

    const series = clientRespondingWith(searchBody);
    await searchCatalog(series.client, { query: 'bad', mediaType: 'tv' });
    expect(requestedUrl(series.fetchImpl).pathname).toBe('/3/search/tv');
  });

  it('manda o termo e a página na consulta', async () => {
    const { client, fetchImpl } = clientRespondingWith(searchBody);
    await searchCatalog(client, { query: '  origem  ', mediaType: 'movie', page: 2 });

    const url = requestedUrl(fetchImpl);
    expect(url.searchParams.get('query')).toBe('origem');
    expect(url.searchParams.get('page')).toBe('2');
  });

  it('aplica o tipo pedido aos resultados de /search/movie, que não trazem media_type', async () => {
    const { client } = clientRespondingWith({
      page: 1,
      total_pages: 1,
      total_results: 1,
      results: [{ id: 27205, title: 'A Origem' }],
    });

    const page = await searchCatalog(client, { query: 'origem', mediaType: 'movie' });

    expect(page.results[0]?.mediaType).toBe('movie');
  });

  it('não chama a rede quando o termo está vazio', async () => {
    const { client, fetchImpl } = clientRespondingWith(searchBody);

    await expect(searchCatalog(client, { query: '   ' })).resolves.toEqual({
      page: 1,
      totalPages: 0,
      totalResults: 0,
      results: [],
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe('detalhe', () => {
  it('busca e normaliza um filme', async () => {
    const { client, fetchImpl } = clientRespondingWith({
      id: 27205,
      title: 'A Origem',
      runtime: 148,
    });

    await expect(getMovieDetail(client, 27205)).resolves.toMatchObject({
      tmdbId: 27205,
      mediaType: 'movie',
      runtimeMinutes: 148,
    });
    expect(requestedUrl(fetchImpl).pathname).toBe('/3/movie/27205');
  });

  it('busca e normaliza uma série', async () => {
    const { client, fetchImpl } = clientRespondingWith({
      id: 1396,
      name: 'Breaking Bad',
      episode_run_time: [45],
    });

    await expect(getTvDetail(client, 1396)).resolves.toMatchObject({
      tmdbId: 1396,
      mediaType: 'tv',
      title: 'Breaking Bad',
      runtimeMinutes: 45,
    });
    expect(requestedUrl(fetchImpl).pathname).toBe('/3/tv/1396');
  });

  it('escolhe o caminho pelo tipo de mídia', async () => {
    const filme = clientRespondingWith({ id: 27205, title: 'A Origem' });
    await getTitleDetail(filme.client, 'movie', 27205);
    expect(requestedUrl(filme.fetchImpl).pathname).toBe('/3/movie/27205');

    const serie = clientRespondingWith({ id: 1396, name: 'Breaking Bad' });
    await getTitleDetail(serie.client, 'tv', 1396);
    expect(requestedUrl(serie.fetchImpl).pathname).toBe('/3/tv/1396');
  });
});

describe('erros', () => {
  it('propaga erro HTTP como TmdbError com o status', async () => {
    const { client } = clientRespondingWith({}, { ok: false, status: 404 });

    await expect(getMovieDetail(client, 1)).rejects.toMatchObject({
      name: 'TmdbError',
      status: 404,
    });
  });

  it('propaga falha de rede como TmdbError com status 0', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError('Network request failed');
    }) as unknown as typeof fetch;
    const client = createTmdbClient({ readToken: 'token-de-teste', fetchImpl });

    const erro = await searchCatalog(client, { query: 'origem' }).catch((e: unknown) => e);

    expect(erro).toBeInstanceOf(TmdbError);
    expect((erro as TmdbError).status).toBe(0);
    // A causa original fica acessível para diagnóstico, sem vazar para a tela.
    expect((erro as TmdbError).cause).toBeInstanceOf(TypeError);
  });

  it('recusa resposta com formato inesperado, e não como TmdbError', async () => {
    const { client } = clientRespondingWith({ resultados: [] });

    const erro = await searchCatalog(client, { query: 'origem' }).catch((e: unknown) => e);

    expect(erro).toBeInstanceOf(Error);
    // Decisão deliberada, travada aqui: contrato quebrado do TMDB não é falha de
    // rede. Se virasse TmdbError, a tela ofereceria "tentar de novo" para algo
    // que repetir não resolve.
    expect(erro).not.toBeInstanceOf(TmdbError);
  });

  it('trata corpo ilegível como TmdbError, e não como SyntaxError cru', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError('Unexpected token < in JSON');
      },
    })) as unknown as typeof fetch;
    const client = createTmdbClient({ readToken: 'token-de-teste', fetchImpl });

    const erro = await searchCatalog(client, { query: 'origem' }).catch((e: unknown) => e);

    expect(erro).toBeInstanceOf(TmdbError);
    expect((erro as TmdbError).status).toBe(200);
  });
});

describe('limite de página do TMDB', () => {
  it('não pede além da página 500, que o TMDB recusa', async () => {
    const { client, fetchImpl } = clientRespondingWith(searchBody);
    await searchCatalog(client, { query: 'origem', page: 900 });

    expect(requestedUrl(fetchImpl).searchParams.get('page')).toBe('500');
  });

  it('não pede página zero nem fracionária', async () => {
    const zero = clientRespondingWith(searchBody);
    await searchCatalog(zero.client, { query: 'origem', page: 0 });
    expect(requestedUrl(zero.fetchImpl).searchParams.get('page')).toBe('1');

    const fracionaria = clientRespondingWith(searchBody);
    await searchCatalog(fracionaria.client, { query: 'origem', page: 2.7 });
    expect(requestedUrl(fracionaria.fetchImpl).searchParams.get('page')).toBe('2');
  });

  it('anuncia só as páginas alcançáveis', async () => {
    const { client } = clientRespondingWith({ ...searchBody, total_pages: 4200 });

    await expect(searchCatalog(client, { query: 'a' })).resolves.toMatchObject({
      totalPages: 500,
    });
  });
});

describe('contrato do cliente', () => {
  it('autentica com o token de leitura e pede português', async () => {
    const { client, fetchImpl } = clientRespondingWith(searchBody);
    await searchCatalog(client, { query: 'origem' });

    const [, init] = vi.mocked(fetchImpl).mock.calls[0]!;
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer token-de-teste');
    expect(requestedUrl(fetchImpl).searchParams.get('language')).toBe('pt-BR');
  });
});
