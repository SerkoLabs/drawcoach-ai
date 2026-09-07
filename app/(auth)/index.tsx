import { useState } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { FormField } from '@/components/ui/form-field';
import { Screen } from '@/components/ui/screen';
import { AuthActionError, signInWithEmail, signUpWithEmail } from '@/features/auth/supabase-auth';
import { useSessionBootstrap } from '@/features/auth/session-bootstrap';
import { t } from '@/i18n';
import { colors, spacing, typeScale } from '@/theme/tokens';

type Mode = 'sign-in' | 'sign-up';

function authErrorMessage(error: unknown) {
  if (!(error instanceof AuthActionError)) return t('auth.unknownError');
  if (error.code === 'invalid_credentials') return t('auth.invalidCredentials');
  if (error.code === 'email_unconfirmed') return t('auth.emailUnconfirmed');
  if (error.code === 'rate_limited') return t('auth.rateLimited');
  return t('auth.unknownError');
}

export default function AuthScreen() {
  const router = useRouter();
  const { refresh } = useSessionBootstrap();
  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const emailError = email.length > 0 && !/^\S+@\S+\.\S+$/.test(email) ? t('auth.emailRequired') : undefined;
  const passwordError = password.length > 0 && password.length < 8 ? t('auth.passwordRequired') : undefined;
  const canSubmit = /^\S+@\S+\.\S+$/.test(email) && password.length >= 8 && !pending;

  const submit = async () => {
    if (!canSubmit) return;
    setPending(true);
    setMessage(null);

    try {
      const result = mode === 'sign-in'
        ? await signInWithEmail(email.trim(), password)
        : await signUpWithEmail(email.trim(), password);

      if (mode === 'sign-up' && !result.session) {
        setMessage(t('auth.checkEmail'));
        return;
      }

      const snapshot = await refresh();
      if (snapshot.phase === 'ready') {
        router.replace('/(tabs)');
      } else if (snapshot.phase === 'onboarding-incomplete') {
        router.replace('/(onboarding)');
      }
    } catch (error) {
      setMessage(authErrorMessage(error));
    } finally {
      setPending(false);
    }
  };

  return (
    <Screen
      title={mode === 'sign-in' ? t('auth.title') : t('auth.signUp')}
      description={t('auth.description')}
      footer={<AppButton label={t('common.back')} variant="secondary" onPress={() => router.back()} />}
    >
      <FormField
        label={t('auth.email')}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        textContentType="emailAddress"
        error={emailError}
      />
      <FormField
        label={t('auth.password')}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        textContentType={mode === 'sign-in' ? 'password' : 'newPassword'}
        error={passwordError}
      />

      {message ? <Text accessibilityRole="alert" style={styles.message}>{message}</Text> : null}

      <AppButton
        label={pending ? t('common.loading') : mode === 'sign-in' ? t('auth.signIn') : t('auth.signUp')}
        disabled={!canSubmit}
        onPress={() => void submit()}
      />
      <AppButton
        label={mode === 'sign-in' ? t('auth.modeSignUp') : t('auth.modeSignIn')}
        variant="secondary"
        disabled={pending}
        onPress={() => {
          setMode((current) => current === 'sign-in' ? 'sign-up' : 'sign-in');
          setMessage(null);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  message: {
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.brandSoft,
    color: colors.ink,
    fontSize: typeScale.caption,
    lineHeight: 19,
  },
});
