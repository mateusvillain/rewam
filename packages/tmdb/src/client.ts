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
  /**
   * Devolve `unknown` de propósito.
   *
   * Um genérico `<T>` aqui não teria de onde inferir nada — seria um `as T` sem
   * checagem, convidando quem chama a pular a validação. Com `unknown`, passar
   * o corpo por um schema deixa de ser disciplina e vira exigência do tipo.
   */
  request: (path: string, params?: Record<string, string | number | undefined>) => Promise<unknown>;
};

export function createTmdbClient({
  readToken,
  baseUrl = TMDB_BASE_URL,
  language = 'pt-BR',
  fetchImpl = fetch,
}: TmdbClientOptions): TmdbClient {
  return {
    async request(path: string, params: Record<string, string | number | undefined> = {}) {
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

      // Corpo ilegível — resposta truncada, ou HTML de proxy no lugar do JSON —
      // subiria como SyntaxError cru, quebrando a promessa de que tudo que sai
      // daqui é TmdbError. O status é o da resposta, e não 0: houve resposta.
      try {
        return await response.json();
      } catch (cause) {
        throw new TmdbError(`Resposta ilegível do TMDB em ${path}`, response.status, { cause });
      }
    },
  };
}
