import { colors } from '@rewam/tokens';
import { QueryClientProvider } from '@tanstack/react-query';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SessionProvider } from '@/features/auth';
import { createQueryClient } from '@/lib/query-client';

export default function RootLayout() {
  const [queryClient] = useState(createQueryClient);

  // Só providers: a navegação de cada área vive no layout do próprio grupo,
  // que é quem decide o que fazer com o estado da sessão.
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <SafeAreaProvider>
          <StatusBar style="light" />
          {/* O Slot não aceita screenOptions, e sem este fundo qualquer tela
              renderizada fora dos grupos apareceria clara num app escuro. */}
          <View style={styles.root}>
            <Slot />
          </View>
        </SafeAreaProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.background,
    flex: 1,
  },
});
