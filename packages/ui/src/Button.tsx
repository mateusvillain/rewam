import { colors, radii, spacing, typography } from '@rewam/tokens';
import { Pressable, StyleSheet, Text, type PressableProps } from 'react-native';

export type ButtonProps = Omit<PressableProps, 'children'> & {
  label: string;
  variant?: 'primary' | 'ghost';
};

export function Button({ label, variant = 'primary', disabled, style, ...rest }: ButtonProps) {
  return (
    <Pressable
      // Antes do spread de propósito: assim uma tela que precise de outro papel
      // — `radio` num grupo de filtros, por exemplo — consegue sobrescrever.
      accessibilityRole="button"
      disabled={disabled}
      style={[
        styles.base,
        variant === 'primary' ? styles.primary : styles.ghost,
        disabled && styles.disabled,
        typeof style === 'object' ? style : null,
      ]}
      {...rest}
    >
      <Text style={[styles.label, variant === 'ghost' && styles.ghostLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderRadius: radii.md,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  primary: {
    backgroundColor: colors.accent,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: colors.border,
    borderWidth: 1,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    color: colors.accentText,
    fontSize: typography.body.fontSize,
    fontWeight: '600',
  },
  ghostLabel: {
    color: colors.text,
  },
});
