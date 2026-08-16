import { colors, radii, spacing, typography } from '@rewam/tokens';
import type { CatalogSeason, EpisodeWatchCount } from '@rewam/types';
import { Button, FormDescription, FormMessage } from '@rewam/ui';

import { useCreateWatchEvent, useDeleteWatchEvent } from '@/features/watch';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { describeCatalogError } from './catalog-error';
import { formatRuntime } from './title-presentation';
import { useSeasonEpisodes } from './use-series';
import { describeEpisodeCount, formatProgress, type Progress } from './series-progress';

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

  // Uma consulta desligada também é `pending` no TanStack v5. Sem distinguir,
  // uma temporada aberta antes de o título estar gravado giraria o indicador
  // para sempre — carregando algo que nunca foi pedido.
  const isWaitingForTitle = titleId === null || tmdbId === null;

  // Uma mutação por temporada, e não por linha: 24 episódios seriam 48
  // observadores de mutação montados só para ficarem ociosos. Qual episódio
  // está em voo sai das próprias variáveis da mutação.
  const create = useCreateWatchEvent();
  const remove = useDeleteWatchEvent();

  const busyEpisodeId = create.isPending
    ? create.variables?.episodeId
    : remove.isPending
      ? removingEpisodeId(remove.variables, watchedByEpisode)
      : null;

  return (
    <View style={styles.root}>
      <Pressable
        onPress={onToggle}
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
          {isWaitingForTitle ? (
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
          ) : titleId === null ? null : (
            episodes.data.map((episode) => (
              <EpisodeRow
                key={episode.id}
                number={episode.episodeNumber}
                name={episode.name}
                runtimeMinutes={episode.runtimeMinutes}
                watched={watchedByEpisode.get(episode.id) ?? null}
                isBusy={busyEpisodeId === episode.id}
                isAnyBusy={create.isPending || remove.isPending}
                onMark={() =>
                  create.mutate({
                    titleId,
                    episodeId: episode.id,
                    watchedAt: new Date().toISOString(),
                    durationMinutes: episode.runtimeMinutes,
                    notes: null,
                  })
                }
                onUndo={(eventId) => remove.mutate(eventId)}
              />
            ))
          )}
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

/**
 * Qual episódio a remoção em voo pertence.
 *
 * A mutação de remover recebe o id do *evento*, não o do episódio, então o
 * caminho de volta passa pelo índice. Sem isso, remover deixaria a linha errada
 * marcada como ocupada.
 */
function removingEpisodeId(
  eventId: string | undefined,
  index: ReadonlyMap<string, EpisodeWatchCount>,
): string | null {
  if (!eventId) return null;
  for (const [episodeId, count] of index) {
    if (count.latestEventId === eventId) return episodeId;
  }
  return null;
}

function EpisodeRow({
  number,
  name,
  runtimeMinutes,
  watched,
  isBusy,
  isAnyBusy,
  onMark,
  onUndo,
}: {
  number: number;
  name: string | null;
  runtimeMinutes: number | null;
  watched: EpisodeWatchCount | null;
  isBusy: boolean;
  isAnyBusy: boolean;
  onMark: () => void;
  onUndo: (eventId: string) => void;
}) {
  const duration = formatRuntime(runtimeMinutes);
  const count = watched?.watchCount ?? 0;
  const label = name ?? `Episódio ${number}`;

  return (
    // Agrupado num anúncio só: lidos soltos, número, nome e duração viram três
    // itens sem relação para quem usa leitor de tela. Os botões ficam fora do
    // grupo para continuarem alcançáveis como controles.
    <View style={styles.episode}>
      <View
        accessible
        accessibilityLabel={`Episódio ${number}. ${label}. ${duration}. ${describeEpisodeCount(count)}`}
        style={styles.episodeInfo}
      >
        <Text style={[styles.episodeNumber, count > 0 && styles.watchedText]}>{number}</Text>

        <View style={styles.episodeText}>
          <Text style={[styles.episodeName, count > 0 && styles.watchedText]} numberOfLines={2}>
            {label}
          </Text>
          {/* A contagem é texto, e não só cor: cor sozinha não chega a quem não
              a distingue, e é a informação da linha que muda. */}
          <Text style={styles.episodeMeta}>
            {duration}
            {count > 0 ? ` · ${describeEpisodeCount(count)}` : ''}
          </Text>
        </View>
      </View>

      <View style={styles.episodeActions}>
        {count > 0 && watched ? (
          <Button
            label="−"
            variant="ghost"
            accessibilityLabel={`Remover o último registro do episódio ${number}`}
            disabled={isAnyBusy}
            onPress={() => onUndo(watched.latestEventId)}
          />
        ) : null}

        <Button
          label={isBusy ? '…' : '+'}
          variant={count > 0 ? 'ghost' : 'primary'}
          accessibilityLabel={
            count > 0
              ? `Marcar episódio ${number} como reassistido`
              : `Marcar episódio ${number} como assistido`
          }
          // Todas as linhas travam enquanto qualquer mutação está no ar: elas
          // compartilham a mesma contagem, e dois toques em sequência deixariam
          // o resultado por conta da ordem das respostas.
          disabled={isAnyBusy}
          onPress={onMark}
        />
      </View>
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
  watchedText: {
    color: colors.textMuted,
  },
});
