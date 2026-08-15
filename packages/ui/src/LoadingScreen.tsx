import { colors, spacing, typography } from '@rewam/tokens';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

export type LoadingScreenProps = {
  /** Anunciado por leitores de tela; visível apenas se `showLabel`. */
  label?: string;
  showLabel?: boolean;
};

/** Espera de tela cheia, usada enquanto ainda não se sabe se existe sessão. */
export function LoadingScreen({ label = 'Carregando', showLabel = false }: LoadingScreenProps) {
  return (
    <View style={styles.root} accessibilityLabel={label} role="progressbar">
      <ActivityIndicator color={colors.accent} size="large" />
      {showLabel ? <Text style={styles.label}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    gap: spacing.md,
    justifyContent: 'center',
  },
  label: {
    color: colors.textMuted,
    fontSize: typography.body.fontSize,
  },
});
