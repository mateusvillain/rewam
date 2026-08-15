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
