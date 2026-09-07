export const SKILL_DIMENSIONS = [
  'composition',
  'perspective_proportion',
  'value_light',
  'color',
  'medium_control',
] as const;

export type SkillDimension = (typeof SKILL_DIMENSIONS)[number];
export type FeedbackConfidence = 'low' | 'medium' | 'high';

export type CritiqueScore = {
  dimension: SkillDimension;
  score: 1 | 2 | 3 | 4 | 5;
};

export type StructuredCritique = {
  strength: string;
  priority_issue: string;
  why_it_matters: string;
  next_action: string;
  micro_exercise: string | null;
  confidence: FeedbackConfidence;
  limitations: string | null;
  target_improved: boolean | null;
  scores: CritiqueScore[];
};

export type FeedbackResult =
  | { status: 'critique'; image_issue: null; critique: StructuredCritique }
  | { status: 'needs_better_image'; image_issue: string; critique: null };

export const feedbackJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['status', 'image_issue', 'critique'],
  properties: {
    status: { type: 'string', enum: ['critique', 'needs_better_image'] },
    image_issue: { anyOf: [{ type: 'string', minLength: 1, maxLength: 240 }, { type: 'null' }] },
    critique: {
      anyOf: [
        {
          type: 'object',
          additionalProperties: false,
          required: [
            'strength',
            'priority_issue',
            'why_it_matters',
            'next_action',
            'micro_exercise',
            'confidence',
            'limitations',
            'target_improved',
            'scores',
          ],
          properties: {
            strength: { type: 'string', minLength: 1, maxLength: 280 },
            priority_issue: { type: 'string', minLength: 1, maxLength: 280 },
            why_it_matters: { type: 'string', minLength: 1, maxLength: 420 },
            next_action: { type: 'string', minLength: 1, maxLength: 420 },
            micro_exercise: { anyOf: [{ type: 'string', minLength: 1, maxLength: 420 }, { type: 'null' }] },
            confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
            limitations: { anyOf: [{ type: 'string', minLength: 1, maxLength: 320 }, { type: 'null' }] },
            target_improved: { anyOf: [{ type: 'boolean' }, { type: 'null' }] },
            scores: {
              type: 'array',
              minItems: 1,
              maxItems: 5,
              items: {
                type: 'object',
                additionalProperties: false,
                required: ['dimension', 'score'],
                properties: {
                  dimension: { type: 'string', enum: [...SKILL_DIMENSIONS] },
                  score: { type: 'integer', minimum: 1, maximum: 5 },
                },
              },
            },
          },
        },
        { type: 'null' },
      ],
    },
  },
} as const;

export const feedbackResponseFormat = {
  type: 'json_schema',
  name: 'drawcoach_checkpoint_feedback',
  description: 'One checkpoint-specific visual coaching result for a DrawCoach learner.',
  strict: true,
  schema: feedbackJsonSchema,
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function validateFeedbackResult(
  value: unknown,
  allowedDimensions: readonly SkillDimension[],
): FeedbackResult {
  if (!isRecord(value)) throw new Error('feedback_not_object');

  if (value.status === 'needs_better_image') {
    if (typeof value.image_issue !== 'string' || value.image_issue.length === 0 || value.critique !== null) {
      throw new Error('invalid_image_quality_result');
    }
    return value as FeedbackResult;
  }

  if (value.status !== 'critique' || value.image_issue !== null || !isRecord(value.critique)) {
    throw new Error('invalid_critique_envelope');
  }

  const critique = value.critique;
  const requiredText = ['strength', 'priority_issue', 'why_it_matters', 'next_action'] as const;
  for (const key of requiredText) {
    if (typeof critique[key] !== 'string' || critique[key].trim().length === 0) {
      throw new Error(`invalid_${key}`);
    }
  }

  if (!['low', 'medium', 'high'].includes(String(critique.confidence))) {
    throw new Error('invalid_confidence');
  }

  if (!Array.isArray(critique.scores) || critique.scores.length === 0) {
    throw new Error('invalid_scores');
  }

  const seen = new Set<string>();
  for (const rawScore of critique.scores) {
    if (!isRecord(rawScore)) throw new Error('invalid_score_item');
    const dimension = rawScore.dimension;
    const score = rawScore.score;
    if (typeof dimension !== 'string' || !allowedDimensions.includes(dimension as SkillDimension)) {
      throw new Error('score_dimension_not_allowed');
    }
    if (seen.has(dimension)) throw new Error('duplicate_score_dimension');
    seen.add(dimension);
    if (!Number.isInteger(score) || Number(score) < 1 || Number(score) > 5) {
      throw new Error('score_out_of_range');
    }
  }

  if (seen.size !== allowedDimensions.length || allowedDimensions.some((dimension) => !seen.has(dimension))) {
    throw new Error('missing_rubric_dimension');
  }

  return value as FeedbackResult;
}
