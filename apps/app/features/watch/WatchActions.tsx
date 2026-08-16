import { spacing } from '@rewam/tokens';
import { Button, FormDescription, FormMessage } from '@rewam/ui';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { mostRecentEvent, watchActionLabel, watchCountLabel } from './watch-actions';
import {
  useCreateWatchEvent,
  useDeleteWatchEvent,
  useWatchEventsByTitle,
} from './use-watch-events';
import { describeWatchError } from './watch-error';

export type WatchActionsProps = {
  /** `titles.id` do banco, não o id do TMDB: é ele que `watch_events` referencia. */
  titleId: string;
  /**
   * Duração do catálogo, congelada no evento no momento do registro.
   *
   * `null` quando o TMDB não informa. O evento é gravado assim mesmo e fica de
   * fora dos totais, que é o combinado do briefing: não inventar número.
   */
  runtimeMinutes: number | null;
};

/**
 * Registrar e desfazer, na tela de detalhe.
 *
 * É um toque só: a data é o instante do toque e a duração vem do catálogo.
 * Nada é sobrescrito — registrar de novo cria outra exibição, e é daí que sai a
 * contagem de reassistidas.
 */
export function WatchActions({ titleId, runtimeMinutes }: WatchActionsProps) {
  const events = useWatchEventsByTitle(titleId);
  const create = useCreateWatchEvent();
  const remove = useDeleteWatchEvent();

  const list = events.data ?? [];
  const count = list.length;
  const latest = mostRecentEvent(list);

  // Uma mutação por vez: com as duas soltas, tocar em registrar e remover em
  // sequência disputaria a mesma contagem e o resultado dependeria da ordem de
  // chegada das respostas.
  const isMutating = create.isPending || remove.isPending;

  const failure = create.isError
    ? describeWatchError(create.error)
    : remove.isError
      ? describeWatchError(remove.error)
      : null;

  if (events.isPending) {
    return <ActivityIndicator accessibilityLabel="Carregando seus registros" />;
  }

  if (events.isError) {
    return (
      <View style={styles.root}>
        <FormMessage>{describeWatchError(events.error).message}</FormMessage>
        <Button
          label={events.isFetching ? 'Tentando…' : 'Tentar de novo'}
          variant="ghost"
          disabled={events.isFetching}
          onPress={() => void events.refetch()}
        />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <FormDescription>{watchCountLabel(count)}</FormDescription>

      {failure ? <FormMessage>{failure.message}</FormMessage> : null}

      <Button
        label={create.isPending ? 'Registrando…' : watchActionLabel(count)}
        disabled={isMutating}
        onPress={() =>
          create.mutate({
            titleId,
            episodeId: null,
            watchedAt: new Date().toISOString(),
            durationMinutes: runtimeMinutes,
            notes: null,
          })
        }
      />

      {latest ? (
        <Button
          label={remove.isPending ? 'Removendo…' : 'Remover último registro'}
          variant="ghost"
          // O rótulo do botão diz "último"; fora do contexto visual, convém
          // dizer também que isto desfaz um registro, e não o filme todo.
          accessibilityLabel="Remover o registro mais recente deste filme"
          disabled={isMutating}
          onPress={() => remove.mutate(latest.id)}
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
