import { colors, spacing, typography } from '@rewam/tokens';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

/**
 * Peças comuns a toda tela de formulário. Existem porque título, erro e links
 * apareciam copiados em cada tela de autenticação: mudar a cor de um link
 * obrigava a editar todos os arquivos, e bastava esquecer um para a interface
 * ficar inconsistente.
 */

export function FormTitle({ children }: { children: ReactNode }) {
  return (
    <Text role="heading" style={styles.title}>
      {children}
    </Text>
  );
}

export function FormDescription({ children }: { children: ReactNode }) {
  return <Text style={styles.description}>{children}</Text>;
}

export type FormMessageProps = {
  children: ReactNode;
  /** `erro` também anuncia a mensagem para leitores de tela. */
  tone?: 'erro' | 'neutro';
};

export function FormMessage({ children, tone = 'erro' }: FormMessageProps) {
  if (!children) return null;

  return (
    <Text role={tone === 'erro' ? 'alert' : undefined} style={styles[tone]}>
      {children}
    </Text>
  );
}

export function FormLinks({ children }: { children: ReactNode }) {
  return <View style={styles.links}>{children}</View>;
}

/** Estilo dos links de navegação entre telas de formulário. */
export const formLinkStyle = {
  color: colors.accent,
  fontSize: typography.body.fontSize,
} as const;

const styles = StyleSheet.create({
  title: {
    color: colors.text,
    fontSize: typography.title.fontSize,
    fontWeight: '600',
  },
  description: {
    color: colors.textMuted,
    fontSize: typography.body.fontSize,
  },
  erro: {
    color: colors.danger,
    fontSize: typography.caption.fontSize,
  },
  neutro: {
    color: colors.textMuted,
    fontSize: typography.caption.fontSize,
  },
  links: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
