import { colors, spacing, typography } from '@rewam/tokens';
import { Button, FormDescription, FormMessage, formLinkStyle, FormLinks, Screen } from '@rewam/ui';
import { Link, Stack, useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import {
  describeIncompleteTotal,
  formatTotal,
  hasNothingYet,
  useWatchStats,
} from '@/features/home';
import { describeWatchError } from '@/features/watch';

/**
 * Tela de início.
 *
 * É o primeiro contato depois do login, e responde de imediato "quanto tempo eu
 * já dediquei". O total vem somado do banco: somá-lo no cliente exigiria baixar
 * todas as exibições da conta, e o custo cresceria com o uso inteiro
 * justamente na tela que abre primeiro.
 */
export default function HomeScreen() {
  const stats = useWatchStats();
  const router = useRouter();

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Rewam' }} />

      <Text style={styles.title}>Rewam</Text>

      {stats.isPending ? (
        <ActivityIndicator accessibilityLabel="Carregando seu total" style={styles.loading} />
      ) : stats.isError ? (
        <View style={styles.block}>
          <FormMessage>{describeWatchError(stats.error).message}</FormMessage>
          <Button
            label={stats.isFetching ? 'Tentando…' : 'Tentar de novo'}
            variant="ghost"
            disabled={stats.isFetching}
            onPress={() => void stats.refetch()}
          />
        </View>
      ) : (
        <Total
          total={formatTotal(stats.data.totalMinutes)}
          incomplete={describeIncompleteTotal(stats.data)}
          isEmpty={hasNothingYet(stats.data)}
        />
      )}

      {/* O atalho é botão, e não link de rodapé: registrar é o que a pessoa
          veio fazer, e a busca é o único caminho até lá. */}
      <Button label="Buscar filmes e séries" onPress={() => router.push('/busca')} />

      <FormLinks>
        <Link href="/perfil" style={formLinkStyle}>
          Seu perfil
        </Link>
      </FormLinks>
    </Screen>
  );
}

function Total({
  total,
  incomplete,
  isEmpty,
}: {
  total: string;
  incomplete: string | null;
  isEmpty: boolean;
}) {
  if (isEmpty) {
    return (
      <View style={styles.block}>
        <Text style={styles.label}>Tempo assistido</Text>
        <Text style={styles.total}>{total}</Text>
        <FormDescription>
          Você ainda não registrou nada. Busque um filme e marque como assistido para o total
          começar a contar.
        </FormDescription>
      </View>
    );
  }

  return (
    // Agrupado num anúncio só: lidos soltos, o rótulo e o número viram dois
    // itens sem relação para quem usa leitor de tela.
    <View accessible accessibilityLabel={`Tempo assistido: ${total}`} style={styles.block}>
      <Text style={styles.label}>Tempo assistido</Text>
      <Text style={styles.total}>{total}</Text>
      {incomplete ? <FormMessage tone="neutro">{incomplete}</FormMessage> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.text,
    fontSize: typography.display.fontSize,
    fontWeight: '700',
  },
  block: {
    gap: spacing.xs,
  },
  label: {
    color: colors.textMuted,
    fontSize: typography.caption.fontSize,
    fontWeight: '600',
  },
  total: {
    color: colors.text,
    fontSize: typography.display.fontSize,
    fontWeight: '700',
  },
  loading: {
    alignSelf: 'flex-start',
  },
});
