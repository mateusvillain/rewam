import { zodResolver } from '@hookform/resolvers/zod';
import { resendSignUpCode, verifySignUpCode } from '@rewam/auth';
import { verificationCodeSchema } from '@rewam/types';
import {
  Button,
  ControlledTextField,
  formLinkStyle,
  FormDescription,
  FormLinks,
  FormMessage,
  FormTitle,
  Screen,
} from '@rewam/ui';
import { Link, router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { MissingEmailNotice, translateAuthError, useResendCooldown } from '@/features/auth';
import { supabase } from '@/lib/supabase';

const formSchema = z.object({ code: verificationCodeSchema });
type FormValues = z.infer<typeof formSchema>;

export default function ConfirmarEmailScreen() {
  const { email } = useLocalSearchParams<{ email?: string }>();

  const send = useCallback(() => resendSignUpCode(supabase, email ?? ''), [email]);
  const { resend, feedback, isBlocked, label: resendButtonLabel } = useResendCooldown(send);

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { code: '' },
  });

  async function onSubmit({ code }: FormValues) {
    if (!email) return;

    const { error } = await verifySignUpCode(supabase, email, code);

    if (error) {
      setError('code', { message: translateAuthError(error) });
      return;
    }

    // O código válido já devolve sessão: a pessoa entra sem redigitar a senha.
    router.replace('/');
  }

  if (!email) {
    return (
      <MissingEmailNotice
        description="O código é enviado para um e-mail específico, e esta tela foi aberta sem essa informação. Entre com sua conta para receber um novo código."
        action={{ label: 'Ir para o login', href: '/(auth)/entrar' }}
      />
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Confirmar e-mail' }} />

      <FormTitle>Confirme seu e-mail</FormTitle>
      <FormDescription>
        Enviamos um código de 6 dígitos para {email}. Digite-o para concluir seu cadastro.
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
        onSubmitEditing={handleSubmit(onSubmit)}
      />

      {feedback ? <FormMessage tone={feedback.tone}>{feedback.message}</FormMessage> : null}

      <Button
        label={isSubmitting ? 'Confirmando…' : 'Confirmar'}
        disabled={isSubmitting}
        onPress={handleSubmit(onSubmit)}
      />

      <Button label={resendButtonLabel} variant="ghost" disabled={isBlocked} onPress={resend} />

      <FormLinks>
        <Link href="/(auth)/entrar" style={formLinkStyle}>
          Voltar para o login
        </Link>
      </FormLinks>
    </Screen>
  );
}
