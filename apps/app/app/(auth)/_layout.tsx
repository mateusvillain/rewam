import { colors } from '@rewam/tokens';
import { LoadingScreen } from '@rewam/ui';
import { Redirect, Stack } from 'expo-router';
import { resolveGuardDecision, useSession } from '@/features/auth';

/**
 * Telas de entrada, cadastro e código.
 *
 * Quem já tem sessão não precisa passar por aqui — e deixar essas telas
 * acessíveis a quem está logado permitiria criar uma segunda conta por cima da
 * sessão atual.
 */
export default function AuthLayout() {
  const { status } = useSession();
  const decision = resolveGuardDecision(status, 'autenticacao');

  if (decision === 'aguardar') {
    return <LoadingScreen />;
  }

  if (decision === 'redirecionar') {
    return <Redirect href="/" />;
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
