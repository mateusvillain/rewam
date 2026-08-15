import { TMDB_ATTRIBUTION } from '@rewam/tmdb';
import { colors, spacing, typography } from '@rewam/tokens';
import { Button, Poster, Screen } from '@rewam/ui';
import { Stack, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  formatRuntime,
  parseTmdbId,
  releaseYear,
  titleSubtitle,
  useTitleDetail,
  usePersistOpenedTitle,
} from '@/features/catalog';

/**
 * Detalhe de filme.
 *
 * É onde a pessoa confirma que escolheu o título certo antes de registrar. A
 * ação de marcar como assistido entra na E4; aqui fica a apresentação e o que
 * ela precisa para funcionar — o título já gravado no banco.
 */
export default function MovieDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tmdbId = parseTmdbId(id);

  const { data: filme, isPending, isError, refetch, isFetching } = useTitleDetail('movie', tmdbId);
  const { falhouAoSalvar } = usePersistOpenedTitle(filme);

  if (tmdbId === null) {
    return (
      <Aviso
        titulo="Filme não encontrado"
        detalhe="O endereço aberto não aponta para um filme válido."
      />
    );
  }

  if (isPending) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Filme' }} />
        <View style={styles.centro}>
          <ActivityIndicator color={colors.textMuted} />
        </View>
      </Screen>
    );
  }

  if (isError) {
    return (
      <Aviso
        titulo="Não foi possível carregar o filme"
        detalhe="Verifique sua conexão e tente de novo."
        aoRepetir={() => void refetch()}
        repetindo={isFetching}
      />
    );
  }

  const ano = releaseYear(filme.releaseDate);
  // O título original só informa quando difere do traduzido; repetido, é ruído.
  const mostrarTituloOriginal = filme.originalTitle !== null && filme.originalTitle !== filme.title;

  return (
    <Screen>
      <Stack.Screen options={{ title: filme.title }} />

      <ScrollView contentContainerStyle={styles.conteudo}>
        <View style={styles.cabecalho}>
          <Poster posterPath={filme.posterPath} title={filme.title} size="lg" />

          <View style={styles.metadados}>
            <Text style={styles.titulo}>{filme.title}</Text>
            {mostrarTituloOriginal ? (
              <Text style={styles.tituloOriginal}>{filme.originalTitle}</Text>
            ) : null}
            <Text style={styles.apoio}>{titleSubtitle(ano, filme.mediaType)}</Text>
            <Text style={styles.apoio}>{formatRuntime(filme.runtimeMinutes)}</Text>
          </View>
        </View>

        {falhouAoSalvar ? (
          <Text style={styles.avisoSalvar} role="alert">
            Não foi possível guardar este filme para registro. Reabra a tela antes de marcar como
            assistido.
          </Text>
        ) : null}

        {filme.overview ? (
          <Text style={styles.sinopse}>{filme.overview}</Text>
        ) : (
          <Text style={styles.apoio}>Sem sinopse em português no TMDB.</Text>
        )}

        <Text style={styles.atribuicao}>{TMDB_ATTRIBUTION}</Text>
      </ScrollView>
    </Screen>
  );
}

function Aviso({
  titulo,
  detalhe,
  aoRepetir,
  repetindo,
}: {
  titulo: string;
  detalhe: string;
  aoRepetir?: () => void;
  repetindo?: boolean;
}) {
  return (
    <Screen>
      <Stack.Screen options={{ title: 'Filme' }} />
      <Text style={styles.titulo}>{titulo}</Text>
      <Text style={styles.apoio}>{detalhe}</Text>
      {aoRepetir ? (
        <Button
          label={repetindo ? 'Tentando…' : 'Tentar de novo'}
          onPress={aoRepetir}
          disabled={repetindo}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  conteudo: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  centro: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  cabecalho: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  metadados: {
    flex: 1,
    gap: spacing.xs,
  },
  titulo: {
    color: colors.text,
    fontSize: typography.title.fontSize,
    fontWeight: '600',
  },
  tituloOriginal: {
    color: colors.textMuted,
    fontSize: typography.body.fontSize,
    fontStyle: 'italic',
  },
  apoio: {
    color: colors.textMuted,
    fontSize: typography.body.fontSize,
  },
  sinopse: {
    color: colors.text,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
  },
  avisoSalvar: {
    color: colors.danger,
    fontSize: typography.caption.fontSize,
  },
  atribuicao: {
    color: colors.textMuted,
    fontSize: typography.caption.fontSize,
  },
});
