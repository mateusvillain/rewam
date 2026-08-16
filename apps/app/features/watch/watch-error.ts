import { DatabaseError, canRetry } from '@rewam/database';

export type WatchErrorPresentation = {
  message: string;
  /** Falso quando repetir a mesma chamada daria o mesmo resultado. */
  canRetry: boolean;
};

/**
 * Traduz uma falha de registro para o que a tela mostra.
 *
 * Mora fora do `.tsx` pelo mesmo motivo de `describeCatalogError`: é a única
 * parte do formulário com decisão de verdade, e o app ainda não tem teste de
 * componente (E8.1) para alcançá-la lá dentro.
 *
 * `DatabaseError` já chega com o texto pronto e com a informação de se vale
 * insistir — foi para isso que a E4.1 traduziu os códigos do PostgREST. Repetir
 * esse julgamento aqui seria recriar o `switch` que ela existe para eliminar.
 */
export function describeWatchError(error: unknown): WatchErrorPresentation {
  if (error instanceof DatabaseError) {
    return { message: error.message, canRetry: canRetry(error) };
  }

  // Sobra o que não veio do banco: falha de rede antes da requisição, ou um
  // defeito nosso ao montar a entrada. Repetir é a única saída que a pessoa tem.
  return {
    message: 'Não foi possível registrar esta exibição. Tente de novo.',
    canRetry: true,
  };
}
