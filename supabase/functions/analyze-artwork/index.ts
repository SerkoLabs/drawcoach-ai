import { createClient } from 'npm:@supabase/supabase-js@2.111.0';

import { buildFeedbackPrompt } from '../_shared/feedback-prompt.ts';
import {
  feedbackResponseFormat,
  validateFeedbackResult,
  type FeedbackResult,
  type SkillDimension,
} from '../_shared/feedback-schema.ts';

const JSON_HEADERS = { 'content-type': 'application/json' } as const;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function requiredEnv(name: string) {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`missing_${name.toLowerCase()}`);
  return value;
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('unexpected_server_shape');
  return value as Record<string, unknown>;
}

function extractOutputText(payload: unknown): string {
  const root = record(payload);
  if (!Array.isArray(root.output)) throw new Error('provider_output_missing');

  for (const item of root.output) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const content = (item as Record<string, unknown>).content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (!part || typeof part !== 'object' || Array.isArray(part)) continue;
      const row = part as Record<string, unknown>;
      if (row.type === 'output_text' && typeof row.text === 'string') return row.text;
    }
  }

  throw new Error('provider_output_text_missing');
}

async function callOpenAI(args: {
  apiKey: string;
  model: string;
  developerPrompt: string;
  userPrompt: string;
  signedImageUrl: string;
}) {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${args.apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: args.model,
      input: [
        {
          role: 'developer',
          content: [{ type: 'input_text', text: args.developerPrompt }],
        },
        {
          role: 'user',
          content: [
            { type: 'input_text', text: args.userPrompt },
            { type: 'input_image', image_url: args.signedImageUrl, detail: 'high' },
          ],
        },
      ],
      text: { format: feedbackResponseFormat },
    }),
  });

  if (!response.ok) {
    throw new Error(`provider_http_${response.status}`);
  }

  return response.json();
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json(405, { error: 'method_not_allowed' });

  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) return json(401, { error: 'authentication_required' });

  let body: Record<string, unknown>;
  try {
    body = record(await request.json());
  } catch {
    return json(400, { error: 'invalid_json' });
  }

  const submissionId = typeof body.submission_id === 'string' ? body.submission_id : '';
  if (!UUID.test(submissionId)) return json(400, { error: 'invalid_submission_id' });

  let supabaseUrl: string;
  let publicKey: string;
  let serviceRoleKey: string;
  let openAiKey: string;
  let openAiModel: string;
  try {
    supabaseUrl = requiredEnv('SUPABASE_URL');
    publicKey = Deno.env.get('SUPABASE_ANON_KEY')?.trim() || requiredEnv('SUPABASE_PUBLISHABLE_KEY');
    serviceRoleKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
    openAiKey = requiredEnv('OPENAI_API_KEY');
    openAiModel = requiredEnv('OPENAI_MODEL');
  } catch {
    return json(503, { error: 'server_not_configured' });
  }

  const userClient = createClient(supabaseUrl, publicKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const userResult = await userClient.auth.getUser();
  const userId = userResult.data.user?.id;
  if (userResult.error || !userId) return json(401, { error: 'invalid_session' });

  // Authorization happens with the caller-scoped client before any provider call or service-role read.
  const submissionResult = await userClient
    .from('artwork_submissions')
    .select('id,user_id,checkpoint_attempt_id,version,storage_path')
    .eq('id', submissionId)
    .maybeSingle();

  if (submissionResult.error) return json(500, { error: 'submission_lookup_failed' });
  if (!submissionResult.data) return json(404, { error: 'submission_not_found' });
  const submission = record(submissionResult.data);

  const checkpointAttemptResult = await userClient
    .from('checkpoint_attempts')
    .select('id,user_id,lesson_attempt_id,checkpoint_id,status')
    .eq('id', String(submission.checkpoint_attempt_id))
    .eq('status', 'in_progress')
    .maybeSingle();

  if (checkpointAttemptResult.error) return json(500, { error: 'checkpoint_lookup_failed' });
  if (!checkpointAttemptResult.data) return json(409, { error: 'checkpoint_not_mutable' });
  const checkpointAttempt = record(checkpointAttemptResult.data);

  const claim = await serviceClient.rpc('claim_analysis_job', {
    p_user_id: userId,
    p_submission_id: submissionId,
  });

  if (claim.error || !Array.isArray(claim.data) || claim.data.length === 0) {
    return json(500, { error: 'analysis_claim_failed' });
  }

  const claimedJob = record(claim.data[0]);
  const jobId = String(claimedJob.job_id);
  const jobStatus = String(claimedJob.job_status);
  const claimed = claimedJob.claimed === true;

  if (!claimed) {
    if (jobStatus === 'succeeded') {
      const critiqueResult = await userClient
        .from('critiques')
        .select('id,strength,priority_issue,why_it_matters,next_action,micro_exercise,confidence,limitations,target_improved')
        .eq('submission_id', submissionId)
        .single();
      if (critiqueResult.error) return json(500, { error: 'critique_lookup_failed' });

      const scoresResult = await userClient
        .from('critique_scores')
        .select('dimension,score')
        .eq('critique_id', String(record(critiqueResult.data).id));
      if (scoresResult.error) return json(500, { error: 'score_lookup_failed' });

      return json(200, {
        status: 'critique',
        critique: { ...critiqueResult.data, scores: scoresResult.data ?? [] },
      });
    }

    if (jobStatus === 'processing') return json(202, { status: 'processing' });
    if (jobStatus === 'needs_better_image') return json(200, { status: 'needs_better_image' });
    return json(409, { error: 'analysis_retry_limit_reached' });
  }

  const markFailed = async (failureCode: string) => {
    await serviceClient
      .from('analysis_jobs')
      .update({ status: 'failed', failure_code: failureCode.slice(0, 80), completed_at: new Date().toISOString() })
      .eq('id', jobId)
      .eq('user_id', userId);
  };

  try {
    const checkpointResult = await serviceClient
      .from('lesson_checkpoints')
      .select('id,lesson_id,title,instruction,capture_guidance,rubric_dimensions,rubric_notes')
      .eq('id', String(checkpointAttempt.checkpoint_id))
      .single();
    if (checkpointResult.error) throw new Error('checkpoint_catalog_missing');
    const checkpoint = record(checkpointResult.data);

    const lessonResult = await serviceClient
      .from('lessons')
      .select('id,path_id,title')
      .eq('id', String(checkpoint.lesson_id))
      .single();
    if (lessonResult.error) throw new Error('lesson_catalog_missing');
    const lesson = record(lessonResult.data);

    const pathResult = await serviceClient
      .from('learning_paths')
      .select('category,medium')
      .eq('id', String(lesson.path_id))
      .single();
    if (pathResult.error) throw new Error('path_catalog_missing');
    const path = record(pathResult.data);

    const rubricDimensions = Array.isArray(checkpoint.rubric_dimensions)
      ? checkpoint.rubric_dimensions.map(String) as SkillDimension[]
      : [];
    if (rubricDimensions.length === 0) throw new Error('rubric_missing');

    let previousPriorityIssue: string | null = null;
    const submissionVersion = Number(submission.version);
    if (submissionVersion > 1) {
      const previousSubmission = await serviceClient
        .from('artwork_submissions')
        .select('id')
        .eq('checkpoint_attempt_id', String(submission.checkpoint_attempt_id))
        .eq('version', submissionVersion - 1)
        .maybeSingle();
      if (previousSubmission.data) {
        const previousCritique = await serviceClient
          .from('critiques')
          .select('priority_issue')
          .eq('submission_id', previousSubmission.data.id)
          .maybeSingle();
        previousPriorityIssue = previousCritique.data?.priority_issue ?? null;
      }
      if (!previousPriorityIssue) throw new Error('previous_feedback_missing');
    }

    const signed = await serviceClient.storage
      .from('artwork')
      .createSignedUrl(String(submission.storage_path), 90);
    if (signed.error || !signed.data?.signedUrl) throw new Error('signed_image_failed');

    const prompt = buildFeedbackPrompt({
      locale: 'tr',
      category: String(path.category) as 'landscape' | 'portrait',
      medium: String(path.medium) as 'pencil' | 'watercolor',
      lessonTitle: String(lesson.title),
      checkpointTitle: String(checkpoint.title),
      checkpointInstruction: String(checkpoint.instruction),
      captureGuidance: checkpoint.capture_guidance == null ? null : String(checkpoint.capture_guidance),
      rubricDimensions,
      rubricNotes: record(checkpoint.rubric_notes),
      submissionVersion,
      previousPriorityIssue,
    });

    const startedAt = Date.now();
    let validated: FeedbackResult | null = null;
    let lastFailure = 'provider_failed';

    // One bounded schema/provider retry. This is intentionally capped because each provider call can incur usage.
    for (let providerAttempt = 0; providerAttempt < 2 && !validated; providerAttempt += 1) {
      try {
        const providerPayload = await callOpenAI({
          apiKey: openAiKey,
          model: openAiModel,
          developerPrompt: prompt.developer,
          userPrompt: prompt.user,
          signedImageUrl: signed.data.signedUrl,
        });
        const outputText = extractOutputText(providerPayload);
        validated = validateFeedbackResult(JSON.parse(outputText), rubricDimensions);
      } catch (error) {
        lastFailure = error instanceof Error ? error.message : 'provider_failed';
      }
    }

    if (!validated) {
      await markFailed(lastFailure.replace(/[^a-z0-9_-]/gi, '_').toLowerCase());
      return json(502, { error: 'analysis_failed' });
    }

    const latencyMs = Date.now() - startedAt;

    if (validated.status === 'needs_better_image') {
      const removed = await serviceClient.storage.from('artwork').remove([String(submission.storage_path)]);
      if (removed.error) {
        await markFailed('image_cleanup_failed');
        return json(500, { error: 'image_cleanup_failed' });
      }

      // Quality failures do not consume one of the learner's three analyzed correction versions.
      const deleted = await serviceClient
        .from('artwork_submissions')
        .delete()
        .eq('id', submissionId)
        .eq('user_id', userId);
      if (deleted.error) {
        await markFailed('submission_cleanup_failed');
        return json(500, { error: 'submission_cleanup_failed' });
      }

      return json(200, {
        status: 'needs_better_image',
        image_issue: validated.image_issue,
      });
    }

    const critique = validated.critique;
    const applied = await serviceClient.rpc('apply_validated_critique', {
      p_user_id: userId,
      p_analysis_job_id: jobId,
      p_submission_id: submissionId,
      p_strength: critique.strength,
      p_priority_issue: critique.priority_issue,
      p_why_it_matters: critique.why_it_matters,
      p_next_action: critique.next_action,
      p_micro_exercise: critique.micro_exercise,
      p_confidence: critique.confidence,
      p_limitations: critique.limitations,
      p_target_improved: critique.target_improved,
      p_scores: critique.scores,
      p_model: openAiModel,
      p_latency_ms: latencyMs,
    });

    if (applied.error) {
      await markFailed('critique_persist_failed');
      return json(500, { error: 'critique_persist_failed' });
    }

    return json(200, { status: 'critique', critique });
  } catch (error) {
    await markFailed(error instanceof Error ? error.message.replace(/[^a-z0-9_-]/gi, '_').slice(0, 80).toLowerCase() : 'analysis_failed');
    return json(500, { error: 'analysis_failed' });
  }
});
