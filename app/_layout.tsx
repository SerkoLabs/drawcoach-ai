import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AppProviders } from '@/providers/app-providers';
import { colors } from '@/theme/tokens';

export default function RootLayout() {
  return (
    <AppProviders>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
        }}
      />
    </AppProviders>
  );
}
