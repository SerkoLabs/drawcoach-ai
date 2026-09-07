begin;

create or replace function public.complete_onboarding(
  p_age_band public.age_band,
  p_experience_level public.experience_level,
  p_goal public.learning_goal,
  p_category public.art_category,
  p_medium public.art_medium,
  p_weekly_days smallint,
  p_session_minutes smallint
)
returns table (profile_id uuid, enrollment_id uuid, path_id uuid)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_path_id uuid;
  v_enrollment_id uuid;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if p_weekly_days not in (2, 3, 4, 5) or p_session_minutes not in (15, 30, 45, 60) then
    raise exception 'invalid practice schedule' using errcode = '22023';
  end if;

  select lp.id
  into v_path_id
  from public.learning_paths lp
  where lp.category = p_category
    and lp.medium = p_medium
    and lp.is_active = true
  limit 1;

  if v_path_id is null then
    raise exception 'selected learning path is unavailable' using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.enrollments e
    where e.user_id = v_user_id
      and e.status = 'active'
      and e.path_id <> v_path_id
  ) then
    raise exception 'changing an active learning path is not supported during onboarding' using errcode = '23505';
  end if;

  insert into public.profiles (
    id,
    age_band,
    experience_level,
    goal,
    preferred_category,
    preferred_medium,
    weekly_days,
    session_minutes,
    locale,
    onboarding_completed_at
  )
  values (
    v_user_id,
    p_age_band,
    p_experience_level,
    p_goal,
    p_category,
    p_medium,
    p_weekly_days,
    p_session_minutes,
    'tr',
    now()
  )
  on conflict (id) do update
  set age_band = excluded.age_band,
      experience_level = excluded.experience_level,
      goal = excluded.goal,
      preferred_category = excluded.preferred_category,
      preferred_medium = excluded.preferred_medium,
      weekly_days = excluded.weekly_days,
      session_minutes = excluded.session_minutes,
      locale = excluded.locale,
      onboarding_completed_at = coalesce(public.profiles.onboarding_completed_at, now());

  insert into public.enrollments (user_id, path_id, status)
  values (v_user_id, v_path_id, 'active')
  on conflict (user_id, path_id) do update
  set status = 'active',
      completed_at = null,
      updated_at = now()
  returning id into v_enrollment_id;

  return query select v_user_id, v_enrollment_id, v_path_id;
end;
$$;

create or replace function public.start_or_resume_lesson(p_lesson_id uuid)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_enrollment_id uuid;
  v_path_id uuid;
  v_lesson_number smallint;
  v_attempt_id uuid;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select e.id, e.path_id, l.lesson_number
  into v_enrollment_id, v_path_id, v_lesson_number
  from public.enrollments e
  join public.learning_paths lp on lp.id = e.path_id and lp.is_active = true
  join public.lessons l on l.path_id = e.path_id and l.id = p_lesson_id and l.is_active = true
  where e.user_id = v_user_id
    and e.status = 'active'
  limit 1;

  if v_enrollment_id is null then
    raise exception 'lesson is not eligible for the active learning path' using errcode = '42501';
  end if;

  if v_lesson_number > 1 and not exists (
    select 1
    from public.lessons previous_lesson
    join public.lesson_attempts previous_attempt
      on previous_attempt.lesson_id = previous_lesson.id
     and previous_attempt.enrollment_id = v_enrollment_id
     and previous_attempt.user_id = v_user_id
     and previous_attempt.status = 'completed'
    where previous_lesson.path_id = v_path_id
      and previous_lesson.lesson_number = v_lesson_number - 1
  ) then
    raise exception 'previous lesson must be completed first' using errcode = '42501';
  end if;

  insert into public.lesson_attempts (user_id, enrollment_id, lesson_id)
  values (v_user_id, v_enrollment_id, p_lesson_id)
  on conflict (enrollment_id, lesson_id) do update
  set updated_at = now()
  returning id into v_attempt_id;

  insert into public.checkpoint_attempts (user_id, lesson_attempt_id, checkpoint_id)
  select v_user_id, v_attempt_id, cp.id
  from public.lesson_checkpoints cp
  where cp.lesson_id = p_lesson_id
    and cp.is_active = true
  order by cp.position
  on conflict (lesson_attempt_id, checkpoint_id) do nothing;

  if not exists (
    select 1 from public.checkpoint_attempts ca
    where ca.lesson_attempt_id = v_attempt_id
      and ca.status = 'in_progress'
  ) then
    update public.checkpoint_attempts ca
    set status = 'in_progress',
        started_at = coalesce(ca.started_at, now())
    where ca.id = (
      select ca2.id
      from public.checkpoint_attempts ca2
      join public.lesson_checkpoints cp on cp.id = ca2.checkpoint_id
      where ca2.lesson_attempt_id = v_attempt_id
        and ca2.status = 'pending'
      order by cp.position
      limit 1
    );
  end if;

  return v_attempt_id;
end;
$$;

revoke all on function public.complete_onboarding(
  public.age_band,
  public.experience_level,
  public.learning_goal,
  public.art_category,
  public.art_medium,
  smallint,
  smallint
) from public, anon, authenticated;
grant execute on function public.complete_onboarding(
  public.age_band,
  public.experience_level,
  public.learning_goal,
  public.art_category,
  public.art_medium,
  smallint,
  smallint
) to authenticated;

revoke all on function public.start_or_resume_lesson(uuid) from public, anon, authenticated;
grant execute on function public.start_or_resume_lesson(uuid) to authenticated;

commit;
