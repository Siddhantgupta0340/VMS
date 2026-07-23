'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import queryClient from '@/lib/queryClient';

/**
 * QueryProvider wraps children with TanStack React Query's QueryClientProvider.
 * Must be a client component because QueryClientProvider uses React context.
 */
export default function QueryProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
