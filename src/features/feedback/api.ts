import { getSupabaseClient } from '@/lib/supabase/client';

export type FeedbackScore = {
  dimension: string;
  score: number;
};

export type LearnerCritique = {
  strength: string;
  priority_issue: string;
  why_it_matters: string;
  next_action: string;
  micro_exercise: string | null;
  confidence: 'low' | 'medium' | 'high';
  limitations: string | null;
  target_improved: boolean | null;
  scores: FeedbackScore[];
};

export type AnalyzeArtworkResult =
  | { status: 'critique'; critique: LearnerCritique }
  | { status: 'needs_better_image'; image_issue: string }
  | { status: 'processing' };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function parseCritique(value: unknown): LearnerCritique {
  if (!isRecord(value)) throw new Error('invalid_critique_response');
  const scores = Array.isArray(value.scores)
    ? value.scores.filter(isRecord).map((item) => ({
        dimension: String(item.dimension),
        score: Number(item.score),
      }))
    : [];

  return {
    strength: String(value.strength ?? ''),
    priority_issue: String(value.priority_issue ?? ''),
    why_it_matters: String(value.why_it_matters ?? ''),
    next_action: String(value.next_action ?? ''),
    micro_exercise: value.micro_exercise == null ? null : String(value.micro_exercise),
    confidence: ['low', 'medium', 'high'].includes(String(value.confidence))
      ? String(value.confidence) as LearnerCritique['confidence']
      : 'low',
    limitations: value.limitations == null ? null : String(value.limitations),
    target_improved: typeof value.target_improved === 'boolean' ? value.target_improved : null,
    scores,
  };
}

export async function analyzeArtwork(submissionId: string): Promise<AnalyzeArtworkResult> {
  const { data, error } = await getSupabaseClient().functions.invoke('analyze-artwork', {
    body: { submission_id: submissionId },
  });

  if (error || !isRecord(data)) throw new Error('artwork_analysis_failed');

  if (data.status === 'processing') return { status: 'processing' };
  if (data.status === 'needs_better_image') {
    return {
      status: 'needs_better_image',
      image_issue: typeof data.image_issue === 'string'
        ? data.image_issue
        : 'Fotoğraf bu kontrol noktasını güvenilir biçimde değerlendirmek için yeterli değil.',
    };
  }
  if (data.status === 'critique') return { status: 'critique', critique: parseCritique(data.critique) };

  throw new Error('unknown_analysis_response');
}
