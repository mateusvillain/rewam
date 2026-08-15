import { zodResolver } from '@hookform/resolvers/zod';
import { spacing } from '@rewam/tokens';
import { NOTES_MAX_LENGTH } from '@rewam/types';
import { Button, ControlledTextField, FormDescription, FormMessage } from '@rewam/ui';
import { useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { useCreateWatchEvent } from './use-watch-events';
import { maskDate, today, yesterday } from './watch-date';
import { describeWatchError } from './watch-error';
import {
  toCreateInput,
  watchFormDefaults,
  watchFormSchema,
  type WatchFormValues,
} from './watch-form';

export type WatchEventFormProps = {
  /** `titles.id` do banco, não o id do TMDB: é ele que `watch_events` referencia. */
  titleId: string;
  /** Duração do TMDB, que pré-preenche o campo. */
  runtimeMinutes: number | null;
};

/**
 * Formulário de registro de exibição.
 *
 * A duração é editável e vem pré-preenchida com a do TMDB porque é ela que fica
 * congelada no evento: quem assistiu a uma versão estendida registra o que de
 * fato viu, e uma correção posterior no catálogo não reescreve esse número.
 */
export function WatchEventForm({ titleId, runtimeMinutes }: WatchEventFormProps) {
  const create = useCreateWatchEvent();

  const { control, handleSubmit, formState, reset, setValue } = useForm<WatchFormValues>({
    resolver: zodResolver(watchFormSchema),
    defaultValues: watchFormDefaults(runtimeMinutes),
  });

  const submit = handleSubmit((values) => {
    create.mutate(toCreateInput(values, titleId), {
      onSuccess: () => {
        // Volta ao estado inicial para que registrar uma reassistida logo em
        // seguida não exija apagar o que ficou do registro anterior.
        reset(watchFormDefaults(runtimeMinutes));
      },
    });
  });

  /** Preenche a data por atalho, já validando: o botão é uma resposta, não um rascunho. */
  function fillDate(value: string) {
    setValue('date', value, { shouldValidate: true, shouldDirty: true });
  }

  const failure = create.isError ? describeWatchError(create.error) : null;

  return (
    <View style={styles.root}>
      <ControlledTextField
        control={control}
        name="date"
        label="Data"
        error={formState.errors.date?.message}
        format={maskDate}
        placeholder="DD/MM/AAAA"
        keyboardType="number-pad"
        inputMode="numeric"
        hint="Quando você assistiu."
      />

      <View style={styles.shortcuts}>
        {/* O rótulo acessível diz o que o botão faz, e não só o seu texto:
            fora do contexto visual, "Hoje" sozinho não avisa que vai
            preencher o campo acima. */}
        <Button
          label="Hoje"
          variant="ghost"
          accessibilityLabel="Preencher a data com hoje"
          onPress={() => fillDate(today())}
        />
        <Button
          label="Ontem"
          variant="ghost"
          accessibilityLabel="Preencher a data com ontem"
          onPress={() => fillDate(yesterday())}
        />
      </View>

      <ControlledTextField
        control={control}
        name="duration"
        label="Duração (minutos)"
        error={formState.errors.duration?.message}
        keyboardType="number-pad"
        inputMode="numeric"
        placeholder="120"
        hint="Fica guardada neste registro, mesmo que o catálogo mude depois."
        onSubmitEditing={submit}
      />

      <ControlledTextField
        control={control}
        name="notes"
        label="Notas (opcional)"
        error={formState.errors.notes?.message}
        placeholder="O que achou?"
        maxLength={NOTES_MAX_LENGTH}
        multiline
        numberOfLines={3}
      />

      {failure ? <FormMessage>{failure.message}</FormMessage> : null}

      {create.isSuccess && !formState.isDirty ? (
        <FormMessage tone="neutro">Exibição registrada.</FormMessage>
      ) : null}

      <Button
        label={create.isPending ? 'Registrando…' : 'Marcar como assistido'}
        // Repetir só é oferecido quando repetir pode dar outro resultado; num
        // dado recusado pelo banco, insistir daria a mesma recusa.
        disabled={create.isPending || (failure !== null && !failure.canRetry && !formState.isDirty)}
        onPress={submit}
      />

      <FormDescription>
        Registrar de novo o mesmo filme conta como reassistida — nada é sobrescrito.
      </FormDescription>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.md,
  },
  shortcuts: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
