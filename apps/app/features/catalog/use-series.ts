import {
  getEpisodeWatchCounts,
  upsertEpisodes,
  upsertSeasons,
  type Episode,
  type EpisodeWatchCount,
} from '@rewam/database';
import { getSeasonEpisodes, getSeriesDetail } from '@rewam/tmdb';
import type { CatalogSeriesDetail } from '@rewam/types';
import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { tmdb } from '@/lib/tmdb';

import { watchEventsKey } from '@/features/watch';

/**
 * Carregamento de série, sob demanda.
 *
 * A série chega em três pedaços, e cada um só é buscado quando faz falta: o
 * detalhe com a lista de temporadas ao abrir a tela, os episódios quando uma
 * temporada é expandida, e as contagens de exibição junto do detalhe. O
 * briefing proíbe baixar o catálogo inteiro — uma série longa tem centenas de
 * episódios que ninguém pediu para ver.
 */

export function seriesDetailQueryKey(tmdbId: number) {
  return ['series-detail', tmdbId] as const;
}

export function seasonEpisodesQueryKey(titleId: string | null, seasonNumber: number) {
  return ['season-episodes', titleId ?? 'none', seasonNumber] as const;
}

/**
 * A chave desce da raiz das exibições porque é isso que a mantém fresca:
 * registrar ou remover um episódio invalida `['watch-events']`, e o progresso
 * da tela muda junto sem ninguém lembrar de invalidar mais nada.
 */
export function episodeWatchCountsKey(titleId: string | null) {
  return [...watchEventsKey, 'episode-counts', titleId ?? 'none'] as const;
}

/**
 * Detalhe da série vindo do TMDB.
 *
 * `tmdbId` nulo é o id inválido na rota: a consulta fica desligada em vez de
 * pedir `/tv/NaN`, e a tela decide o que mostrar.
 */
export function useSeriesDetail(tmdbId: number | null) {
  return useQuery({
    queryKey: seriesDetailQueryKey(tmdbId ?? -1),
    queryFn: (): Promise<CatalogSeriesDetail> => {
      if (tmdbId === null) throw new Error('Detalhe de série pedido sem id do TMDB.');
      return getSeriesDetail(tmdb, tmdbId);
    },
    enabled: tmdbId !== null,
  });
}

/**
 * Episódios de uma temporada, buscados no TMDB e gravados no banco.
 *
 * A gravação faz parte da consulta, e não de um efeito à parte, porque o que a
 * tela precisa não é o episódio do TMDB: é o episódio **do banco**, que tem o
 * `id` que `watch_events` referencia. Buscar sem gravar devolveria uma lista
 * que não dá para marcar.
 *
 * `enabled` só quando a temporada está aberta: é o que torna o carregamento
 * sob demanda, e não uma promessa no comentário.
 */
export function useSeasonEpisodes(
  titleId: string | null,
  tmdbId: number | null,
  seasonNumber: number,
  isOpen: boolean,
) {
  return useQuery({
    queryKey: seasonEpisodesQueryKey(titleId, seasonNumber),
    queryFn: async (): Promise<Episode[]> => {
      if (titleId === null || tmdbId === null) {
        throw new Error('Temporada pedida sem título gravado.');
      }

      const fromCatalog = await getSeasonEpisodes(tmdb, tmdbId, seasonNumber);
      return upsertEpisodes(supabase, titleId, fromCatalog);
    },
    enabled: isOpen && titleId !== null && tmdbId !== null,
  });
}

/** Contagem de exibições por episódio da série, para o progresso e a lista. */
export function useEpisodeWatchCounts(titleId: string | null) {
  return useQuery({
    queryKey: episodeWatchCountsKey(titleId),
    queryFn: (): Promise<EpisodeWatchCount[]> => {
      if (titleId === null) throw new Error('Contagens pedidas sem título gravado.');
      return getEpisodeWatchCounts(supabase, titleId);
    },
    enabled: titleId !== null,
  });
}

/**
 * Grava as temporadas assim que o detalhe chega.
 *
 * Existe para que `upsert_episodes` consiga ligar cada episódio à sua
 * temporada: a função procura a temporada por `(title_id, season_number)` e
 * deixa o vínculo nulo se ela ainda não existir. Nada quebra sem isso — o
 * episódio não depende da temporada para ser identificado —, mas o vínculo
 * ficaria pela metade conforme a ordem em que as telas fossem abertas.
 */
export function usePersistSeasons(titleId: string | null, detail: CatalogSeriesDetail | undefined) {
  return useQuery({
    queryKey: ['persist-seasons', titleId ?? 'none'],
    queryFn: async () => {
      if (titleId === null || !detail) throw new Error('Temporadas pedidas sem título gravado.');
      return upsertSeasons(supabase, titleId, detail.seasons);
    },
    enabled: titleId !== null && detail !== undefined,
    // Gravar de novo a cada foco não traria nada: o catálogo de temporadas de
    // uma série muda em escala de meses, não de sessão.
    staleTime: Infinity,
  });
}
