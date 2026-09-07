import type { PropsWithChildren } from 'react';
import { Redirect } from 'expo-router';

import { MessageState } from '@/components/ui/message-state';
import { Screen } from '@/components/ui/screen';
import { useSessionBootstrap } from '@/features/auth/session-bootstrap';

export function RequireSession({ children }: PropsWithChildren) {
  const { phase } = useSessionBootstrap();

  if (phase === 'initializing') {
    return (
      <Screen title="Hesabın hazırlanıyor">
        <MessageState title="Oturum kontrol ediliyor" body="Korumalı ekran açılmadan önce hesabın ve profil durumun doğrulanıyor." />
      </Screen>
    );
  }

  if (phase === 'signed-out') {
    return <Redirect href="/(auth)" />;
  }

  if (phase === 'onboarding-incomplete') {
    return <Redirect href="/(onboarding)" />;
  }

  return children;
}
