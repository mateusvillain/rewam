import { upsertTitle, type Title } from '@rewam/database';
import type { CatalogTitle, MediaType } from '@rewam/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

export function titleQueryKey(mediaType: MediaType, tmdbId: number) {
  return ['title', mediaType, tmdbId] as const;
}

/**
 * Grava o título selecionado e devolve a linha do banco, com o `id` que as
 * telas precisam para registrar uma exibição.
 *
 * O upsert é idempotente por `(tmdb_id, media_type)`, então chamar de novo para
 * o mesmo título atualiza a cópia local em vez de duplicar — o que também
 * mantém a cópia fresca quando o TMDB corrige um dado.
 */
export function useUpsertTitle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (title: CatalogTitle) => upsertTitle(supabase, title),

    // A linha que acabou de voltar é a versão mais nova que existe: semeá-la no
    // cache evita uma ida ao banco logo em seguida. Não há o que invalidar
    // ainda — histórico e listas que dependem de `titles` só nascem na E4, e é
    // lá que a invalidação passa a ter alvo.
    onSuccess: (saved: Title) => {
      queryClient.setQueryData(titleQueryKey(saved.mediaType, saved.tmdbId), saved);
    },
  });
}
