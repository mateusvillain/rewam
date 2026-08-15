import { z } from 'zod';
import type { RewamSupabaseClient } from './client';

export const profileSchema = z.object({
  id: z.uuid(),
  name: z.string().nullable(),
});
export type Profile = z.infer<typeof profileSchema>;

/**
 * O RLS já limita a leitura ao próprio perfil, então não há filtro por usuário
 * aqui: pedir `user_id` ao cliente seria justamente o que as políticas evitam.
 */
export async function getOwnProfile(client: RewamSupabaseClient): Promise<Profile | null> {
  const { data, error } = await client.from('profiles').select('id, name').maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return profileSchema.parse(data);
}

export async function updateOwnProfileName(
  client: RewamSupabaseClient,
  name: string | null,
): Promise<Profile> {
  const { data, error } = await client
    .from('profiles')
    .update({ name })
    // O RLS restringe a linha, mas o PostgREST exige um filtro explícito para
    // não recusar o update como operação em massa.
    .not('id', 'is', null)
    .select('id, name')
    .single();

  if (error) throw error;

  return profileSchema.parse(data);
}

/** Apaga a conta de quem está autenticado; perfil e exibições vão pela cascata. */
export async function deleteOwnAccount(client: RewamSupabaseClient): Promise<void> {
  const { error } = await client.rpc('delete_own_account');
  if (error) throw error;
}
