import { QueryClientProvider } from '@tanstack/react-query';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
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
          <Slot />
        </SafeAreaProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}
