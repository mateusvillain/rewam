import { getTitleDetail } from '@rewam/tmdb';
import type { CatalogTitleDetail, MediaType } from '@rewam/types';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';

import { tmdb } from '@/lib/tmdb';

import { useUpsertTitle } from './use-title';

export function titleDetailQueryKey(mediaType: MediaType, tmdbId: number) {
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
    queryKey: titleDetailQueryKey(mediaType, tmdbId ?? -1),
    queryFn: () => {
      // `enabled` já impede este caminho, mas afirmar isso com um cast deixaria
      // um `/movie/NaN` silencioso à espera de quem mexesse no `enabled`.
      if (tmdbId === null) throw new Error('Detalhe pedido sem id do TMDB.');
      return getTitleDetail(tmdb, mediaType, tmdbId);
    },
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
 * A guarda é limpa quando a gravação falha. Sem isso ela registraria a
 * tentativa, e não o sucesso: um erro de rede passageiro queimaria a única
 * chance e nada mais gravaria enquanto a tela estivesse aberta. Mutations não
 * têm retry automático — só as queries têm.
 */
export function usePersistOpenedTitle(detail: CatalogTitleDetail | undefined) {
  const { mutate, data: saved, isError, isPending } = useUpsertTitle();
  const persisted = useRef<string | null>(null);

  const persist = useCallback(
    (title: CatalogTitleDetail) => {
      const key = `${title.mediaType}:${title.tmdbId}`;
      persisted.current = key;

      mutate(title, {
        onError: () => {
          // Libera para a próxima tentativa, seja pelo botão ou por um refetch.
          if (persisted.current === key) persisted.current = null;
        },
      });
    },
    [mutate],
  );

  useEffect(() => {
    if (!detail) return;
    if (persisted.current === `${detail.mediaType}:${detail.tmdbId}`) return;

    persist(detail);
  }, [detail, persist]);

  return {
    /**
     * A linha gravada em `titles`, com o `id` que `watch_events` referencia.
     *
     * É `undefined` enquanto a gravação não termina, e é por isso que a ação de
     * registrar só aparece depois: sem este id, marcar como assistido falharia
     * por chave estrangeira — o id do TMDB não serve, `watch_events` aponta
     * para `titles.id`.
     */
    title: saved,
    saveFailed: isError,
    isSaving: isPending,
    /** Repete a gravação sem exigir que a pessoa saia e volte para a tela. */
    retrySave: useCallback(() => {
      if (detail) persist(detail);
    }, [detail, persist]),
  };
}
