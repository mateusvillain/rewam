import { zodResolver } from '@hookform/resolvers/zod';
import { requestPasswordResetCode } from '@rewam/auth';
import { emailSchema } from '@rewam/types';
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
import { Link, router, Stack } from 'expo-router';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { classifyAuthError, translateAuthError } from '@/features/auth';
import { supabase } from '@/lib/supabase';

const formSchema = z.object({ email: emailSchema });
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
    // isso entregaria quais endereços têm conta. Só falha de infraestrutura
    // aparece — a classificação vive em um lugar só, junto das mensagens, para
    // não haver duas listas capazes de divergir.
    if (error && classifyAuthError(error) === 'infra') {
      setError('root', { message: translateAuthError(error) });
      return;
    }

    router.push({ pathname: '/(auth)/nova-senha', params: { email } });
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Recuperar senha' }} />

      <FormTitle>Esqueceu a senha?</FormTitle>
      <FormDescription>
        Informe o e-mail da sua conta. Enviaremos um código de 6 dígitos para você escolher uma nova
        senha.
      </FormDescription>

      <ControlledTextField
        control={control}
        name="email"
        label="E-mail"
        error={errors.email?.message}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        inputMode="email"
        placeholder="voce@exemplo.com"
        submitBehavior="blurAndSubmit"
        onSubmitEditing={handleSubmit(onSubmit)}
      />

      <FormMessage>{errors.root?.message}</FormMessage>

      <Button
        label={isSubmitting ? 'Enviando…' : 'Enviar código'}
        disabled={isSubmitting}
        onPress={handleSubmit(onSubmit)}
      />

      <FormLinks>
        <Link href="/(auth)/entrar" style={formLinkStyle}>
          Voltar para o login
        </Link>
      </FormLinks>
    </Screen>
  );
}
