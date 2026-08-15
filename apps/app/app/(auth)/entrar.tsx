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
import { Link, router, Stack } from 'expo-router';
import { useForm } from 'react-hook-form';
import { translateAuthError } from '@/features/auth';
import { supabase } from '@/lib/supabase';

export default function EntrarScreen() {
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
      setError('root', { message: translateAuthError(error) });
      return;
    }

    router.replace('/');
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
