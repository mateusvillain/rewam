import { colors, radii, spacing, typography } from '@rewam/tokens';
import { useId } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

export type TextFieldProps = TextInputProps & {
  label: string;
  /** Mensagem de validação; quando presente, o campo entra em estado de erro. */
  error?: string;
  hint?: string;
};

export function TextField({ label, error, hint, style, ...rest }: TextFieldProps) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <View style={styles.root}>
      <Text nativeID={`${id}-label`} style={styles.label}>
        {label}
      </Text>

      <TextInput
        accessibilityLabel={label}
        aria-labelledby={`${id}-label`}
        aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
        placeholderTextColor={colors.textMuted}
        style={[styles.input, error ? styles.inputWithError : null, style]}
        {...rest}
      />

      {error ? (
        <Text nativeID={`${id}-error`} style={styles.error} role="alert">
          {error}
        </Text>
      ) : hint ? (
        <Text nativeID={`${id}-hint`} style={styles.hint}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.xs,
  },
  label: {
    color: colors.textMuted,
    fontSize: typography.caption.fontSize,
    fontWeight: '600',
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    color: colors.text,
    fontSize: typography.body.fontSize,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  inputWithError: {
    borderColor: colors.danger,
  },
  error: {
    color: colors.danger,
    fontSize: typography.caption.fontSize,
  },
  hint: {
    color: colors.textMuted,
    fontSize: typography.caption.fontSize,
  },
});
