import { colors, spacing, typography } from '@rewam/tokens';
import { Button, FormDescription, FormMessage, formLinkStyle, FormLinks, Screen } from '@rewam/ui';
import { Link, Stack, useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { formatLongDuration } from '@rewam/utils';

import { describeIncompleteTotal, hasNothingYet, useWatchStats } from '@/features/home';
import { describeWatchError, type WatchErrorPresentation } from '@/features/watch';

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
        <TotalError
          failure={describeWatchError(stats.error)}
          isRetrying={stats.isFetching}
          onRetry={() => void stats.refetch()}
        />
      ) : (
        <Total
          total={formatLongDuration(stats.data.totalMinutes)}
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
  const invite = isEmpty
    ? 'Você ainda não registrou nada. Busque um filme e marque como assistido para o total começar a contar.'
    : null;

  return (
    // Agrupado num anúncio só, nos dois estados: lidos soltos, o rótulo e o
    // número viram dois itens sem relação para quem usa leitor de tela.
    <View
      accessible
      accessibilityLabel={['Tempo assistido:', total, invite ?? incomplete ?? '']
        .filter(Boolean)
        .join(' ')}
      style={styles.block}
    >
      <Text style={styles.label}>Tempo assistido</Text>
      <Text style={styles.total}>{total}</Text>
      {invite ? <FormDescription>{invite}</FormDescription> : null}
      {incomplete ? <FormMessage tone="neutro">{incomplete}</FormMessage> : null}
    </View>
  );
}

/**
 * A falha ao carregar o total.
 *
 * O botão só aparece quando repetir pode dar outro resultado — a mesma regra
 * que `CatalogErrorNotice` aplica ao catálogo. Oferecer "tentar de novo" para
 * uma sessão expirada ou uma consulta malformada faria a pessoa insistir num
 * caminho que falha igual todas as vezes.
 */
function TotalError({
  failure,
  isRetrying,
  onRetry,
}: {
  failure: WatchErrorPresentation;
  isRetrying: boolean;
  onRetry: () => void;
}) {
  return (
    <View style={styles.block}>
      <FormMessage>{failure.message}</FormMessage>
      {failure.canRetry ? (
        <Button
          label={isRetrying ? 'Tentando…' : 'Tentar de novo'}
          variant="ghost"
          disabled={isRetrying}
          onPress={onRetry}
        />
      ) : null}
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
