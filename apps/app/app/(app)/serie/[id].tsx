import { TMDB_ATTRIBUTION } from '@rewam/tmdb';
import { colors, spacing, typography } from '@rewam/tokens';
import {
  Button,
  FormDescription,
  FormMessage,
  FormTitle,
  LoadingScreen,
  Poster,
  Screen,
} from '@rewam/ui';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  CatalogErrorNotice,
  countRegularSeasons,
  formatProgress,
  formatSeasonCount,
  indexByEpisode,
  parseTmdbId,
  releaseYear,
  seasonProgress,
  SeasonSection,
  seriesProgress,
  titleSubtitle,
  usePersistOpenedTitle,
  usePersistSeasons,
  useEpisodeWatchCounts,
  useSeriesDetail,
} from '@/features/catalog';

/**
 * Detalhe de série.
 *
 * Contraparte do detalhe de filme, com a diferença que define o Epic 5: o alvo
 * do registro é o episódio, não o título. Por isso a tela é uma lista de
 * temporadas que carregam sob demanda, e não um botão só.
 *
 * O título é gravado ao abrir, como no filme, porque `episodes` referencia
 * `titles.id` — e é dele que dependem tanto as temporadas quanto a contagem.
 *
 * A ação de marcar episódio chega na E5.3; aqui a lista já diz o que foi
 * assistido, que é o que a contagem por episódio permite.
 */
export default function SeriesDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tmdbId = parseTmdbId(id);

  const detail = useSeriesDetail(tmdbId);
  const { title: savedTitle, saveFailed, isSaving, retrySave } = usePersistOpenedTitle(detail.data);
  const titleId = savedTitle?.id ?? null;

  // Grava as temporadas assim que o título existe, para que os episódios
  // consigam se ligar a elas.
  const { seasonsFailed } = usePersistSeasons(titleId, detail.data);

  const counts = useEpisodeWatchCounts(titleId);

  // Uma temporada aberta por vez: a lista de uma série longa já é comprida, e
  // várias abertas transformariam a tela numa rolagem sem referência.
  const [openSeason, setOpenSeason] = useState<number | null>(null);

  if (tmdbId === null) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Série' }} />
        <FormTitle>Endereço inválido</FormTitle>
        <FormDescription>
          Este endereço não aponta para uma série. Volte à busca e escolha um título.
        </FormDescription>
      </Screen>
    );
  }

  if (detail.isPending) {
    return (
      <>
        <Stack.Screen options={{ title: 'Série' }} />
        <LoadingScreen label="Carregando a série" />
      </>
    );
  }

  if (detail.isError) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Série' }} />
        <CatalogErrorNotice
          error={detail.error}
          mediaType="tv"
          onRetry={() => void detail.refetch()}
          isRetrying={detail.isFetching}
        />
      </Screen>
    );
  }

  const series = detail.data;
  const year = releaseYear(series.releaseDate);
  const showOriginalTitle = series.originalTitle !== null && series.originalTitle !== series.title;
  const watchCounts = counts.data ?? [];
  const progress = seriesProgress(series.seasons, watchCounts);
  // Calculado uma vez aqui, e não dentro de cada temporada: fechada ou aberta,
  // toda seção refaria o índice inteiro a cada render.
  const watchedByEpisode = indexByEpisode(watchCounts);

  return (
    <Screen>
      <Stack.Screen options={{ title: series.title }} />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Poster posterPath={series.posterPath} title={series.title} size="lg" />

          <View style={styles.metadata}>
            <FormTitle>{series.title}</FormTitle>
            {showOriginalTitle ? (
              <Text style={styles.originalTitle}>{series.originalTitle}</Text>
            ) : null}
            <FormDescription>{titleSubtitle(year, series.mediaType)}</FormDescription>
            <FormDescription>
              {formatSeasonCount(countRegularSeasons(series.seasons))}
            </FormDescription>
            {/* O progresso só é verdade depois que as contagens chegam, e é
                falso se elas falharem: nos dois casos diria "0 de 62" para
                quem assistiu a série inteira. Melhor não afirmar nada. */}
            {counts.isPending ? null : counts.isError ? (
              <FormMessage tone="neutro">Não foi possível carregar seu progresso.</FormMessage>
            ) : (
              <FormDescription>{formatProgress(progress)}</FormDescription>
            )}
          </View>
        </View>

        {saveFailed ? (
          <View style={styles.saveWarning}>
            <FormMessage>
              Não foi possível guardar esta série para registro. Sem isso, as temporadas não
              carregam.
            </FormMessage>
            <Button
              label={isSaving ? 'Tentando…' : 'Tentar guardar de novo'}
              variant="ghost"
              onPress={retrySave}
              disabled={isSaving}
            />
          </View>
        ) : null}

        {/* Falhar aqui não impede marcar episódio: o vínculo com a temporada
            é conveniência, e `upsert_episodes` grava com ele nulo. Por isso o
            recado é discreto e sem botão — não há nada travado esperando. */}
        {seasonsFailed && !saveFailed ? (
          <FormMessage tone="neutro">
            As temporadas não foram guardadas. Os episódios continuam funcionando.
          </FormMessage>
        ) : null}

        {series.seasons.length === 0 ? (
          <FormDescription>O TMDB não lista temporadas para esta série.</FormDescription>
        ) : (
          <View style={styles.seasons}>
            {series.seasons.map((season) => (
              <SeasonSection
                key={season.seasonNumber}
                season={season}
                titleId={titleId}
                tmdbId={tmdbId}
                progress={seasonProgress(season, watchCounts)}
                watchedByEpisode={watchedByEpisode}
                isOpen={openSeason === season.seasonNumber}
                onToggle={() =>
                  setOpenSeason((current) =>
                    current === season.seasonNumber ? null : season.seasonNumber,
                  )
                }
              />
            ))}
          </View>
        )}

        {series.overview ? (
          <Text style={styles.overview}>{series.overview}</Text>
        ) : (
          <FormDescription>Sem sinopse em português no TMDB.</FormDescription>
        )}

        <Text style={styles.attribution}>{TMDB_ATTRIBUTION}</Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // `flex: 1` no próprio ScrollView: sem isso ele se dimensiona pelo conteúdo
  // dentro de um pai `flex: 1` e corta em vez de rolar no iOS e no Android.
  scroll: {
    flex: 1,
  },
  content: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  metadata: {
    flex: 1,
    gap: spacing.xs,
  },
  originalTitle: {
    color: colors.textMuted,
    fontSize: typography.body.fontSize,
    fontStyle: 'italic',
  },
  seasons: {
    gap: spacing.sm,
  },
  saveWarning: {
    gap: spacing.sm,
  },
  overview: {
    color: colors.text,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
  },
  attribution: {
    color: colors.textMuted,
    fontSize: typography.caption.fontSize,
  },
});
