import {
  createClient,
  type SupabaseClient,
  type SupabaseClientOptions,
} from '@supabase/supabase-js';
import type { Database } from './types.generated';

export type RewamSupabaseClient = SupabaseClient<Database>;

export type SupabaseClientConfig = {
  url: string;
  /** Sempre a chave anônima no app. `service_role` jamais sai do servidor. */
  anonKey: string;
  options?: SupabaseClientOptions<'public'>;
};

export function createSupabaseClient({
  url,
  anonKey,
  options,
}: SupabaseClientConfig): RewamSupabaseClient {
  if (!url || !anonKey) {
    throw new Error('Supabase: URL e chave anônima são obrigatórias.');
  }
  return createClient<Database>(url, anonKey, options);
}
