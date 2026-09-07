begin;

create or replace function public.get_my_next_lesson()
returns table (
  enrollment_id uuid,
  path_id uuid,
  path_title text,
  lesson_id uuid,
  lesson_number smallint,
  lesson_title text,
  lesson_objective text,
  estimated_minutes smallint
)
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
  select
    e.id,
    lp.id,
    lp.title,
    l.id,
    l.lesson_number,
    l.title,
    l.objective,
    l.estimated_minutes
  from public.enrollments e
  join public.learning_paths lp
    on lp.id = e.path_id
   and lp.is_active = true
  join public.lessons l
    on l.path_id = e.path_id
   and l.is_active = true
  where e.user_id = auth.uid()
    and e.status = 'active'
    and not exists (
      select 1
      from public.lesson_attempts la
      where la.user_id = auth.uid()
        and la.enrollment_id = e.id
        and la.lesson_id = l.id
        and la.status = 'completed'
    )
    and (
      l.lesson_number = 1
      or exists (
        select 1
        from public.lessons previous_lesson
        join public.lesson_attempts previous_attempt
          on previous_attempt.lesson_id = previous_lesson.id
         and previous_attempt.user_id = auth.uid()
         and previous_attempt.enrollment_id = e.id
         and previous_attempt.status = 'completed'
        where previous_lesson.path_id = e.path_id
          and previous_lesson.lesson_number = l.lesson_number - 1
      )
    )
  order by l.lesson_number
  limit 1;
$$;

revoke all on function public.get_my_next_lesson() from public, anon, authenticated;
grant execute on function public.get_my_next_lesson() to authenticated;

create or replace function public.register_artwork_submission(
  p_submission_id uuid,
  p_checkpoint_attempt_id uuid,
  p_storage_path text,
  p_mime_type text,
  p_byte_size integer,
  p_width integer default null,
  p_height integer default null
)
returns table (submission_id uuid, version smallint)
language plpgsql
security definer
set search_path = pg_catalog, public, storage
as $$
declare
  v_user_id uuid := auth.uid();
  v_lesson_attempt_id uuid;
  v_existing public.artwork_submissions%rowtype;
  v_version smallint;
  v_expected_prefix text;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if p_mime_type not in ('image/jpeg', 'image/png', 'image/heic', 'image/heif') then
    raise exception 'unsupported image type' using errcode = '22023';
  end if;

  if p_byte_size <= 0 or p_byte_size > 15728640 then
    raise exception 'invalid image size' using errcode = '22023';
  end if;

  if (p_width is not null and p_width <= 0) or (p_height is not null and p_height <= 0) then
    raise exception 'invalid image dimensions' using errcode = '22023';
  end if;

  select ca.lesson_attempt_id
  into v_lesson_attempt_id
  from public.checkpoint_attempts ca
  where ca.id = p_checkpoint_attempt_id
    and ca.user_id = v_user_id
    and ca.status = 'in_progress';

  if v_lesson_attempt_id is null then
    raise exception 'checkpoint is not the current mutable checkpoint' using errcode = '42501';
  end if;

  v_expected_prefix := concat(
    v_user_id::text, '/',
    v_lesson_attempt_id::text, '/',
    p_checkpoint_attempt_id::text, '/',
    p_submission_id::text, '/artwork.'
  );

  if p_storage_path not like v_expected_prefix || '%' then
    raise exception 'storage path does not match submission ownership' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from storage.objects o
    where o.bucket_id = 'artwork'
      and o.name = p_storage_path
  ) then
    raise exception 'artwork object does not exist' using errcode = '23503';
  end if;

  select * into v_existing
  from public.artwork_submissions s
  where s.id = p_submission_id;

  if found then
    if v_existing.user_id <> v_user_id
       or v_existing.checkpoint_attempt_id <> p_checkpoint_attempt_id
       or v_existing.storage_path <> p_storage_path then
      raise exception 'submission id conflicts with existing record' using errcode = '23505';
    end if;
    return query select v_existing.id, v_existing.version;
    return;
  end if;

  select coalesce(max(s.version), 0)::smallint + 1
  into v_version
  from public.artwork_submissions s
  where s.checkpoint_attempt_id = p_checkpoint_attempt_id;

  if v_version > 3 then
    raise exception 'maximum analyzed submission versions reached' using errcode = '22023';
  end if;

  insert into public.artwork_submissions (
    id,
    user_id,
    checkpoint_attempt_id,
    version,
    storage_path,
    mime_type,
    byte_size,
    width,
    height
  ) values (
    p_submission_id,
    v_user_id,
    p_checkpoint_attempt_id,
    v_version,
    p_storage_path,
    p_mime_type,
    p_byte_size,
    p_width,
    p_height
  );

  return query select p_submission_id, v_version;
end;
$$;

revoke all on function public.register_artwork_submission(uuid, uuid, text, text, integer, integer, integer)
from public, anon, authenticated;
grant execute on function public.register_artwork_submission(uuid, uuid, text, text, integer, integer, integer)
to authenticated;

commit;
