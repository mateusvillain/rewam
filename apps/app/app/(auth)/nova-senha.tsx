import { zodResolver } from '@hookform/resolvers/zod';
import {
  requestPasswordResetCode,
  signOut,
  updatePassword,
  verifyPasswordResetCode,
} from '@rewam/auth';
import { passwordResetSchema, type PasswordResetInput } from '@rewam/types';
import {
  Button,
  ControlledTextField,
  FormDescription,
  FormMessage,
  FormTitle,
  Screen,
} from '@rewam/ui';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { MissingEmailNotice, translateAuthError, useResendCooldown } from '@/features/auth';
import { supabase } from '@/lib/supabase';

export default function NovaSenhaScreen() {
  const { email } = useLocalSearchParams<{ email?: string }>();

  const send = useCallback(() => requestPasswordResetCode(supabase, email ?? ''), [email]);
  const { resend, feedback, isBlocked, label: resendButtonLabel } = useResendCooldown(send);

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PasswordResetInput>({
    resolver: zodResolver(passwordResetSchema),
    defaultValues: { code: '', password: '' },
  });

  async function onSubmit({ code, password }: PasswordResetInput) {
    if (!email) {
      setError('root', { message: 'Recomece informando seu e-mail.' });
      return;
    }

    // O código só troca de mãos por uma sessão; é ela que autoriza a nova senha.
    const { error: verifyError } = await verifyPasswordResetCode(supabase, email, code);
    if (verifyError) {
      setError('code', { message: translateAuthError(verifyError) });
      return;
    }

    const { error: updateError } = await updatePassword(supabase, { password });
    if (updateError) {
      // A verificação já criou sessão válida. Sem encerrá-la, quem falha aqui
      // fica autenticado sem ter trocado a senha — um código de e-mail viraria
      // login. O código também já foi consumido, então o caminho é pedir outro.
      await signOut(supabase);
      setError('root', {
        message: `${translateAuthError(updateError)} Peça um novo código para tentar de novo.`,
      });
      return;
    }

    router.replace('/');
  }

  if (!email) {
    return (
      <MissingEmailNotice
        description="O código é enviado para um e-mail específico, e esta tela foi aberta sem essa informação. Recomece o pedido para receber um código novo."
        action={{ label: 'Pedir código de redefinição', href: '/(auth)/recuperar-senha' }}
      />
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Nova senha' }} />

      <FormTitle>Escolha uma nova senha</FormTitle>
      <FormDescription>
        Digite o código que enviamos para {email} e a senha que passará a valer.
      </FormDescription>

      <ControlledTextField
        control={control}
        name="code"
        label="Código de 6 dígitos"
        error={errors.code?.message}
        autoComplete="one-time-code"
        inputMode="numeric"
        keyboardType="number-pad"
        maxLength={6}
        placeholder="000000"
      />

      <ControlledTextField
        control={control}
        name="password"
        label="Nova senha"
        error={errors.password?.message}
        autoComplete="new-password"
        secureTextEntry
        hint="Pelo menos 8 caracteres."
        onSubmitEditing={handleSubmit(onSubmit)}
      />

      <FormMessage>{errors.root?.message}</FormMessage>
      {feedback ? <FormMessage tone={feedback.tone}>{feedback.message}</FormMessage> : null}

      <Button
        label={isSubmitting ? 'Salvando…' : 'Salvar nova senha'}
        disabled={isSubmitting}
        onPress={handleSubmit(onSubmit)}
      />

      <Button label={resendButtonLabel} variant="ghost" disabled={isBlocked} onPress={resend} />
    </Screen>
  );
}
