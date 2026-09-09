/**
 * Server-side visual critique endpoint (Expo Router API route → /api/critique).
 *
 * Holds the Anthropic API key (never shipped to the client), sends the artwork
 * image plus checkpoint rubric to Claude, and returns structured Feedback JSON.
 *
 * Model: defaults to claude-opus-5 (best judgement for nuanced visual critique);
 * override with the CRITIQUE_MODEL env var (e.g. claude-sonnet-5 for lower cost
 * at higher volume). Structured output uses a strict tool schema; adaptive
 * thinking + auto tool choice keeps this portable across current models.
 */

import Anthropic from '@anthropic-ai/sdk';

import type { CritiqueRequest } from '@/services/critique';
import { SKILL_LABELS, mediumSkillLabel, type Feedback, type SkillDimension } from '@/domain/types';

const DEFAULT_MODEL = 'claude-opus-5';
const TOOL_NAME = 'submit_critique';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function buildSystemPrompt(): string {
  return [
    'You are DrawCoach, a warm, precise drawing coach for beginner and intermediate learners (ages 13+).',
    'You are given a photo of a learner’s in-progress artwork for a specific lesson checkpoint, along with the assignment and a rubric.',
    'Assess ONLY what this checkpoint asks for — do not critique aspects the checkpoint is not about yet.',
    'Be specific and actionable, never vague or harsh. Point to concrete regions and give a correction the learner can act on immediately.',
    'Keep every field concise: 1–2 sentences each. Reference what you actually see in the image.',
    'Score each listed rubric dimension from 1 (needs work) to 5 (strong), with a short note tied to the image.',
    'Set checkpointMet to true only when the success criteria are genuinely satisfied well enough to move on.',
    'Provide a micro-exercise only when it would genuinely help; otherwise return an empty string for it.',
    `You MUST respond by calling the ${TOOL_NAME} tool exactly once and provide no other text.`,
  ].join(' ');
}

function buildUserText(req: CritiqueRequest): string {
  const dims = req.rubricDimensions
    .map((d) => (d === 'medium' ? mediumSkillLabel(req.medium) : SKILL_LABELS[d]))
    .join(', ');
  const lines = [
    `Category: ${req.category}. Medium: ${req.medium}. Learner level: ${req.level}.`,
    `Lesson: ${req.lessonTitle} — ${req.lessonObjective}`,
    `Checkpoint: ${req.checkpointTitle}`,
    `Instruction: ${req.checkpointInstruction}`,
    `Assignment (what the image shows): ${req.assignment}`,
    `Success criteria:`,
    ...req.successCriteria.map((c) => `  • ${c}`),
    `Assess these rubric dimensions (${dims}). For each, consider:`,
    ...req.rubricCriteria.map((c) => `  • ${c}`),
  ];
  if (req.isCorrection) {
    lines.push(
      'This is a RESUBMISSION after feedback. Judge whether the earlier issue improved and give the next most useful step.',
    );
    if (req.previousPriorityIssue) {
      lines.push(`The previous priority issue was: "${req.previousPriorityIssue}".`);
    }
  }
  lines.push('Now assess the attached image and call the tool.');
  return lines.join('\n');
}

function buildTool(dimensions: SkillDimension[]): Anthropic.Tool {
  return {
    name: TOOL_NAME,
    description: 'Return structured, checkpoint-specific feedback on the learner’s artwork.',
    // strict output so the arguments always validate against this schema
    strict: true,
    input_schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        strength: { type: 'string', description: 'One genuine strength visible in the work.' },
        priorityIssue: {
          type: 'string',
          description: 'The single highest-priority issue to fix for this checkpoint.',
        },
        why: { type: 'string', description: 'Why that issue matters for this checkpoint.' },
        correction: { type: 'string', description: 'A concrete, immediately actionable correction.' },
        microExercise: {
          type: 'string',
          description: 'A short optional drill; empty string if none is needed.',
        },
        encouragement: { type: 'string', description: 'A brief, honest word of encouragement.' },
        checkpointMet: {
          type: 'boolean',
          description: 'True only if the success criteria are met well enough to move on.',
        },
        rubricScores: {
          type: 'array',
          description: 'One entry per listed rubric dimension.',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              dimension: { type: 'string', enum: dimensions },
              score: { type: 'integer', minimum: 1, maximum: 5 },
              note: { type: 'string' },
            },
            required: ['dimension', 'score', 'note'],
          },
        },
      },
      required: [
        'strength',
        'priorityIssue',
        'why',
        'correction',
        'microExercise',
        'encouragement',
        'checkpointMet',
        'rubricScores',
      ],
    },
  } as Anthropic.Tool;
}

function clampScore(n: unknown): number {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v)) return 3;
  return Math.min(5, Math.max(1, v));
}

function normalizeFeedback(input: any, dimensions: SkillDimension[]): Feedback {
  const allowed = new Set(dimensions);
  const rawScores = Array.isArray(input?.rubricScores) ? input.rubricScores : [];
  const scores = rawScores
    .filter((s: any) => allowed.has(s?.dimension))
    .map((s: any) => ({
      dimension: s.dimension as SkillDimension,
      score: clampScore(s?.score),
      note: String(s?.note ?? ''),
    }));
  return {
    strength: String(input?.strength ?? ''),
    priorityIssue: String(input?.priorityIssue ?? ''),
    why: String(input?.why ?? ''),
    correction: String(input?.correction ?? ''),
    microExercise: input?.microExercise ? String(input.microExercise) : undefined,
    encouragement: input?.encouragement ? String(input.encouragement) : undefined,
    checkpointMet: Boolean(input?.checkpointMet),
    rubricScores: scores,
  };
}

function validate(req: Partial<CritiqueRequest>): string | null {
  if (!req.imageBase64 || typeof req.imageBase64 !== 'string') return 'Missing image data.';
  if (!Array.isArray(req.rubricDimensions) || req.rubricDimensions.length === 0)
    return 'Missing rubric dimensions.';
  return null;
}

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return jsonResponse(
      {
        error:
          'The feedback service is not configured. Set ANTHROPIC_API_KEY on the server (see .env.example).',
      },
      500,
    );
  }

  let req: CritiqueRequest;
  try {
    req = (await request.json()) as CritiqueRequest;
  } catch {
    return jsonResponse({ error: 'Invalid request body.' }, 400);
  }

  const invalid = validate(req);
  if (invalid) return jsonResponse({ error: invalid }, 400);

  const model = process.env.CRITIQUE_MODEL || DEFAULT_MODEL;
  const client = new Anthropic({ apiKey });
  const mediaType = (req.mediaType || 'image/jpeg') as
    | 'image/jpeg'
    | 'image/png'
    | 'image/gif'
    | 'image/webp';

  try {
    const message = await client.messages.create({
      model,
      max_tokens: 4096,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'medium' },
      system: buildSystemPrompt(),
      tools: [buildTool(req.rubricDimensions)],
      tool_choice: { type: 'auto' },
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: req.imageBase64 },
            },
            { type: 'text', text: buildUserText(req) },
          ],
        },
      ],
    });

    if (message.stop_reason === 'refusal') {
      return jsonResponse(
        { error: 'The feedback service could not process this image. Please try another photo.' },
        422,
      );
    }

    const toolUse = message.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use' && b.name === TOOL_NAME,
    );
    if (!toolUse) {
      return jsonResponse(
        { error: 'Could not generate structured feedback. Please try again.' },
        502,
      );
    }

    const feedback = normalizeFeedback(toolUse.input, req.rubricDimensions);
    return jsonResponse(feedback);
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return jsonResponse({ error: 'The feedback service key is invalid.' }, 500);
    }
    if (error instanceof Anthropic.RateLimitError) {
      return jsonResponse({ error: 'The feedback service is busy. Please try again shortly.' }, 503);
    }
    const detail = error instanceof Error ? error.message : 'Unknown error.';
    return jsonResponse({ error: `Feedback service error: ${detail}` }, 502);
  }
}
