import { LoadingScreen } from '@rewam/ui';
import { Redirect, Stack, usePathname } from 'expo-router';
import { resolveGuardDecision, useSession } from '@/features/auth';
import { stackScreenOptions } from '@/features/navigation';

/**
 * Área autenticada.
 *
 * O estado de carregamento é tratado antes de qualquer decisão: enquanto a
 * sessão não terminou de ser restaurada, redirecionar para o login mandaria
 * embora quem está logado, e a tela piscaria a cada abertura do app.
 */
export default function AppLayout() {
  const { status } = useSession();
  const pathname = usePathname();
  const decision = resolveGuardDecision(status, 'protegida');

  if (decision === 'aguardar') {
    return <LoadingScreen />;
  }

  if (decision === 'redirecionar') {
    // Guarda o destino para que um link para tela interna continue valendo
    // depois do login, em vez de desaguar sempre no início.
    return <Redirect href={{ pathname: '/(auth)/entrar', params: { redirect: pathname } }} />;
  }

  return <Stack screenOptions={stackScreenOptions} />;
}
