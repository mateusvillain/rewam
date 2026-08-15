import { createTmdbClient } from '@rewam/tmdb';
import { env } from './env';

export const tmdb = createTmdbClient({ readToken: env.tmdbReadToken });
