import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { OptionCard } from '@/components/ui/OptionCard';
import { Screen } from '@/components/ui/Screen';
import { Stepper } from '@/components/ui/Stepper';
import { AppText } from '@/components/ui/Text';
import { getPath } from '@/content/paths';
import { Radius, Spacing } from '@/constants/theme';
import {
  AGE_BANDS,
  CATEGORIES,
  EXPERIENCE_LEVELS,
  GOALS,
  MEDIUMS,
  WEEKLY_PRACTICE,
  type OnboardingDraft,
  type Option,
  type UserProfile,
} from '@/domain/types';
import { useScheme, useTheme } from '@/hooks/use-theme';
import { useApp } from '@/store/AppStore';

type SelectKey = 'ageBand' | 'level' | 'goal' | 'category' | 'medium' | 'weeklyPractice';

interface SelectStep {
  kind: 'select';
  key: SelectKey;
  title: string;
  subtitle: string;
  options: Option<string>[];
}

const SELECT_STEPS: SelectStep[] = [
  { kind: 'select', key: 'ageBand', title: 'How old are you?', subtitle: 'DrawCoach is designed for ages 13 and up.', options: AGE_BANDS },
  { kind: 'select', key: 'level', title: 'Where are you now?', subtitle: 'We’ll pitch feedback at the right level.', options: EXPERIENCE_LEVELS },
  { kind: 'select', key: 'goal', title: 'What’s your goal?', subtitle: 'This shapes how we pace your practice.', options: GOALS },
  { kind: 'select', key: 'category', title: 'What do you want to draw?', subtitle: 'Pick your starting focus — you can change later.', options: CATEGORIES },
  { kind: 'select', key: 'medium', title: 'Which medium?', subtitle: 'Your path adapts to the tools you use.', options: MEDIUMS },
  { kind: 'select', key: 'weeklyPractice', title: 'How often will you practice?', subtitle: 'Be honest — consistency beats intensity.', options: WEEKLY_PRACTICE },
];

const TOTAL_STEPS = SELECT_STEPS.length + 1; // + welcome/name

export default function Onboarding() {
  const theme = useTheme();
  const scheme = useScheme();
  const router = useRouter();
  const { completeOnboarding } = useApp();

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [draft, setDraft] = useState<OnboardingDraft>({});

  const selectStep = step > 0 ? SELECT_STEPS[step - 1] : null;
  const isLast = step === TOTAL_STEPS - 1;

  const canContinue = useMemo(() => {
    if (step === 0) return name.trim().length > 0;
    if (!selectStep) return false;
    return draft[selectStep.key] != null;
  }, [step, name, selectStep, draft]);

  const previewPath =
    draft.category && draft.medium ? getPath(`${draft.category}-${draft.medium}`) : undefined;

  function choose(key: SelectKey, value: string) {
    setDraft((d) => ({ ...d, [key]: value }) as OnboardingDraft);
  }

  function onBack() {
    if (step === 0) return;
    setStep((s) => s - 1);
  }

  function onContinue() {
    if (!canContinue) return;
    if (!isLast) {
      setStep((s) => s + 1);
      return;
    }
    const profile: UserProfile = {
      name: name.trim(),
      ageBand: draft.ageBand!,
      level: draft.level!,
      goal: draft.goal!,
      category: draft.category!,
      medium: draft.medium!,
      weeklyPractice: draft.weeklyPractice!,
      createdAt: Date.now(),
    };
    completeOnboarding(profile);
    router.replace('/(tabs)');
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Screen
        footer={
          <View style={styles.footerRow}>
            {step > 0 ? (
              <Button label="Back" variant="ghost" fullWidth={false} onPress={onBack} />
            ) : (
              <View />
            )}
            <Button
              label={isLast ? 'Start learning' : 'Continue'}
              onPress={onContinue}
              disabled={!canContinue}
              fullWidth={false}
              style={styles.continueBtn}
              icon={isLast ? '✦' : undefined}
            />
          </View>
        }
      >
        <View style={styles.stepperWrap}>
          <Stepper total={TOTAL_STEPS} current={step} />
        </View>

        {step === 0 ? (
          <View style={styles.welcome}>
            <View style={[styles.logoDot, { backgroundColor: theme.primary }]}>
              <AppText style={styles.logoGlyph}>✎</AppText>
            </View>
            <AppText variant="display" style={styles.center}>
              Welcome to DrawCoach
            </AppText>
            <AppText variant="body" tone="secondary" style={styles.center}>
              Personalized drawing lessons with specific, checkpoint-by-checkpoint feedback on your
              own work. Let’s set up your path.
            </AppText>
            <View style={styles.field}>
              <AppText variant="overline" tone="muted">
                WHAT SHOULD WE CALL YOU?
              </AppText>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor={theme.textMuted}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={onContinue}
                style={[
                  styles.input,
                  { color: theme.text, backgroundColor: theme.card, borderColor: theme.border },
                ]}
                keyboardAppearance={scheme}
              />
            </View>
          </View>
        ) : selectStep ? (
          <View style={styles.stepBody}>
            <AppText variant="title">{selectStep.title}</AppText>
            <AppText variant="body" tone="secondary" style={styles.subtitle}>
              {selectStep.subtitle}
            </AppText>
            <View style={styles.options}>
              {selectStep.options.map((opt) => (
                <OptionCard
                  key={opt.value}
                  label={opt.label}
                  hint={opt.hint}
                  selected={draft[selectStep.key] === opt.value}
                  onPress={() => choose(selectStep.key, opt.value)}
                />
              ))}
            </View>

            {isLast && previewPath ? (
              <Card style={styles.preview}>
                <AppText variant="overline" tone="primary">
                  YOUR PATH
                </AppText>
                <AppText variant="heading">{previewPath.title}</AppText>
                <AppText variant="caption" tone="secondary">
                  {previewPath.subtitle}
                </AppText>
                <AppText variant="caption" tone="muted">
                  {previewPath.lessons.length} lessons ·{' '}
                  {previewPath.lessons.reduce((n, l) => n + l.checkpoints.length, 0)} checkpoints
                </AppText>
              </Card>
            ) : null}
          </View>
        ) : null}
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stepperWrap: { marginBottom: Spacing.xl },
  welcome: { gap: Spacing.md, alignItems: 'center' },
  center: { textAlign: 'center' },
  logoDot: {
    width: 64,
    height: 64,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  logoGlyph: { fontSize: 30, color: '#fff' },
  field: { width: '100%', gap: Spacing.sm, marginTop: Spacing.lg },
  input: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md + 2,
    fontSize: 17,
  },
  stepBody: { gap: Spacing.xs },
  subtitle: { marginBottom: Spacing.md },
  options: { gap: Spacing.md },
  preview: { marginTop: Spacing.xl, gap: 4 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.md },
  continueBtn: { minWidth: 160, flex: 1 },
});
