/**
 * O que fazer depois de um cadastro bem-sucedido.
 *
 * O Supabase decide isso por configuração: com confirmação de e-mail desligada,
 * o `signUp` já devolve sessão e a pessoa entra direto; com ela ligada, não vem
 * sessão e falta confirmar o e-mail. A tela não pode assumir nenhum dos dois,
 * porque a configuração muda entre o ambiente local e o projeto remoto.
 */
export type SignUpOutcome = 'signedIn' | 'needsConfirmation';

export function resolveSignUpOutcome(hasSession: boolean): SignUpOutcome {
  return hasSession ? 'signedIn' : 'needsConfirmation';
}
