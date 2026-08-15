import { spacing } from '@rewam/tokens';
import { Button, FormDescription, FormTitle } from '@rewam/ui';
import { StyleSheet, View } from 'react-native';

import { describeCatalogError } from './catalog-error';

export type CatalogErrorNoticeProps = {
  error: unknown;
  onRetry: () => void;
  isRetrying?: boolean;
};

/**
 * Recado de falha ao falar com o catálogo.
 *
 * Detalhe e busca mostravam a mesma coisa com estilos próprios; separar evita
 * que a segunda tela a mudar de texto deixe a outra para trás.
 *
 * O botão de repetir só aparece quando repetir resolve: insistir num 404 traz
 * outro 404, e oferecer o botão seria uma promessa falsa.
 */
export function CatalogErrorNotice({ error, onRetry, isRetrying }: CatalogErrorNoticeProps) {
  const { title, detail, canRetry } = describeCatalogError(error);

  return (
    <View style={styles.root}>
      <FormTitle>{title}</FormTitle>
      <FormDescription>{detail}</FormDescription>
      {canRetry ? (
        <Button
          label={isRetrying ? 'Tentando…' : 'Tentar de novo'}
          onPress={onRetry}
          disabled={isRetrying}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.sm,
  },
});
