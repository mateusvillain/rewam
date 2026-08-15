import { zodResolver } from '@hookform/resolvers/zod';
import { DatabaseError } from '@rewam/database';
import { spacing } from '@rewam/tokens';
import { Button, ControlledTextField, FormDescription, FormMessage, TextField } from '@rewam/ui';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { useCreateWatchEvent } from './use-watch-events';
import { maskDate, today, yesterday } from './watch-date';
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
  onRegistered?: () => void;
};

/**
 * Formulário de registro de exibição.
 *
 * A duração é editável e vem pré-preenchida com a do TMDB porque é ela que fica
 * congelada no evento: quem assistiu a uma versão estendida registra o que de
 * fato viu, e uma correção posterior no catálogo não reescreve esse número.
 */
export function WatchEventForm({ titleId, runtimeMinutes, onRegistered }: WatchEventFormProps) {
  const create = useCreateWatchEvent();

  const { control, handleSubmit, formState, reset, setValue } = useForm<WatchFormValues>({
    resolver: zodResolver(watchFormSchema),
    defaultValues: watchFormDefaults(runtimeMinutes),
  });

  function onSubmit(values: WatchFormValues) {
    create.mutate(toCreateInput(values, titleId), {
      onSuccess: () => {
        // Volta ao estado inicial para que registrar uma reassistida logo em
        // seguida não exija apagar o que ficou do registro anterior.
        reset(watchFormDefaults(runtimeMinutes));
        onRegistered?.();
      },
    });
  }

  return (
    <View style={styles.root}>
      <Controller
        control={control}
        name="date"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextField
            label="Data"
            value={value}
            // A máscara roda na mudança, e não na validação: assim a pessoa vê
            // as barras aparecerem enquanto digita, em vez de ser corrigida ao
            // sair do campo.
            onChangeText={(text) => onChange(maskDate(text))}
            onBlur={onBlur}
            error={formState.errors.date?.message}
            placeholder="DD/MM/AAAA"
            keyboardType="number-pad"
            inputMode="numeric"
            hint="Quando você assistiu."
          />
        )}
      />

      <View style={styles.shortcuts}>
        <Button
          label="Hoje"
          variant="ghost"
          onPress={() => setValue('date', today(), { shouldValidate: true })}
        />
        <Button
          label="Ontem"
          variant="ghost"
          onPress={() => setValue('date', yesterday(), { shouldValidate: true })}
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
      />

      <ControlledTextField
        control={control}
        name="notes"
        label="Notas (opcional)"
        error={formState.errors.notes?.message}
        placeholder="O que achou?"
        multiline
        numberOfLines={3}
      />

      {create.isError ? <FormMessage>{describeError(create.error)}</FormMessage> : null}

      {create.isSuccess && !formState.isDirty ? (
        <FormMessage tone="neutro">Exibição registrada.</FormMessage>
      ) : null}

      <Button
        label={create.isPending ? 'Registrando…' : 'Marcar como assistido'}
        disabled={create.isPending}
        onPress={handleSubmit(onSubmit)}
      />

      <FormDescription>
        Registrar de novo o mesmo filme conta como reassistida — nada é sobrescrito.
      </FormDescription>
    </View>
  );
}

/**
 * A mensagem da falha, já em português.
 *
 * `DatabaseError` chega com o texto pronto justamente para a tela não
 * reimplementar o `switch` sobre SQLSTATE; o resto vira uma frase genérica, que
 * é o melhor que se pode dizer sobre um erro que não se sabe classificar.
 */
function describeError(error: unknown): string {
  if (error instanceof DatabaseError) return error.message;
  return 'Não foi possível registrar esta exibição. Tente de novo.';
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
