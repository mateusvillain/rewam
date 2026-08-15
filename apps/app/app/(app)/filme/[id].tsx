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

import {
  describeCatalogError,
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
 * É onde a pessoa confirma que escolheu o título certo antes de registrar. A
 * ação de marcar como assistido chega na E4; aqui fica a apresentação e o lugar
 * reservado para ela, além do título já gravado no banco — que é o que essa
 * ação vai precisar para funcionar.
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
  const { saveFailed, isSaving, retrySave } = usePersistOpenedTitle(movie);

  if (tmdbId === null) {
    return (
      <Notice
        title="Endereço inválido"
        detail="Este endereço não aponta para um filme. Volte à busca e escolha um título."
      />
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
    const { title, detail, canRetry } = describeCatalogError(error);

    return (
      <Notice
        title={title}
        detail={detail}
        // Sem `canRetry`, um filme removido do TMDB ganharia um botão que
        // repete para sempre o mesmo 404.
        onRetry={canRetry ? () => void refetch() : undefined}
        isRetrying={isFetching}
      />
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

        {/* Lugar da ação da E4. O botão fica desabilitado em vez de ausente
            para que o layout já nasça com ela, e para dizer o que vem a
            seguir — mesmo caminho da tela de início. */}
        <View style={styles.action}>
          <Button label="Marcar como assistido" disabled />
          <FormDescription>O registro de exibições chega no próximo incremento.</FormDescription>
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

/** Tela de recado: id inválido e falhas de carregamento caem aqui. */
function Notice({
  title,
  detail,
  onRetry,
  isRetrying,
}: {
  title: string;
  detail: string;
  onRetry?: () => void;
  isRetrying?: boolean;
}) {
  return (
    <Screen>
      <Stack.Screen options={{ title: 'Filme' }} />
      <FormTitle>{title}</FormTitle>
      <FormDescription>{detail}</FormDescription>
      {onRetry ? (
        <Button
          label={isRetrying ? 'Tentando…' : 'Tentar de novo'}
          onPress={onRetry}
          disabled={isRetrying}
        />
      ) : null}
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
