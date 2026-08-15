import { zodResolver } from '@hookform/resolvers/zod';
import { signIn } from '@rewam/auth';
import { credentialsSchema, type Credentials } from '@rewam/types';
import {
  Button,
  ControlledTextField,
  formLinkStyle,
  FormLinks,
  FormMessage,
  FormTitle,
  Screen,
} from '@rewam/ui';
import { Link, router, Stack, useLocalSearchParams } from 'expo-router';
import { useForm } from 'react-hook-form';
import {
  isUnconfirmedEmailError,
  resolveRedirectTarget,
  translateAuthError,
} from '@/features/auth';
import { supabase } from '@/lib/supabase';

export default function EntrarScreen() {
  const { redirect } = useLocalSearchParams<{ redirect?: string }>();

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Credentials>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(values: Credentials) {
    const { error } = await signIn(supabase, values);

    if (error) {
      // Conta criada mas não confirmada não é um beco: quem parou no meio do
      // cadastro volta direto para a tela de código, sem recomeçar. Isso não
      // revela conta alheia — o Supabase só responde assim com a senha correta.
      if (isUnconfirmedEmailError(error)) {
        router.push({ pathname: '/(auth)/confirmar-email', params: { email: values.email } });
        return;
      }

      setError('root', { message: translateAuthError(error) });
      return;
    }

    // Um link para tela interna continua valendo depois do login, em vez de
    // desaguar sempre no início.
    router.replace(resolveRedirectTarget(redirect));
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Entrar' }} />

      <FormTitle>Entrar no Rewam</FormTitle>

      <ControlledTextField
        control={control}
        name="email"
        label="E-mail"
        error={errors.email?.message}
        autoCapitalize="none"
        autoComplete="email"
        inputMode="email"
        keyboardType="email-address"
        placeholder="voce@exemplo.com"
      />

      <ControlledTextField
        control={control}
        name="password"
        label="Senha"
        error={errors.password?.message}
        autoComplete="current-password"
        secureTextEntry
        onSubmitEditing={handleSubmit(onSubmit)}
      />

      <FormMessage>{errors.root?.message}</FormMessage>

      <Button
        label={isSubmitting ? 'Entrando…' : 'Entrar'}
        disabled={isSubmitting}
        onPress={handleSubmit(onSubmit)}
      />

      <FormLinks>
        <Link href="/(auth)/recuperar-senha" style={formLinkStyle}>
          Esqueci minha senha
        </Link>
        <Link href="/(auth)/criar-conta" style={formLinkStyle}>
          Criar uma conta
        </Link>
      </FormLinks>
    </Screen>
  );
}
