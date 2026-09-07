# Database, Authorization and Storage Design

## 1. Scope and principles

DrawCoach AI uses Supabase Postgres/Auth/Storage. This design exists before migrations, as required by the repository lifecycle.

Principles:
- `auth.users.id` is the canonical user identity.
- Every private row has a deterministic ownership path to `auth.uid()`.
- All client-exposed tables have RLS enabled.
- RLS **and** SQL grants are explicit; RLS is not treated as a substitute for privileges.
- Catalog content is read-only to authenticated users.
- Critical progress state transitions are not writable as arbitrary client updates.
- OpenAI/Supabase secret credentials remain server-side.
- User deletion is hard deletion in MVP; no hidden soft-deleted copy of artwork is kept in application tables.
- Private storage object cleanup is part of account/attempt deletion; Postgres cascade alone is not enough for Storage.

Current Supabase patterns were verified 2026-09-07 against:
- Expo quickstart: https://supabase.com/docs/guides/getting-started/quickstarts/expo-react-native
- RLS/storage controls: https://supabase.com/docs/guides/storage
- Storage policies: https://supabase.com/docs/guides/storage/quickstart
- Edge Function secrets: https://supabase.com/docs/guides/functions/secrets
- Edge Function auth: https://supabase.com/docs/guides/functions/auth

## 2. Roles and data classification

### Supabase roles

| Role | Meaning | Product access |
|---|---|---|
| `anon` | No authenticated user session | No product tables in MVP; auth endpoints only |
| `authenticated` | Signed-in application user | Read shared catalog; own private data according to grants/RLS |
| server secret/service role | Trusted Edge Functions only; bypasses RLS | Privileged orchestration/deletion only after explicit request authorization |

### Data classes

| Class | Examples | Rules |
|---|---|---|
| Public/shared catalog | learning paths, lessons, checkpoint instructions/rubrics | Authenticated read-only in MVP; no client writes |
| Private profile | age band, level, goal, practice preferences | Owner only |
| Private learning state | enrollment, attempts, checkpoint state | Owner read; server-authoritative writes |
| Private user content | artwork storage objects | Owner access only; trusted analysis/deletion access |
| Private derived data | critiques, rubric scores, usefulness rating | Owner read; controlled writes |
| Security/operational | provider failure code, analysis latency, deletion status | Minimum necessary, owner/server scoped; no raw secrets/content |

## 3. Shared types / domains

Use Postgres enums or constrained text consistently. Prefer enums for state values that are stable inside MVP; adding enum values later must be an explicit migration.

Proposed enum types:

```text
age_band              = 13_17 | 18_24 | 25_34 | 35_44 | 45_54 | 55_plus
experience_level      = new | beginner | intermediate
learning_goal         = hobby | fundamentals | specialize | portfolio
art_category          = landscape | portrait
art_medium            = pencil | watercolor
enrollment_status     = active | completed
lesson_attempt_status = in_progress | completed
checkpoint_status     = pending | in_progress | accepted | needs_practice
analysis_status       = queued | processing | succeeded | needs_better_image | failed
feedback_confidence   = low | medium | high
skill_dimension       = composition | perspective_proportion | value_light | color | medium_control
feedback_rating       = helpful | not_helpful
deletion_status       = requested | processing | failed | completed
```

## 4. Timestamp conventions

- IDs: `uuid`, generated with `gen_random_uuid()` unless the flow requires a client-generated stable ID before object upload.
- `created_at timestamptz not null default now()` on all product rows.
- `updated_at timestamptz not null default now()` on mutable rows.
- A shared `set_updated_at()` trigger updates `updated_at` on mutation.
- Domain event timestamps (`started_at`, `completed_at`, `analyzed_at`) remain separate from audit timestamps.

## 5. Tables

### 5.1 `profiles`

One row per authenticated user.

| Column | Type | Null | Default / constraint |
|---|---|---:|---|
| `id` | uuid | no | PK; FK → `auth.users(id)` ON DELETE CASCADE |
| `age_band` | age_band | yes | null until onboarding save |
| `experience_level` | experience_level | yes | |
| `goal` | learning_goal | yes | |
| `preferred_category` | art_category | yes | |
| `preferred_medium` | art_medium | yes | |
| `weekly_days` | smallint | yes | CHECK in (2,3,4,5) |
| `session_minutes` | smallint | yes | CHECK in (15,30,45,60) |
| `locale` | text | no | default `'tr'`; CHECK initial supported set (`tr`) until localization expands |
| `onboarding_completed_at` | timestamptz | yes | all required onboarding fields must be non-null when set; enforced by CHECK |
| `created_at` | timestamptz | no | `now()` |
| `updated_at` | timestamptz | no | `now()` + trigger |

Constraints:
- PK `profiles_pkey(id)`.
- CHECK: `onboarding_completed_at is null OR (age_band ... session_minutes are all not null)`.

Indexes:
- PK only for MVP; profile lookups are by `id`.

Ownership/classification:
- private; owner = `id`.

Soft delete:
- no. Hard deleted when Auth user is deleted.

### 5.2 `learning_paths`

Server-seeded learning path catalog.

| Column | Type | Null | Default / constraint |
|---|---|---:|---|
| `id` | uuid | no | PK |
| `slug` | text | no | UNIQUE |
| `category` | art_category | no | |
| `medium` | art_medium | no | |
| `title` | text | no | |
| `description` | text | no | |
| `estimated_weeks` | smallint | no | CHECK > 0 |
| `is_active` | boolean | no | true |
| `sort_order` | smallint | no | CHECK >= 0 |
| `created_at` | timestamptz | no | now() |
| `updated_at` | timestamptz | no | now() + trigger |

Constraints:
- UNIQUE `(category, medium)` for MVP so exactly one active canonical path exists per supported combination.
- UNIQUE `slug`.

Indexes:
- `(is_active, sort_order)`.

Classification:
- shared catalog.

Deletion:
- no routine delete. Set `is_active=false`; destructive catalog deletion is migration-only.

### 5.3 `lessons`

Ordered lesson catalog inside a path.

| Column | Type | Null | Default / constraint |
|---|---|---:|---|
| `id` | uuid | no | PK |
| `path_id` | uuid | no | FK → `learning_paths(id)` ON DELETE RESTRICT |
| `lesson_number` | smallint | no | CHECK > 0 |
| `title` | text | no | |
| `objective` | text | no | |
| `instructions` | text | no | concise lesson intro |
| `materials` | text[] | no | default `{}` |
| `estimated_minutes` | smallint | no | CHECK between 5 and 180 |
| `is_active` | boolean | no | true |
| `created_at` | timestamptz | no | now() |
| `updated_at` | timestamptz | no | now() + trigger |

Constraints:
- UNIQUE `(path_id, lesson_number)`.

Indexes:
- `(path_id, lesson_number)`.

Classification:
- shared catalog.

Deletion:
- migration-only; inactive content uses `is_active=false`.

### 5.4 `lesson_checkpoints`

Ordered feedback checkpoints per lesson.

| Column | Type | Null | Default / constraint |
|---|---|---:|---|
| `id` | uuid | no | PK |
| `lesson_id` | uuid | no | FK → `lessons(id)` ON DELETE RESTRICT |
| `position` | smallint | no | CHECK > 0 |
| `title` | text | no | |
| `instruction` | text | no | current drawing action |
| `capture_guidance` | text | yes | optional photo guidance |
| `rubric_dimensions` | skill_dimension[] | no | at least one dimension |
| `rubric_notes` | jsonb | no | default `{}`; server-owned prompt hints only |
| `is_active` | boolean | no | true |
| `created_at` | timestamptz | no | now() |
| `updated_at` | timestamptz | no | now() + trigger |

Constraints:
- UNIQUE `(lesson_id, position)`.
- CHECK `cardinality(rubric_dimensions) >= 1`.
- CHECK no duplicate dimensions; implement with migration helper/check or seed validation if direct CHECK is impractical.
- `rubric_notes` must be JSON object.

Indexes:
- `(lesson_id, position)`.

Classification:
- shared catalog, read-only to client.

### 5.5 `enrollments`

Assignment of a user to a learning path.

| Column | Type | Null | Default / constraint |
|---|---|---:|---|
| `id` | uuid | no | PK |
| `user_id` | uuid | no | FK → `auth.users(id)` ON DELETE CASCADE |
| `path_id` | uuid | no | FK → `learning_paths(id)` ON DELETE RESTRICT |
| `status` | enrollment_status | no | `active` |
| `assigned_at` | timestamptz | no | now() |
| `completed_at` | timestamptz | yes | required iff completed |
| `created_at` | timestamptz | no | now() |
| `updated_at` | timestamptz | no | now() + trigger |

Constraints:
- UNIQUE `(user_id, path_id)` in MVP because repeating paths is out of scope.
- CHECK status/completed_at consistency.
- Partial UNIQUE index on `(user_id)` WHERE `status='active'` to enforce one active path.

Indexes:
- `(user_id, status)`.
- `(path_id)` for FK/catalog reporting.

Ownership:
- private; owner = `user_id`.

Writes:
- created/changed through controlled onboarding/path RPC, not arbitrary client insert/update.

### 5.6 `lesson_attempts`

One canonical attempt per enrollment + lesson in MVP.

| Column | Type | Null | Default / constraint |
|---|---|---:|---|
| `id` | uuid | no | PK |
| `user_id` | uuid | no | FK → `auth.users(id)` ON DELETE CASCADE |
| `enrollment_id` | uuid | no | FK → `enrollments(id)` ON DELETE CASCADE |
| `lesson_id` | uuid | no | FK → `lessons(id)` ON DELETE RESTRICT |
| `status` | lesson_attempt_status | no | `in_progress` |
| `started_at` | timestamptz | no | now() |
| `completed_at` | timestamptz | yes | |
| `created_at` | timestamptz | no | now() |
| `updated_at` | timestamptz | no | now() + trigger |

Constraints:
- UNIQUE `(enrollment_id, lesson_id)`.
- CHECK status/completed_at consistency.
- server/RPC verifies `enrollments.user_id = user_id`, enrollment path owns lesson and prior lesson is terminal.

Indexes:
- `(user_id, status)`.
- `(enrollment_id, lesson_id)` unique index covers lookup.
- `(lesson_id)` for FK.

Ownership:
- private; `user_id`.

Writes:
- controlled RPC only.

### 5.7 `checkpoint_attempts`

Server-authoritative state of each lesson checkpoint.

| Column | Type | Null | Default / constraint |
|---|---|---:|---|
| `id` | uuid | no | PK |
| `user_id` | uuid | no | FK → `auth.users(id)` ON DELETE CASCADE |
| `lesson_attempt_id` | uuid | no | FK → `lesson_attempts(id)` ON DELETE CASCADE |
| `checkpoint_id` | uuid | no | FK → `lesson_checkpoints(id)` ON DELETE RESTRICT |
| `status` | checkpoint_status | no | `pending` |
| `started_at` | timestamptz | yes | |
| `completed_at` | timestamptz | yes | |
| `created_at` | timestamptz | no | now() |
| `updated_at` | timestamptz | no | now() + trigger |

Constraints:
- UNIQUE `(lesson_attempt_id, checkpoint_id)`.
- terminal statuses `accepted|needs_practice` require `completed_at`.
- `pending|in_progress` require `completed_at is null`.

Indexes:
- `(user_id, status)`.
- `(lesson_attempt_id)`.
- `(checkpoint_id)`.

Ownership:
- private; `user_id`.

Writes:
- controlled state-transition RPC/function only.

### 5.8 `artwork_submissions`

One image submission version for a checkpoint attempt.

| Column | Type | Null | Default / constraint |
|---|---|---:|---|
| `id` | uuid | no | PK; may be client-generated before upload |
| `user_id` | uuid | no | FK → `auth.users(id)` ON DELETE CASCADE |
| `checkpoint_attempt_id` | uuid | no | FK → `checkpoint_attempts(id)` ON DELETE CASCADE |
| `version` | smallint | no | CHECK between 1 and 3 for analyzed MVP versions; assigned by registration RPC |
| `storage_path` | text | no | UNIQUE; exact private object key |
| `mime_type` | text | no | allowlisted image MIME |
| `byte_size` | integer | no | CHECK >0 AND <= 15728640 |
| `width` | integer | yes | CHECK >0 when present |
| `height` | integer | yes | CHECK >0 when present |
| `created_at` | timestamptz | no | now() |

Constraints:
- UNIQUE `(checkpoint_attempt_id, version)`.
- UNIQUE `storage_path`.
- CHECK `storage_path` begins with `user_id::text || '/'`; RPC also verifies exact expected path components.
- MIME allowlist initially `image/jpeg`, `image/png`, `image/heic`, `image/heif` if client/storage pipeline supports them in the chosen platform build; analysis normalization must ensure provider-supported representation.

Indexes:
- `(user_id, created_at desc)`.
- `(checkpoint_attempt_id, version)` unique.

Ownership:
- private; `user_id`.

Writes:
- registered through controlled RPC after object exists and ownership/path are verified.

Soft delete:
- no. Attempt/artwork deletion hard-deletes row and object through server-coordinated flow.

### 5.9 `analysis_jobs`

One idempotent analysis state per artwork submission.

| Column | Type | Null | Default / constraint |
|---|---|---:|---|
| `id` | uuid | no | PK |
| `user_id` | uuid | no | FK → `auth.users(id)` ON DELETE CASCADE |
| `submission_id` | uuid | no | FK → `artwork_submissions(id)` ON DELETE CASCADE; UNIQUE |
| `status` | analysis_status | no | `queued` |
| `provider` | text | no | default `openai` |
| `model` | text | yes | stored only after provider call begins |
| `attempt_count` | smallint | no | 0; CHECK between 0 and bounded retry limit |
| `latency_ms` | integer | yes | CHECK >= 0 |
| `failure_code` | text | yes | normalized non-secret code only |
| `started_at` | timestamptz | yes | |
| `completed_at` | timestamptz | yes | terminal states only |
| `created_at` | timestamptz | no | now() |
| `updated_at` | timestamptz | no | now() + trigger |

Constraints:
- UNIQUE `submission_id`.
- terminal-state timestamp consistency.
- CHECK `provider` is an allowed server-defined value; initial only `openai`.

Indexes:
- `(user_id, created_at desc)`.
- `(status, created_at)` for server recovery/operations if needed.

Ownership:
- private operational/derived data; `user_id`.

Writes:
- Edge Function/server only.

### 5.10 `critiques`

Validated user-facing critique for successful analysis. One per submission.

| Column | Type | Null | Default / constraint |
|---|---|---:|---|
| `id` | uuid | no | PK |
| `user_id` | uuid | no | FK → `auth.users(id)` ON DELETE CASCADE |
| `analysis_job_id` | uuid | no | FK → `analysis_jobs(id)` ON DELETE CASCADE; UNIQUE |
| `submission_id` | uuid | no | FK → `artwork_submissions(id)` ON DELETE CASCADE; UNIQUE |
| `strength` | text | no | bounded length in application/server schema |
| `priority_issue` | text | no | exactly one primary issue |
| `why_it_matters` | text | no | |
| `next_action` | text | no | |
| `micro_exercise` | text | yes | |
| `confidence` | feedback_confidence | no | |
| `limitations` | text | yes | |
| `target_improved` | boolean | yes | null for version 1; used for correction versions |
| `created_at` | timestamptz | no | now() |

Constraints:
- UNIQUE `analysis_job_id`.
- UNIQUE `submission_id`.
- server validates text length/schema before insert.

Indexes:
- `(user_id, created_at desc)`.

Ownership:
- private derived; `user_id`.

Writes:
- trusted analysis server only.

### 5.11 `critique_scores`

Normalized per-dimension scores used as learning evidence.

| Column | Type | Null | Default / constraint |
|---|---|---:|---|
| `id` | uuid | no | PK |
| `user_id` | uuid | no | FK → `auth.users(id)` ON DELETE CASCADE |
| `critique_id` | uuid | no | FK → `critiques(id)` ON DELETE CASCADE |
| `dimension` | skill_dimension | no | must be declared by checkpoint rubric |
| `score` | smallint | no | CHECK between 1 and 5 |
| `created_at` | timestamptz | no | now() |

Constraints:
- UNIQUE `(critique_id, dimension)`.
- server verifies dimension belongs to the associated checkpoint's `rubric_dimensions`.

Indexes:
- `(user_id, dimension, created_at desc)` for progress aggregation.
- `(critique_id)`.

Ownership:
- private derived; `user_id`.

Writes:
- trusted analysis server only.

### 5.12 `feedback_ratings`

Optional usefulness rating for a critique.

| Column | Type | Null | Default / constraint |
|---|---|---:|---|
| `id` | uuid | no | PK |
| `user_id` | uuid | no | FK → `auth.users(id)` ON DELETE CASCADE |
| `critique_id` | uuid | no | FK → `critiques(id)` ON DELETE CASCADE |
| `rating` | feedback_rating | no | |
| `created_at` | timestamptz | no | now() |
| `updated_at` | timestamptz | no | now() + trigger |

Constraints:
- UNIQUE `(user_id, critique_id)`.
- ownership must match critique owner.

Indexes:
- unique index covers user/critique lookup.
- `(critique_id)` if aggregate review becomes necessary.

Ownership:
- private user feedback; `user_id`.

Writes:
- owner may insert/update own rating under RLS.

### 5.13 `account_deletion_requests`

Short-lived server workflow state used to make full deletion retryable/idempotent.

| Column | Type | Null | Default / constraint |
|---|---|---:|---|
| `id` | uuid | no | PK |
| `user_id` | uuid | no | FK → `auth.users(id)` ON DELETE CASCADE; UNIQUE |
| `status` | deletion_status | no | `requested` |
| `failure_code` | text | yes | normalized code, no secrets |
| `requested_at` | timestamptz | no | now() |
| `completed_at` | timestamptz | yes | |
| `created_at` | timestamptz | no | now() |
| `updated_at` | timestamptz | no | now() + trigger |

Constraints:
- UNIQUE `user_id`.
- terminal status/timestamp consistency.

Indexes:
- `(status, requested_at)` for trusted operational recovery.

Ownership:
- private operational; `user_id`.

Writes:
- trusted `delete-account` function only; owner may read current state if needed.

After successful Auth user deletion, this row cascades away. Completion should be communicated in the function response before session invalidation; long-term deletion audit belongs in privacy-minimized infrastructure logs, not an orphaned personal-data table.

## 6. Relationships

```text
auth.users
 ├─1:1─ profiles
 ├─1:N─ enrollments ─N:1─ learning_paths ─1:N─ lessons ─1:N─ lesson_checkpoints
 ├─1:N─ lesson_attempts ─1:N─ checkpoint_attempts ─1:N─ artwork_submissions
 │                                                └─1:1─ analysis_jobs ─1:1─ critiques ─1:N─ critique_scores
 │                                                                         └─1:0..1─ feedback_ratings
 └─1:0..1─ account_deletion_requests
```

All private child tables duplicate `user_id` deliberately. This is controlled denormalization that makes ownership predicates/indexing explicit and avoids deep joins in every RLS policy. Server functions must enforce that duplicated ownership matches the referenced parent.

## 7. Derived progress / recommendation model

Do **not** create a mutable skill-score table in the first schema.

Use a stable SQL view/RPC such as `get_my_skill_summary(enrollment_id)` that aggregates validated `critique_scores` for `auth.uid()`:
- only successful critiques,
- only dimensions valid for their checkpoints,
- recent accepted/terminal checkpoint evidence weighted more than old evidence in application/RPC logic,
- returns `evidence_count`, simple normalized display score, and latest recurring weak dimension.

Reason: critique scores are the source evidence; a persistent summary table would create synchronization/drift risk before performance measurements justify it.

If aggregation becomes measurably expensive, add a derived summary table later through a recorded decision/migration.

## 8. Critical server functions / RPCs

Exact SQL signatures may be refined during migration implementation, but authorization invariants are fixed here.

### `complete_onboarding(...)`
Authenticated caller only.
- derives `user_id = auth.uid()`; never accepts arbitrary owner ID.
- validates enum/practice inputs.
- resolves active learning path matching selected category+medium.
- upserts own profile fields and completion timestamp.
- creates one active enrollment atomically.
- idempotent: repeated identical request returns the same enrollment.

### `start_or_resume_lesson(p_lesson_id uuid)`
Authenticated caller only.
- derives user.
- confirms active enrollment owns lesson path.
- confirms prior lesson complete unless lesson number 1.
- creates/reuses unique lesson attempt.
- creates checkpoint_attempt rows in deterministic order if needed.
- starts first/next checkpoint only; later checkpoints stay pending.

### `register_artwork_submission(...)`
Authenticated caller only.
- derives user.
- verifies checkpoint attempt belongs to caller and is current mutable checkpoint.
- verifies the referenced object exists in `storage.objects`, bucket is `artwork`, and path prefix/components match owner/attempt/checkpoint/submission.
- computes next `version` server-side.
- refuses registration beyond 3 analyzed/registered versions under MVP correction policy unless previous un-analyzed failed object is being repaired according to implementation semantics.
- inserts row atomically/idempotently by submission ID/storage path.

### `apply_validated_critique(...)`
Not directly executable by ordinary client role.
- invoked from trusted analysis function/server context.
- persists critique + score rows atomically.
- validates dimensions against checkpoint rubric.
- updates analysis job terminal state.
- determines correction acceptance/`needs_practice` threshold.
- advances checkpoint/lesson state only when rules pass.

### `delete_attempt(p_attempt_id uuid)`
Preferred as trusted Edge Function orchestration because Storage objects must also be removed.
- authorize owner first.
- list/delete only object paths belonging to attempt.
- then delete attempt row (cascades DB children), or use a safe compensating sequence documented in implementation.
- idempotent.

### `delete-account`
Edge Function, not public SQL admin function.
- authenticates request user.
- creates/updates deletion request.
- removes all `artwork/<user_id>/...` objects.
- deletes Auth user with secret/admin capability; DB FK cascades private rows.
- never accepts arbitrary target user ID from untrusted request body.

## 9. RLS policy design

RLS enabled on every table in `public` exposed through Data API.

### Helper rule
Ownership predicates use direct columns when available:
```sql
user_id = auth.uid()
```
For `profiles`:
```sql
id = auth.uid()
```

Do not trust a client-provided `user_id`; inserts either derive owner inside RPC/server logic or have `WITH CHECK (user_id = auth.uid())` plus parent-ownership checks.

### `profiles`
- SELECT: `id = auth.uid()`.
- INSERT: preferably through onboarding RPC; if direct bootstrap insert is allowed, only `id = auth.uid()` and only permitted columns.
- UPDATE: owner only, with column grants excluding `id` and server-managed timestamps. Path-sensitive fields should be updated through controlled flow if they affect enrollment.
- DELETE: no ordinary client grant/policy.

### Catalog: `learning_paths`, `lessons`, `lesson_checkpoints`
- SELECT authenticated: active catalog rows; implementation may allow completed-history references to inactive rows through a stable policy/view if catalog deactivation occurs.
- INSERT/UPDATE/DELETE: no `authenticated` grants/policies.
- `anon`: no product-table grant in MVP.

### `enrollments`
- SELECT: `user_id = auth.uid()`.
- No direct INSERT/UPDATE/DELETE grant to authenticated role; controlled RPC only.

### `lesson_attempts`
- SELECT: `user_id = auth.uid()`.
- No direct mutation grant; controlled RPC/server flow.

### `checkpoint_attempts`
- SELECT: `user_id = auth.uid()`.
- No direct mutation grant.

### `artwork_submissions`
- SELECT: `user_id = auth.uid()`.
- Registration through controlled RPC; direct table INSERT/UPDATE/DELETE not granted to client.

### `analysis_jobs`, `critiques`, `critique_scores`
- SELECT: `user_id = auth.uid()`.
- No ordinary client mutations.

### `feedback_ratings`
- SELECT: `user_id = auth.uid()`.
- INSERT: `WITH CHECK (user_id = auth.uid())` and critique ownership exists.
- UPDATE: `USING/WITH CHECK (user_id = auth.uid())`; `user_id` and `critique_id` not changeable via column grants.
- DELETE: optional owner delete; not required by product UI but may be granted safely. MVP can omit and let it cascade.

### `account_deletion_requests`
- SELECT: optional owner-only so deletion UI can recheck state.
- No ordinary client insert/update/delete.

## 10. SQL grants

Initial intent; migrations must test actual Supabase default privileges and explicitly revoke broad defaults before grants.

```text
anon:
  no SELECT/INSERT/UPDATE/DELETE on public product tables

authenticated:
  SELECT on active catalog exposure (tables or safer views)
  SELECT own private tables via RLS
  profile column INSERT/UPDATE only if direct profile bootstrap/edit is retained
  INSERT/UPDATE on feedback_ratings limited by column grants + RLS
  EXECUTE on explicitly approved user RPCs only

server secret/service role:
  used only inside trusted Edge Functions; bypass behavior acknowledged and every request authorizes target user before privileged mutation
```

`PUBLIC` execute privileges on custom functions are revoked by default; grant execute only to `authenticated` for intended RPCs.

## 11. Storage design

### Bucket: `artwork`
- Public: **false**.
- File-size limit: **15 MB**.
- Allowed MIME types: enable only supported image types that the final upload/normalization pipeline can process.
- No public URL generation.

Object key:
```text
<user_id>/<lesson_attempt_id>/<checkpoint_attempt_id>/<submission_id>/artwork.<ext>
```

### Storage RLS

`storage.objects` INSERT for authenticated user only when:
- `bucket_id = 'artwork'`, and
- first folder component equals `auth.uid()::text`, and
- object name matches expected non-empty path structure.

SELECT:
- owner prefix only.

UPDATE:
- **not granted** in MVP; submission objects are immutable. Correction creates a new submission/object.

DELETE:
- ordinary client direct delete omitted; trusted deletion flow removes object and associated DB records coherently.

Trusted AI function uses server capability only after it authorizes the submission owner from authenticated request context. It does not expose a long-lived/public image URL to the client.

## 12. Cascade behavior

| Parent → child | Behavior | Reason |
|---|---|---|
| `auth.users` → private user rows | CASCADE | full account deletion |
| `learning_paths` → lessons | RESTRICT | prevent accidental deletion of catalog referenced by history |
| `lessons` → checkpoints | RESTRICT | same |
| catalog → enrollments/attempts | RESTRICT | preserve historical referential integrity |
| `enrollments` → lesson_attempts | CASCADE | deleting user/enrollment removes practice state |
| `lesson_attempts` → checkpoint_attempts | CASCADE | attempt deletion |
| `checkpoint_attempts` → submissions | CASCADE | attempt/checkpoint deletion |
| `artwork_submissions` → analysis_jobs/critiques | CASCADE | remove derived analysis with source submission |
| `critiques` → critique_scores/feedback_ratings | CASCADE | remove derived evidence/rating |

Storage is not covered by Postgres FK cascades; server deletion must remove objects explicitly.

## 13. Soft delete policy

No user-content soft delete in MVP.

Reasons:
- product promise includes deletion,
- hidden soft-deleted artwork increases privacy/security surface,
- no restore-bin requirement exists.

Catalog uses `is_active` rather than soft deletion because historical attempts may reference old lessons.

If regulatory/abuse/security retention later requires preserving specific records, that must be a separate documented policy and must not silently retain artwork contrary to product deletion UX.

## 14. Retention and deletion

### Application database/storage
- Profile/progress/artwork/critique: retained while account exists or until user deletes the relevant attempt/content.
- Individual attempt deletion: hard delete DB tree + corresponding storage objects.
- Account deletion: delete all user storage objects, then delete Auth user and cascaded product rows.

### AI provider
- Application DB stores only validated critique, score evidence and minimal analysis metadata; raw provider response/prompt is not retained as a general application field.
- Provider-side handling/retention of image inputs is governed by current OpenAI platform controls and must be re-verified before beta/release.

### Logs
- Logs must not contain raw image bytes, signed URLs, tokens, secrets or full AI prompts/responses in production.
- Exact infrastructure log retention is a release-stage operational decision based on the chosen observability provider.

## 15. Index rationale

Every foreign key used in ownership joins/filters gets an index unless already covered by a unique/PK index.

High-value predicates:
- `user_id` ownership across private tables,
- `user_id + status` for active enrollment/attempt state,
- `lesson_id/path_id + order` for catalog traversal,
- `checkpoint_attempt_id + version` for correction history,
- `user_id + dimension + created_at` for progress aggregation,
- analysis `status + created_at` for trusted recovery/diagnostics.

Do not add speculative indexes for unmeasured reporting queries.

## 16. Migration strategy

1. Create types/extensions/helpers.
2. Create catalog tables.
3. Create private user tables in dependency order.
4. Add constraints/indexes.
5. Create update timestamp triggers.
6. Enable RLS on all public product tables.
7. Revoke default/public privileges; add explicit grants.
8. Create policies.
9. Create user RPCs with explicit execute grants.
10. Configure private Storage bucket and object policies through migration where supported/reliable.
11. Seed deterministic four learning paths and minimal lesson content only after content task is reached.
12. Run allow/deny security tests locally/development before linking the first vertical slice.

No migration is run merely from this design stage.

## 17. Authorization test matrix

These are mandatory integration/security tests once migrations exist.

### Profile
- ALLOW: user A selects own profile.
- DENY: user A selects/updates user B profile.
- DENY: user A changes profile `id`.

### Catalog
- ALLOW: authenticated user reads active path/lesson/checkpoint.
- DENY: authenticated user inserts/updates/deletes catalog row.
- DENY: anon reads product catalog in MVP unless deliberately changed later.

### Enrollment/progress
- ALLOW: user A reads own enrollment/attempt/checkpoint rows.
- DENY: A reads B's rows by guessed UUID.
- DENY: A directly updates checkpoint to `accepted` or lesson to `completed`.
- DENY: A starts a lesson outside active path/prerequisite order through RPC.

### Artwork submission
- ALLOW: A uploads Storage object under A prefix with valid MIME/size.
- DENY: A uploads under B prefix.
- DENY: A reads B object.
- DENY: A overwrites immutable object via UPDATE.
- ALLOW: A registers own existing object/current checkpoint through RPC.
- DENY: A registers B object or non-current checkpoint.

### Analysis/critique
- ALLOW: A selects own analysis/critique/scores.
- DENY: A selects B analysis/critique/scores.
- DENY: ordinary authenticated role inserts/updates critique or score directly.
- DENY: analyze Edge Function request for a submission not owned by requester.

### Feedback rating
- ALLOW: A rates own critique.
- ALLOW: A changes own rating according to feature semantics.
- DENY: A rates B critique or changes rating owner/critique linkage.

### Deletion
- DENY: delete-account accepts arbitrary target `user_id` from request body.
- ALLOW: authenticated A deletes A only.
- VERIFY: A account deletion removes A DB rows and all `artwork/A/...` objects while leaving B untouched.
- VERIFY: retrying a partially failed deletion is idempotent.

## 18. Data-authorization gate review

**Gate status: FALLBACK PASS**  
**Preferred reviewer:** `gpt-6-astra`  
**Actual reviewer:** `gpt-5.6-sol` (fallback; Astra unavailable in this runtime)  
**Review date:** 2026-09-07

Focused adversarial review:

1. **Can user A read user B artwork metadata/critique by guessed UUID?**  
   No by design: every private table has direct `user_id` ownership RLS; storage uses owner prefix policy. Mandatory deny tests cover guessed IDs.

2. **Can user A forge `user_id=B` on insert?**  
   Critical writes are RPC/server-controlled and derive `auth.uid()`. Any direct allowed insert has `WITH CHECK` ownership plus immutable owner columns.

3. **Can a user mark a checkpoint/lesson completed directly?**  
   No direct mutation grants on server-authoritative state tables. Advancement is through controlled state-transition logic.

4. **Can client write fake AI scores/critiques?**  
   No client write grants/policies for `analysis_jobs`, `critiques`, `critique_scores`.

5. **Can private Storage be bypassed with a public URL?**  
   Bucket is private; no public URL flow. SELECT/upload policies scope object prefix to owner; server analysis authorizes before privileged access.

6. **Does Auth deletion leave private Storage behind?**  
   Plain FK cascade would, so the design explicitly requires storage cleanup before Auth deletion. This is a release-blocking invariant for deletion tests.

7. **Does use of secret/service-role bypass RLS create an unguarded endpoint?**  
   Edge Functions first authenticate/derive requesting identity and never accept arbitrary target owner for privileged operations. Secret keys remain server-only.

8. **Is derived progress vulnerable to arbitrary client score writes?**  
   No; source scores are trusted-server-only and progress is derived from those rows.

No unresolved P0/P1 authorization design finding remains. Implementation must not weaken grants/RLS to simplify client code.
