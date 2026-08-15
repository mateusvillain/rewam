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
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { WatchEventForm } from '@/features/watch';

import {
  CatalogErrorNotice,
  formatRuntime,
  parseTmdbId,
  releaseYear,
  titleSubtitle,
  usePersistOpenedTitle,
  useTitleDetail,
} from '@/features/catalog';

/**
 * Detalhe de filme.
 *
 * É onde a pessoa confirma que escolheu o título certo e registra a exibição.
 *
 * O título é gravado no banco ao abrir a tela, antes de qualquer ação: é o
 * `titles.id` dessa gravação que `watch_events` referencia, e é por isso que o
 * formulário depende dela e não do id do TMDB.
 *
 * O histórico das exibições deste título entra logo abaixo do formulário na
 * E4.4; a invalidação de cache que vai alimentá-lo já é feita no registro.
 */
export default function MovieDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tmdbId = parseTmdbId(id);

  const {
    data: movie,
    isPending,
    isError,
    error,
    refetch,
    isFetching,
  } = useTitleDetail('movie', tmdbId);
  const { title: savedTitle, saveFailed, isSaving, retrySave } = usePersistOpenedTitle(movie);

  if (tmdbId === null) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Filme' }} />
        <FormTitle>Endereço inválido</FormTitle>
        <FormDescription>
          Este endereço não aponta para um filme. Volte à busca e escolha um título.
        </FormDescription>
      </Screen>
    );
  }

  if (isPending) {
    return (
      <>
        <Stack.Screen options={{ title: 'Filme' }} />
        <LoadingScreen label="Carregando o filme" />
      </>
    );
  }

  if (isError) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Filme' }} />
        <CatalogErrorNotice error={error} onRetry={() => void refetch()} isRetrying={isFetching} />
      </Screen>
    );
  }

  const year = releaseYear(movie.releaseDate);
  // O título original só informa quando difere do traduzido; repetido, é ruído.
  const showOriginalTitle = movie.originalTitle !== null && movie.originalTitle !== movie.title;

  return (
    <Screen>
      <Stack.Screen options={{ title: movie.title }} />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Poster posterPath={movie.posterPath} title={movie.title} size="lg" />

          <View style={styles.metadata}>
            <FormTitle>{movie.title}</FormTitle>
            {showOriginalTitle ? (
              <Text style={styles.originalTitle}>{movie.originalTitle}</Text>
            ) : null}
            <FormDescription>{titleSubtitle(year, movie.mediaType)}</FormDescription>
            <FormDescription>{formatRuntime(movie.runtimeMinutes)}</FormDescription>
          </View>
        </View>

        {/* A ação só existe depois que o título está gravado: `watch_events`
            referencia `titles.id`, e sem ele o registro falharia por chave
            estrangeira. Enquanto grava, o lugar dela fica ocupado — em vez de
            aparecer de repente e mover o resto da tela. */}
        <View style={styles.action}>
          {savedTitle ? (
            <WatchEventForm titleId={savedTitle.id} runtimeMinutes={movie.runtimeMinutes} />
          ) : saveFailed ? null : (
            <FormDescription>Preparando o registro…</FormDescription>
          )}
        </View>

        {saveFailed ? (
          <View style={styles.saveWarning}>
            <FormMessage>
              Não foi possível guardar este filme para registro. Sem isso, marcar como assistido vai
              falhar.
            </FormMessage>
            <Button
              label={isSaving ? 'Tentando…' : 'Tentar guardar de novo'}
              variant="ghost"
              onPress={retrySave}
              disabled={isSaving}
            />
          </View>
        ) : null}

        {movie.overview ? (
          <Text style={styles.overview}>{movie.overview}</Text>
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
    // O `Screen` já dá o respiro lateral; aqui só o de baixo, para o último
    // texto não encostar na borda ao fim da rolagem.
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
  action: {
    gap: spacing.xs,
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
