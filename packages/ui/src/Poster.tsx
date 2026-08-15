import { posterUrl } from '@rewam/tmdb';
import { colors, radii, typography } from '@rewam/tokens';
import { useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';

import { POSTER_SIZES, posterHeight, posterInitials, type PosterSizeName } from './poster-rules';

export type PosterProps = {
  /** Caminho do TMDB, como vem normalizado. `null` cai direto no espaço reservado. */
  posterPath: string | null;
  /** Usado nas iniciais do espaço reservado e como rótulo de acessibilidade. */
  title?: string | null;
  size?: PosterSizeName;
};

/**
 * Pôster de título, com espaço reservado para quem não tem imagem.
 *
 * Boa parte do catálogo do TMDB não tem pôster, e a URL depende do tamanho
 * pedido. Concentrar as duas regras aqui evita que busca, detalhe, histórico e
 * início repitam cada uma do seu jeito.
 *
 * O quadro tem largura e altura fixas desde o primeiro render, e o espaço
 * reservado fica atrás da imagem — então trocar "carregando" por "carregado",
 * ou cair para o espaço reservado quando a imagem falha, nunca desloca o que
 * está em volta.
 */
export function Poster({ posterPath, title, size = 'md' }: PosterProps) {
  const { width, remote } = POSTER_SIZES[size];
  const height = posterHeight(width);
  const uri = posterUrl(posterPath, remote);

  // Caminho existir não garante imagem: o TMDB tem registro apontando para
  // arquivo que não responde mais, e aí o espaço reservado assume.
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const showImage = uri !== null && !failed;

  const initials = posterInitials(title);
  const label = title ? `Pôster de ${title}` : 'Pôster indisponível';

  return (
    <View style={[styles.frame, { width, height }]}>
      <View style={styles.placeholder}>
        <Text style={initials ? styles.initials : styles.icon} numberOfLines={1}>
          {initials || '🎬'}
        </Text>
      </View>

      {showImage && (
        <Image
          accessibilityRole="image"
          accessibilityLabel={label}
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          onError={() => setFailed(true)}
          onLoadEnd={() => setLoading(false)}
        />
      )}

      {showImage && loading && (
        <View style={[StyleSheet.absoluteFill, styles.loading]} pointerEvents="none">
          <ActivityIndicator color={colors.textMuted} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    overflow: 'hidden',
  },
  placeholder: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  initials: {
    color: colors.textMuted,
    fontSize: typography.title.fontSize,
    fontWeight: '600',
  },
  icon: {
    fontSize: typography.title.fontSize,
  },
  loading: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
