import { Tabs } from 'expo-router';

import { RequireSession } from '@/features/auth/require-session';
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
        <Tabs.Screen name="index" options={{ title: 'Ana Sayfa' }} />
        <Tabs.Screen name="progress" options={{ title: 'Gelişim' }} />
        <Tabs.Screen name="history" options={{ title: 'Çalışmalar' }} />
        <Tabs.Screen name="settings" options={{ title: 'Ayarlar' }} />
      </Tabs>
    </RequireSession>
  );
}
