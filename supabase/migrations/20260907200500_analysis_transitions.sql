begin;

create or replace function public.claim_analysis_job(
  p_user_id uuid,
  p_submission_id uuid
)
returns table (
  job_id uuid,
  job_status public.analysis_status,
  attempt_count smallint,
  claimed boolean
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_job public.analysis_jobs%rowtype;
begin
  if not exists (
    select 1
    from public.artwork_submissions s
    where s.id = p_submission_id
      and s.user_id = p_user_id
  ) then
    raise exception 'submission ownership mismatch' using errcode = '42501';
  end if;

  insert into public.analysis_jobs (user_id, submission_id, status)
  values (p_user_id, p_submission_id, 'queued')
  on conflict (submission_id) do nothing;

  select * into v_job
  from public.analysis_jobs j
  where j.submission_id = p_submission_id
    and j.user_id = p_user_id
  for update;

  if not found then
    raise exception 'analysis job unavailable' using errcode = '42501';
  end if;

  if v_job.status in ('succeeded', 'needs_better_image') then
    return query select v_job.id, v_job.status, v_job.attempt_count, false;
    return;
  end if;

  if v_job.status = 'processing'
     and v_job.started_at is not null
     and v_job.started_at > now() - interval '5 minutes' then
    return query select v_job.id, v_job.status, v_job.attempt_count, false;
    return;
  end if;

  if v_job.attempt_count >= 3 then
    if v_job.status <> 'failed' then
      update public.analysis_jobs
      set status = 'failed',
          failure_code = 'retry_limit_reached',
          completed_at = now()
      where id = v_job.id;
    end if;
    return query select v_job.id, 'failed'::public.analysis_status, v_job.attempt_count, false;
    return;
  end if;

  update public.analysis_jobs
  set status = 'processing',
      attempt_count = attempt_count + 1,
      started_at = now(),
      completed_at = null,
      failure_code = null
  where id = v_job.id
  returning * into v_job;

  return query select v_job.id, v_job.status, v_job.attempt_count, true;
end;
$$;

create or replace function public.apply_validated_critique(
  p_user_id uuid,
  p_analysis_job_id uuid,
  p_submission_id uuid,
  p_strength text,
  p_priority_issue text,
  p_why_it_matters text,
  p_next_action text,
  p_micro_exercise text,
  p_confidence public.feedback_confidence,
  p_limitations text,
  p_target_improved boolean,
  p_scores jsonb,
  p_model text,
  p_latency_ms integer
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_submission public.artwork_submissions%rowtype;
  v_checkpoint public.checkpoint_attempts%rowtype;
  v_rubric public.skill_dimension[];
  v_critique_id uuid;
  v_next_checkpoint_id uuid;
  v_score_count integer;
  v_unique_score_count integer;
begin
  if jsonb_typeof(p_scores) <> 'array' then
    raise exception 'scores must be an array' using errcode = '22023';
  end if;

  select * into v_submission
  from public.artwork_submissions s
  where s.id = p_submission_id
    and s.user_id = p_user_id;

  if not found then
    raise exception 'submission ownership mismatch' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.analysis_jobs j
    where j.id = p_analysis_job_id
      and j.user_id = p_user_id
      and j.submission_id = p_submission_id
      and j.status = 'processing'
  ) then
    raise exception 'analysis job is not claimable for completion' using errcode = '42501';
  end if;

  select ca.* into v_checkpoint
  from public.checkpoint_attempts ca
  where ca.id = v_submission.checkpoint_attempt_id
    and ca.user_id = p_user_id
  for update;

  if not found then
    raise exception 'checkpoint ownership mismatch' using errcode = '42501';
  end if;

  select cp.rubric_dimensions into v_rubric
  from public.lesson_checkpoints cp
  where cp.id = v_checkpoint.checkpoint_id;

  if v_rubric is null or cardinality(v_rubric) = 0 then
    raise exception 'checkpoint rubric unavailable' using errcode = '23514';
  end if;

  select count(*), count(distinct score_row.dimension)
  into v_score_count, v_unique_score_count
  from jsonb_to_recordset(p_scores) as score_row(dimension text, score integer)
  where score_row.dimension is not null
    and score_row.score between 1 and 5;

  if v_score_count <> cardinality(v_rubric)
     or v_unique_score_count <> cardinality(v_rubric)
     or exists (
       select 1
       from jsonb_to_recordset(p_scores) as score_row(dimension text, score integer)
       where score_row.dimension is null
          or score_row.score not between 1 and 5
          or not (score_row.dimension::public.skill_dimension = any(v_rubric))
     ) then
    raise exception 'scores do not match checkpoint rubric' using errcode = '23514';
  end if;

  if v_submission.version = 1 and p_target_improved is not null then
    raise exception 'first submission target_improved must be null' using errcode = '23514';
  end if;

  if v_submission.version > 1 and p_target_improved is null then
    raise exception 'correction submission requires target_improved' using errcode = '23514';
  end if;

  insert into public.critiques (
    user_id,
    analysis_job_id,
    submission_id,
    strength,
    priority_issue,
    why_it_matters,
    next_action,
    micro_exercise,
    confidence,
    limitations,
    target_improved
  ) values (
    p_user_id,
    p_analysis_job_id,
    p_submission_id,
    p_strength,
    p_priority_issue,
    p_why_it_matters,
    p_next_action,
    p_micro_exercise,
    p_confidence,
    p_limitations,
    p_target_improved
  )
  on conflict (submission_id) do update
  set strength = excluded.strength,
      priority_issue = excluded.priority_issue,
      why_it_matters = excluded.why_it_matters,
      next_action = excluded.next_action,
      micro_exercise = excluded.micro_exercise,
      confidence = excluded.confidence,
      limitations = excluded.limitations,
      target_improved = excluded.target_improved
  returning id into v_critique_id;

  delete from public.critique_scores where critique_id = v_critique_id;

  insert into public.critique_scores (user_id, critique_id, dimension, score)
  select
    p_user_id,
    v_critique_id,
    score_row.dimension::public.skill_dimension,
    score_row.score::smallint
  from jsonb_to_recordset(p_scores) as score_row(dimension text, score integer);

  update public.analysis_jobs
  set status = 'succeeded',
      model = p_model,
      latency_ms = p_latency_ms,
      failure_code = null,
      completed_at = now()
  where id = p_analysis_job_id;

  if v_submission.version > 1 and (p_target_improved = true or v_submission.version >= 3) then
    update public.checkpoint_attempts
    set status = case when p_target_improved then 'accepted'::public.checkpoint_status else 'needs_practice'::public.checkpoint_status end,
        completed_at = now()
    where id = v_checkpoint.id;

    select ca.id into v_next_checkpoint_id
    from public.checkpoint_attempts ca
    join public.lesson_checkpoints cp on cp.id = ca.checkpoint_id
    where ca.lesson_attempt_id = v_checkpoint.lesson_attempt_id
      and ca.status = 'pending'
    order by cp.position
    limit 1
    for update of ca;

    if v_next_checkpoint_id is not null then
      update public.checkpoint_attempts
      set status = 'in_progress',
          started_at = coalesce(started_at, now())
      where id = v_next_checkpoint_id;
    else
      update public.lesson_attempts
      set status = 'completed',
          completed_at = now()
      where id = v_checkpoint.lesson_attempt_id
        and user_id = p_user_id;
    end if;
  end if;

  return v_critique_id;
end;
$$;

revoke all on function public.claim_analysis_job(uuid, uuid) from public, anon, authenticated;
revoke all on function public.apply_validated_critique(
  uuid, uuid, uuid, text, text, text, text, text,
  public.feedback_confidence, text, boolean, jsonb, text, integer
) from public, anon, authenticated;

grant execute on function public.claim_analysis_job(uuid, uuid) to service_role;
grant execute on function public.apply_validated_critique(
  uuid, uuid, uuid, text, text, text, text, text,
  public.feedback_confidence, text, boolean, jsonb, text, integer
) to service_role;

commit;
