import { useRouter } from 'expo-router';

import { AppButton } from '@/components/ui/app-button';
import { MessageState } from '@/components/ui/message-state';
import { Screen } from '@/components/ui/screen';

export default function AuthScreen() {
  const router = useRouter();

  return (
    <Screen
      title="Hesabına giriş yap"
      description="Çizimlerin ve gelişim geçmişin yalnızca senin hesabında tutulacak."
      footer={<AppButton label="Geri dön" variant="secondary" onPress={() => router.back()} />}
    >
      <MessageState
        title="Kimlik doğrulama sıradaki aşamada bağlanacak"
        body="Bu ekran gerçek giriş akışı hazır olmadan sahte bir giriş deneyimi göstermiyor."
      />
    </Screen>
  );
}
