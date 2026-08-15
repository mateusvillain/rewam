import { Button, FormDescription, FormTitle, Screen } from '@rewam/ui';
import { router } from 'expo-router';

export type MissingEmailNoticeProps = {
  /** Para onde mandar quem chegou aqui sem e-mail, e o rótulo do botão. */
  action: { label: string; href: '/(auth)/entrar' | '/(auth)/recuperar-senha' };
  description: string;
};

/**
 * As telas de código dependem do e-mail que veio da navegação. Sem ele não há
 * o que verificar, e deixar os botões desabilitados criava um beco sem saída —
 * então ambas mostram esta saída explícita.
 */
export function MissingEmailNotice({ action, description }: MissingEmailNoticeProps) {
  return (
    <Screen>
      <FormTitle>Precisamos do seu e-mail</FormTitle>
      <FormDescription>{description}</FormDescription>
      <Button label={action.label} onPress={() => router.replace(action.href)} />
    </Screen>
  );
}
