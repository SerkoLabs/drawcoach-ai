import { MessageState } from '@/components/ui/message-state';
import { Screen } from '@/components/ui/screen';

export default function SettingsScreen() {
  return (
    <Screen title="Ayarlar" description="Hedef, çalışma temposu, gizlilik ve hesap yaşam döngüsü ayarları burada yönetilecek.">
      <MessageState title="Hesap henüz bağlı değil" body="Gerçek kimlik doğrulama tamamlanana kadar hesap silme gibi yıkıcı işlemler etkinleştirilmiyor." />
    </Screen>
  );
}
