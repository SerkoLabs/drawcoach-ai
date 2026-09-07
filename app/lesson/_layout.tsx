import type { PropsWithChildren } from 'react';
import { Stack } from 'expo-router';

import { RequireSession } from '@/features/auth/require-session';

export default function LessonLayout(_: PropsWithChildren) {
  return (
    <RequireSession>
      <Stack screenOptions={{ headerShown: false }} />
    </RequireSession>
  );
}
