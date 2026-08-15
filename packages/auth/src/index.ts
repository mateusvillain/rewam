import type { RewamSupabaseClient } from '@rewam/database';
import type { Session } from '@supabase/supabase-js';
import { z } from 'zod';

export const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(8, 'A senha precisa de pelo menos 8 caracteres.'),
});
export type Credentials = z.infer<typeof credentialsSchema>;

export const signUpSchema = credentialsSchema.extend({
  name: z.string().min(2, 'Informe seu nome.'),
});
export type SignUpInput = z.infer<typeof signUpSchema>;

/** O perfil é criado por trigger em `auth.users`; aqui só passamos metadados seguros. */
export async function signUp(client: RewamSupabaseClient, input: SignUpInput) {
  const { name, email, password } = signUpSchema.parse(input);
  return client.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });
}

export async function signIn(client: RewamSupabaseClient, input: Credentials) {
  const { email, password } = credentialsSchema.parse(input);
  return client.auth.signInWithPassword({ email, password });
}

export async function signOut(client: RewamSupabaseClient) {
  return client.auth.signOut();
}

/**
 * Redefinição de senha em três passos, por código de 6 dígitos:
 * pedir o código, trocar o código por uma sessão, e então gravar a nova senha.
 *
 * O código evita depender de deep link nas três plataformas e funciona mesmo
 * quando a pessoa abre o e-mail num dispositivo diferente do que pediu a troca.
 */
export const passwordResetCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, 'O código tem 6 dígitos.');

export const newPasswordSchema = z.object({
  password: z.string().min(8, 'A senha precisa de pelo menos 8 caracteres.'),
});
export type NewPasswordInput = z.infer<typeof newPasswordSchema>;

export async function requestPasswordResetCode(client: RewamSupabaseClient, email: string) {
  return client.auth.resetPasswordForEmail(z.email().parse(email));
}

/** Um código válido cria a sessão que autoriza a troca de senha em seguida. */
export async function verifyPasswordResetCode(
  client: RewamSupabaseClient,
  email: string,
  code: string,
) {
  return client.auth.verifyOtp({
    email: z.email().parse(email),
    token: passwordResetCodeSchema.parse(code),
    type: 'recovery',
  });
}

/** Exige a sessão criada por `verifyPasswordResetCode`. */
export async function updatePassword(client: RewamSupabaseClient, input: NewPasswordInput) {
  const { password } = newPasswordSchema.parse(input);
  return client.auth.updateUser({ password });
}

export async function getCurrentUserId(client: RewamSupabaseClient): Promise<string | null> {
  const { data } = await client.auth.getUser();
  return data.user?.id ?? null;
}

/**
 * Observa a sessão do início ao fim: o Supabase emite `INITIAL_SESSION` assim
 * que termina de restaurar do storage, e depois um evento por login, logout ou
 * renovação de token — inclusive quando o logout acontece em outra aba na web.
 *
 * Por isso não há um `getSession()` em paralelo: duas fontes para o mesmo estado
 * abrem espaço para a resposta mais lenta sobrescrever a mais nova.
 *
 * Devolve a função de cancelamento da assinatura.
 */
export function subscribeToSession(
  client: RewamSupabaseClient,
  onChange: (session: Session | null) => void,
): () => void {
  const {
    data: { subscription },
  } = client.auth.onAuthStateChange((_event, session) => {
    onChange(session);
  });

  return () => subscription.unsubscribe();
}
