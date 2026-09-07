begin;

create type public.age_band as enum ('13_17', '18_24', '25_34', '35_44', '45_54', '55_plus');
create type public.experience_level as enum ('new', 'beginner', 'intermediate');
create type public.learning_goal as enum ('hobby', 'fundamentals', 'specialize', 'portfolio');
create type public.art_category as enum ('landscape', 'portrait');
create type public.art_medium as enum ('pencil', 'watercolor');
create type public.enrollment_status as enum ('active', 'completed');
create type public.lesson_attempt_status as enum ('in_progress', 'completed');
create type public.checkpoint_status as enum ('pending', 'in_progress', 'accepted', 'needs_practice');
create type public.analysis_status as enum ('queued', 'processing', 'succeeded', 'needs_better_image', 'failed');
create type public.feedback_confidence as enum ('low', 'medium', 'high');
create type public.skill_dimension as enum ('composition', 'perspective_proportion', 'value_light', 'color', 'medium_control');
create type public.feedback_rating as enum ('helpful', 'not_helpful');
create type public.deletion_status as enum ('requested', 'processing', 'failed', 'completed');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  age_band public.age_band,
  experience_level public.experience_level,
  goal public.learning_goal,
  preferred_category public.art_category,
  preferred_medium public.art_medium,
  weekly_days smallint check (weekly_days in (2, 3, 4, 5)),
  session_minutes smallint check (session_minutes in (15, 30, 45, 60)),
  locale text not null default 'tr' check (locale in ('tr')),
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_onboarding_complete_check check (
    onboarding_completed_at is null or (
      age_band is not null and experience_level is not null and goal is not null and
      preferred_category is not null and preferred_medium is not null and
      weekly_days is not null and session_minutes is not null
    )
  )
);

create table public.learning_paths (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  category public.art_category not null,
  medium public.art_medium not null,
  title text not null,
  description text not null,
  estimated_weeks smallint not null check (estimated_weeks > 0),
  is_active boolean not null default true,
  sort_order smallint not null check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint learning_paths_category_medium_key unique (category, medium)
);

create index learning_paths_active_sort_idx on public.learning_paths (is_active, sort_order);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  path_id uuid not null references public.learning_paths(id) on delete restrict,
  lesson_number smallint not null check (lesson_number > 0),
  title text not null,
  objective text not null,
  instructions text not null,
  materials text[] not null default '{}',
  estimated_minutes smallint not null check (estimated_minutes between 5 and 180),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lessons_path_number_key unique (path_id, lesson_number)
);

create index lessons_path_number_idx on public.lessons (path_id, lesson_number);

create table public.lesson_checkpoints (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete restrict,
  position smallint not null check (position > 0),
  title text not null,
  instruction text not null,
  capture_guidance text,
  rubric_dimensions public.skill_dimension[] not null,
  rubric_notes jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lesson_checkpoints_lesson_position_key unique (lesson_id, position),
  constraint lesson_checkpoints_rubric_nonempty check (cardinality(rubric_dimensions) >= 1),
  constraint lesson_checkpoints_rubric_notes_object check (jsonb_typeof(rubric_notes) = 'object')
);

create index lesson_checkpoints_lesson_position_idx on public.lesson_checkpoints (lesson_id, position);

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  path_id uuid not null references public.learning_paths(id) on delete restrict,
  status public.enrollment_status not null default 'active',
  assigned_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint enrollments_user_path_key unique (user_id, path_id),
  constraint enrollments_completion_check check (
    (status = 'completed' and completed_at is not null) or
    (status = 'active' and completed_at is null)
  )
);

create unique index enrollments_one_active_user_idx on public.enrollments (user_id) where status = 'active';
create index enrollments_user_status_idx on public.enrollments (user_id, status);
create index enrollments_path_idx on public.enrollments (path_id);

create table public.lesson_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  enrollment_id uuid not null references public.enrollments(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete restrict,
  status public.lesson_attempt_status not null default 'in_progress',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lesson_attempts_enrollment_lesson_key unique (enrollment_id, lesson_id),
  constraint lesson_attempts_completion_check check (
    (status = 'completed' and completed_at is not null) or
    (status = 'in_progress' and completed_at is null)
  )
);

create index lesson_attempts_user_status_idx on public.lesson_attempts (user_id, status);
create index lesson_attempts_lesson_idx on public.lesson_attempts (lesson_id);

create table public.checkpoint_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_attempt_id uuid not null references public.lesson_attempts(id) on delete cascade,
  checkpoint_id uuid not null references public.lesson_checkpoints(id) on delete restrict,
  status public.checkpoint_status not null default 'pending',
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint checkpoint_attempts_attempt_checkpoint_key unique (lesson_attempt_id, checkpoint_id),
  constraint checkpoint_attempts_completion_check check (
    (status in ('accepted', 'needs_practice') and completed_at is not null) or
    (status in ('pending', 'in_progress') and completed_at is null)
  )
);

create index checkpoint_attempts_user_status_idx on public.checkpoint_attempts (user_id, status);
create index checkpoint_attempts_attempt_idx on public.checkpoint_attempts (lesson_attempt_id);
create index checkpoint_attempts_checkpoint_idx on public.checkpoint_attempts (checkpoint_id);

create table public.artwork_submissions (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  checkpoint_attempt_id uuid not null references public.checkpoint_attempts(id) on delete cascade,
  version smallint not null check (version between 1 and 3),
  storage_path text not null unique,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/heic', 'image/heif')),
  byte_size integer not null check (byte_size > 0 and byte_size <= 15728640),
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  created_at timestamptz not null default now(),
  constraint artwork_submissions_attempt_version_key unique (checkpoint_attempt_id, version),
  constraint artwork_submissions_owner_prefix_check check (storage_path like user_id::text || '/%')
);

create index artwork_submissions_user_created_idx on public.artwork_submissions (user_id, created_at desc);

create table public.analysis_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  submission_id uuid not null unique references public.artwork_submissions(id) on delete cascade,
  status public.analysis_status not null default 'queued',
  provider text not null default 'openai' check (provider = 'openai'),
  model text,
  attempt_count smallint not null default 0 check (attempt_count between 0 and 3),
  latency_ms integer check (latency_ms is null or latency_ms >= 0),
  failure_code text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint analysis_jobs_completion_check check (
    (status in ('succeeded', 'needs_better_image', 'failed') and completed_at is not null) or
    (status in ('queued', 'processing') and completed_at is null)
  )
);

create index analysis_jobs_user_created_idx on public.analysis_jobs (user_id, created_at desc);
create index analysis_jobs_status_created_idx on public.analysis_jobs (status, created_at);

create table public.critiques (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  analysis_job_id uuid not null unique references public.analysis_jobs(id) on delete cascade,
  submission_id uuid not null unique references public.artwork_submissions(id) on delete cascade,
  strength text not null,
  priority_issue text not null,
  why_it_matters text not null,
  next_action text not null,
  micro_exercise text,
  confidence public.feedback_confidence not null,
  limitations text,
  target_improved boolean,
  created_at timestamptz not null default now()
);

create index critiques_user_created_idx on public.critiques (user_id, created_at desc);

create table public.critique_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  critique_id uuid not null references public.critiques(id) on delete cascade,
  dimension public.skill_dimension not null,
  score smallint not null check (score between 1 and 5),
  created_at timestamptz not null default now(),
  constraint critique_scores_critique_dimension_key unique (critique_id, dimension)
);

create index critique_scores_user_dimension_created_idx on public.critique_scores (user_id, dimension, created_at desc);
create index critique_scores_critique_idx on public.critique_scores (critique_id);

create table public.feedback_ratings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  critique_id uuid not null references public.critiques(id) on delete cascade,
  rating public.feedback_rating not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint feedback_ratings_user_critique_key unique (user_id, critique_id)
);

create index feedback_ratings_critique_idx on public.feedback_ratings (critique_id);

create table public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  status public.deletion_status not null default 'requested',
  failure_code text,
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint account_deletion_completion_check check (
    (status = 'completed' and completed_at is not null) or
    (status in ('requested', 'processing', 'failed') and completed_at is null)
  )
);

create index account_deletion_status_requested_idx on public.account_deletion_requests (status, requested_at);

create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger learning_paths_set_updated_at before update on public.learning_paths for each row execute function public.set_updated_at();
create trigger lessons_set_updated_at before update on public.lessons for each row execute function public.set_updated_at();
create trigger lesson_checkpoints_set_updated_at before update on public.lesson_checkpoints for each row execute function public.set_updated_at();
create trigger enrollments_set_updated_at before update on public.enrollments for each row execute function public.set_updated_at();
create trigger lesson_attempts_set_updated_at before update on public.lesson_attempts for each row execute function public.set_updated_at();
create trigger checkpoint_attempts_set_updated_at before update on public.checkpoint_attempts for each row execute function public.set_updated_at();
create trigger analysis_jobs_set_updated_at before update on public.analysis_jobs for each row execute function public.set_updated_at();
create trigger feedback_ratings_set_updated_at before update on public.feedback_ratings for each row execute function public.set_updated_at();
create trigger account_deletion_requests_set_updated_at before update on public.account_deletion_requests for each row execute function public.set_updated_at();

commit;
