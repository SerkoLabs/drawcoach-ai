import { getSupabaseClient } from '@/lib/supabase/client';

export type NextLesson = {
  enrollmentId: string;
  pathId: string;
  pathTitle: string;
  lessonId: string;
  lessonNumber: number;
  lessonTitle: string;
  lessonObjective: string;
  estimatedMinutes: number;
};

export type LessonCheckpoint = {
  id: string;
  position: number;
  title: string;
  instruction: string;
  captureGuidance: string | null;
  rubricDimensions: string[];
};

export type LessonDetail = {
  id: string;
  pathId: string;
  lessonNumber: number;
  title: string;
  objective: string;
  instructions: string;
  materials: string[];
  estimatedMinutes: number;
  checkpoints: LessonCheckpoint[];
};

export type CheckpointAttemptDetail = {
  id: string;
  lessonAttemptId: string;
  checkpointId: string;
  status: string;
  title: string;
  instruction: string;
  captureGuidance: string | null;
  position: number;
};

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('unexpected_server_shape');
  return value as Record<string, unknown>;
}

export async function getMyNextLesson(): Promise<NextLesson | null> {
  const { data, error } = await getSupabaseClient().rpc('get_my_next_lesson');
  if (error) throw new Error('next_lesson_failed');
  if (!Array.isArray(data) || data.length === 0) return null;

  const row = asRecord(data[0]);
  return {
    enrollmentId: String(row.enrollment_id),
    pathId: String(row.path_id),
    pathTitle: String(row.path_title),
    lessonId: String(row.lesson_id),
    lessonNumber: Number(row.lesson_number),
    lessonTitle: String(row.lesson_title),
    lessonObjective: String(row.lesson_objective),
    estimatedMinutes: Number(row.estimated_minutes),
  };
}

export async function getLessonDetail(lessonId: string): Promise<LessonDetail> {
  const supabase = getSupabaseClient();
  const lessonResult = await supabase
    .from('lessons')
    .select('id,path_id,lesson_number,title,objective,instructions,materials,estimated_minutes')
    .eq('id', lessonId)
    .single();

  if (lessonResult.error || !lessonResult.data) throw new Error('lesson_not_found');

  const checkpointsResult = await supabase
    .from('lesson_checkpoints')
    .select('id,position,title,instruction,capture_guidance,rubric_dimensions')
    .eq('lesson_id', lessonId)
    .eq('is_active', true)
    .order('position', { ascending: true });

  if (checkpointsResult.error) throw new Error('lesson_checkpoints_failed');

  const lesson = asRecord(lessonResult.data);
  const checkpoints = (checkpointsResult.data ?? []).map((value) => {
    const checkpoint = asRecord(value);
    return {
      id: String(checkpoint.id),
      position: Number(checkpoint.position),
      title: String(checkpoint.title),
      instruction: String(checkpoint.instruction),
      captureGuidance: checkpoint.capture_guidance == null ? null : String(checkpoint.capture_guidance),
      rubricDimensions: Array.isArray(checkpoint.rubric_dimensions)
        ? checkpoint.rubric_dimensions.map(String)
        : [],
    } satisfies LessonCheckpoint;
  });

  return {
    id: String(lesson.id),
    pathId: String(lesson.path_id),
    lessonNumber: Number(lesson.lesson_number),
    title: String(lesson.title),
    objective: String(lesson.objective),
    instructions: String(lesson.instructions),
    materials: Array.isArray(lesson.materials) ? lesson.materials.map(String) : [],
    estimatedMinutes: Number(lesson.estimated_minutes),
    checkpoints,
  };
}

export async function startOrResumeLesson(lessonId: string): Promise<string> {
  const { data, error } = await getSupabaseClient().rpc('start_or_resume_lesson', {
    p_lesson_id: lessonId,
  });
  if (error || typeof data !== 'string') throw new Error('start_lesson_failed');
  return data;
}

export async function getCurrentCheckpointAttempt(lessonAttemptId: string) {
  const { data, error } = await getSupabaseClient()
    .from('checkpoint_attempts')
    .select('id,checkpoint_id,status')
    .eq('lesson_attempt_id', lessonAttemptId)
    .eq('status', 'in_progress')
    .maybeSingle();

  if (error) throw new Error('checkpoint_state_failed');
  if (!data) return null;

  const row = asRecord(data);
  return {
    id: String(row.id),
    checkpointId: String(row.checkpoint_id),
    status: String(row.status),
  };
}

export async function getCheckpointAttemptDetail(
  lessonAttemptId: string,
  checkpointAttemptId: string,
): Promise<CheckpointAttemptDetail> {
  const supabase = getSupabaseClient();
  const attemptResult = await supabase
    .from('checkpoint_attempts')
    .select('id,lesson_attempt_id,checkpoint_id,status')
    .eq('id', checkpointAttemptId)
    .eq('lesson_attempt_id', lessonAttemptId)
    .single();

  if (attemptResult.error || !attemptResult.data) throw new Error('checkpoint_attempt_not_found');
  const attempt = asRecord(attemptResult.data);

  const checkpointResult = await supabase
    .from('lesson_checkpoints')
    .select('id,position,title,instruction,capture_guidance')
    .eq('id', String(attempt.checkpoint_id))
    .single();

  if (checkpointResult.error || !checkpointResult.data) throw new Error('checkpoint_not_found');
  const checkpoint = asRecord(checkpointResult.data);

  return {
    id: String(attempt.id),
    lessonAttemptId: String(attempt.lesson_attempt_id),
    checkpointId: String(attempt.checkpoint_id),
    status: String(attempt.status),
    title: String(checkpoint.title),
    instruction: String(checkpoint.instruction),
    captureGuidance: checkpoint.capture_guidance == null ? null : String(checkpoint.capture_guidance),
    position: Number(checkpoint.position),
  };
}
