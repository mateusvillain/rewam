import { Button, FormDescription, FormTitle, Screen } from '@rewam/ui';
import { router, Stack } from 'expo-router';

/**
 * Fica dentro do grupo protegido de propósito: um endereço inexistente não pode
 * ser a brecha por onde se renderiza algo fora do guard de sessão.
 */
export default function NotFoundScreen() {
  return (
    <Screen>
      <Stack.Screen options={{ title: 'Página não encontrada' }} />
      <FormTitle>Não encontramos esta página</FormTitle>
      <FormDescription>
        O endereço pode ter mudado de lugar, ou o link que você seguiu está incompleto.
      </FormDescription>
      <Button label="Ir para o início" onPress={() => router.replace('/')} />
    </Screen>
  );
}
