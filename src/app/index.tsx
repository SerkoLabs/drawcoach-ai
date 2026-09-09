import { Redirect } from 'expo-router';

import { useApp } from '@/store/AppStore';

export default function Index() {
  const { onboarded } = useApp();
  return <Redirect href={onboarded ? '/(tabs)' : '/onboarding'} />;
}
