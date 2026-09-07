import { getSupabaseClient } from '@/lib/supabase/client';
import type { CompletedOnboarding } from './model';

export async function completeOnboarding(input: CompletedOnboarding) {
  const { data, error } = await getSupabaseClient().rpc('complete_onboarding', {
    p_age_band: input.ageBand,
    p_experience_level: input.experienceLevel,
    p_goal: input.goal,
    p_category: input.category,
    p_medium: input.medium,
    p_weekly_days: input.weeklyDays,
    p_session_minutes: input.sessionMinutes,
  });

  if (error) throw new Error('complete_onboarding_failed');
  return data;
}
