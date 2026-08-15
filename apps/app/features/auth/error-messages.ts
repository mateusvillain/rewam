/**
 * Traduz o erro do Supabase para algo que a pessoa entenda, sem repassar
 * mensagem técnica nem revelar se um e-mail existe na base.
 *
 * A chave primária é o `code` do `AuthError`, estável entre versões. O texto da
 * mensagem só entra como último recurso: casar por texto livre erra fácil —
 * "Invalid Refresh Token" e "Invalid token" pedem respostas bem diferentes.
 */
export type AuthErrorLike = { message: string; code?: string | null } | null | undefined;

/** `infra` é falha do serviço; `user` é algo que a pessoa pode corrigir. */
export type AuthErrorKind = 'infra' | 'user';

type Entry = { message: string; kind: AuthErrorKind };

const BY_CODE: Record<string, Entry> = {
  invalid_credentials: { message: 'E-mail ou senha incorretos.', kind: 'user' },
  email_not_confirmed: { message: 'Confirme seu e-mail antes de entrar.', kind: 'user' },
  otp_expired: { message: 'O código expirou. Peça um novo.', kind: 'user' },
  otp_disabled: { message: 'Código inválido. Peça um novo.', kind: 'user' },
  user_already_exists: { message: 'Já existe uma conta com esse e-mail.', kind: 'user' },
  email_exists: { message: 'Já existe uma conta com esse e-mail.', kind: 'user' },
  same_password: { message: 'A nova senha precisa ser diferente da anterior.', kind: 'user' },
  weak_password: {
    message: 'Escolha uma senha mais forte, com pelo menos 8 caracteres.',
    kind: 'user',
  },
  over_email_send_rate_limit: {
    message: 'Muitos e-mails seguidos. Aguarde alguns minutos e tente de novo.',
    kind: 'infra',
  },
  over_request_rate_limit: {
    message: 'Muitas tentativas seguidas. Aguarde um minuto e tente de novo.',
    kind: 'infra',
  },
};

const BY_MESSAGE: Array<{ match: RegExp; entry: Entry }> = [
  { match: /invalid login credentials/i, entry: BY_CODE.invalid_credentials! },
  { match: /email not confirmed/i, entry: BY_CODE.email_not_confirmed! },
  { match: /token has expired|expired/i, entry: BY_CODE.otp_expired! },
  {
    match: /token.*(not found|invalid)|invalid.*otp/i,
    entry: { message: 'Código inválido. Confira os 6 dígitos e tente de novo.', kind: 'user' },
  },
  { match: /already registered|already been registered/i, entry: BY_CODE.user_already_exists! },
  { match: /should be different/i, entry: BY_CODE.same_password! },
  {
    match: /rate limit|too many requests|for security purposes/i,
    entry: BY_CODE.over_request_rate_limit!,
  },
  {
    match: /network|fetch failed|failed to fetch/i,
    entry: { message: 'Sem conexão com o servidor. Verifique sua internet.', kind: 'infra' },
  },
];

const FALLBACK: Entry = {
  message: 'Não foi possível concluir agora. Tente de novo em instantes.',
  kind: 'infra',
};

function resolve(error: AuthErrorLike): Entry {
  if (!error) return FALLBACK;

  const byCode = error.code ? BY_CODE[error.code] : undefined;
  if (byCode) return byCode;

  return BY_MESSAGE.find((entry) => entry.match.test(error.message))?.entry ?? FALLBACK;
}

export function translateAuthError(error: AuthErrorLike): string {
  return resolve(error).message;
}

/**
 * Distingue o que pode ser mostrado num fluxo que não deve revelar se uma conta
 * existe: falha de infraestrutura é segura de exibir, erro de usuário não.
 */
export function classifyAuthError(error: AuthErrorLike): AuthErrorKind {
  return resolve(error).kind;
}
