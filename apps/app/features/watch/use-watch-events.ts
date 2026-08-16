import {
  createWatchEvent,
  createWatchEvents,
  deleteWatchEvent,
  getTitleWatchSummary,
  type TitleWatchSummary,
  type WatchEvent,
} from '@rewam/database';
import type { CreateWatchEventInput } from '@rewam/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

/**
 * Raiz das chaves de cache das exibições.
 *
 * Toda consulta de exibição precisa descender daqui — a contagem por título e o
 * total da tela de início (E4.6) — para que invalidar a raiz alcance todas de
 * uma vez. Sem essa regra, cada tela nova teria de ser lembrada em cada
 * mutação, e a esquecida seria justamente a que mostra número velho depois de
 * registrar.
 */
export const watchEventsKey = ['watch-events'] as const;

export function titleWatchSummaryKey(titleId: string) {
  return [...watchEventsKey, 'summary', titleId] as const;
}

/**
 * Quantas vezes o título foi assistido, e qual foi a última vez.
 *
 * Fica desligada enquanto o título não está gravado no banco: sem `titles.id`
 * não há o que consultar, e uma consulta com id nulo só encheria o cache de
 * entrada inútil.
 */
export function useTitleWatchSummary(titleId: string | null) {
  return useQuery({
    queryKey: titleWatchSummaryKey(titleId ?? 'none'),
    queryFn: (): Promise<TitleWatchSummary> => {
      if (titleId === null) throw new Error('Resumo pedido sem id do título.');
      return getTitleWatchSummary(supabase, titleId);
    },
    enabled: titleId !== null,
  });
}

/**
 * Registra uma exibição.
 *
 * A invalidação é da raiz, e não de uma chave específica: o mesmo evento muda a
 * contagem do título e o total da tela de início. Invalidar por nome deixaria a
 * porta aberta para esquecer um quando a E4.6 chegar — e um total desatualizado
 * é o defeito que se nota primeiro.
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

/**
 * Registra várias exibições de uma vez.
 *
 * Separada de `useCreateWatchEvent` porque a operação no banco é outra: um
 * insert com a lista inteira, atômico. Reusar a mutação singular num laço
 * gravaria N vezes e abriria a porta para meia temporada registrada.
 */
export function useCreateWatchEvents() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (inputs: CreateWatchEventInput[]): Promise<WatchEvent[]> =>
      createWatchEvents(supabase, inputs),

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
