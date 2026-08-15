import { TmdbError } from '@rewam/tmdb';

export type CatalogErrorPresentation = {
  title: string;
  detail: string;
  /** Falso quando repetir a mesma chamada daria o mesmo resultado. */
  canRetry: boolean;
};

/**
 * Traduz uma falha de catálogo para o que a tela mostra.
 *
 * Existe porque "verifique sua conexão e tente de novo" para tudo é enganoso
 * em três dos quatro casos: um filme removido do TMDB não volta por insistir, e
 * oferecer o botão faz a pessoa repetir algo que nunca vai funcionar. O
 * `TmdbError` já carrega o status justamente para permitir esta distinção.
 */
export function describeCatalogError(error: unknown): CatalogErrorPresentation {
  if (error instanceof TmdbError) {
    // Status 0 é o combinado do cliente para "não houve resposta".
    if (error.status === 0) {
      return {
        title: 'Sem conexão com o TMDB',
        detail: 'Não foi possível falar com o catálogo. Verifique sua conexão.',
        canRetry: true,
      };
    }

    if (error.status === 404) {
      return {
        title: 'Filme não encontrado',
        detail: 'O TMDB não tem nenhum filme com este identificador.',
        canRetry: false,
      };
    }

    if (error.status === 401 || error.status === 403) {
      return {
        title: 'Acesso ao catálogo recusado',
        detail: 'A credencial de leitura do TMDB não foi aceita.',
        canRetry: false,
      };
    }

    if (error.status === 429) {
      return {
        title: 'Muitas consultas ao TMDB',
        detail: 'O catálogo pediu uma pausa. Tente de novo em instantes.',
        canRetry: true,
      };
    }

    return {
      title: 'O TMDB respondeu com erro',
      detail: `O catálogo devolveu o código ${error.status}.`,
      canRetry: error.status >= 500,
    };
  }

  // Sobra o que não é rede nem HTTP: o formato da resposta mudou e a validação
  // recusou. Repetir traria a mesma resposta.
  return {
    title: 'Resposta inesperada do TMDB',
    detail: 'O catálogo devolveu algo que o app não soube ler.',
    canRetry: false,
  };
}
