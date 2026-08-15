/**
 * Tradução dos erros do PostgREST para um erro tipado do domínio.
 *
 * O que chega do cliente Supabase é um objeto com `code`, `message`, `details`
 * e `hint` — nada disso serve para a tela decidir o que fazer, e a `message`
 * costuma ser o nome de uma constraint (`watch_events_duration_minutes_check`).
 * Sem esta camada, ou o nome da constraint vaza para a interface, ou cada tela
 * reimplementa o mesmo `switch` sobre SQLSTATE.
 *
 * A discriminação é por `code`, e não pelo texto: mensagens do Postgres mudam
 * entre versões e vêm no idioma do servidor.
 */

export type DatabaseErrorCode =
  /** Sessão ausente ou expirada; a pessoa precisa entrar de novo. */
  | 'nao-autenticado'
  /** RLS ou privilégio recusou a operação — inclusive gravar em nome de outra conta. */
  | 'sem-permissao'
  /** Chave estrangeira sem destino: título ou episódio que não existe no banco. */
  | 'referencia-inexistente'
  /** Constraint de conteúdo recusou o valor: duração <= 0, nota longa demais. */
  | 'dados-invalidos'
  /** Nenhuma linha atingida — normalmente algo apagado em outro dispositivo. */
  | 'nao-encontrado'
  /**
   * O pedido em si está malformado: aninhamento ambíguo, coluna que não existe.
   *
   * Categoria à parte de propósito. É defeito de programação, não falha
   * passageira, e cair em `indisponivel` faria a tela oferecer "tentar de novo"
   * para algo que vai falhar igual todas as vezes. É exatamente a classe de erro
   * que o nome da chave estrangeira em `watch-events.ts` existe para evitar.
   */
  | 'consulta-invalida'
  /** Falha de rede ou do servidor. É a única categoria que vale repetir. */
  | 'indisponivel';

export class DatabaseError extends Error {
  readonly code: DatabaseErrorCode;

  constructor(code: DatabaseErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'DatabaseError';
    this.code = code;
  }
}

/**
 * SQLSTATE e códigos do PostgREST que o cliente consegue provocar.
 *
 * Fora desta tabela tudo cai em `indisponivel`: um erro que não sabemos
 * classificar é do servidor até prova em contrário, e essa é a leitura que não
 * culpa a pessoa por um dado que ela informou corretamente.
 */
const ERROR_CODES: Record<string, DatabaseErrorCode> = {
  // Chave estrangeira violada.
  '23503': 'referencia-inexistente',
  // not_null_violation, check_violation, invalid_text_representation.
  '23502': 'dados-invalidos',
  '23514': 'dados-invalidos',
  '22P02': 'dados-invalidos',
  // Duplicidade: no MVP só o catálogo tem UNIQUE alcançável pelo cliente.
  '23505': 'dados-invalidos',
  // Privilégio de tabela ausente ou política de RLS recusando a linha.
  '42501': 'sem-permissao',
  // JWT ausente, inválido ou expirado.
  PGRST301: 'nao-autenticado',
  // `single()` sem exatamente uma linha.
  PGRST116: 'nao-encontrado',
  // Sintaxe do `select` inválida.
  PGRST100: 'consulta-invalida',
  // Relação inexistente e aninhamento ambíguo, respectivamente.
  PGRST200: 'consulta-invalida',
  PGRST201: 'consulta-invalida',
};

const ERROR_MESSAGES: Record<DatabaseErrorCode, string> = {
  'nao-autenticado': 'Sua sessão expirou. Entre de novo para continuar.',
  'sem-permissao': 'Você não tem permissão para esta operação.',
  'referencia-inexistente': 'O título deste registro não está mais no banco.',
  'dados-invalidos': 'Algum dado informado não é aceito. Revise e tente de novo.',
  'nao-encontrado': 'Este registro não existe mais.',
  'consulta-invalida': 'O app fez um pedido que o servidor não entendeu.',
  indisponivel: 'Não foi possível falar com o servidor. Tente de novo.',
};

/** As únicas categorias em que repetir a mesma chamada pode dar outro resultado. */
const RETRIABLE: ReadonlySet<DatabaseErrorCode> = new Set(['indisponivel']);

/**
 * Se vale oferecer "tentar de novo" para este erro.
 *
 * Mora aqui, e não na tela, porque é a tabela acima que sabe a resposta —
 * repetido em cada tela, um código novo nasceria retryable por esquecimento.
 */
export function canRetry(error: DatabaseError): boolean {
  return RETRIABLE.has(error.code);
}

/** Extrai o `code` do erro do Supabase sem assumir o formato inteiro. */
function readCode(error: unknown): string | null {
  if (typeof error !== 'object' || error === null) return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : null;
}

export function translateDatabaseError(error: unknown): DatabaseError {
  // Já traduzido: relançar sem reembrulhar, senão a causa original se perde a
  // cada camada por onde o erro passa.
  if (error instanceof DatabaseError) return error;

  const code = ERROR_CODES[readCode(error) ?? ''] ?? 'indisponivel';
  return new DatabaseError(code, ERROR_MESSAGES[code], { cause: error });
}

/** Açúcar para o padrão `if (error) throw ...` que se repete em cada consulta. */
export function throwIfError(error: unknown): void {
  if (error) throw translateDatabaseError(error);
}
