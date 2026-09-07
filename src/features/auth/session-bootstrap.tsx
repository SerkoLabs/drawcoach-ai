import type { PropsWithChildren } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { logger } from '@/lib/logger';

export type SessionPhase = 'initializing' | 'signed-out' | 'onboarding-incomplete' | 'ready';

export type SessionBootstrapResult = {
  phase: Exclude<SessionPhase, 'initializing'>;
  userId?: string;
};

type SessionContextValue = {
  phase: SessionPhase;
  userId?: string;
  refresh: () => Promise<void>;
};

type SessionBootstrapProviderProps = PropsWithChildren<{
  bootstrap?: () => Promise<SessionBootstrapResult>;
}>;

const SessionContext = createContext<SessionContextValue | null>(null);

async function developmentBootstrap(): Promise<SessionBootstrapResult> {
  return { phase: 'signed-out' };
}

export function SessionBootstrapProvider({
  children,
  bootstrap = developmentBootstrap,
}: SessionBootstrapProviderProps) {
  const [snapshot, setSnapshot] = useState<{ phase: SessionPhase; userId?: string }>({
    phase: 'initializing',
  });

  const refresh = useCallback(async () => {
    setSnapshot({ phase: 'initializing' });
    try {
      const next = await bootstrap();
      setSnapshot(next);
    } catch (error) {
      logger.error('Session bootstrap failed', {
        errorName: error instanceof Error ? error.name : 'unknown',
      });
      setSnapshot({ phase: 'signed-out' });
    }
  }, [bootstrap]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<SessionContextValue>(
    () => ({ phase: snapshot.phase, userId: snapshot.userId, refresh }),
    [refresh, snapshot.phase, snapshot.userId],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSessionBootstrap() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSessionBootstrap must be used inside SessionBootstrapProvider');
  }
  return context;
}
