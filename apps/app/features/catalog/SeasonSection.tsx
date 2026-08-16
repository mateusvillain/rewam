import { colors, radii, spacing, typography } from '@rewam/tokens';
import type { CatalogSeason } from '@rewam/types';
import { Button, FormDescription, FormMessage } from '@rewam/ui';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { describeCatalogError } from './catalog-error';
import { formatRuntime } from './title-presentation';
import { useSeasonEpisodes } from './use-series';
import { formatProgress, type Progress } from './series-progress';

export type SeasonSectionProps = {
  season: CatalogSeason;
  titleId: string | null;
  tmdbId: number | null;
  /** Progresso desta temporada, calculado uma vez pela tela. */
  progress: Progress;
  /** Contagem por `episodes.id`, montada uma vez pela tela. */
  watchedByEpisode: ReadonlyMap<string, number>;
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
          ) : (
            episodes.data.map((episode) => (
              <EpisodeRow
                key={episode.id}
                number={episode.episodeNumber}
                name={episode.name}
                runtimeMinutes={episode.runtimeMinutes}
                watchCount={watchedByEpisode.get(episode.id) ?? 0}
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

function EpisodeRow({
  number,
  name,
  runtimeMinutes,
  watchCount,
}: {
  number: number;
  name: string | null;
  runtimeMinutes: number | null;
  watchCount: number;
}) {
  const duration = formatRuntime(runtimeMinutes);
  const watched = watchCount > 0;

  return (
    // Agrupado num anúncio só: lidos soltos, número, nome e duração viram três
    // itens sem relação para quem usa leitor de tela.
    <View
      accessible
      accessibilityLabel={`Episódio ${number}. ${name ?? 'sem título'}. ${duration}. ${
        watched ? 'Assistido.' : 'Não assistido.'
      }`}
      style={styles.episode}
    >
      <Text style={[styles.episodeNumber, watched && styles.watched]}>{number}</Text>

      <View style={styles.episodeText}>
        <Text style={[styles.episodeName, watched && styles.watched]} numberOfLines={2}>
          {name ?? `Episódio ${number}`}
        </Text>
        <Text style={styles.episodeMeta}>{duration}</Text>
      </View>

      {/* A marca de assistido é texto, e não só cor: cor sozinha não chega a
          quem não a distingue, e é a única informação da linha que muda. */}
      {watched ? <Text style={styles.check}>assistido</Text> : null}
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
    gap: spacing.md,
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
  watched: {
    color: colors.textMuted,
  },
  check: {
    color: colors.success,
    fontSize: typography.caption.fontSize,
    fontWeight: '600',
  },
});
