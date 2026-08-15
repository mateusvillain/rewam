import { createSupabaseClient, type RewamSupabaseClient } from '@rewam/database';
import type { Env } from './env.js';

/**
 * Cria um cliente amarrado ao token de sessão do usuário: toda consulta passa
 * pelas políticas de RLS, e `auth.uid()` continua sendo a única fonte de identidade.
 */
export function createUserScopedClient(env: Env, accessToken: string): RewamSupabaseClient {
  if (!accessToken) {
    throw new Error('Chamada MCP sem token de sessão do usuário.');
  }

  return createSupabaseClient({
    url: env.SUPABASE_URL,
    anonKey: env.SUPABASE_ANON_KEY,
    options: {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    },
  });
}
