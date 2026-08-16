import type { EpisodeWatchCount } from '@rewam/database';
import { colors, radii, spacing, typography } from '@rewam/tokens';
import type { CatalogSeason } from '@rewam/types';
import { FormDescription, FormMessage } from '@rewam/ui';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { describeWatchError } from '@/features/watch';

import { formatRuntime } from './title-presentation';
import { useSeasonEpisodes } from './use-series';
import { formatProgress, indexByEpisode, seasonProgress } from './series-progress';

export type SeasonSectionProps = {
  season: CatalogSeason;
  titleId: string | null;
  tmdbId: number | null;
  counts: ReadonlyArray<EpisodeWatchCount>;
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
  counts,
  isOpen,
  onToggle,
}: SeasonSectionProps) {
  const episodes = useSeasonEpisodes(titleId, tmdbId, season.seasonNumber, isOpen);
  const progress = seasonProgress(season, counts);
  const watchedByEpisode = indexByEpisode(counts);

  const label = season.name ?? `Temporada ${season.seasonNumber}`;

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
          {episodes.isPending ? (
            <ActivityIndicator accessibilityLabel={`Carregando ${label}`} />
          ) : episodes.isError ? (
            <FormMessage>{describeWatchError(episodes.error).message}</FormMessage>
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
