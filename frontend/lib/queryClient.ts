'use client';

import { QueryClient } from '@tanstack/react-query';

/**
 * TanStack React Query client configuration.
 *
 * - staleTime: 1 minute — cached data is considered fresh for 1 min before background refetch.
 * - gcTime: 5 minutes — unused cache entries are garbage collected after 5 min.
 * - retry: 1 — automatically retry failed queries once before throwing.
 * - refetchOnWindowFocus: false — disable automatic refetch when the window regains focus.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,         // 1 minute
      gcTime: 1000 * 60 * 5,        // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

export default queryClient;
