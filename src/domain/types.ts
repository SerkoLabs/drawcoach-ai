/**
 * Core domain model for DrawCoach AI.
 *
 * These types are shared across the store, the seed content, the critique
 * service, and every screen. Enums are modeled as string-literal unions with
 * co-located option metadata so onboarding screens and labels stay in sync.
 */

// ---------------------------------------------------------------------------
// Skill dimensions
// ---------------------------------------------------------------------------

export const SKILL_DIMENSIONS = [
  'composition',
  'perspective',
  'value',
  'color',
  'medium',
] as const;

export type SkillDimension = (typeof SKILL_DIMENSIONS)[number];

export const SKILL_LABELS: Record<SkillDimension, string> = {
  composition: 'Composition',
  perspective: 'Perspective & Proportion',
  value: 'Value & Light',
  color: 'Color',
  medium: 'Medium Control',
};

export const SKILL_BLURBS: Record<SkillDimension, string> = {
  composition: 'How elements are arranged, framed and balanced on the page.',
  perspective: 'Believable proportion, alignment and depth.',
  value: 'The range and structure of lights and darks that build form.',
  color: 'Temperature, harmony and mixing choices.',
  medium: 'Control of the specific tool — pencil pressure or water and pigment.',
};

/** Medium changes what "Medium Control" concretely means. */
export function mediumSkillLabel(medium: Medium): string {
  return medium === 'pencil' ? 'Pencil Control' : 'Watercolor Control';
}

// ---------------------------------------------------------------------------
// Onboarding enums + option metadata
// ---------------------------------------------------------------------------

export interface Option<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

export type AgeBand = '13-15' | '16-17' | '18-24' | '25-34' | '35-49' | '50+';
export const AGE_BANDS: Option<AgeBand>[] = [
  { value: '13-15', label: '13–15' },
  { value: '16-17', label: '16–17' },
  { value: '18-24', label: '18–24' },
  { value: '25-34', label: '25–34' },
  { value: '35-49', label: '35–49' },
  { value: '50+', label: '50 and over' },
];

export type ExperienceLevel = 'beginner' | 'improver' | 'intermediate';
export const EXPERIENCE_LEVELS: Option<ExperienceLevel>[] = [
  { value: 'beginner', label: 'Beginner', hint: 'New to drawing or picking it back up.' },
  { value: 'improver', label: 'Advanced beginner', hint: 'Comfortable with basics, want structure.' },
  {
    value: 'intermediate',
    label: 'Intermediate',
    hint: 'Draw regularly and want to fix specific weaknesses.',
  },
];

export type Goal = 'hobby' | 'skills' | 'portfolio' | 'career';
export const GOALS: Option<Goal>[] = [
  { value: 'hobby', label: 'Enjoy it as a hobby', hint: 'Relaxed, consistent practice.' },
  { value: 'skills', label: 'Build core skills', hint: 'Steady, well-rounded improvement.' },
  { value: 'portfolio', label: 'Grow a portfolio', hint: 'Finished pieces I am proud of.' },
  { value: 'career', label: 'Work toward art professionally', hint: 'Serious, focused growth.' },
];

export type Category = 'landscape' | 'portrait';
export const CATEGORIES: Option<Category>[] = [
  { value: 'landscape', label: 'Landscape', hint: 'Scenes, nature, depth and atmosphere.' },
  { value: 'portrait', label: 'Portrait', hint: 'Faces, proportion and likeness.' },
];

export type Medium = 'pencil' | 'watercolor';
export const MEDIUMS: Option<Medium>[] = [
  { value: 'pencil', label: 'Pencil', hint: 'Graphite — value, edges and texture.' },
  { value: 'watercolor', label: 'Watercolor', hint: 'Washes, water control and color.' },
];

export type WeeklyPractice = 'light' | 'steady' | 'intense';
export const WEEKLY_PRACTICE: Option<WeeklyPractice>[] = [
  { value: 'light', label: '1–2 sessions / week', hint: 'A gentle, sustainable rhythm.' },
  { value: 'steady', label: '3–4 sessions / week', hint: 'Steady, noticeable progress.' },
  { value: 'intense', label: '5+ sessions / week', hint: 'Fast, focused improvement.' },
];

// ---------------------------------------------------------------------------
// Learning content
// ---------------------------------------------------------------------------

export interface Rubric {
  /** Skill dimensions this checkpoint is assessed on. */
  dimensions: SkillDimension[];
  /** Guidance for the critique model on what "good" looks like here. */
  criteria: string[];
}

export interface Checkpoint {
  id: string;
  title: string;
  /** What the learner should do. */
  instruction: string;
  /** What the learner should submit for feedback. */
  assignment: string;
  /** Bullet list the learner sees describing success. */
  successCriteria: string[];
  rubric: Rubric;
  microExerciseHint?: string;
}

export interface Lesson {
  id: string;
  number: number;
  title: string;
  objective: string;
  overview: string;
  estMinutes: number;
  primarySkills: SkillDimension[];
  checkpoints: Checkpoint[];
}

export interface LearningPath {
  id: string; // `${category}-${medium}`
  category: Category;
  medium: Medium;
  title: string;
  subtitle: string;
  lessons: Lesson[];
}

// ---------------------------------------------------------------------------
// Feedback (produced by the critique service)
// ---------------------------------------------------------------------------

export interface RubricScore {
  dimension: SkillDimension;
  /** 1 (needs work) … 5 (strong). */
  score: number;
  note: string;
}

export interface Feedback {
  strength: string;
  priorityIssue: string;
  why: string;
  correction: string;
  microExercise?: string;
  encouragement?: string;
  rubricScores: RubricScore[];
  /** Whether the checkpoint's success criteria are met well enough to move on. */
  checkpointMet: boolean;
}

// ---------------------------------------------------------------------------
// Progress + profile (persisted)
// ---------------------------------------------------------------------------

export interface Attempt {
  id: string;
  imageUri: string;
  createdAt: number;
  isCorrection: boolean;
  feedback?: Feedback;
  error?: string;
}

export interface CheckpointProgress {
  lessonId: string;
  checkpointId: string;
  attempts: Attempt[];
  completed: boolean;
  completedAt?: number;
}

export interface UserProfile {
  name: string;
  ageBand: AgeBand;
  level: ExperienceLevel;
  goal: Goal;
  category: Category;
  medium: Medium;
  weeklyPractice: WeeklyPractice;
  createdAt: number;
}

/** Draft answers collected during onboarding before a profile exists. */
export type OnboardingDraft = Partial<Omit<UserProfile, 'createdAt'>>;

export const PROGRESS_KEY = (lessonId: string, checkpointId: string) =>
  `${lessonId}:${checkpointId}`;
