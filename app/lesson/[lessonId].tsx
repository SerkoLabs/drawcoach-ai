import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { Card } from '@/components/ui/card';
import { MessageState } from '@/components/ui/message-state';
import { Screen } from '@/components/ui/screen';
import { colors, typeScale } from '@/theme/tokens';

const ROUTE_ID = /^[a-z0-9][a-z0-9-]{0,63}$/;

export default function LessonRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ lessonId?: string | string[] }>();
  const lessonId = typeof params.lessonId === 'string' ? params.lessonId : '';
  const valid = ROUTE_ID.test(lessonId);

  if (!valid) {
    return (
      <Screen title="Ders açılamadı" footer={<AppButton label="Geri dön" onPress={() => router.back()} />}>
        <MessageState tone="danger" title="Geçersiz ders kimliği" body="Ders bağlantısı beklenen biçimde değil. Güvenli şekilde önceki ekrana dönebilirsin." />
      </Screen>
    );
  }

  return (
    <Screen
      title="Ders 1 — Kompozisyon"
      description="İlk gerçek vertical slice bu ekranı checkpoint gönderimi ve AI geri bildirimiyle tamamlayacak."
      footer={<AppButton label="Checkpoint henüz hazır değil" disabled onPress={() => undefined} />}
    >
      <Card>
        <Text style={styles.kicker}>AMAÇ</Text>
        <Text style={styles.body}>Basit bir manzarada ufuk çizgisini ve ana odak noktasını bilinçli yerleştir.</Text>
      </Card>
      <Card>
        <Text style={styles.kicker}>ÖDEV</Text>
        <Text style={styles.body}>Gökyüzü, dağ kütlesi ve ön plan içeren küçük bir kurşun kalem taslağı hazırla.</Text>
      </Card>
      <MessageState title={`Rota: ${lessonId}`} body="Gerçek katalog ve ilerleme verisi Supabase bağlandığında bu sabit geliştirme içeriğinin yerini alacak." />
    </Screen>
  );
}

const styles = StyleSheet.create({
  kicker: { color: colors.inkMuted, fontSize: typeScale.caption, fontWeight: '800', letterSpacing: 1.2 },
  body: { color: colors.ink, fontSize: typeScale.body, lineHeight: 22 },
});
