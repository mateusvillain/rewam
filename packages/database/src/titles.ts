import { catalogTitleSchema, titleSchema, type CatalogTitle, type Title } from '@rewam/types';

import type { RewamSupabaseClient } from './client';

export type { Title };

/**
 * Grava ou atualiza a cópia mínima do título selecionado.
 *
 * O TMDB é catálogo, não fonte dos registros pessoais: `watch_events`
 * referencia `titles.id`, então o título precisa existir aqui antes de qualquer
 * exibição ser registrada.
 *
 * Passa pela função `upsert_title` e não pela tabela: desde a E3.7, o papel
 * `authenticated` só tem leitura em catálogo. O `update` direto deixaria
 * qualquer conta reescrever a duração de um título, que alimenta as
 * estatísticas de todas as outras.
 *
 * Recebe `CatalogTitle`, e não `CatalogSearchResult`, de propósito: resultado de
 * busca não traz duração, e o tipo é o que impede a chamada errada. A função no
 * banco tem a segunda linha de defesa: a duração é gravada uma vez e nenhuma
 * chamada posterior a reescreve — nem uma vinda de outra conta.
 */
export async function upsertTitle(
  client: RewamSupabaseClient,
  input: CatalogTitle,
): Promise<Title> {
  // Validar na entrada, e não só na saída: a tabela recusa duração <= 0 com
  // `titles_runtime_minutes_check`, e esse nome chegaria cru na tela se a
  // normalização deixasse passar um zero. Falhar aqui dá uma mensagem legível
  // e evita a ida ao banco.
  const title = catalogTitleSchema.parse(input);

  const { data, error } = await client.rpc('upsert_title', {
    p_tmdb_id: title.tmdbId,
    p_media_type: title.mediaType,
    p_title: title.title,
    // `undefined` em vez de `null` porque os argumentos opcionais da função são
    // tipados sem `null`. O efeito é o mesmo: cai no default.
    //
    // Vale notar o que isto **não** protege: título, pôster e data são
    // sobrescritos pelo que chegar, inclusive por nada. Só a duração é imutável
    // depois da primeira gravação, e quem garante isso é o `coalesce` da
    // função, não este `??`.
    p_original_title: title.originalTitle ?? undefined,
    p_poster_path: title.posterPath ?? undefined,
    p_release_date: title.releaseDate ?? undefined,
    p_runtime_minutes: title.runtimeMinutes ?? undefined,
  });

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
