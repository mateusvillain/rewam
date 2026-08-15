/**
 * Só variáveis públicas: URL Supabase, chave anônima e token de leitura do TMDB.
 * Segredos (`service_role`, token privado) ficam exclusivamente no servidor.
 */
function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Variável de ambiente ausente: ${name}. Veja .env.example.`);
  }
  return value;
}

export const env = {
  supabaseUrl: requireEnv('EXPO_PUBLIC_SUPABASE_URL', process.env.EXPO_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: requireEnv(
    'EXPO_PUBLIC_SUPABASE_ANON_KEY',
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  ),
  tmdbReadToken: requireEnv('EXPO_PUBLIC_TMDB_READ_TOKEN', process.env.EXPO_PUBLIC_TMDB_READ_TOKEN),
};
