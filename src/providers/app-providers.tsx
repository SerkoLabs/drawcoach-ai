import type { PropsWithChildren } from 'react';
import { useEffect, useRef } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';

import { SessionBootstrapProvider, useSessionBootstrap } from '@/features/auth/session-bootstrap';
import { queryClient } from '@/lib/query-client';

function UserScopedQueryBoundary({ children }: PropsWithChildren) {
  const { phase, userId } = useSessionBootstrap();
  const previousUserId = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (phase === 'initializing') return;

    if (phase === 'signed-out' || previousUserId.current !== userId) {
      queryClient.clear();
    }
    previousUserId.current = userId;
  }, [phase, userId]);

  return children;
}

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionBootstrapProvider>
        <UserScopedQueryBoundary>{children}</UserScopedQueryBoundary>
      </SessionBootstrapProvider>
    </QueryClientProvider>
  );
}
