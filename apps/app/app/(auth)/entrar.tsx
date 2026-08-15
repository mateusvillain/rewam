import { zodResolver } from '@hookform/resolvers/zod';
import { signIn } from '@rewam/auth';
import { colors, spacing, typography } from '@rewam/tokens';
import { credentialsSchema, type Credentials } from '@rewam/types';
import { Button, Screen, TextField } from '@rewam/ui';
import { Link, router, Stack } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text, View } from 'react-native';
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

      <Text style={styles.title}>Entrar no Rewam</Text>

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
            inputMode="email"
            keyboardType="email-address"
            placeholder="voce@exemplo.com"
          />
        )}
      />

      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextField
            label="Senha"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.password?.message}
            autoComplete="current-password"
            secureTextEntry
            onSubmitEditing={handleSubmit(onSubmit)}
          />
        )}
      />

      {errors.root?.message ? <Text style={styles.error}>{errors.root.message}</Text> : null}

      <Button
        label={isSubmitting ? 'Entrando…' : 'Entrar'}
        disabled={isSubmitting}
        onPress={handleSubmit(onSubmit)}
      />

      <View style={styles.links}>
        <Link href="/(auth)/recuperar-senha" style={styles.link}>
          Esqueci minha senha
        </Link>
        <Link href="/(auth)/criar-conta" style={styles.link}>
          Criar uma conta
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.text,
    fontSize: typography.title.fontSize,
    fontWeight: '600',
  },
  error: {
    color: colors.danger,
    fontSize: typography.caption.fontSize,
  },
  links: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  link: {
    color: colors.accent,
    fontSize: typography.body.fontSize,
  },
});
