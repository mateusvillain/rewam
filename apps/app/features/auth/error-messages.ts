/**
 * Traduz o erro do Supabase para algo que a pessoa entenda, sem repassar
 * mensagem técnica nem revelar se um e-mail existe na base.
 */
const MESSAGES: Array<{ match: RegExp; message: string }> = [
  {
    match: /invalid login credentials/i,
    message: 'E-mail ou senha incorretos.',
  },
  {
    match: /email not confirmed/i,
    message: 'Confirme seu e-mail antes de entrar.',
  },
  {
    match: /token has expired|otp[_ ]expired/i,
    message: 'O código expirou. Peça um novo.',
  },
  {
    match: /invalid.*(token|otp)|token.*invalid/i,
    message: 'Código inválido. Confira os 6 dígitos e tente de novo.',
  },
  {
    match: /user already registered|already been registered/i,
    message: 'Já existe uma conta com esse e-mail.',
  },
  {
    match: /same[_ ]password|should be different/i,
    message: 'A nova senha precisa ser diferente da anterior.',
  },
  {
    match: /password.*at least|weak[_ ]password/i,
    message: 'A senha precisa de pelo menos 8 caracteres.',
  },
  {
    match: /rate limit|too many requests|for security purposes/i,
    message: 'Muitas tentativas seguidas. Aguarde um minuto e tente de novo.',
  },
  {
    match: /network|fetch failed|failed to fetch/i,
    message: 'Sem conexão com o servidor. Verifique sua internet.',
  },
];

const FALLBACK = 'Não foi possível concluir agora. Tente de novo em instantes.';

export function translateAuthError(error: { message: string } | null | undefined): string {
  if (!error) return FALLBACK;

  const found = MESSAGES.find((entry) => entry.match.test(error.message));
  return found ? found.message : FALLBACK;
}
