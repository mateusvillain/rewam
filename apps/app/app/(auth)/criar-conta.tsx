import { zodResolver } from '@hookform/resolvers/zod';
import { signUp } from '@rewam/auth';
import { signUpSchema, type SignUpInput } from '@rewam/types';
import {
  Button,
  ControlledTextField,
  formLinkStyle,
  FormLinks,
  FormMessage,
  FormTitle,
  Screen,
} from '@rewam/ui';
import { Link, router, Stack } from 'expo-router';
import { useForm } from 'react-hook-form';
import { classifyAuthError, translateAuthError } from '@/features/auth';
import { supabase } from '@/lib/supabase';

export default function CriarContaScreen() {
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
      // Erro de usuário aqui quase sempre significa "esse e-mail já tem conta",
      // e dizer isso transformaria o cadastro num verificador de quem está
      // cadastrado — justamente o que as telas de recuperação evitam. Então o
      // caminho é o mesmo do cadastro bem-sucedido: avisamos que enviamos um
      // código, e quem já tem conta descobre pelo e-mail que recebe.
      if (classifyAuthError(error) === 'infra') {
        setError('root', { message: translateAuthError(error) });
        return;
      }

      goToConfirmation(values.email);
      return;
    }

    // Com a confirmação ligada, o cadastro não devolve sessão: falta digitar o
    // código. O caminho é o mesmo do e-mail já cadastrado, de propósito — quem
    // tenta descobrir contas alheias vê sempre a mesma tela.
    if (data.session === null) {
      goToConfirmation(values.email);
      return;
    }

    router.replace('/');
  }

  function goToConfirmation(email: string) {
    router.push({ pathname: '/(auth)/confirmar-email', params: { email } });
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Criar conta' }} />

      <FormTitle>Criar conta no Rewam</FormTitle>

      <ControlledTextField
        control={control}
        name="name"
        label="Nome"
        error={errors.name?.message}
        autoComplete="name"
        placeholder="Como quer ser chamado"
      />

      <ControlledTextField
        control={control}
        name="email"
        label="E-mail"
        error={errors.email?.message}
        autoCapitalize="none"
        autoComplete="email"
        inputMode="email"
        keyboardType="email-address"
        placeholder="voce@exemplo.com"
      />

      <ControlledTextField
        control={control}
        name="password"
        label="Senha"
        error={errors.password?.message}
        autoComplete="new-password"
        secureTextEntry
        hint="Pelo menos 8 caracteres."
        onSubmitEditing={handleSubmit(onSubmit)}
      />

      <FormMessage>{errors.root?.message}</FormMessage>

      <Button
        label={isSubmitting ? 'Criando conta…' : 'Criar conta'}
        disabled={isSubmitting}
        onPress={handleSubmit(onSubmit)}
      />

      <FormLinks>
        <Link href="/(auth)/entrar" style={formLinkStyle}>
          Já tenho conta
        </Link>
      </FormLinks>
    </Screen>
  );
}
