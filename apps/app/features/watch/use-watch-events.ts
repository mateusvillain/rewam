import { createWatchEvent, type WatchEvent } from '@rewam/database';
import type { CreateWatchEventInput } from '@rewam/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

/**
 * Raiz das chaves de cache das exibições.
 *
 * Toda consulta de exibição precisa descender daqui — histórico do título
 * (E4.4), histórico global (E4.5) e total da tela de início (E4.6) — para que
 * invalidar a raiz alcance as três de uma vez. Sem essa regra, cada tela nova
 * teria de ser lembrada em cada mutação, e a esquecida seria justamente a que
 * mostra número velho depois de registrar.
 */
export const watchEventsKey = ['watch-events'] as const;

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
