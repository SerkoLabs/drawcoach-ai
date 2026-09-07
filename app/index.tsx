import { useRouter } from 'expo-router';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { t } from '@/i18n';

const FEATURES = [
  ['01', t('welcome.feature.1.title'), t('welcome.feature.1.body')],
  ['02', t('welcome.feature.2.title'), t('welcome.feature.2.body')],
  ['03', t('welcome.feature.3.title'), t('welcome.feature.3.body')],
] as const;

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.artCard} accessibilityLabel={t('welcome.artAccessibility')}>
          <Text style={styles.artEyebrow}>DRAWCOACH AI</Text>
          <View style={styles.sun} />
          <View style={styles.mountainBack} />
          <View style={styles.mountainFront} />
          <View style={styles.horizon} />
          <Text style={styles.artCaption}>{t('welcome.artCaption')}</Text>
        </View>

        <View style={styles.headingBlock}>
          <Text style={styles.brand}>DrawCoach</Text>
          <Text style={styles.tagline}>{t('welcome.tagline')}</Text>
        </View>

        <View style={styles.featureList}>
          {FEATURES.map(([number, title, body]) => (
            <View key={number} style={styles.featureRow}>
              <View style={styles.numberBadge}>
                <Text style={styles.numberText}>{number}</Text>
              </View>
              <View style={styles.featureCopy}>
                <Text style={styles.featureTitle}>{title}</Text>
                <Text style={styles.featureBody}>{body}</Text>
              </View>
            </View>
          ))}
        </View>

        <AppButton
          label={t('welcome.start')}
          accessibilityHint={t('welcome.startHint')}
          onPress={() => router.push('/(onboarding)')}
        />
        <AppButton label={t('welcome.preview')} variant="secondary" onPress={() => router.push('/(tabs)')} />
        <Text style={styles.devNote}>{t('welcome.devNote')}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F7F3EC' },
  content: { padding: 24, paddingBottom: 40, gap: 24 },
  artCard: { height: 250, overflow: 'hidden', borderRadius: 28, backgroundColor: '#DCE8E2', padding: 22, borderWidth: 1, borderColor: '#CAD8D1' },
  artEyebrow: { fontSize: 11, letterSpacing: 2.2, fontWeight: '700', color: '#234941' },
  sun: { position: 'absolute', width: 54, height: 54, borderRadius: 27, backgroundColor: '#E9C98D', top: 52, right: 38 },
  mountainBack: { position: 'absolute', width: 210, height: 210, backgroundColor: '#A8BCB4', transform: [{ rotate: '45deg' }], bottom: -93, left: -14, borderRadius: 12 },
  mountainFront: { position: 'absolute', width: 190, height: 190, backgroundColor: '#53766C', transform: [{ rotate: '45deg' }], bottom: -84, right: -18, borderRadius: 12 },
  horizon: { position: 'absolute', height: 58, left: 0, right: 0, bottom: 0, backgroundColor: '#294F48', opacity: 0.92 },
  artCaption: { position: 'absolute', left: 22, bottom: 20, color: '#FFFFFF', fontSize: 12, letterSpacing: 1.4, fontWeight: '700' },
  headingBlock: { gap: 8 },
  brand: { fontSize: 42, lineHeight: 46, fontWeight: '700', color: '#173C36', letterSpacing: -1.4 },
  tagline: { fontSize: 18, lineHeight: 26, color: '#596A65', maxWidth: 330 },
  featureList: { gap: 16 },
  featureRow: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  numberBadge: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E5ECE8' },
  numberText: { color: '#214D45', fontWeight: '800', fontSize: 12 },
  featureCopy: { flex: 1, gap: 3 },
  featureTitle: { color: '#1F3934', fontSize: 16, fontWeight: '700' },
  featureBody: { color: '#6A7874', fontSize: 14, lineHeight: 20 },
  devNote: { textAlign: 'center', color: '#8B9692', fontSize: 12 },
});
