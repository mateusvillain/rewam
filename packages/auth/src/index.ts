import type { RewamSupabaseClient } from '@rewam/database';
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

export async function resetPassword(
  client: RewamSupabaseClient,
  email: string,
  redirectTo?: string,
) {
  return client.auth.resetPasswordForEmail(z.email().parse(email), { redirectTo });
}

export async function getCurrentUserId(client: RewamSupabaseClient): Promise<string | null> {
  const { data } = await client.auth.getUser();
  return data.user?.id ?? null;
}
