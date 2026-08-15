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
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  canResend,
  classifyAuthError,
  remainingCooldownSeconds,
  resendLabel,
  translateAuthError,
} from '@/features/auth';
import { supabase } from '@/lib/supabase';

const formSchema = z.object({ code: verificationCodeSchema });
type FormValues = z.infer<typeof formSchema>;

export default function ConfirmarEmailScreen() {
  const { email } = useLocalSearchParams<{ email?: string }>();
  const [lastSentAt, setLastSentAt] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [feedback, setFeedback] = useState<{ kind: 'erro' | 'neutro'; message: string } | null>(
    null,
  );
  const [isResending, setIsResending] = useState(false);

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { code: '' },
  });

  // Um tique por segundo só enquanto há espera a mostrar; o intervalo para
  // sozinho ao zerar, em vez de ficar rodando o tempo todo em segundo plano.
  useEffect(() => {
    if (lastSentAt === null) return;

    function tick() {
      setRemaining(remainingCooldownSeconds(lastSentAt, Date.now()));
    }

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lastSentAt]);

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

  async function onResend() {
    if (!email || !canResend(lastSentAt, Date.now())) return;

    setIsResending(true);
    setFeedback(null);

    const { error } = await resendSignUpCode(supabase, email);

    if (error && classifyAuthError(error) === 'infra') {
      setFeedback({ kind: 'erro', message: translateAuthError(error) });
    } else {
      // Sucesso e erro de usuário respondem igual: esta tela não pode revelar
      // se o e-mail digitado corresponde a uma conta pendente.
      setFeedback({ kind: 'neutro', message: 'Enviamos um novo código.' });
      setLastSentAt(Date.now());
    }

    setIsResending(false);
  }

  if (!email) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Confirmar e-mail' }} />
        <FormTitle>Precisamos do seu e-mail</FormTitle>
        <FormDescription>
          O código é enviado para um e-mail específico, e esta tela foi aberta sem essa informação.
          Entre com sua conta para receber um novo código.
        </FormDescription>
        <Button label="Ir para o login" onPress={() => router.replace('/(auth)/entrar')} />
      </Screen>
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

      <FormMessage>{errors.root?.message}</FormMessage>
      {feedback ? <FormMessage tone={feedback.kind}>{feedback.message}</FormMessage> : null}

      <Button
        label={isSubmitting ? 'Confirmando…' : 'Confirmar'}
        disabled={isSubmitting}
        onPress={handleSubmit(onSubmit)}
      />

      <Button
        label={isResending ? 'Reenviando…' : resendLabel(remaining)}
        variant="ghost"
        disabled={isResending || remaining > 0}
        onPress={onResend}
      />

      <FormLinks>
        <Link href="/(auth)/entrar" style={formLinkStyle}>
          Voltar para o login
        </Link>
      </FormLinks>
    </Screen>
  );
}
