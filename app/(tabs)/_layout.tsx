import { Tabs } from 'expo-router';

import { RequireSession } from '@/features/auth/require-session';
import { t } from '@/i18n';
import { colors } from '@/theme/tokens';

export default function TabsLayout() {
  return (
    <RequireSession>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.brand,
          tabBarInactiveTintColor: colors.inkMuted,
          tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        }}
      >
        <Tabs.Screen name="index" options={{ title: t('tabs.home') }} />
        <Tabs.Screen name="progress" options={{ title: t('tabs.progress') }} />
        <Tabs.Screen name="history" options={{ title: t('tabs.history') }} />
        <Tabs.Screen name="settings" options={{ title: t('tabs.settings') }} />
      </Tabs>
    </RequireSession>
  );
}
