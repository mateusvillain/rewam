import { zodResolver } from '@hookform/resolvers/zod';
import {
  requestPasswordResetCode,
  signOut,
  updatePassword,
  verifyPasswordResetCode,
} from '@rewam/auth';
import { colors, spacing, typography } from '@rewam/tokens';
import { passwordResetSchema, type PasswordResetInput } from '@rewam/types';
import { Button, Screen, TextField } from '@rewam/ui';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text } from 'react-native';
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
        <Text style={styles.title}>Precisamos do seu e-mail</Text>
        <Text style={styles.body}>
          O código é enviado para um e-mail específico, e esta tela foi aberta sem essa informação.
          Recomece o pedido para receber um código novo.
        </Text>
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

      <Text style={styles.title}>Escolha uma nova senha</Text>
      <Text style={styles.body}>
        Digite o código que enviamos para {email} e a senha que passará a valer.
      </Text>

      <Controller
        control={control}
        name="code"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextField
            label="Código de 6 dígitos"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.code?.message}
            autoComplete="one-time-code"
            inputMode="numeric"
            keyboardType="number-pad"
            maxLength={6}
            placeholder="000000"
          />
        )}
      />

      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextField
            label="Nova senha"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.password?.message}
            autoComplete="new-password"
            secureTextEntry
            hint="Pelo menos 8 caracteres."
            onSubmitEditing={handleSubmit(onSubmit)}
          />
        )}
      />

      {errors.root?.message ? <Text style={styles.error}>{errors.root.message}</Text> : null}
      {resend ? (
        <Text style={resend.kind === 'erro' ? styles.error : styles.info}>{resend.message}</Text>
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

const styles = StyleSheet.create({
  title: {
    color: colors.text,
    fontSize: typography.title.fontSize,
    fontWeight: '600',
  },
  body: {
    color: colors.textMuted,
    fontSize: typography.body.fontSize,
    marginBottom: spacing.sm,
  },
  error: {
    color: colors.danger,
    fontSize: typography.caption.fontSize,
  },
  info: {
    color: colors.textMuted,
    fontSize: typography.caption.fontSize,
  },
});
