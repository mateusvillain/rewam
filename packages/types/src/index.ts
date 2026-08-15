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

export const watchEventSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  titleId: z.uuid(),
  episodeId: z.uuid().nullable(),
  watchedAt: z.iso.datetime(),
  durationMinutes: z.number().int().positive().nullable(),
  notes: z.string().max(500).nullable(),
});
export type WatchEvent = z.infer<typeof watchEventSchema>;

/** Entrada de criação: `user_id` vem sempre de `auth.uid()`, nunca do cliente. */
export const createWatchEventInputSchema = watchEventSchema
  .omit({ id: true, userId: true })
  .extend({ watchedAt: z.iso.datetime().default(() => new Date().toISOString()) });
export type CreateWatchEventInput = z.infer<typeof createWatchEventInputSchema>;

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
