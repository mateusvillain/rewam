import { z } from 'zod';

/**
 * O MCP nunca opera como administrador em nome de terceiros: usa a chave
 * anônima somada ao token de sessão do usuário. `service_role` fica fora daqui.
 */
const envSchema = z.object({
  SUPABASE_URL: z.url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  TMDB_API_READ_TOKEN: z.string().min(1),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const missing = parsed.error.issues.map((issue) => issue.path.join('.')).join(', ');
    throw new Error(`Configuração inválida do MCP: ${missing}. Veja .env.example.`);
  }
  return parsed.data;
}
