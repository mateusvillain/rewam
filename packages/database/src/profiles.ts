import { profileSchema, type Profile } from '@rewam/types';
import type { RewamSupabaseClient } from './client';
import { throwIfError } from './errors';

export type { Profile };

/**
 * O RLS já limita a leitura ao próprio perfil, então não há filtro por usuário
 * aqui: pedir `user_id` ao cliente seria justamente o que as políticas evitam.
 */
export async function getOwnProfile(client: RewamSupabaseClient): Promise<Profile | null> {
  const { data, error } = await client.from('profiles').select('id, name').maybeSingle();

  throwIfError(error);
  if (!data) return null;

  return profileSchema.parse(data);
}

/**
 * O filtro por id é defesa em profundidade, não formalidade: sem ele o PostgREST
 * exigiria algum filtro qualquer, e a operação passaria a depender só do RLS
 * para não virar um update em massa se a política mudasse.
 */
export async function updateOwnProfileName(
  client: RewamSupabaseClient,
  userId: string,
  name: string | null,
): Promise<Profile> {
  const { data, error } = await client
    .from('profiles')
    .update({ name })
    .eq('id', userId)
    .select('id, name')
    .single();

  throwIfError(error);

  return profileSchema.parse(data);
}

/** Cria o perfil que deveria ter nascido com a conta, caso ele não exista. */
export async function createOwnProfile(
  client: RewamSupabaseClient,
  userId: string,
  name: string | null,
): Promise<Profile> {
  const { data, error } = await client
    .from('profiles')
    .insert({ id: userId, name })
    .select('id, name')
    .single();

  throwIfError(error);

  return profileSchema.parse(data);
}

/** Apaga a conta de quem está autenticado; perfil e exibições vão pela cascata. */
export async function deleteOwnAccount(client: RewamSupabaseClient): Promise<void> {
  const { error } = await client.rpc('delete_own_account');
  throwIfError(error);
}
