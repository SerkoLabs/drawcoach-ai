/**
 * Pure derivations over learning content + persisted progress: skill profile,
 * lesson/path completion, the next checkpoint to do, and the next-focus
 * recommendation. Kept free of React and storage so it is trivial to reason
 * about and test.
 */

import {
  PROGRESS_KEY,
  SKILL_DIMENSIONS,
  type Attempt,
  type Checkpoint,
  type CheckpointProgress,
  type LearningPath,
  type Lesson,
  type SkillDimension,
} from '@/domain/types';

export type ProgressMap = Record<string, CheckpointProgress>;

/** Dimensions actually trained by this path, in canonical order. */
export function relevantDimensions(path: LearningPath): SkillDimension[] {
  const present = new Set<SkillDimension>();
  for (const lesson of path.lessons) {
    for (const cp of lesson.checkpoints) {
      for (const d of cp.rubric.dimensions) present.add(d);
    }
  }
  return SKILL_DIMENSIONS.filter((d) => present.has(d));
}

export function checkpointProgress(
  progress: ProgressMap,
  lessonId: string,
  checkpointId: string,
): CheckpointProgress | undefined {
  return progress[PROGRESS_KEY(lessonId, checkpointId)];
}

export function latestAttempt(cp: CheckpointProgress | undefined): Attempt | undefined {
  if (!cp || cp.attempts.length === 0) return undefined;
  return cp.attempts[cp.attempts.length - 1];
}

export interface LessonStatus {
  total: number;
  done: number;
  completed: boolean;
  started: boolean;
}

export function lessonStatus(lesson: Lesson, progress: ProgressMap): LessonStatus {
  const total = lesson.checkpoints.length;
  let done = 0;
  let started = false;
  for (const cp of lesson.checkpoints) {
    const p = checkpointProgress(progress, lesson.id, cp.id);
    if (p && p.attempts.length > 0) started = true;
    if (p?.completed) done += 1;
  }
  return { total, done, completed: total > 0 && done === total, started };
}

export interface PathStatus {
  totalCheckpoints: number;
  doneCheckpoints: number;
  totalLessons: number;
  doneLessons: number;
  percent: number; // 0-100
}

export function pathStatus(path: LearningPath, progress: ProgressMap): PathStatus {
  let totalCheckpoints = 0;
  let doneCheckpoints = 0;
  let doneLessons = 0;
  for (const lesson of path.lessons) {
    const s = lessonStatus(lesson, progress);
    totalCheckpoints += s.total;
    doneCheckpoints += s.done;
    if (s.completed) doneLessons += 1;
  }
  const percent = totalCheckpoints === 0 ? 0 : Math.round((doneCheckpoints / totalCheckpoints) * 100);
  return {
    totalCheckpoints,
    doneCheckpoints,
    totalLessons: path.lessons.length,
    doneLessons,
    percent,
  };
}

export interface NextUp {
  lesson: Lesson;
  checkpoint: Checkpoint;
  index: number; // checkpoint index within the lesson
}

/** First not-yet-completed checkpoint in lesson/checkpoint order, or null when done. */
export function nextCheckpoint(path: LearningPath, progress: ProgressMap): NextUp | null {
  for (const lesson of path.lessons) {
    for (let i = 0; i < lesson.checkpoints.length; i += 1) {
      const cp = lesson.checkpoints[i];
      const p = checkpointProgress(progress, lesson.id, cp.id);
      if (!p?.completed) return { lesson, checkpoint: cp, index: i };
    }
  }
  return null;
}

interface GradedSample {
  dimension: SkillDimension;
  score: number; // 1-5
  at: number;
}

function collectSamples(path: LearningPath, progress: ProgressMap): GradedSample[] {
  const samples: GradedSample[] = [];
  for (const lesson of path.lessons) {
    for (const cp of lesson.checkpoints) {
      const p = checkpointProgress(progress, lesson.id, cp.id);
      if (!p) continue;
      for (const attempt of p.attempts) {
        if (!attempt.feedback) continue;
        for (const rs of attempt.feedback.rubricScores) {
          samples.push({ dimension: rs.dimension, score: rs.score, at: attempt.createdAt });
        }
      }
    }
  }
  return samples;
}

export interface SkillStat {
  dimension: SkillDimension;
  /** 0-100, or null when there is no data yet. */
  score: number | null;
  samples: number;
}

/** Average rubric score per relevant dimension, scaled to 0-100. */
export function skillProfile(path: LearningPath, progress: ProgressMap): SkillStat[] {
  const samples = collectSamples(path, progress);
  return relevantDimensions(path).map((dimension) => {
    const forDim = samples.filter((s) => s.dimension === dimension);
    if (forDim.length === 0) return { dimension, score: null, samples: 0 };
    const mean = forDim.reduce((acc, s) => acc + s.score, 0) / forDim.length;
    return { dimension, score: Math.round((mean / 5) * 100), samples: forDim.length };
  });
}

export interface FocusRecommendation {
  dimension: SkillDimension;
  score: number; // 0-100
  samples: number;
}

/**
 * The weakest relevant dimension based on recent feedback. Uses the most
 * recent samples so the recommendation reflects current work, not old attempts.
 */
export function nextFocus(
  path: LearningPath,
  progress: ProgressMap,
  recentWindow = 8,
): FocusRecommendation | null {
  const samples = collectSamples(path, progress).sort((a, b) => b.at - a.at);
  if (samples.length === 0) return null;

  const byDim = new Map<SkillDimension, { total: number; count: number }>();
  const seen = new Map<SkillDimension, number>();
  for (const s of samples) {
    const used = seen.get(s.dimension) ?? 0;
    if (used >= recentWindow) continue;
    seen.set(s.dimension, used + 1);
    const agg = byDim.get(s.dimension) ?? { total: 0, count: 0 };
    agg.total += s.score;
    agg.count += 1;
    byDim.set(s.dimension, agg);
  }

  let worst: FocusRecommendation | null = null;
  for (const [dimension, agg] of byDim) {
    const score = Math.round((agg.total / agg.count / 5) * 100);
    if (!worst || score < worst.score) worst = { dimension, score, samples: agg.count };
  }
  return worst;
}
