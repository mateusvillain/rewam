import { getTitleDetail } from '@rewam/tmdb';
import type { CatalogTitleDetail, MediaType } from '@rewam/types';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { tmdb } from '@/lib/tmdb';

import { useUpsertTitle } from './use-title';

export function titleDetailQueryKey(mediaType: MediaType, tmdbId: number | null) {
  return ['title-detail', mediaType, tmdbId] as const;
}

/**
 * Detalhe do título vindo do TMDB.
 *
 * `tmdbId` nulo é o id inválido na rota: a consulta fica desligada em vez de
 * pedir `/movie/NaN`, e a tela decide o que mostrar.
 */
export function useTitleDetail(mediaType: MediaType, tmdbId: number | null) {
  return useQuery({
    queryKey: titleDetailQueryKey(mediaType, tmdbId),
    queryFn: () => getTitleDetail(tmdb, mediaType, tmdbId as number),
    enabled: tmdbId !== null,
  });
}

/**
 * Grava o título no banco assim que o detalhe carrega.
 *
 * `watch_events` referencia `titles.id`, então o título precisa existir antes
 * de a E4 conseguir registrar uma exibição. Gravar ao abrir a tela, e não ao
 * marcar como assistido, deixa o registro instantâneo quando ele chegar.
 *
 * O upsert é idempotente, mas a guarda evita repeti-lo a cada re-render ou
 * refetch — abrir a tela uma vez é uma gravação, não uma por render.
 *
 * Uma falha aqui **não** derruba a tela: ver o filme é o trabalho principal, e
 * gravar a cópia local é preparação para o próximo passo. A tela avisa em vez
 * de esconder, porque sem essa linha o registro de exibição falharia depois.
 */
export function usePersistOpenedTitle(detail: CatalogTitleDetail | undefined) {
  const { mutate, isError } = useUpsertTitle();
  const persisted = useRef<string | null>(null);

  useEffect(() => {
    if (!detail) return;

    const key = `${detail.mediaType}:${detail.tmdbId}`;
    if (persisted.current === key) return;

    persisted.current = key;
    mutate(detail);
  }, [detail, mutate]);

  return { falhouAoSalvar: isError };
}
