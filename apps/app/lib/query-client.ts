import { QueryClient } from '@tanstack/react-query';

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Catálogo TMDB muda pouco; histórico pessoal é invalidado por mutação.
        staleTime: 5 * 60 * 1000,
        retry: 1,
      },
    },
  });
}
