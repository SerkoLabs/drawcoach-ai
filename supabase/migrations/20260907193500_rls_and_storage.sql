begin;

alter table public.profiles enable row level security;
alter table public.learning_paths enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_checkpoints enable row level security;
alter table public.enrollments enable row level security;
alter table public.lesson_attempts enable row level security;
alter table public.checkpoint_attempts enable row level security;
alter table public.artwork_submissions enable row level security;
alter table public.analysis_jobs enable row level security;
alter table public.critiques enable row level security;
alter table public.critique_scores enable row level security;
alter table public.feedback_ratings enable row level security;
alter table public.account_deletion_requests enable row level security;

revoke all on table public.profiles from public, anon, authenticated;
revoke all on table public.learning_paths from public, anon, authenticated;
revoke all on table public.lessons from public, anon, authenticated;
revoke all on table public.lesson_checkpoints from public, anon, authenticated;
revoke all on table public.enrollments from public, anon, authenticated;
revoke all on table public.lesson_attempts from public, anon, authenticated;
revoke all on table public.checkpoint_attempts from public, anon, authenticated;
revoke all on table public.artwork_submissions from public, anon, authenticated;
revoke all on table public.analysis_jobs from public, anon, authenticated;
revoke all on table public.critiques from public, anon, authenticated;
revoke all on table public.critique_scores from public, anon, authenticated;
revoke all on table public.feedback_ratings from public, anon, authenticated;
revoke all on table public.account_deletion_requests from public, anon, authenticated;

-- Authenticated users may read the active catalog and only their own private rows.
grant select on table public.learning_paths, public.lessons, public.lesson_checkpoints to authenticated;
grant select on table public.profiles, public.enrollments, public.lesson_attempts,
  public.checkpoint_attempts, public.artwork_submissions, public.analysis_jobs,
  public.critiques, public.critique_scores, public.feedback_ratings,
  public.account_deletion_requests to authenticated;

grant insert (user_id, critique_id, rating) on public.feedback_ratings to authenticated;
grant update (rating) on public.feedback_ratings to authenticated;

create policy learning_paths_read_active
on public.learning_paths for select to authenticated
using (is_active = true);

create policy lessons_read_active
on public.lessons for select to authenticated
using (
  is_active = true
  and exists (
    select 1 from public.learning_paths p
    where p.id = lessons.path_id and p.is_active = true
  )
);

create policy lesson_checkpoints_read_active
on public.lesson_checkpoints for select to authenticated
using (
  is_active = true
  and exists (
    select 1
    from public.lessons l
    join public.learning_paths p on p.id = l.path_id
    where l.id = lesson_checkpoints.lesson_id
      and l.is_active = true
      and p.is_active = true
  )
);

create policy profiles_read_own
on public.profiles for select to authenticated
using (id = auth.uid());

create policy enrollments_read_own
on public.enrollments for select to authenticated
using (user_id = auth.uid());

create policy lesson_attempts_read_own
on public.lesson_attempts for select to authenticated
using (user_id = auth.uid());

create policy checkpoint_attempts_read_own
on public.checkpoint_attempts for select to authenticated
using (user_id = auth.uid());

create policy artwork_submissions_read_own
on public.artwork_submissions for select to authenticated
using (user_id = auth.uid());

create policy analysis_jobs_read_own
on public.analysis_jobs for select to authenticated
using (user_id = auth.uid());

create policy critiques_read_own
on public.critiques for select to authenticated
using (user_id = auth.uid());

create policy critique_scores_read_own
on public.critique_scores for select to authenticated
using (user_id = auth.uid());

create policy feedback_ratings_read_own
on public.feedback_ratings for select to authenticated
using (user_id = auth.uid());

create policy feedback_ratings_insert_own
on public.feedback_ratings for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.critiques c
    where c.id = feedback_ratings.critique_id
      and c.user_id = auth.uid()
  )
);

create policy feedback_ratings_update_own
on public.feedback_ratings for update to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.critiques c
    where c.id = feedback_ratings.critique_id
      and c.user_id = auth.uid()
  )
);

create policy account_deletion_requests_read_own
on public.account_deletion_requests for select to authenticated
using (user_id = auth.uid());

-- Private immutable artwork bucket. Database rows are registered separately through an RPC.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'artwork',
  'artwork',
  false,
  15728640,
  array['image/jpeg', 'image/png', 'image/heic', 'image/heif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy artwork_objects_insert_own_prefix
on storage.objects for insert to authenticated
with check (
  bucket_id = 'artwork'
  and (storage.foldername(name))[1] = auth.uid()::text
  and array_length(storage.foldername(name), 1) = 4
);

create policy artwork_objects_read_own_prefix
on storage.objects for select to authenticated
using (
  bucket_id = 'artwork'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Deliberately no UPDATE or DELETE policy for authenticated users: artwork objects are immutable,
-- and deletion is coordinated by trusted server flows so Storage and Postgres cannot drift.

commit;
