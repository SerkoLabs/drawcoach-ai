import 'react-native-url-polyfill/auto';

import { AppState } from 'react-native';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { getPublicEnv } from '@/lib/env';
import { logger } from '@/lib/logger';
import { supabaseSessionStorage } from './secure-storage';

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (client) return client;

  const env = getPublicEnv();
  client = createClient(env.supabaseUrl, env.supabasePublishableKey, {
    auth: {
      storage: supabaseSessionStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });

  return client;
}

export function bindSupabaseAuthAutoRefresh(): () => void {
  const supabase = getSupabaseClient();

  const updateRefreshState = (state: string) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  };

  updateRefreshState(AppState.currentState);
  const subscription = AppState.addEventListener('change', updateRefreshState);

  return () => {
    subscription.remove();
    supabase.auth.stopAutoRefresh();
  };
}

export function tryBindSupabaseAuthAutoRefresh(): () => void {
  try {
    return bindSupabaseAuthAutoRefresh();
  } catch (error) {
    logger.warn('Supabase auth lifecycle is not active in this environment', {
      errorName: error instanceof Error ? error.name : 'unknown',
    });
    return () => undefined;
  }
}
