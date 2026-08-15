import { colors, spacing } from '@rewam/tokens';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

export type ScreenProps = {
  children: ReactNode;
};

export function Screen({ children }: ScreenProps) {
  return <View style={styles.root}>{children}</View>;
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.background,
    flex: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
});
