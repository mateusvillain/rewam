import { colors, radii, spacing, typography } from '@rewam/tokens';
import type { CatalogSeason, EpisodeWatchCount } from '@rewam/types';
import { Button, FormDescription, FormMessage } from '@rewam/ui';

import { useCreateWatchEvent, useCreateWatchEvents, useDeleteWatchEvent } from '@/features/watch';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { describeCatalogError, type CatalogErrorPresentation } from './catalog-error';
import { useSeasonEpisodes } from './use-series';
import { BatchBar } from './BatchBar';
import {
  isWholeSeasonSelected,
  summarizeSelection,
  toggleSelection,
  toggleWholeSeason,
} from './batch-selection';
import { EpisodeRow } from './EpisodeRow';
import { formatProgress, type Progress } from './series-progress';

export type SeasonSectionProps = {
  season: CatalogSeason;
  titleId: string | null;
  tmdbId: number | null;
  /** Progresso desta temporada, calculado uma vez pela tela. */
  progress: Progress;
  /** Contagem por `episodes.id`, montada uma vez pela tela. */
  watchedByEpisode: ReadonlyMap<string, EpisodeWatchCount>;
  isOpen: boolean;
  onToggle: () => void;
};

/**
 * Uma temporada na lista, que carrega os episódios ao ser aberta.
 *
 * O progresso aparece com a temporada ainda fechada: `episode_watch_counts`
 * devolve o número da temporada junto da contagem, justamente para a tela não
 * precisar carregar os episódios só para dizer quantos foram assistidos.
 */
export function SeasonSection({
  season,
  titleId,
  tmdbId,
  progress,
  watchedByEpisode,
  isOpen,
  onToggle,
}: SeasonSectionProps) {
  const episodes = useSeasonEpisodes(titleId, tmdbId, season.seasonNumber, isOpen);

  const label = season.name ?? `Temporada ${season.seasonNumber}`;

  // Uma mutação por temporada, e não por linha: 24 episódios seriam 48
  // observadores de mutação montados só para ficarem ociosos.
  const create = useCreateWatchEvent();
  const remove = useDeleteWatchEvent();

  // Quais episódios estão em voo, por id.
  //
  // Só a linha tocada trava, e não a temporada inteira: episódios têm contagens
  // independentes — `episode_watch_counts` agrupa por `episode_id` —, então
  // marcar o 3 enquanto o 1 grava não disputa nada. Travar as 24 linhas a cada
  // toque faria uma temporada longa parecer quebrada.
  //
  // O conjunto vem daqui, e não das variáveis da mutação, porque elas guardam
  // uma chamada só: com duas em voo, a segunda apagaria o rastro da primeira.
  const [pendingEpisodes, setPendingEpisodes] = useState<ReadonlySet<string>>(new Set());

  // Seleção múltipla, para marcar uma temporada sem tocar episódio a episódio.
  // Vive por temporada: selecionar em duas ao mesmo tempo pediria um resumo que
  // some coisas que a pessoa não vê juntas na tela.
  //
  // O modo é estado próprio, e não derivado de `selected.size > 0`: derivado,
  // não haveria como começar a selecionar — o controle de cada linha só
  // apareceria depois de já haver alguém selecionado, e a única entrada seria
  // "temporada inteira". Escolher três episódios de vinte e quatro ficaria
  // impossível.
  const [isSelecting, setIsSelecting] = useState(false);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const batch = useCreateWatchEvents();

  function leaveSelection() {
    setIsSelecting(false);
    setSelected(new Set());
  }

  function markPending(episodeId: string, isPending: boolean) {
    setPendingEpisodes((current) => {
      const next = new Set(current);
      if (isPending) next.add(episodeId);
      else next.delete(episodeId);
      return next;
    });
  }

  // Sem isto o toque simplesmente não acontece: o botão destrava, a contagem
  // não muda e nada explica por quê. É o que `WatchActions` já faz no filme.
  // O mais recente vence. Encadeados por ordem fixa, uma falha antiga de
  // "Marcar" ficaria na frente para sempre — `isError` só some na mutação
  // seguinte —, e o erro do lote que acabou de acontecer nunca apareceria.
  const failure = mostRecentFailure([
    { mutation: create, kind: 'single' },
    { mutation: remove, kind: 'single' },
    { mutation: batch, kind: 'batch' },
  ]);

  return (
    <View style={styles.root}>
      <Pressable
        onPress={() => {
          // Fechar a temporada abandona a seleção: reabrir e reencontrar
          // episódios marcados de uma sessão anterior é surpresa, não memória.
          if (isOpen) leaveSelection();
          onToggle();
        }}
        accessibilityRole="button"
        // `expanded` é o que faz o leitor de tela anunciar que isto abre e
        // fecha; sem ele, é um botão que muda a tela sem avisar como.
        accessibilityState={{ expanded: isOpen }}
        accessibilityLabel={`${label}. ${formatProgress(progress)}.`}
        style={({ pressed }) => [styles.header, pressed && styles.pressed]}
      >
        <View style={styles.headerText}>
          <Text style={styles.seasonName}>{label}</Text>
          <Text style={styles.progress}>{formatProgress(progress)}</Text>
        </View>
        <Text style={styles.chevron}>{isOpen ? '−' : '+'}</Text>
      </Pressable>

      {isOpen ? (
        <View style={styles.body}>
          {/* A condição fica inline, e não numa variável derivada: é ela que
              faz o TypeScript estreitar `titleId` no ramo de baixo, onde a
              gravação precisa dele. Um booleano nomeado obrigaria a asseverar
              com `!` o que a própria condição já garante.

              Uma consulta desligada também é `pending` no TanStack v5. Sem
              distinguir, uma temporada aberta antes de o título estar gravado
              giraria o indicador para sempre. */}
          {titleId === null || tmdbId === null ? (
            <FormDescription>
              Aguardando a série ser guardada para carregar os episódios.
            </FormDescription>
          ) : episodes.isPending ? (
            <ActivityIndicator accessibilityLabel={`Carregando ${label}`} />
          ) : episodes.isError ? (
            <SeasonError
              error={episodes.error}
              isRetrying={episodes.isFetching}
              onRetry={() => void episodes.refetch()}
            />
          ) : episodes.data.length === 0 ? (
            <FormDescription>Esta temporada ainda não tem episódios no catálogo.</FormDescription>
          ) : (
            episodes.data.map((episode) => (
              <EpisodeRow
                key={episode.id}
                number={episode.episodeNumber}
                name={episode.name}
                runtimeMinutes={episode.runtimeMinutes}
                watched={watchedByEpisode.get(episode.id) ?? null}
                isBusy={pendingEpisodes.has(episode.id)}
                isSelecting={isSelecting}
                isSelected={selected.has(episode.id)}
                isLocked={batch.isPending}
                onToggleSelection={() =>
                  setSelected((current) => toggleSelection(current, episode.id))
                }
                onMark={() => {
                  markPending(episode.id, true);
                  create.mutate(
                    {
                      titleId,
                      episodeId: episode.id,
                      watchedAt: new Date().toISOString(),
                      durationMinutes: episode.runtimeMinutes,
                      notes: null,
                    },
                    { onSettled: () => markPending(episode.id, false) },
                  );
                }}
                onUndo={(eventId) => {
                  markPending(episode.id, true);
                  remove.mutate(eventId, {
                    onSettled: () => markPending(episode.id, false),
                  });
                }}
              />
            ))
          )}

          {failure ? (
            <FormMessage>
              {/* O lote é atômico, então "falhou" e "nada entrou" são a mesma
                  coisa — e dizer isso é o que dispensa a pessoa de conferir
                  episódio a episódio o que sobrou pela metade. O acréscimo
                  acompanha a falha exibida, e não `batch.isError`: um erro de
                  lote antigo não pode legendar uma falha de toque recente. */}
              {failure.kind === 'batch'
                ? `${failure.detail} Nenhum episódio foi registrado.`
                : failure.detail}
            </FormMessage>
          ) : null}

          {episodes.data && episodes.data.length > 0 && titleId !== null ? (
            <BatchBar
              isSelecting={isSelecting}
              summary={summarizeSelection(episodes.data, selected)}
              isSaving={batch.isPending}
              allSelected={isWholeSeasonSelected(selected, episodes.data)}
              onStart={() => setIsSelecting(true)}
              onToggleAll={() =>
                setSelected((current) => toggleWholeSeason(current, episodes.data))
              }
              onConfirm={() => {
                const now = new Date().toISOString();
                batch.mutate(
                  episodes.data
                    .filter((episode) => selected.has(episode.id))
                    .map((episode) => ({
                      titleId,
                      episodeId: episode.id,
                      // Todos com a mesma data: foi uma sessão só, e datas
                      // diferentes por milissegundo não significam nada.
                      watchedAt: now,
                      durationMinutes: episode.runtimeMinutes,
                      notes: null,
                    })),
                  { onSuccess: leaveSelection },
                );
              }}
              onCancel={leaveSelection}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

/**
 * A falha ao carregar uma temporada.
 *
 * `describeCatalogError`, e não o tradutor de exibições: esta consulta busca no
 * TMDB **e** grava no banco, então tanto `TmdbError` quanto `DatabaseError`
 * passam por aqui — e é ele que sabe dos dois.
 */
/**
 * A falha mais recente entre várias mutações.
 *
 * `submittedAt` cresce a cada `mutate`, então a maior é a última tentativa.
 * Sem isto, a ordem do encadeamento decidiria qual erro a pessoa vê — e seria
 * sempre o mesmo, porque `isError` permanece até a mutação seguinte.
 */
function mostRecentFailure(
  candidates: ReadonlyArray<{
    mutation: { isError: boolean; error: unknown; submittedAt: number };
    kind: 'single' | 'batch';
  }>,
): (CatalogErrorPresentation & { kind: 'single' | 'batch' }) | null {
  const failed = candidates.filter((candidate) => candidate.mutation.isError);
  if (failed.length === 0) return null;

  const latest = failed.reduce((a, b) => (b.mutation.submittedAt > a.mutation.submittedAt ? b : a));

  return { ...describeCatalogError(latest.mutation.error, 'tv'), kind: latest.kind };
}

function SeasonError({
  error,
  isRetrying,
  onRetry,
}: {
  error: unknown;
  isRetrying: boolean;
  onRetry: () => void;
}) {
  const failure = describeCatalogError(error, 'tv');

  return (
    <View style={styles.error}>
      <FormMessage>{failure.detail}</FormMessage>
      {failure.canRetry ? (
        <Button
          label={isRetrying ? 'Tentando…' : 'Tentar de novo'}
          variant="ghost"
          disabled={isRetrying}
          onPress={onRetry}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  pressed: {
    opacity: 0.6,
  },
  headerText: {
    flex: 1,
    gap: spacing.xs,
  },
  seasonName: {
    color: colors.text,
    fontSize: typography.body.fontSize,
    fontWeight: '600',
  },
  progress: {
    color: colors.textMuted,
    fontSize: typography.caption.fontSize,
  },
  chevron: {
    color: colors.textMuted,
    fontSize: typography.title.fontSize,
  },
  body: {
    gap: spacing.sm,
    padding: spacing.md,
  },
  error: {
    gap: spacing.sm,
  },
  episode: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  episodeInfo: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: spacing.md,
  },
  episodeActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  batch: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
  batchActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  episodeNumber: {
    color: colors.textMuted,
    fontSize: typography.body.fontSize,
    minWidth: 24,
    textAlign: 'right',
  },
  episodeText: {
    flex: 1,
    gap: spacing.xs,
  },
  episodeName: {
    color: colors.text,
    fontSize: typography.body.fontSize,
  },
  episodeMeta: {
    color: colors.textMuted,
    fontSize: typography.caption.fontSize,
  },
  watchedCount: {
    color: colors.success,
    fontSize: typography.caption.fontSize,
    fontWeight: '600',
  },
});
