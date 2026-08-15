import { zodResolver } from '@hookform/resolvers/zod';
import { signUp } from '@rewam/auth';
import { colors, spacing, typography } from '@rewam/tokens';
import { signUpSchema, type SignUpInput } from '@rewam/types';
import { Button, Screen, TextField } from '@rewam/ui';
import { Link, router, Stack } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text, View } from 'react-native';
import { resolveSignUpOutcome, translateAuthError } from '@/features/auth';
import { supabase } from '@/lib/supabase';

export default function CriarContaScreen() {
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: '', email: '', password: '' },
  });

  async function onSubmit(values: SignUpInput) {
    const { data, error } = await signUp(supabase, values);

    if (error) {
      setError('root', { message: translateAuthError(error) });
      return;
    }

    // Com confirmação de e-mail ligada, o cadastro não devolve sessão: falta
    // digitar o código. A tela de confirmação chega na REW-50; até lá, o aviso
    // aqui evita deixar a pessoa achando que já está dentro.
    if (resolveSignUpOutcome(data.session !== null) === 'needsConfirmation') {
      setPendingEmail(values.email);
      return;
    }

    router.replace('/');
  }

  if (pendingEmail) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Confirme seu e-mail' }} />
        <Text style={styles.title}>Falta confirmar seu e-mail</Text>
        <Text style={styles.body}>
          Enviamos um código para {pendingEmail}. Confirme para concluir o cadastro e entrar.
        </Text>
        <Link href="/(auth)/entrar" style={styles.link}>
          Voltar para o login
        </Link>
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Criar conta' }} />

      <Text style={styles.title}>Criar conta no Rewam</Text>

      <Controller
        control={control}
        name="name"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextField
            label="Nome"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.name?.message}
            autoComplete="name"
            placeholder="Como quer ser chamado"
          />
        )}
      />

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
            autoComplete="new-password"
            secureTextEntry
            hint="Pelo menos 8 caracteres."
            onSubmitEditing={handleSubmit(onSubmit)}
          />
        )}
      />

      {errors.root?.message ? <Text style={styles.error}>{errors.root.message}</Text> : null}

      <Button
        label={isSubmitting ? 'Criando conta…' : 'Criar conta'}
        disabled={isSubmitting}
        onPress={handleSubmit(onSubmit)}
      />

      <View style={styles.links}>
        <Link href="/(auth)/entrar" style={styles.link}>
          Já tenho conta
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
  body: {
    color: colors.textMuted,
    fontSize: typography.body.fontSize,
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
