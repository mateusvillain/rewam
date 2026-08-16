import { colors, spacing } from '@rewam/tokens';
import { Button, FormDescription } from '@rewam/ui';
import { StyleSheet, View } from 'react-native';

import { describeSelection, type SelectionSummary } from './batch-selection';

export type BatchBarProps = {
  isSelecting: boolean;
  summary: SelectionSummary;
  isSaving: boolean;
  allSelected: boolean;
  onStart: () => void;
  onToggleAll: () => void;
  onConfirm: () => void;
  onCancel: () => void;
};

export /**
 * A barra de seleção em lote.
 *
 * O resumo aparece antes de confirmar porque é o que o briefing pede: a pessoa
 * precisa saber quantos minutos está prestes a somar ao total. Sem ele,
 * "marcar temporada" é um botão que muda um número invisível.
 */
function BatchBar({
  isSelecting,
  summary,
  isSaving,
  allSelected,
  onStart,
  onToggleAll,
  onConfirm,
  onCancel,
}: BatchBarProps) {
  if (!isSelecting) {
    return (
      <View style={styles.batch}>
        <Button label="Selecionar vários" variant="ghost" onPress={onStart} />
      </View>
    );
  }

  return (
    <View style={styles.batch}>
      <Button
        label={allSelected ? 'Desmarcar temporada' : 'Selecionar temporada'}
        variant="ghost"
        disabled={isSaving}
        onPress={onToggleAll}
      />

      {summary.count > 0 ? (
        <>
          {/* Agrupado com o texto do resumo para o leitor de tela anunciar o
              que será gravado, e não só o rótulo do botão. */}
          <View
            accessible
            // `polite` faz o leitor de tela reler o resumo quando ele muda, em
            // vez de a pessoa ter de voltar até aqui a cada episódio marcado.
            accessibilityLiveRegion="polite"
            accessibilityLabel={`Selecionado: ${describeSelection(summary)}`}
          >
            <FormDescription>{describeSelection(summary)}</FormDescription>
          </View>

          <View style={styles.batchActions}>
            <Button label="Cancelar" variant="ghost" disabled={isSaving} onPress={onCancel} />
            <Button
              label={isSaving ? 'Registrando…' : 'Registrar selecionados'}
              disabled={isSaving}
              onPress={onConfirm}
            />
          </View>
        </>
      ) : (
        <Button label="Cancelar" variant="ghost" disabled={isSaving} onPress={onCancel} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  batch: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
  batchActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
