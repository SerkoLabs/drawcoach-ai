import { useRouter } from 'expo-router';

import { AppButton } from '@/components/ui/app-button';
import { MessageState } from '@/components/ui/message-state';
import { Screen } from '@/components/ui/screen';
import { t } from '@/i18n';

export default function AuthScreen() {
  const router = useRouter();

  return (
    <Screen
      title={t('auth.title')}
      description={t('auth.description')}
      footer={<AppButton label={t('common.back')} variant="secondary" onPress={() => router.back()} />}
    >
      <MessageState title={t('auth.placeholderTitle')} body={t('auth.placeholderBody')} />
    </Screen>
  );
}
