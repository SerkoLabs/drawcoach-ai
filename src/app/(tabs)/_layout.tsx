import { Redirect, Tabs } from 'expo-router';
import { StyleSheet, Text, type ColorValue } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/store/AppStore';

function TabGlyph({ glyph, color }: { glyph: string; color: ColorValue }) {
  return <Text style={[styles.glyph, { color }]}>{glyph}</Text>;
}

export default function TabsLayout() {
  const theme = useTheme();
  const { onboarded } = useApp();

  if (!onboarded) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: {
          backgroundColor: theme.card,
          borderTopColor: theme.border,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ color }) => <TabGlyph glyph="◎" color={color} />,
        }}
      />
      <Tabs.Screen
        name="path"
        options={{
          title: 'Path',
          tabBarIcon: ({ color }) => <TabGlyph glyph="▤" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <TabGlyph glyph="◐" color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  glyph: { fontSize: 20, lineHeight: 24 },
});
