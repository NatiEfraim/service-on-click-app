'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { ApiError } from '@/lib/api/client';

/**
 * Server state lives in React Query. The API allows 100 requests a minute per user, so the defaults are frugal:
 * data is fresh for 30 s, nothing refetches just because the window got focus, and only a lost connection is retried (once).
 */
export function QueryProvider({ children }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: (failureCount, error) => error instanceof ApiError && error.offline && failureCount < 1,
          },
          mutations: { retry: false },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
