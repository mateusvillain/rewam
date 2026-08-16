import { getWatchStats, type WatchStats } from '@rewam/database';
import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

/**
 * Chave do total assistido.
 *
 * Desce de `['watch-events']` de propósito: registrar ou remover uma exibição
 * invalida essa raiz, e é isso que faz o total da tela de início mudar sozinho
 * quando a pessoa marca um filme na tela de detalhe. Uma chave irmã, fora da
 * raiz, mostraria número velho até o app ser reaberto.
 */
export const watchStatsKey = ['watch-events', 'stats'] as const;

export function useWatchStats() {
  return useQuery({
    queryKey: watchStatsKey,
    queryFn: (): Promise<WatchStats> => getWatchStats(supabase),
  });
}
