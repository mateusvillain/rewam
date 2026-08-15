import type { SessionStatus } from './session-status';

/**
 * O que um layout deve fazer diante do estado da sessão.
 *
 * A regra vive fora do componente para poder ser verificada sem renderizar:
 * o erro clássico aqui é tratar "ainda não sei" como "não tem sessão", o que
 * expulsa quem está logado no primeiro instante de cada abertura do app.
 */
export type GuardArea = 'protegida' | 'autenticacao';
export type GuardDecision = 'aguardar' | 'redirecionar' | 'renderizar';

export function resolveGuardDecision(status: SessionStatus, area: GuardArea): GuardDecision {
  if (status === 'loading') return 'aguardar';

  if (area === 'protegida') {
    return status === 'signedIn' ? 'renderizar' : 'redirecionar';
  }

  return status === 'signedOut' ? 'renderizar' : 'redirecionar';
}
