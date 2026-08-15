import { requestPasswordResetCode } from '@rewam/auth';
import { colors, spacing, typography } from '@rewam/tokens';
import { Button, Screen, TextField } from '@rewam/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { router, Stack } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text } from 'react-native';
import { z } from 'zod';
import { translateAuthError } from '@/features/auth';
import { supabase } from '@/lib/supabase';

const formSchema = z.object({
  email: z.email('Informe um e-mail válido.'),
});
type FormValues = z.infer<typeof formSchema>;

export default function RecuperarSenhaScreen() {
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '' },
  });

  async function onSubmit({ email }: FormValues) {
    const { error } = await requestPasswordResetCode(supabase, email);

    // Um e-mail inexistente não pode ser distinguível de um existente: revelar
    // isso entregaria quais endereços têm conta. Só erros de infraestrutura
    // aparecem para a pessoa.
    if (error && /rate limit|network|for security purposes/i.test(error.message)) {
      setError('root', { message: translateAuthError(error) });
      return;
    }

    router.push({ pathname: '/(auth)/nova-senha', params: { email } });
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Recuperar senha' }} />

      <Text style={styles.title}>Esqueceu a senha?</Text>
      <Text style={styles.body}>
        Informe o e-mail da sua conta. Enviaremos um código de 6 dígitos para você escolher uma nova
        senha.
      </Text>

      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextField
            label="E-mail"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.email?.message}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            inputMode="email"
            placeholder="voce@exemplo.com"
            submitBehavior="blurAndSubmit"
            onSubmitEditing={handleSubmit(onSubmit)}
          />
        )}
      />

      {errors.root?.message ? <Text style={styles.error}>{errors.root.message}</Text> : null}

      <Button
        label={isSubmitting ? 'Enviando…' : 'Enviar código'}
        disabled={isSubmitting}
        onPress={handleSubmit(onSubmit)}
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
});
