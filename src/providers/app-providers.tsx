import type { PropsWithChildren } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';

import { SessionBootstrapProvider } from '@/features/auth/session-bootstrap';
import { queryClient } from '@/lib/query-client';

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionBootstrapProvider>{children}</SessionBootstrapProvider>
    </QueryClientProvider>
  );
}
