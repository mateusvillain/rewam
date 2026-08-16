import { spacing } from '@rewam/tokens';
import { Button, FormDescription, FormTitle } from '@rewam/ui';
import { StyleSheet, View } from 'react-native';

import type { MediaType } from '@rewam/types';

import { describeCatalogError } from './catalog-error';

export type CatalogErrorNoticeProps = {
  error: unknown;
  /** Decide se o recado fala de filme ou de série. Filme por ser o caso antigo. */
  mediaType?: MediaType;
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
export function CatalogErrorNotice({
  error,
  mediaType = 'movie',
  onRetry,
  isRetrying,
}: CatalogErrorNoticeProps) {
  const { title, detail, canRetry } = describeCatalogError(error, mediaType);

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
