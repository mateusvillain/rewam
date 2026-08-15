import { colors, radii, spacing, typography } from '@rewam/tokens';
import { Poster } from '@rewam/ui';
import type { CatalogSearchResult } from '@rewam/types';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { releaseYear, titleSubtitle } from '@/features/catalog';

/**
 * Uma linha da lista de resultados.
 *
 * Série ainda não tem tela de detalhe — é a E5.2. Em vez de um link que
 * desaguaria em "não encontrado", a linha aparece sem toque e diz o motivo: o
 * resultado continua visível, que é o que o filtro entre filmes e séries
 * promete, sem prometer uma navegação que não existe.
 */
export function SearchResultRow({ result }: { result: CatalogSearchResult }) {
  const subtitle = titleSubtitle(releaseYear(result.releaseDate), result.mediaType);
  const isMovie = result.mediaType === 'movie';

  const content = (
    <View style={styles.row}>
      <Poster posterPath={result.posterPath} title={result.title} size="sm" />

      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>
          {result.title}
        </Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        {isMovie ? null : <Text style={styles.soon}>Detalhe de série chega em breve</Text>}
      </View>
    </View>
  );

  if (!isMovie) {
    return (
      <View
        accessible
        accessibilityLabel={`${result.title}. ${subtitle}. Detalhe ainda não disponível.`}
      >
        {content}
      </View>
    );
  }

  return (
    <Link href={`/filme/${result.tmdbId}`} asChild>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`${result.title}. ${subtitle}`}
        style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
      >
        {content}
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  pressable: {
    borderRadius: radii.sm,
  },
  pressed: {
    opacity: 0.6,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  info: {
    flex: 1,
    gap: spacing.xs,
    justifyContent: 'center',
  },
  title: {
    color: colors.text,
    fontSize: typography.body.fontSize,
    fontWeight: '600',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: typography.caption.fontSize,
  },
  soon: {
    color: colors.textMuted,
    fontSize: typography.caption.fontSize,
    fontStyle: 'italic',
  },
});
