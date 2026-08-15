import { LoadingScreen } from '@rewam/ui';
import { Redirect, Stack, useLocalSearchParams } from 'expo-router';
import { resolveGuardDecision, resolveRedirectTarget, useSession } from '@/features/auth';
import { stackScreenOptions } from '@/features/navigation';

/**
 * Telas de entrada, cadastro e código.
 *
 * Quem já tem sessão não precisa passar por aqui — e deixar essas telas
 * acessíveis a quem está logado permitiria criar uma segunda conta por cima da
 * sessão atual.
 */
export default function AuthLayout() {
  const { status } = useSession();
  const { redirect } = useLocalSearchParams<{ redirect?: string }>();
  const decision = resolveGuardDecision(status, 'autenticacao');

  if (decision === 'aguardar') {
    return <LoadingScreen />;
  }

  if (decision === 'redirecionar') {
    // Precisa respeitar o destino pretendido. Este guard reage ao mesmo evento
    // de sessão que a tela de login, e corre com o redirecionamento dela; se
    // aqui fosse sempre o início, quem seguiu um link para tela interna acabaria
    // no lugar errado justamente por ter conseguido entrar.
    return <Redirect href={resolveRedirectTarget(redirect)} />;
  }

  return <Stack screenOptions={stackScreenOptions} />;
}
