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
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { classifyAuthError, translateAuthError } from '@/features/auth';
import { supabase } from '@/lib/supabase';

type ResendState = { kind: 'sucesso' | 'erro'; message: string } | null;

export default function NovaSenhaScreen() {
  const { email } = useLocalSearchParams<{ email?: string }>();
  const [resend, setResend] = useState<ResendState>(null);
  const [isResending, setIsResending] = useState(false);

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

  async function onResend() {
    if (!email) return;

    setIsResending(true);
    setResend(null);

    const { error } = await requestPasswordResetCode(supabase, email);

    if (!error) {
      setResend({ kind: 'sucesso', message: 'Enviamos um novo código.' });
    } else if (classifyAuthError(error) === 'infra') {
      setResend({ kind: 'erro', message: translateAuthError(error) });
    } else {
      // Mesma política da tela anterior: nada aqui pode revelar se a conta existe.
      setResend({ kind: 'sucesso', message: 'Enviamos um novo código.' });
    }

    setIsResending(false);
  }

  if (!email) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Nova senha' }} />
        <FormTitle>Precisamos do seu e-mail</FormTitle>
        <FormDescription>
          O código é enviado para um e-mail específico, e esta tela foi aberta sem essa informação.
          Recomece o pedido para receber um código novo.
        </FormDescription>
        <Button
          label="Pedir código de redefinição"
          onPress={() => router.replace('/(auth)/recuperar-senha')}
        />
      </Screen>
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
      {resend ? (
        <FormMessage tone={resend.kind === 'erro' ? 'erro' : 'neutro'}>
          {resend.message}
        </FormMessage>
      ) : null}

      <Button
        label={isSubmitting ? 'Salvando…' : 'Salvar nova senha'}
        disabled={isSubmitting}
        onPress={handleSubmit(onSubmit)}
      />

      <Button
        label={isResending ? 'Reenviando…' : 'Reenviar código'}
        variant="ghost"
        disabled={isResending}
        onPress={onResend}
      />
    </Screen>
  );
}
