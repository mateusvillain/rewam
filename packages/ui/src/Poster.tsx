import { posterUrl } from '@rewam/tmdb';
import { colors, radii, typography } from '@rewam/tokens';
import { useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';

import { POSTER_SIZES, posterHeight, posterInitials, type PosterSizeName } from './poster-rules';

export type { PosterSizeName };

export type PosterProps = {
  /** Caminho do TMDB, como vem normalizado. `null` cai direto no espaço reservado. */
  posterPath: string | null;
  /** Usado nas iniciais do espaço reservado e como rótulo de acessibilidade. */
  title?: string | null;
  size?: PosterSizeName;
};

type LoadState = {
  /** Qual URI este estado descreve. Sem isto, o estado sobrevive à troca de título. */
  uri: string | null;
  status: 'loading' | 'loaded' | 'failed';
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
  const [load, setLoad] = useState<LoadState>({ uri, status: 'loading' });

  // Numa lista, o mesmo componente é reaproveitado para outro título. Sem
  // zerar aqui, um pôster que falhou continuaria falhado para o título
  // seguinte, e um já carregado pularia o indicador do próximo.
  if (load.uri !== uri) setLoad({ uri, status: 'loading' });

  const showImage = uri !== null && load.status !== 'failed';
  const initials = posterInitials(title);
  const label = title ? `Pôster de ${title}` : 'Pôster indisponível';

  return (
    <View style={[styles.frame, { width, height }]}>
      <View
        style={styles.placeholder}
        // Com imagem na frente, o espaço reservado não deve ser anunciado: quem
        // lê a tela ouviria as iniciais e em seguida o rótulo da imagem.
        accessibilityElementsHidden={showImage}
        importantForAccessibility={showImage ? 'no-hide-descendants' : 'yes'}
        accessibilityRole={showImage ? undefined : 'image'}
        accessibilityLabel={showImage ? undefined : label}
      >
        <Text style={initials ? styles.initials : styles.icon} numberOfLines={1}>
          {initials || '🎬'}
        </Text>
      </View>

      {showImage && (
        <Image
          accessibilityRole="image"
          accessibilityLabel={label}
          source={{ uri }}
          style={styles.image}
          onError={() => setLoad({ uri, status: 'failed' })}
          onLoadEnd={() => setLoad({ uri, status: 'loaded' })}
        />
      )}

      {showImage && load.status === 'loading' && (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.textMuted} />
        </View>
      )}
    </View>
  );
}

/**
 * As três camadas do pôster ocupam o quadro inteiro e ficam empilhadas.
 *
 * Escrito à mão porque `StyleSheet.absoluteFillObject` não existe na tipagem do
 * React Native que o app usa — só `absoluteFill`, que é um id registrado e não
 * dá para espalhar dentro de outro estilo.
 */
const fillsFrame = {
  bottom: 0,
  left: 0,
  position: 'absolute',
  right: 0,
  top: 0,
} as const;

const styles = StyleSheet.create({
  frame: {
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    overflow: 'hidden',
  },
  placeholder: {
    ...fillsFrame,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    ...fillsFrame,
    // Em estilo, e não como prop: a prop `resizeMode` está depreciada na versão
    // de React Native que o app usa.
    resizeMode: 'cover',
  },
  loading: {
    ...fillsFrame,
    alignItems: 'center',
    justifyContent: 'center',
    // Idem: `pointerEvents` como prop de View está depreciada.
    pointerEvents: 'none',
  },
  initials: {
    color: colors.textMuted,
    fontSize: typography.title.fontSize,
    fontWeight: '600',
  },
  icon: {
    fontSize: typography.title.fontSize,
  },
});
