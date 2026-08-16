import { colors, radii, spacing, typography } from '@rewam/tokens';
import { Poster } from '@rewam/ui';
import type { CatalogSearchResult } from '@rewam/types';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { releaseYear, titleSubtitle } from '@/features/catalog';

/**
 * Uma linha da lista de resultados.
 *
 * Filme e série navegam para telas diferentes porque o alvo do registro é
 * diferente: no filme é o título, na série é o episódio. A rota carrega essa
 * escolha, e é por isso que o caminho é decidido aqui e não na tela de destino.
 *
 * Até a E5.2 a linha de série não era tocável, e com o filtro "Séries" ativo
 * nenhum item da lista respondia ao toque — um beco sem saída que esta tela
 * fechou.
 */
export function SearchResultRow({ result }: { result: CatalogSearchResult }) {
  const subtitle = titleSubtitle(releaseYear(result.releaseDate), result.mediaType);
  const href = result.mediaType === 'movie' ? `/filme/${result.tmdbId}` : `/serie/${result.tmdbId}`;

  const content = (
    <View style={styles.row}>
      <Poster posterPath={result.posterPath} title={result.title} size="sm" />

      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>
          {result.title}
        </Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
    </View>
  );

  return (
    <Link href={href} asChild>
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
});
