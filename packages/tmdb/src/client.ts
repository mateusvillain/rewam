const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export type TmdbClientOptions = {
  /** Token de leitura v4. No app vem de variável pública; no servidor, de segredo. */
  readToken: string;
  baseUrl?: string;
  language?: string;
  fetchImpl?: typeof fetch;
};

export class TmdbError extends Error {
  constructor(
    message: string,
    /** Status HTTP, ou `0` quando não houve resposta — rede fora, DNS, timeout. */
    readonly status: number,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'TmdbError';
  }
}

export type TmdbClient = {
  request: <T>(path: string, params?: Record<string, string | number | undefined>) => Promise<T>;
};

export function createTmdbClient({
  readToken,
  baseUrl = TMDB_BASE_URL,
  language = 'pt-BR',
  fetchImpl = fetch,
}: TmdbClientOptions): TmdbClient {
  return {
    async request<T>(path: string, params: Record<string, string | number | undefined> = {}) {
      const url = new URL(`${baseUrl}${path}`);
      url.searchParams.set('language', language);
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) url.searchParams.set(key, String(value));
      }

      // Sem este try, falha de rede sobe como TypeError cru e quem chama teria
      // de tratar dois tipos de erro para a mesma pergunta: "deu para falar com
      // o TMDB?". Com status 0, um único `catch (TmdbError)` cobre os dois.
      let response: Response;
      try {
        response = await fetchImpl(url.toString(), {
          headers: {
            Authorization: `Bearer ${readToken}`,
            accept: 'application/json',
          },
        });
      } catch (cause) {
        throw new TmdbError(`Não foi possível falar com o TMDB em ${path}`, 0, { cause });
      }

      if (!response.ok) {
        throw new TmdbError(`TMDB respondeu ${response.status} em ${path}`, response.status);
      }

      return (await response.json()) as T;
    },
  };
}
