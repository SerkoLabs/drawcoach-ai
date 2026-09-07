import { useState } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { useSessionBootstrap } from '@/features/auth/session-bootstrap';
import { signOutCurrentUser } from '@/features/auth/supabase-auth';
import { t } from '@/i18n';
import { colors, spacing, typeScale } from '@/theme/tokens';

export default function SettingsScreen() {
  const router = useRouter();
  const { refresh } = useSessionBootstrap();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signOut = async () => {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      await signOutCurrentUser();
      await refresh();
      router.replace('/(auth)');
    } catch {
      setError(t('settings.signOutError'));
    } finally {
      setPending(false);
    }
  };

  return (
    <Screen title={t('settings.title')} description={t('settings.description')}>
      <Card>
        <Text style={styles.title}>Hesap</Text>
        <Text style={styles.body}>Oturumunu bu cihazda güvenli biçimde kapatabilirsin.</Text>
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        <AppButton
          label={pending ? t('settings.signingOut') : t('settings.signOut')}
          variant="secondary"
          disabled={pending}
          onPress={() => void signOut()}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.ink, fontSize: typeScale.body, fontWeight: '800' },
  body: { color: colors.inkMuted, fontSize: typeScale.caption, lineHeight: 19 },
  error: { color: '#A64343', fontSize: typeScale.caption, lineHeight: 19, marginTop: spacing.xs },
});
