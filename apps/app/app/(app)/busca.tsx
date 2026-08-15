import { spacing } from '@rewam/tokens';
import { Button, FormDescription, FormTitle, Screen, TextField } from '@rewam/ui';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';

import { describeCatalogError } from '@/features/catalog';
import {
  SEARCH_FILTERS,
  SearchResultRow,
  searchPlaceholder,
  useSearch,
  type SearchFilterId,
} from '@/features/search';

/**
 * Busca de títulos no TMDB.
 *
 * É a porta de entrada para registrar qualquer exibição. Os três estados que a
 * lista pode ter — carregando, vazia e com erro — são tratados aqui, e não pela
 * lista, porque cada um pede um recado diferente.
 */
export default function SearchScreen() {
  const [term, setTerm] = useState('');
  const [filter, setFilter] = useState<SearchFilterId>('todos');

  const { data, isFetching, isError, error, refetch, debouncedTerm, isDebouncing } = useSearch(
    term,
    filter,
  );

  const results = data?.results ?? [];
  // O termo consultado, não o que está sendo digitado: senão a lista diria
  // "nenhum resultado" para uma busca que ainda nem saiu.
  const placeholder = searchPlaceholder(debouncedTerm, results.length);
  const isBusy = isFetching || isDebouncing;

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Buscar' }} />

      <TextField
        label="Buscar"
        placeholder="Nome do filme ou série"
        value={term}
        onChangeText={setTerm}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        hint="Escolha um título para ver os detalhes e registrar."
      />

      <View style={styles.filters} accessibilityRole="radiogroup">
        {SEARCH_FILTERS.map(({ id, label }) => (
          <Button
            key={id}
            label={label}
            variant={filter === id ? 'primary' : 'ghost'}
            onPress={() => setFilter(id)}
            accessibilityRole="radio"
            accessibilityState={{ selected: filter === id }}
          />
        ))}
      </View>

      {isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} isRetrying={isFetching} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(result) => `${result.mediaType}:${result.tmdbId}`}
          renderItem={({ item }) => <SearchResultRow result={item} />}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            // O indicador aparece só com a lista vazia: mantido junto dos
            // resultados, ele piscaria a cada tecla sobre uma lista que já
            // serve para ler.
            isBusy ? (
              <ActivityIndicator accessibilityLabel="Buscando" style={styles.loading} />
            ) : placeholder === 'digite' ? (
              <FormDescription>Digite o nome de um filme ou série para começar.</FormDescription>
            ) : placeholder === 'nenhum' ? (
              <FormDescription>
                Nenhum resultado para “{debouncedTerm}”. Tente outro nome ou troque o filtro.
              </FormDescription>
            ) : null
          }
        />
      )}
    </Screen>
  );
}

function ErrorState({
  error,
  onRetry,
  isRetrying,
}: {
  error: unknown;
  onRetry: () => void;
  isRetrying: boolean;
}) {
  const { title, detail, canRetry } = describeCatalogError(error);

  return (
    <View style={styles.error}>
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
  filters: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  list: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  loading: {
    marginTop: spacing.lg,
  },
  error: {
    gap: spacing.sm,
  },
});
