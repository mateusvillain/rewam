import { z } from 'zod';

/** Contratos compartilhados entre app, MCP e backend. Nunca duplicar em outro pacote. */

export const mediaTypeSchema = z.enum(['movie', 'tv']);
export type MediaType = z.infer<typeof mediaTypeSchema>;

export const titleSchema = z.object({
  id: z.uuid(),
  tmdbId: z.number().int().positive(),
  mediaType: mediaTypeSchema,
  title: z.string().min(1),
  originalTitle: z.string().nullable(),
  posterPath: z.string().nullable(),
  releaseDate: z.string().nullable(),
  runtimeMinutes: z.number().int().positive().nullable(),
});
export type Title = z.infer<typeof titleSchema>;

export const episodeSchema = z.object({
  id: z.uuid(),
  titleId: z.uuid(),
  seasonNumber: z.number().int().nonnegative(),
  episodeNumber: z.number().int().positive(),
  name: z.string().nullable(),
  runtimeMinutes: z.number().int().positive().nullable(),
  airDate: z.string().nullable(),
});
export type Episode = z.infer<typeof episodeSchema>;

// ---------------------------------------------------------------------------
// Catálogo TMDB, já normalizado
// ---------------------------------------------------------------------------
// Formas derivadas de `titleSchema` e `episodeSchema` para não repetir campo por
// campo: o que vem do TMDB é o mesmo título, só que ainda sem identidade no
// nosso banco. Derivar mantém os dois lados em sincronia quando um campo mudar.

/** Busca do TMDB não devolve duração — por isso ela some aqui, em vez de virar `null`. */
export const catalogSearchResultSchema = titleSchema.omit({ id: true, runtimeMinutes: true });
export type CatalogSearchResult = z.infer<typeof catalogSearchResultSchema>;

/** Título de catálogo pronto para upsert em `titles`, ainda sem `id`. */
export const catalogTitleSchema = titleSchema.omit({ id: true });
export type CatalogTitle = z.infer<typeof catalogTitleSchema>;

/** Detalhe traz sinopse, que não é persistida em `titles` nem usada na busca. */
export const catalogTitleDetailSchema = catalogTitleSchema.extend({
  overview: z.string().nullable(),
});
export type CatalogTitleDetail = z.infer<typeof catalogTitleDetailSchema>;

/** Episódio do TMDB: sem `id` nem `titleId`, que só existem depois de persistido. */
export const catalogEpisodeSchema = episodeSchema
  .omit({ id: true, titleId: true })
  .extend({ tmdbId: z.number().int().positive() });
export type CatalogEpisode = z.infer<typeof catalogEpisodeSchema>;

/**
 * Instante vindo de uma coluna `timestamptz`.
 *
 * O deslocamento é aceito de propósito: o PostgREST serializa `timestamptz`
 * como `2026-08-10T20:00:00+00:00`, não com `Z`. O padrão de `z.iso.datetime()`
 * exige `Z` e recusaria toda linha real do banco — a validação de retorno
 * quebraria justamente onde deveria proteger.
 */
export const timestampSchema = z.iso.datetime({ offset: true });

export const watchEventSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  titleId: z.uuid(),
  episodeId: z.uuid().nullable(),
  watchedAt: timestampSchema,
  durationMinutes: z.number().int().positive().nullable(),
  notes: z.string().max(500).nullable(),
});
export type WatchEvent = z.infer<typeof watchEventSchema>;

/**
 * Exibição com o catálogo junto, como as listas de histórico precisam.
 *
 * Existe para que a lista traga pôster e título numa consulta só: sem o
 * aninhamento, cada linha da tela viraria uma ida ao banco atrás do título.
 * `episode` é nulo em filme e no registro agregado de série.
 */
export const watchEventWithContextSchema = watchEventSchema.extend({
  title: titleSchema,
  episode: episodeSchema.nullable(),
});
export type WatchEventWithContext = z.infer<typeof watchEventWithContextSchema>;

/** Entrada de criação: `user_id` vem sempre de `auth.uid()`, nunca do cliente. */
export const createWatchEventInputSchema = watchEventSchema
  .omit({ id: true, userId: true })
  .extend({ watchedAt: timestampSchema.default(() => new Date().toISOString()) });
export type CreateWatchEventInput = z.infer<typeof createWatchEventInputSchema>;

/**
 * Edição de uma exibição já registrada.
 *
 * Só os três campos que a pessoa de fato revisa. `titleId` e `episodeId` ficam
 * de fora porque mudá-los não é editar o registro: é registrar outra coisa — e
 * a numeração de reassistida dos dois alvos mudaria em silêncio.
 *
 * Campo ausente não é alterado; `null` explícito apaga o valor, que é como se
 * remove uma nota ou se volta a duração para desconhecida.
 */
export const updateWatchEventInputSchema = watchEventSchema
  .pick({ watchedAt: true, durationMinutes: true, notes: true })
  .partial();
export type UpdateWatchEventInput = z.infer<typeof updateWatchEventInputSchema>;

export const watchStatsSchema = z.object({
  totalMinutes: z.number().int().nonnegative(),
  totalEvents: z.number().int().nonnegative(),
  rewatchEvents: z.number().int().nonnegative(),
  unknownDurationEvents: z.number().int().nonnegative(),
});
export type WatchStats = z.infer<typeof watchStatsSchema>;

// ---------------------------------------------------------------------------
// Autenticação
// ---------------------------------------------------------------------------
// Contratos de formulário vivem aqui para que telas, `@rewam/auth` e MCP usem a
// mesma regra e a mesma mensagem, em vez de cada um redefinir a sua.

export const emailSchema = z.email('Informe um e-mail válido.');

export const passwordSchema = z.string().min(8, 'A senha precisa de pelo menos 8 caracteres.');

/** Código enviado por e-mail na confirmação de cadastro e na troca de senha. */
export const verificationCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, 'O código tem 6 dígitos.');

export const credentialsSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});
export type Credentials = z.infer<typeof credentialsSchema>;

/** Espelha a constraint `profiles_name_length_check` no banco. */
export const profileNameSchema = z.string().trim().max(100, 'Use no máximo 100 caracteres.');

export const signUpSchema = credentialsSchema.extend({
  name: profileNameSchema.min(2, 'Informe seu nome.'),
});

export const profileSchema = z.object({
  id: z.uuid(),
  name: z.string().nullable(),
});
export type Profile = z.infer<typeof profileSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;

export const newPasswordSchema = z.object({ password: passwordSchema });
export type NewPasswordInput = z.infer<typeof newPasswordSchema>;

export const passwordResetSchema = z.object({
  code: verificationCodeSchema,
  password: passwordSchema,
});
export type PasswordResetInput = z.infer<typeof passwordResetSchema>;
