import { useRouter } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { Card } from '@/components/ui/card';
import { MessageState } from '@/components/ui/message-state';
import { Screen } from '@/components/ui/screen';
import { colors, typeScale } from '@/theme/tokens';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <Screen title="Bugünkü çalışman" description="Kişisel ders yolun hazır olduğunda sıradaki görev burada görünecek.">
      <Card>
        <Text style={styles.kicker}>ÖRNEK YOL</Text>
        <Text style={styles.title}>Manzara • Kurşun Kalem</Text>
        <Text style={styles.body}>Ders 1 — Kompozisyon ve ufuk çizgisi</Text>
        <AppButton label="Ders rotasını aç" onPress={() => router.push('/lesson/lesson-1')} />
      </Card>
      <MessageState title="Gerçek ilerleme henüz bağlı değil" body="Bu iskelet ürün akışını görünür kılıyor; sahte tamamlanma veya sahte AI sonucu üretmiyor." />
    </Screen>
  );
}

const styles = StyleSheet.create({
  kicker: { color: colors.inkMuted, fontSize: typeScale.caption, fontWeight: '800', letterSpacing: 1.3 },
  title: { color: colors.ink, fontSize: typeScale.title, fontWeight: '800' },
  body: { color: colors.inkMuted, fontSize: typeScale.body, lineHeight: 22 },
});
