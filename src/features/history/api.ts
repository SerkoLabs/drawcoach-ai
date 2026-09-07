import { getSupabaseClient } from '@/lib/supabase/client';

export type AttemptHistoryItem = {
  id: string;
  lessonId: string;
  lessonTitle: string;
  status: 'in_progress' | 'completed';
  startedAt: string;
  completedAt: string | null;
};

export type AttemptSubmission = {
  id: string;
  checkpointAttemptId: string;
  version: number;
  storagePath: string;
  signedUrl: string | null;
  critique: {
    strength: string;
    priorityIssue: string;
    nextAction: string;
    targetImproved: boolean | null;
  } | null;
};

export type AttemptCheckpointHistory = {
  id: string;
  position: number;
  title: string;
  status: string;
  submissions: AttemptSubmission[];
};

export type AttemptHistoryDetail = AttemptHistoryItem & {
  checkpoints: AttemptCheckpointHistory[];
};

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('unexpected_server_shape');
  return value as Record<string, unknown>;
}

export async function getMyAttemptHistory(): Promise<AttemptHistoryItem[]> {
  const supabase = getSupabaseClient();
  const attempts = await supabase
    .from('lesson_attempts')
    .select('id,lesson_id,status,started_at,completed_at')
    .order('started_at', { ascending: false })
    .limit(30);

  if (attempts.error) throw new Error('attempt_history_failed');
  const rows = attempts.data ?? [];
  if (rows.length === 0) return [];

  const lessonIds = Array.from(new Set(rows.map((row) => String(record(row).lesson_id))));
  const lessons = await supabase.from('lessons').select('id,title').in('id', lessonIds);
  if (lessons.error) throw new Error('attempt_lesson_lookup_failed');
  const titles = new Map((lessons.data ?? []).map((row) => {
    const item = record(row);
    return [String(item.id), String(item.title)] as const;
  }));

  return rows.map((row) => {
    const item = record(row);
    const lessonId = String(item.lesson_id);
    return {
      id: String(item.id),
      lessonId,
      lessonTitle: titles.get(lessonId) ?? 'Ders',
      status: String(item.status) as AttemptHistoryItem['status'],
      startedAt: String(item.started_at),
      completedAt: item.completed_at == null ? null : String(item.completed_at),
    };
  });
}

export async function getAttemptHistoryDetail(attemptId: string): Promise<AttemptHistoryDetail> {
  const supabase = getSupabaseClient();
  const attemptResult = await supabase
    .from('lesson_attempts')
    .select('id,lesson_id,status,started_at,completed_at')
    .eq('id', attemptId)
    .single();
  if (attemptResult.error || !attemptResult.data) throw new Error('attempt_not_found');
  const attempt = record(attemptResult.data);

  const lessonResult = await supabase.from('lessons').select('id,title').eq('id', String(attempt.lesson_id)).single();
  if (lessonResult.error || !lessonResult.data) throw new Error('attempt_lesson_not_found');
  const lesson = record(lessonResult.data);

  const checkpointAttemptsResult = await supabase
    .from('checkpoint_attempts')
    .select('id,checkpoint_id,status')
    .eq('lesson_attempt_id', attemptId);
  if (checkpointAttemptsResult.error) throw new Error('attempt_checkpoints_failed');
  const checkpointAttempts = checkpointAttemptsResult.data ?? [];

  const checkpointIds = checkpointAttempts.map((row) => String(record(row).checkpoint_id));
  const checkpointCatalog = checkpointIds.length
    ? await supabase.from('lesson_checkpoints').select('id,position,title').in('id', checkpointIds)
    : { data: [], error: null };
  if (checkpointCatalog.error) throw new Error('checkpoint_catalog_failed');
  const checkpointById = new Map((checkpointCatalog.data ?? []).map((row) => {
    const item = record(row);
    return [String(item.id), { position: Number(item.position), title: String(item.title) }] as const;
  }));

  const checkpointAttemptIds = checkpointAttempts.map((row) => String(record(row).id));
  const submissionsResult = checkpointAttemptIds.length
    ? await supabase
        .from('artwork_submissions')
        .select('id,checkpoint_attempt_id,version,storage_path')
        .in('checkpoint_attempt_id', checkpointAttemptIds)
        .order('version', { ascending: true })
    : { data: [], error: null };
  if (submissionsResult.error) throw new Error('attempt_submissions_failed');
  const submissionRows = submissionsResult.data ?? [];

  const submissionIds = submissionRows.map((row) => String(record(row).id));
  const critiquesResult = submissionIds.length
    ? await supabase
        .from('critiques')
        .select('submission_id,strength,priority_issue,next_action,target_improved')
        .in('submission_id', submissionIds)
    : { data: [], error: null };
  if (critiquesResult.error) throw new Error('attempt_critiques_failed');
  const critiqueBySubmission = new Map((critiquesResult.data ?? []).map((row) => {
    const item = record(row);
    return [String(item.submission_id), item] as const;
  }));

  const signedBySubmission = new Map<string, string | null>();
  await Promise.all(submissionRows.map(async (row) => {
    const item = record(row);
    const submissionId = String(item.id);
    const signed = await supabase.storage.from('artwork').createSignedUrl(String(item.storage_path), 120);
    signedBySubmission.set(submissionId, signed.error ? null : signed.data.signedUrl);
  }));

  const submissionsByCheckpoint = new Map<string, AttemptSubmission[]>();
  for (const row of submissionRows) {
    const item = record(row);
    const submissionId = String(item.id);
    const checkpointAttemptId = String(item.checkpoint_attempt_id);
    const critique = critiqueBySubmission.get(submissionId);
    const normalized: AttemptSubmission = {
      id: submissionId,
      checkpointAttemptId,
      version: Number(item.version),
      storagePath: String(item.storage_path),
      signedUrl: signedBySubmission.get(submissionId) ?? null,
      critique: critique
        ? {
            strength: String(critique.strength),
            priorityIssue: String(critique.priority_issue),
            nextAction: String(critique.next_action),
            targetImproved: typeof critique.target_improved === 'boolean' ? critique.target_improved : null,
          }
        : null,
    };
    const existing = submissionsByCheckpoint.get(checkpointAttemptId) ?? [];
    existing.push(normalized);
    submissionsByCheckpoint.set(checkpointAttemptId, existing);
  }

  const checkpoints = checkpointAttempts
    .map((row) => {
      const item = record(row);
      const catalog = checkpointById.get(String(item.checkpoint_id));
      return {
        id: String(item.id),
        position: catalog?.position ?? 0,
        title: catalog?.title ?? 'Kontrol noktası',
        status: String(item.status),
        submissions: submissionsByCheckpoint.get(String(item.id)) ?? [],
      } satisfies AttemptCheckpointHistory;
    })
    .sort((a, b) => a.position - b.position);

  return {
    id: String(attempt.id),
    lessonId: String(attempt.lesson_id),
    lessonTitle: String(lesson.title),
    status: String(attempt.status) as AttemptHistoryItem['status'],
    startedAt: String(attempt.started_at),
    completedAt: attempt.completed_at == null ? null : String(attempt.completed_at),
    checkpoints,
  };
}
