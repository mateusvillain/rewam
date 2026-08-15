import { titleSchema, type CatalogTitle, type Title } from '@rewam/types';

import type { RewamSupabaseClient } from './client';

export type { Title };

const TITLE_COLUMNS =
  'id, tmdb_id, media_type, title, original_title, poster_path, release_date, runtime_minutes';

/**
 * Grava ou atualiza a cópia mínima do título selecionado.
 *
 * O TMDB é catálogo, não fonte dos registros pessoais: `watch_events`
 * referencia `titles.id`, então o título precisa existir aqui antes de qualquer
 * exibição ser registrada.
 *
 * Recebe `CatalogTitle`, e não `CatalogSearchResult`, de propósito. Resultado de
 * busca não traz duração, e persistir a partir dele gravaria `runtime_minutes`
 * nulo — indistinguível de "o TMDB não sabe a duração" — e depois apagaria a
 * duração certa no próximo upsert. Quem seleciona um título busca o detalhe
 * antes; o tipo é o que garante isso, porque `CatalogSearchResult` não é
 * atribuível a `CatalogTitle`.
 */
export async function upsertTitle(
  client: RewamSupabaseClient,
  title: CatalogTitle,
): Promise<Title> {
  // A unicidade de (tmdb_id, media_type) é o que torna isto idempotente:
  // selecionar o mesmo título de novo atualiza a linha e devolve o mesmo id,
  // em vez de criar outra.
  const { data, error } = await client
    .from('titles')
    .upsert(
      {
        tmdb_id: title.tmdbId,
        media_type: title.mediaType,
        title: title.title,
        original_title: title.originalTitle,
        poster_path: title.posterPath,
        release_date: title.releaseDate,
        runtime_minutes: title.runtimeMinutes,
      },
      { onConflict: 'tmdb_id,media_type' },
    )
    .select(TITLE_COLUMNS)
    .single();

  if (error) throw error;

  return titleSchema.parse({
    id: data.id,
    tmdbId: data.tmdb_id,
    mediaType: data.media_type,
    title: data.title,
    originalTitle: data.original_title,
    posterPath: data.poster_path,
    releaseDate: data.release_date,
    runtimeMinutes: data.runtime_minutes,
  });
}
