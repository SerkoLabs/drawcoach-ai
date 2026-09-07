import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { t } from '@/i18n';
import { colors, spacing, typeScale } from '@/theme/tokens';

const PROFILE_STEPS = [
  t('onboarding.step.age'),
  t('onboarding.step.level'),
  t('onboarding.step.goal'),
  t('onboarding.step.category'),
  t('onboarding.step.medium'),
  t('onboarding.step.schedule'),
] as const;

export default function OnboardingStartScreen() {
  const router = useRouter();

  return (
    <Screen
      title={t('onboarding.title')}
      description={t('onboarding.description')}
      footer={<AppButton label={t('onboarding.start')} disabled onPress={() => undefined} />}
    >
      <Card>
        {PROFILE_STEPS.map((step, index) => (
          <View key={step} style={styles.row}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{index + 1}</Text>
            </View>
            <Text style={styles.label}>{step}</Text>
          </View>
        ))}
      </Card>
      <AppButton label={t('onboarding.showAuth')} variant="secondary" onPress={() => router.push('/(auth)')} />
      <Text style={styles.note}>{t('onboarding.devNote')}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 44 },
  badge: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: colors.brand, fontSize: typeScale.caption, fontWeight: '800' },
  label: { flex: 1, color: colors.ink, fontSize: typeScale.body, fontWeight: '600' },
  note: { color: colors.inkMuted, fontSize: typeScale.caption, lineHeight: 18 },
});
