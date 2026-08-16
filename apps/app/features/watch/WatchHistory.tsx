import type { WatchEvent } from '@rewam/database';
import { colors, radii, spacing, typography } from '@rewam/tokens';
import { FormDescription } from '@rewam/ui';
import { StyleSheet, Text, View } from 'react-native';

import { toHistoryItems, type WatchHistoryItem } from './watch-history';

export type WatchHistoryProps = {
  events: ReadonlyArray<WatchEvent>;
};

/**
 * As exibições de um título, da mais recente para a mais antiga.
 *
 * Sem `FlatList`: a lista já vem inteira do banco — sem paginação, porque a
 * numeração de reassistida precisa de todos os eventos para estar certa — e
 * vive dentro do `ScrollView` da tela de detalhe. Uma lista virtualizada
 * aninhada em outra rolagem é justamente o que o React Native avisa para não
 * fazer, e aqui não traria ganho: o histórico de um filme é curto.
 */
export function WatchHistory({ events }: WatchHistoryProps) {
  const items = toHistoryItems(events);

  if (items.length === 0) {
    // O convite, e não a repetição do contador: a linha acima já disse que não
    // há registro. O que falta dizer é o que fazer a respeito.
    return <FormDescription>Toque acima para registrar a primeira exibição.</FormDescription>;
  }

  return (
    <View style={styles.root}>
      <Text style={styles.heading} role="heading">
        Suas exibições
      </Text>

      {items.map((item) => (
        <HistoryRow key={item.id} item={item} />
      ))}
    </View>
  );
}

function HistoryRow({ item }: { item: WatchHistoryItem }) {
  return (
    // `accessible` agrupa as três linhas num anúncio só: sem isso o leitor de
    // tela lê posição, data e duração como três itens soltos, e a relação
    // entre eles se perde.
    <View accessible accessibilityLabel={`${item.position}. ${item.date}. ${item.duration}.`}>
      <View style={styles.row}>
        <Text style={styles.position}>{item.position}</Text>
        <Text style={styles.date}>{item.date}</Text>
        <Text style={item.hasUnknownDuration ? styles.durationUnknown : styles.duration}>
          {item.duration}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.sm,
  },
  heading: {
    color: colors.text,
    fontSize: typography.body.fontSize,
    fontWeight: '600',
  },
  row: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  position: {
    color: colors.text,
    fontSize: typography.body.fontSize,
    fontWeight: '600',
  },
  date: {
    color: colors.textMuted,
    fontSize: typography.caption.fontSize,
  },
  duration: {
    color: colors.textMuted,
    fontSize: typography.caption.fontSize,
  },
  // Itálico, e não vermelho: duração ausente é uma informação que falta, não um
  // erro que a pessoa cometeu.
  durationUnknown: {
    color: colors.textMuted,
    fontSize: typography.caption.fontSize,
    fontStyle: 'italic',
  },
});
