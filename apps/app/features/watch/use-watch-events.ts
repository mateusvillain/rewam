import {
  createWatchEvent,
  deleteWatchEvent,
  listWatchEventsByTitle,
  type WatchEvent,
} from '@rewam/database';
import type { CreateWatchEventInput } from '@rewam/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

/**
 * Raiz das chaves de cache das exibições.
 *
 * Toda consulta de exibição precisa descender daqui — histórico do título,
 * histórico global (E4.5) e total da tela de início (E4.6) — para que invalidar
 * a raiz alcance todas de uma vez. Sem essa regra, cada tela nova teria de ser
 * lembrada em cada mutação, e a esquecida seria justamente a que mostra número
 * velho depois de registrar.
 */
export const watchEventsKey = ['watch-events'] as const;

export function watchEventsByTitleKey(titleId: string) {
  return [...watchEventsKey, 'by-title', titleId] as const;
}

/**
 * Exibições de um título.
 *
 * Fica desligada enquanto o título não está gravado no banco: sem `titles.id`
 * não há o que consultar, e uma consulta com id nulo só encheria o cache de
 * entrada inútil.
 */
export function useWatchEventsByTitle(titleId: string | null) {
  return useQuery({
    queryKey: watchEventsByTitleKey(titleId ?? 'none'),
    queryFn: () => {
      if (titleId === null) throw new Error('Exibições pedidas sem id do título.');
      return listWatchEventsByTitle(supabase, titleId);
    },
    enabled: titleId !== null,
  });
}

/**
 * Registra uma exibição.
 *
 * A invalidação é da raiz, e não de uma lista específica: o mesmo evento entra
 * na contagem do título, no histórico global e no total da tela de início.
 * Invalidar por nome deixaria a porta aberta para esquecer um quando a E4.5 e a
 * E4.6 chegarem — e um total desatualizado é o defeito que se nota primeiro.
 */
export function useCreateWatchEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateWatchEventInput): Promise<WatchEvent> =>
      createWatchEvent(supabase, input),

    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: watchEventsKey });
    },
  });
}

/** Apaga uma exibição. Mesma invalidação do registro, pelo mesmo motivo. */
export function useDeleteWatchEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteWatchEvent(supabase, id),

    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: watchEventsKey });
    },
  });
}
