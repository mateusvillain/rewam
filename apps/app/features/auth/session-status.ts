/**
 * Três estados, não um booleano: "ainda não sei" precisa ser distinguível de
 * "não há sessão", senão o roteamento manda para o login antes de terminar a
 * restauração e a tela pisca a cada abertura do app.
 */
export type SessionStatus = 'loading' | 'signedIn' | 'signedOut';

export function resolveSessionStatus(isRestoring: boolean, hasSession: boolean): SessionStatus {
  if (isRestoring) return 'loading';
  return hasSession ? 'signedIn' : 'signedOut';
}
