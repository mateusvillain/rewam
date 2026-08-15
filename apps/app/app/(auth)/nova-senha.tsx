import { requestPasswordResetCode, updatePassword, verifyPasswordResetCode } from '@rewam/auth';
import { colors, spacing, typography } from '@rewam/tokens';
import { Button, Screen, TextField } from '@rewam/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text } from 'react-native';
import { z } from 'zod';
import { translateAuthError } from '@/features/auth';
import { supabase } from '@/lib/supabase';

const formSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'O código tem 6 dígitos.'),
  password: z.string().min(8, 'A senha precisa de pelo menos 8 caracteres.'),
});
type FormValues = z.infer<typeof formSchema>;

export default function NovaSenhaScreen() {
  const { email } = useLocalSearchParams<{ email?: string }>();
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { code: '', password: '' },
  });

  async function onSubmit({ code, password }: FormValues) {
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
      setError('root', { message: translateAuthError(updateError) });
      return;
    }

    router.replace('/');
  }

  async function onResend() {
    if (!email) return;

    setIsResending(true);
    setResendMessage(null);

    const { error } = await requestPasswordResetCode(supabase, email);
    setResendMessage(error ? translateAuthError(error) : 'Enviamos um novo código.');
    setIsResending(false);
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Nova senha' }} />

      <Text style={styles.title}>Escolha uma nova senha</Text>
      <Text style={styles.body}>
        {email
          ? `Digite o código que enviamos para ${email} e a senha que passará a valer.`
          : 'Recomece pela tela de recuperação para receber um código.'}
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
      {resendMessage ? <Text style={styles.info}>{resendMessage}</Text> : null}

      <Button
        label={isSubmitting ? 'Salvando…' : 'Salvar nova senha'}
        disabled={isSubmitting || !email}
        onPress={handleSubmit(onSubmit)}
      />

      <Button
        label={isResending ? 'Reenviando…' : 'Reenviar código'}
        variant="ghost"
        disabled={isResending || !email}
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
