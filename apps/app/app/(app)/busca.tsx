import { spacing } from '@rewam/tokens';
import { Button, FormDescription, Screen, TextField } from '@rewam/ui';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';

import { CatalogErrorNotice } from '@/features/catalog';
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
 *
 * Campo e filtros ficam de pé mesmo no erro: sem isso, uma falha que não se
 * resolve repetindo deixaria a pessoa sem nada para fazer além de sair.
 */
export default function SearchScreen() {
  const [term, setTerm] = useState('');
  const [filter, setFilter] = useState<SearchFilterId>('all');

  const { data, isFetching, isError, error, refetch, debouncedTerm, isDebouncing } = useSearch(
    term,
    filter,
  );

  const results = data?.results ?? [];

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
            // `checked`, e não `selected`: um `role="radio"` sem `aria-checked`
            // é inválido para leitor de tela.
            accessibilityState={{ checked: filter === id }}
          />
        ))}
      </View>

      {isError ? (
        <CatalogErrorNotice error={error} onRetry={() => void refetch()} isRetrying={isFetching} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(result) => `${result.mediaType}:${result.tmdbId}`}
          renderItem={({ item }) => <SearchResultRow result={item} />}
          // `flex: 1` no próprio FlatList: sem isso ele se dimensiona pelo
          // conteúdo dentro de um pai `flex: 1` e corta em vez de rolar.
          style={styles.list}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <EmptyState
              term={debouncedTerm}
              resultCount={results.length}
              isBusy={isFetching || isDebouncing}
            />
          }
        />
      )}
    </Screen>
  );
}

/**
 * O que aparece no lugar da lista quando ela está vazia.
 *
 * O indicador só entra aqui, e não junto dos resultados: mantido lá, piscaria a
 * cada tecla sobre uma lista que já serve para ler.
 */
function EmptyState({
  term,
  resultCount,
  isBusy,
}: {
  term: string;
  resultCount: number;
  isBusy: boolean;
}) {
  if (isBusy) {
    return <ActivityIndicator accessibilityLabel="Buscando" style={styles.loading} />;
  }

  // Decidido pelo termo já consultado, não pelo que está sendo digitado: senão
  // a tela diria "nenhum resultado" para uma busca que ainda nem saiu.
  switch (searchPlaceholder(term, resultCount)) {
    case 'empty-term':
      return <FormDescription>Digite o nome de um filme ou série para começar.</FormDescription>;
    case 'no-results':
      return (
        <FormDescription>
          Nenhum resultado para “{term}”. Tente outro nome ou troque o filtro.
        </FormDescription>
      );
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  filters: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  loading: {
    marginTop: spacing.lg,
  },
});
