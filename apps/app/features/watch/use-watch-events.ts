import { createWatchEvent, type WatchEvent } from '@rewam/database';
import type { CreateWatchEventInput } from '@rewam/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

/**
 * Chaves de cache das exibições.
 *
 * Todas descendem de `['watch-events']` para que invalidar a raiz alcance
 * histórico do título, histórico global e total de uma vez. Sem a raiz comum,
 * cada tela nova do Epic 4 teria de ser lembrada em cada mutação — e a
 * esquecida seria justamente a que mostra número velho depois de registrar.
 */
export const watchEventsKey = ['watch-events'] as const;

export function watchEventsByTitleKey(titleId: string) {
  return [...watchEventsKey, 'by-title', titleId] as const;
}

export function watchEventsListKey() {
  return [...watchEventsKey, 'list'] as const;
}

export function watchStatsKey() {
  return [...watchEventsKey, 'stats'] as const;
}

/**
 * Registra uma exibição.
 *
 * A invalidação é da raiz, e não de uma lista específica: o mesmo evento entra
 * no histórico do título, no histórico global e no total da tela de início.
 * Invalidar os três por nome deixaria a porta aberta para esquecer um quando a
 * E4.5 e a E4.6 chegarem — e um total desatualizado é exatamente o defeito que
 * a pessoa nota primeiro.
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
