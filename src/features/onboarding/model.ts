export type AgeBand = '13_17' | '18_24' | '25_34' | '35_44' | '45_54' | '55_plus';
export type ExperienceLevel = 'new' | 'beginner' | 'intermediate';
export type LearningGoal = 'hobby' | 'fundamentals' | 'specialize' | 'portfolio';
export type ArtCategory = 'landscape' | 'portrait';
export type ArtMedium = 'pencil' | 'watercolor';
export type WeeklyDays = 2 | 3 | 4 | 5;
export type SessionMinutes = 15 | 30 | 45 | 60;

export type OnboardingDraft = {
  ageBand?: AgeBand;
  experienceLevel?: ExperienceLevel;
  goal?: LearningGoal;
  category?: ArtCategory;
  medium?: ArtMedium;
  weeklyDays?: WeeklyDays;
  sessionMinutes?: SessionMinutes;
};

export type CompletedOnboarding = Required<OnboardingDraft>;

export function isOnboardingComplete(draft: OnboardingDraft): draft is CompletedOnboarding {
  return Boolean(
    draft.ageBand &&
      draft.experienceLevel &&
      draft.goal &&
      draft.category &&
      draft.medium &&
      draft.weeklyDays &&
      draft.sessionMinutes,
  );
}
