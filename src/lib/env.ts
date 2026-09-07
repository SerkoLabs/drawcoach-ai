export type PublicEnv = {
  supabaseUrl: string;
  supabasePublishableKey: string;
  appEnv: 'development' | 'preview' | 'production';
};

function required(name: string, value: string | undefined): string {
  if (!value?.trim()) {
    throw new Error(`Missing required public environment variable: ${name}`);
  }
  return value.trim();
}

function parseAppEnv(value: string | undefined): PublicEnv['appEnv'] {
  const normalized = value?.trim() || 'development';
  if (normalized === 'development' || normalized === 'preview' || normalized === 'production') {
    return normalized;
  }
  throw new Error('EXPO_PUBLIC_APP_ENV must be development, preview, or production');
}

export function getPublicEnv(): PublicEnv {
  return {
    supabaseUrl: required('EXPO_PUBLIC_SUPABASE_URL', process.env.EXPO_PUBLIC_SUPABASE_URL),
    supabasePublishableKey: required(
      'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
      process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    ),
    appEnv: parseAppEnv(process.env.EXPO_PUBLIC_APP_ENV),
  };
}
