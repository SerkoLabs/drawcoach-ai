import type { AuthError } from '@supabase/supabase-js';

import { getSupabaseClient } from '@/lib/supabase/client';
import type { SessionBootstrapResult } from './auth-types';

export class AuthActionError extends Error {
  constructor(
    readonly code: 'invalid_credentials' | 'email_unconfirmed' | 'rate_limited' | 'unknown',
  ) {
    super(code);
    this.name = 'AuthActionError';
  }
}

function mapAuthError(error: AuthError): AuthActionError {
  const message = error.message.toLowerCase();
  if (message.includes('invalid login credentials')) return new AuthActionError('invalid_credentials');
  if (message.includes('email not confirmed')) return new AuthActionError('email_unconfirmed');
  if (error.status === 429) return new AuthActionError('rate_limited');
  return new AuthActionError('unknown');
}

export async function bootstrapSupabaseSession(): Promise<SessionBootstrapResult> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) throw mapAuthError(error);
  const userId = data.session?.user.id;
  if (!userId) return { phase: 'signed-out' };

  const profile = await supabase
    .from('profiles')
    .select('onboarding_completed_at')
    .eq('id', userId)
    .maybeSingle();

  if (profile.error) throw new AuthActionError('unknown');

  return {
    phase: profile.data?.onboarding_completed_at ? 'ready' : 'onboarding-incomplete',
    userId,
  };
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await getSupabaseClient().auth.signInWithPassword({ email, password });
  if (error) throw mapAuthError(error);
  return data;
}

export async function signUpWithEmail(email: string, password: string) {
  const { data, error } = await getSupabaseClient().auth.signUp({ email, password });
  if (error) throw mapAuthError(error);
  return data;
}

export async function signOutCurrentUser() {
  const { error } = await getSupabaseClient().auth.signOut();
  if (error) throw mapAuthError(error);
}
