import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { useSessionBootstrap } from '@/features/auth/session-bootstrap';
import { completeOnboarding } from '@/features/onboarding/api';
import {
  isOnboardingComplete,
  type AgeBand,
  type ArtCategory,
  type ArtMedium,
  type ExperienceLevel,
  type LearningGoal,
  type OnboardingDraft,
  type SessionMinutes,
  type WeeklyDays,
} from '@/features/onboarding/model';
import { t } from '@/i18n';
import { colors, radius, spacing, typeScale } from '@/theme/tokens';

const STEPS = ['age', 'level', 'goal', 'category', 'medium', 'schedule', 'review'] as const;
type Step = (typeof STEPS)[number];

function Choice({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.choice, selected ? styles.choiceSelected : null, pressed ? styles.choicePressed : null]}
    >
      <View style={[styles.radio, selected ? styles.radioSelected : null]} />
      <Text style={[styles.choiceLabel, selected ? styles.choiceLabelSelected : null]}>{label}</Text>
    </Pressable>
  );
}

export default function OnboardingScreen() {
  const router = useRouter();
  const { phase, refresh } = useSessionBootstrap();
  const [stepIndex, setStepIndex] = useState(0);
  const [draft, setDraft] = useState<OnboardingDraft>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const step = STEPS[stepIndex] as Step;

  const ageOptions: Array<[AgeBand, string]> = useMemo(() => [
    ['13_17', t('onboarding.age.13_17')], ['18_24', t('onboarding.age.18_24')], ['25_34', t('onboarding.age.25_34')],
    ['35_44', t('onboarding.age.35_44')], ['45_54', t('onboarding.age.45_54')], ['55_plus', t('onboarding.age.55_plus')],
  ], []);
  const levelOptions: Array<[ExperienceLevel, string]> = useMemo(() => [
    ['new', t('onboarding.level.new')], ['beginner', t('onboarding.level.beginner')], ['intermediate', t('onboarding.level.intermediate')],
  ], []);
  const goalOptions: Array<[LearningGoal, string]> = useMemo(() => [
    ['hobby', t('onboarding.goal.hobby')], ['fundamentals', t('onboarding.goal.fundamentals')],
    ['specialize', t('onboarding.goal.specialize')], ['portfolio', t('onboarding.goal.portfolio')],
  ], []);
  const categoryOptions: Array<[ArtCategory, string]> = useMemo(() => [
    ['landscape', t('onboarding.category.landscape')], ['portrait', t('onboarding.category.portrait')],
  ], []);
  const mediumOptions: Array<[ArtMedium, string]> = useMemo(() => [
    ['pencil', t('onboarding.medium.pencil')], ['watercolor', t('onboarding.medium.watercolor')],
  ], []);
  const weeklyOptions: Array<[WeeklyDays, string]> = [[2, '2 gün'], [3, '3 gün'], [4, '4 gün'], [5, '5 gün']];
  const minuteOptions: Array<[SessionMinutes, string]> = [[15, '15 dk'], [30, '30 dk'], [45, '45 dk'], [60, '60 dk']];

  const canContinue = (() => {
    if (step === 'age') return Boolean(draft.ageBand);
    if (step === 'level') return Boolean(draft.experienceLevel);
    if (step === 'goal') return Boolean(draft.goal);
    if (step === 'category') return Boolean(draft.category);
    if (step === 'medium') return Boolean(draft.medium);
    if (step === 'schedule') return Boolean(draft.weeklyDays && draft.sessionMinutes);
    return isOnboardingComplete(draft);
  })();

  const save = async () => {
    if (!isOnboardingComplete(draft) || saving) return;
    setError(null);

    if (phase === 'signed-out') {
      setError(t('onboarding.requiresAccount'));
      router.push('/(auth)');
      return;
    }

    setSaving(true);
    try {
      await completeOnboarding(draft);
      const snapshot = await refresh();
      if (snapshot.phase === 'ready') router.replace('/(tabs)');
    } catch {
      setError(t('onboarding.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const title = (() => {
    if (step === 'age') return t('onboarding.step.age');
    if (step === 'level') return t('onboarding.step.level');
    if (step === 'goal') return t('onboarding.step.goal');
    if (step === 'category') return t('onboarding.step.category');
    if (step === 'medium') return t('onboarding.step.medium');
    if (step === 'schedule') return t('onboarding.step.schedule');
    return t('onboarding.step.review');
  })();

  return (
    <Screen title={title} description={`${stepIndex + 1} / ${STEPS.length} • ${t('onboarding.description')}`}>
      {step === 'age' ? ageOptions.map(([value, label]) => (
        <Choice key={value} label={label} selected={draft.ageBand === value} onPress={() => setDraft((d) => ({ ...d, ageBand: value }))} />
      )) : null}

      {step === 'level' ? levelOptions.map(([value, label]) => (
        <Choice key={value} label={label} selected={draft.experienceLevel === value} onPress={() => setDraft((d) => ({ ...d, experienceLevel: value }))} />
      )) : null}

      {step === 'goal' ? goalOptions.map(([value, label]) => (
        <Choice key={value} label={label} selected={draft.goal === value} onPress={() => setDraft((d) => ({ ...d, goal: value }))} />
      )) : null}

      {step === 'category' ? categoryOptions.map(([value, label]) => (
        <Choice key={value} label={label} selected={draft.category === value} onPress={() => setDraft((d) => ({ ...d, category: value }))} />
      )) : null}

      {step === 'medium' ? mediumOptions.map(([value, label]) => (
        <Choice key={value} label={label} selected={draft.medium === value} onPress={() => setDraft((d) => ({ ...d, medium: value }))} />
      )) : null}

      {step === 'schedule' ? (
        <>
          <Text style={styles.sectionTitle}>{t('onboarding.schedule.days')}</Text>
          <View style={styles.compactGrid}>
            {weeklyOptions.map(([value, label]) => (
              <Choice key={value} label={label} selected={draft.weeklyDays === value} onPress={() => setDraft((d) => ({ ...d, weeklyDays: value }))} />
            ))}
          </View>
          <Text style={styles.sectionTitle}>{t('onboarding.schedule.minutes')}</Text>
          <View style={styles.compactGrid}>
            {minuteOptions.map(([value, label]) => (
              <Choice key={value} label={label} selected={draft.sessionMinutes === value} onPress={() => setDraft((d) => ({ ...d, sessionMinutes: value }))} />
            ))}
          </View>
        </>
      ) : null}

      {step === 'review' && isOnboardingComplete(draft) ? (
        <Card>
          <Text style={styles.reviewTitle}>{t('onboarding.reviewTitle')}</Text>
          <Text style={styles.reviewLine}>{t(`onboarding.category.${draft.category}` as const)} • {t(`onboarding.medium.${draft.medium}` as const)}</Text>
          <Text style={styles.reviewLine}>{t(`onboarding.goal.${draft.goal}` as const)}</Text>
          <Text style={styles.reviewLine}>{draft.weeklyDays} gün/hafta • {draft.sessionMinutes} dakika</Text>
        </Card>
      ) : null}

      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}

      <View style={styles.actions}>
        {stepIndex > 0 ? (
          <AppButton label={t('common.back')} variant="secondary" disabled={saving} onPress={() => { setError(null); setStepIndex((i) => i - 1); }} />
        ) : null}
        {step === 'review' ? (
          <AppButton label={saving ? t('onboarding.saving') : t('onboarding.save')} disabled={!canContinue || saving} onPress={() => void save()} />
        ) : (
          <AppButton label={t('common.continue')} disabled={!canContinue} onPress={() => { setError(null); setStepIndex((i) => i + 1); }} />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  choice: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  choiceSelected: { borderColor: colors.brand, backgroundColor: colors.brandSoft },
  choicePressed: { opacity: 0.82 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: colors.border },
  radioSelected: { borderWidth: 5, borderColor: colors.brand },
  choiceLabel: { flex: 1, color: colors.ink, fontSize: typeScale.body, lineHeight: 21 },
  choiceLabelSelected: { fontWeight: '800' },
  sectionTitle: { color: colors.ink, fontSize: typeScale.body, fontWeight: '800', marginTop: spacing.sm },
  compactGrid: { gap: spacing.sm },
  reviewTitle: { color: colors.ink, fontSize: typeScale.title, fontWeight: '800' },
  reviewLine: { color: colors.inkMuted, fontSize: typeScale.body, lineHeight: 22 },
  actions: { gap: spacing.sm, marginTop: spacing.sm },
  error: { color: '#A64343', fontSize: typeScale.caption, lineHeight: 19 },
});
