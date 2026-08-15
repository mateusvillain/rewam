import { colors } from '@rewam/tokens';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

export type LoadingScreenProps = {
  /** Anunciado por leitores de tela. */
  label?: string;
};

/** Espera de tela cheia, usada enquanto ainda não se sabe se existe sessão. */
export function LoadingScreen({ label = 'Carregando' }: LoadingScreenProps) {
  return (
    // `accessible` é o que faz o rótulo ser anunciado no iOS e no Android; sem
    // ele, um container comum costuma ser ignorado pelo leitor de tela.
    <View accessible accessibilityLabel={label} role="progressbar" style={styles.root}>
      <ActivityIndicator color={colors.accent} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: 'center',
  },
});
