# Product Specification

## 1. Product summary

DrawCoach AI is a mobile drawing coach for beginner and intermediate learners. It combines structured numbered lessons with visual critique of the learner's own artwork at defined checkpoints. The product's core value is not content consumption; it is the repeated loop of **practice → submit → receive one prioritized correction → revise → resubmit → progress**.

MVP learning paths:
- Landscape / pencil
- Landscape / watercolor
- Portrait / pencil
- Portrait / watercolor

The product is private by default. There is no public sharing or social graph in MVP.

## 2. Personas / primary user

### P-001 — Beginner explorer
- Age: 13+.
- Has little formal drawing education.
- Wants a clear sequence and does not know what to practice next.
- Needs concise language and small corrections.

### P-002 — Intermediate improver
- Age: 13+.
- Already draws but repeats the same mistakes.
- Has a specific goal such as landscape specialization.
- Wants targeted critique and evidence of progress over time.

### P-003 — Returning hobbyist
- Has limited weekly time.
- Wants a practice plan based on 2–5 sessions per week.
- Values continuity more than a large content library.

## 3. Product principles

1. **Feedback first.** Every lesson exists to produce observable work and actionable critique.
2. **One priority at a time.** Feedback identifies the highest-value correction instead of overwhelming the learner.
3. **Checkpoint-aware critique.** A sketch checkpoint is judged differently from value, color or final-detail checkpoints.
4. **Private by default.** Artwork and learning history are visible only to the owning user in MVP.
5. **AI is coaching, not truth.** Critique is phrased as a recommendation and may communicate uncertainty.
6. **Progress must be earned from evidence.** Skill progress is derived from completed lesson/checkpoint feedback, not arbitrary XP alone.
7. **Small MVP.** No social, marketplace, live teacher, realtime video or payment flow before the feedback loop is validated.

## 4. MVP scope

- Account creation/sign-in.
- Guided onboarding and learner profile.
- Supported learning-path selection.
- Numbered lesson catalog and lesson detail.
- Defined lesson checkpoints.
- Camera/library artwork submission.
- Server-side AI visual critique.
- Structured feedback and corrected resubmission.
- Lesson completion.
- Skill progress and next-focus recommendation.
- Artwork/feedback history with before/after comparison.
- Feedback usefulness signal.
- Sign out and account deletion.

## 5. Non-goals

- Public community or UGC discovery.
- Human instructor marketplace.
- Live classes or live critique.
- Real-time camera/video coaching.
- Drawing directly on an in-app professional canvas.
- Generative image creation as a core learning feature.
- Support for all media/categories.
- Subscription activation or purchase flow.
- Certificates, leaderboards or competitions.
- Users under 13.

## 6. Feature specifications

### F-001 — Authentication and private account
- User goal: create a private account so learning progress and artwork persist across sessions/devices.
- Trigger: user chooses to start the app beyond the welcome screen or returns signed out.
- Preconditions: network connection.
- Happy path:
  1. User enters email and password.
  2. Client validates basic format and password rules.
  3. Backend authentication creates/signs in the account.
  4. Session is persisted securely by the supported mobile auth adapter.
  5. Existing user profile is loaded, or onboarding starts for a new user.
- Alternate paths:
  - Existing account signs in.
  - Email confirmation is required by environment configuration; app shows a pending-confirmation state.
  - User signs out and returns to auth.
- Validation:
  - Email must be syntactically valid.
  - Password minimum is 8 characters in MVP; server policy may be stronger.
  - Server is authoritative for duplicate-account/auth errors.
- Permissions: unauthenticated users may only access auth and non-sensitive welcome content.
- Loading: disable duplicate submit while auth request is pending.
- Empty: not applicable.
- Error/retry: surface actionable auth error without exposing raw backend details; retain entered email.
- Offline/degraded: sign-in/sign-up requires network. A previously valid persisted session may open cached shell content, but protected server data still depends on connectivity.
- Analytics: `auth_started`, `auth_succeeded`, `auth_failed` with failure category only; never log password/token.
- Acceptance criteria:
  - [ ] New user can create an account and reach onboarding.
  - [ ] Returning user can sign in and reach the correct post-auth destination.
  - [ ] Session survives app restart when still valid.
  - [ ] Invalid/expired session returns safely to auth.
  - [ ] No privileged key or service-role credential is present in the client bundle.
- Out of scope: Apple/Google social login, passwordless deep-link login.

### F-002 — Learner onboarding profile
- User goal: tell the coach enough about learning needs to create a suitable path.
- Trigger: authenticated user has no completed onboarding profile.
- Preconditions: authenticated session.
- Happy path:
  1. Select age band: `13–17`, `18–24`, `25–34`, `35–44`, `45–54`, `55+`.
  2. Select experience: `new`, `beginner`, `intermediate`.
  3. Select goal: `hobby`, `build fundamentals`, `specialize`, `portfolio practice`.
  4. Select supported category: `landscape` or `portrait`.
  5. Select supported medium: `pencil` or `watercolor`.
  6. Select weekly practice target: 2, 3, 4 or 5 days/week and preferred session duration: 15, 30, 45 or 60 minutes.
  7. Review and save.
  8. App assigns the matching initial learning path and opens the home screen.
- Alternate paths:
  - User goes back and changes previous selections before save.
  - User later edits non-age profile preferences in settings; active course changes require explicit confirmation because progress may no longer map cleanly.
- Validation: all required selections must be from supported enums.
- Permissions: owner only.
- Loading: save button shows progress and is idempotent.
- Empty: not applicable.
- Error/retry: selections remain in local state if save fails.
- Offline/degraded: onboarding can be filled offline but cannot be finalized until profile save succeeds.
- Analytics: `onboarding_started`, `onboarding_completed`, chosen category/medium/experience; do not send exact email or artwork.
- Acceptance criteria:
  - [ ] Exact date of birth is not requested or stored.
  - [ ] Under-13 option is not available; welcome copy states MVP is 13+.
  - [ ] Completing onboarding persists a profile and an assigned path.
  - [ ] Relaunch does not repeat onboarding after successful completion.
- Out of scope: psychometric testing, adaptive personality profiling.

### F-003 — Personalized learning path and home
- User goal: immediately know the next lesson and current focus.
- Trigger: onboarded user opens the app/home.
- Preconditions: active assigned learning path.
- Happy path:
  1. Home loads active path, completed lessons, next eligible lesson and current recommended focus.
  2. User sees path title, progress count, next lesson number/title, estimated time and one short coach-focus sentence.
  3. User taps `Start/Continue`.
- Alternate paths:
  - First user has no feedback history: focus comes from lesson objective.
  - Returning user has repeated weakness: focus is derived from recent feedback rubric results.
  - Completed path: show completion state and allow review; future paths are not invented.
- Validation: next lesson must belong to the user's active path and obey prerequisite order.
- Permissions: owner-specific progress; lesson content itself may be shared read-only catalog data.
- Loading: skeleton or bounded loading state.
- Empty: if catalog content is unavailable, show recoverable error rather than blank home.
- Error/retry: retry button and cached last-known summary when safe.
- Offline/degraded: previously loaded lesson metadata may be shown; starting a never-loaded lesson may require network.
- Analytics: `home_viewed`, `lesson_cta_tapped`.
- Acceptance criteria:
  - [ ] Home always identifies one next eligible action unless the path is complete.
  - [ ] Locked lessons cannot be started by manipulating client state.
  - [ ] Recommendation never invents a lesson outside the assigned path.
- Out of scope: algorithmic course marketplace/recommendation across hundreds of tracks.

### F-004 — Lesson detail and checkpoint progression
- User goal: understand exactly what to draw now and when to request feedback.
- Trigger: user opens an eligible lesson.
- Preconditions: authenticated, onboarded, lesson belongs to active path and prerequisites are satisfied.
- Happy path:
  1. Lesson shows objective, materials, short instruction, expected duration and checkpoint sequence.
  2. User starts lesson attempt.
  3. Current checkpoint shows its instruction and rubric focus.
  4. User submits artwork for that checkpoint.
  5. After accepted feedback/correction flow, checkpoint is completed and the next checkpoint unlocks.
  6. Completing the final checkpoint completes the lesson.
- Alternate paths:
  - User exits mid-lesson and later resumes the active attempt.
  - User may review completed checkpoints but cannot mutate historical feedback.
- Validation: checkpoint progression is ordered server-side; completed checkpoint IDs must belong to the lesson.
- Permissions: owner for attempts; lesson catalog read access according to catalog policy.
- Loading: bounded loading for lesson and attempt.
- Empty: no eligible checkpoints is a catalog/configuration error.
- Error/retry: failed attempt creation or progress update is retryable.
- Offline/degraded: loaded instructions remain readable; submission/completion mutation requires network.
- Analytics: `lesson_started`, `checkpoint_viewed`, `lesson_completed`.
- Acceptance criteria:
  - [ ] A lesson attempt resumes after app restart.
  - [ ] Checkpoints unlock in defined order.
  - [ ] User cannot mark a checkpoint/lesson complete purely from client-side state.
  - [ ] Each checkpoint declares the rubric dimensions relevant to that stage.
- Out of scope: free-form course authoring UI.

### F-005 — Artwork capture/library upload
- User goal: submit a clear image of current artwork with minimal friction.
- Trigger: user taps `Add artwork` on current checkpoint.
- Preconditions: active checkpoint.
- Happy path:
  1. User chooses camera or photo library.
  2. App requests the minimum required native permission at the moment it is needed.
  3. User captures/selects one image.
  4. App previews the image and shows simple capture guidance (full page/canvas visible, adequate light, minimal glare).
  5. User confirms.
  6. Image is uploaded to a private storage location scoped to the user/attempt/checkpoint.
  7. Submission record is created only after a valid stored object exists.
- Alternate paths:
  - Permission denied: explain how to continue with the other source or system settings.
  - User cancels picker/camera: return to checkpoint unchanged.
  - User replaces preview before submit.
- Validation:
  - Accept JPEG/PNG/HEIC inputs supported by the platform pipeline; normalize server/processing path as needed.
  - Enforce upload size limit of 15 MB for MVP.
  - One image per submission version.
- Permissions: private owner-only object access via storage authorization; analysis service accesses only through trusted backend flow.
- Loading: show upload progress/busy state; prevent duplicate confirm.
- Empty: no image selected keeps submit disabled.
- Error/retry: upload retry must not create orphan submission rows; failed image remains available on the screen while possible.
- Offline/degraded: capture/select can occur; upload requires network and is not background-queued in MVP.
- Analytics: `artwork_source_selected`, `artwork_upload_succeeded`, `artwork_upload_failed`; do not log image URL/content in analytics.
- Acceptance criteria:
  - [ ] Permission is requested only after user selects camera/library action.
  - [ ] Another authenticated user cannot read the object.
  - [ ] Failed upload does not advance the checkpoint.
  - [ ] Repeated submit tap does not create duplicate submission versions.
- Out of scope: multi-image panoramas, video, realtime camera stream.

### F-006 — AI checkpoint critique
- User goal: receive specific, useful feedback on the current stage of the drawing.
- Trigger: a valid artwork submission reaches `ready_for_analysis`.
- Preconditions: authenticated owner, valid submission, supported lesson/checkpoint, image available to trusted backend.
- Happy path:
  1. Trusted backend loads lesson context, medium/category, checkpoint rubric and recent learner weakness summary.
  2. Backend sends the image and constrained critique instructions to the configured vision-capable model.
  3. Model output is validated against a strict structured response schema.
  4. Backend stores a critique with rubric observations and user-facing feedback.
  5. Client polls/reloads or receives completion and renders feedback.
- Required feedback schema:
  - `strength`: one specific positive observation.
  - `priority_issue`: one highest-priority correction.
  - `why_it_matters`: concise teaching explanation.
  - `next_action`: concrete correction the learner can perform now.
  - `micro_exercise`: nullable short exercise.
  - `rubric_scores`: only dimensions declared for this checkpoint, normalized 1–5.
  - `confidence`: low/medium/high.
  - `limitations`: nullable short note when photo quality or ambiguity reduces confidence.
- Alternate paths:
  - Image is too dark/cropped/ambiguous: return a `needs_better_image` result rather than fabricated critique.
  - AI timeout/provider failure: mark analysis retryable; do not complete checkpoint.
  - Invalid model schema: one controlled server retry; then fail safely.
- Validation:
  - Model output is never trusted without schema validation.
  - Critique cannot include unsupported numeric precision or claim objective certainty.
  - Prompt includes only the minimum user/course context needed.
- Permissions: AI provider credential exists only in trusted server/edge environment; client can request analysis only for a submission it owns.
- Loading: show `Analyzing your drawing…` with ability to leave and return.
- Empty: not applicable.
- Error/retry: user can retry failed analysis without re-uploading if the stored object remains valid.
- Offline/degraded: requires network.
- Analytics: latency bucket, success/failure category, `feedback_delivered`; do not send raw image or critique text to generic analytics.
- Acceptance criteria:
  - [ ] Client never directly calls AI provider with a secret key.
  - [ ] Backend authorizes ownership before analysis.
  - [ ] Feedback conforms to the structured schema before persistence/display.
  - [ ] Provider/schema failure cannot mark the checkpoint complete.
  - [ ] Low-quality image path asks for a better image instead of inventing feedback.
  - [ ] User receives at most one prioritized correction in the primary feedback block.
- Out of scope: diagnosing mental state/personality from artwork, scoring artistic worth, generating replacement artwork.

### F-007 — Correction and resubmission loop
- User goal: apply feedback and demonstrate a correction before advancing.
- Trigger: critique for current submission is delivered.
- Preconditions: current checkpoint has delivered critique.
- Happy path:
  1. User reads structured feedback.
  2. User taps `I corrected it` / `Resubmit`.
  3. User uploads a new version for the same checkpoint.
  4. AI receives previous priority issue plus new image and evaluates whether the target improved sufficiently or needs one more correction.
  5. If accepted, checkpoint completes and next checkpoint unlocks.
- Alternate paths:
  - User chooses `Try again later`; attempt remains resumable.
  - AI says target is still unresolved; return another single correction, capped at 3 analyzed versions per checkpoint in MVP.
  - After 3 analyzed versions without acceptance, allow checkpoint completion with `needs_practice` status so a learner is not trapped; next-focus recommendation carries the weakness forward.
- Validation: version numbers monotonic per checkpoint; previous critique linkage preserved.
- Permissions: owner only.
- Loading: same upload/analysis states as initial submission.
- Empty: not applicable.
- Error/retry: retry provider failure without incrementing analyzed-version count until a valid critique exists.
- Offline/degraded: requires network for upload/analysis.
- Analytics: `correction_started`, `correction_accepted`, `checkpoint_needs_practice`.
- Acceptance criteria:
  - [ ] Initial and corrected versions remain linked and reviewable.
  - [ ] User cannot be forced into an infinite correction loop.
  - [ ] Accepted checkpoint unlock is server-authoritative.
  - [ ] Re-analysis focuses on the previous priority issue plus checkpoint rubric, not unrelated critique expansion.
- Out of scope: unlimited tutoring chat about a checkpoint.

### F-008 — Skill progress and next-focus recommendation
- User goal: see what is improving and what to practice next.
- Trigger: checkpoint/lesson completion and home/progress view.
- Preconditions: at least one completed critique for personalized values; otherwise neutral baseline.
- Happy path:
  1. Valid critiques contribute normalized rubric observations.
  2. App aggregates recent evidence into skill dimensions relevant to the active path.
  3. Progress screen shows simple level/progress bars plus a plain-language focus.
  4. Home recommendation uses the highest recurring weakness that is relevant to the next eligible lesson; otherwise uses the lesson objective.
- Dimensions:
  - composition
  - perspective/proportion
  - value/light
  - color (when applicable)
  - medium control
- Alternate paths:
  - Too little evidence: display `Not enough practice data yet` instead of fake precision.
  - Conflicting feedback: weight recent accepted checkpoints more than single older observations.
- Validation: only validated critique rubric scores contribute.
- Permissions: owner only.
- Loading: progress skeleton.
- Empty: explicit first-lesson empty state.
- Error/retry: fallback to last computed summary.
- Offline/degraded: last cached summary may display.
- Analytics: `progress_viewed`, recommended dimension category.
- Acceptance criteria:
  - [ ] No skill score is shown as precise expert measurement; UI explains it is practice evidence.
  - [ ] Unsupported rubric dimensions do not affect a checkpoint.
  - [ ] Recommendation is traceable to recent stored feedback or current lesson objective.
- Out of scope: competitive ranking, psychometric ability score.

### F-009 — Artwork and feedback history / before-after
- User goal: review improvement and revisit prior coaching.
- Trigger: user opens History or completed lesson.
- Preconditions: owner has submissions.
- Happy path:
  1. History lists completed lesson attempts by date/path/lesson.
  2. User opens an attempt.
  3. User can inspect each checkpoint's first and final submission and associated critique.
  4. When two versions exist, user can switch between `Before` and `After`.
- Alternate paths: single-version checkpoint shows one image without comparison control.
- Validation: only records from the authenticated owner are queried.
- Permissions: owner only.
- Loading: thumbnails lazy-load; full image loads on detail.
- Empty: encouraging empty state with CTA to first lesson.
- Error/retry: failed thumbnail can retry without blocking rest of list.
- Offline/degraded: cached thumbnails/history may appear; signed private URLs may require refresh online.
- Analytics: `history_viewed`, `before_after_viewed`.
- Acceptance criteria:
  - [ ] User cannot load another user's attempt by guessed ID.
  - [ ] Before/after shows versions from the same checkpoint only.
  - [ ] Deleted image is not shown through stale application state after refresh.
- Out of scope: exporting a public portfolio.

### F-010 — Feedback usefulness signal
- User goal: quickly tell the product whether critique helped.
- Trigger: delivered critique is displayed.
- Preconditions: critique belongs to current user.
- Happy path: user selects `Helpful` or `Not helpful`; one response is stored and may be changed once later.
- Alternate paths: user skips rating.
- Validation: one active rating per user/critique.
- Permissions: owner write; aggregate analytics only outside user-facing records.
- Loading: optimistic UI with rollback on failure.
- Empty: not applicable.
- Error/retry: non-blocking; critique remains usable.
- Offline/degraded: queue is not required in MVP; rating can be retried later.
- Analytics: rating itself is product feedback.
- Acceptance criteria:
  - [ ] Rating is optional and never gates lesson progress.
  - [ ] A user cannot rate another user's critique.
- Out of scope: free-text support chat attached to rating.

### F-011 — Account settings, artwork deletion and account deletion
- User goal: control private data and leave the product.
- Trigger: Settings.
- Preconditions: authenticated.
- Happy path:
  - Sign out: ends local session and returns to auth.
  - Delete individual artwork/attempt: confirmation → authorized server mutation → database rows/storage objects removed according to retention design.
  - Delete account: explicit destructive confirmation → server-side deletion workflow removes/queues removal of owned app data and storage, then removes auth account and signs out.
- Alternate paths: deletion job failure enters retryable/pending state and does not falsely claim success.
- Validation: destructive confirmation required; account deletion cannot be triggered by a single accidental tap.
- Permissions: owner only; privileged auth-user deletion runs only in trusted backend.
- Loading: deletion progress disables repeat action.
- Empty: not applicable.
- Error/retry: actionable error; retry safe/idempotent.
- Offline/degraded: destructive operations require network.
- Analytics: `account_deletion_started/completed/failed` without personal content.
- Acceptance criteria:
  - [ ] Sign out clears local authenticated state.
  - [ ] User can delete owned artwork/attempts.
  - [ ] User can request full account deletion from inside the app.
  - [ ] Client cannot directly use service-role/admin credentials for account deletion.
  - [ ] Deletion is idempotent and storage cleanup is covered.
- Out of scope: legal archival beyond documented operational/security logs.

## 7. Cross-cutting behavior

### Onboarding
- First authenticated session without a profile always enters onboarding.
- Back navigation preserves unsaved selections in memory.
- Completion is a server-persisted state, not a local-only flag.

### Account lifecycle
- Email/password in MVP.
- Session restore occurs before protected navigation decides destination.
- Invalid/expired sessions are handled without exposing protected screens.

### Accessibility
- Touch targets follow platform guidance.
- Text supports dynamic font scaling where practical.
- Feedback meaning is not conveyed by color alone.
- Images include accessible labels such as `Your first submission for Composition checkpoint`.

### Localization
- MVP interface/content language: Turkish first.
- All user-facing strings are structured so English can be added without changing business logic.
- AI output language is explicitly requested from profile/app locale rather than inferred from artwork.

### Notifications
- Push notifications are not required for first vertical slice.
- MVP may add local/push practice reminders only after core loop, with explicit opt-in and without sensitive critique text on lock screens.

### Privacy
- Artwork is private.
- Exact birth date is not collected.
- Generic analytics excludes email, image URLs, raw artwork and full critique text.
- AI provider receives only the submitted image plus minimum lesson/rubric context needed for critique.
- Retention/deletion details are defined in `docs/DATABASE.md` and release privacy documentation.

### Moderation
- No public UGC in MVP; community moderation is N/A.
- Server still needs safe handling of unsupported/abusive inputs and provider error categories.

### Payments
- N/A for MVP. No subscription or in-app purchase flow is implemented before product-value validation.

### Account deletion/export
- In-app deletion required.
- Data export is post-MVP unless current release policy/legal requirements make it mandatory; re-evaluate during Stage 14 using current official policies.

### Admin/support
- No broad admin dashboard in MVP.
- Operational support uses server logs and non-content identifiers; direct access to private artwork should not be a default support workflow.

## 8. Product risks

| Risk | Impact | MVP mitigation |
|---|---|---|
| AI gives confident but wrong art critique | High trust loss | Constrained rubric, one priority, confidence/limitations, low-quality-image path, usefulness rating |
| Feedback latency is too high | Core loop abandonment | Asynchronous analysis state, leave-and-return support, latency instrumentation |
| Upload privacy/RLS mistake | Critical | Private bucket, owner path/policies, allow/deny tests, server ownership check |
| Learner gets trapped in corrections | High frustration | Maximum 3 analyzed versions, then `needs_practice` completion |
| Too many paths dilute content quality | Medium | Only four category/medium combinations in MVP |
| Age/minor handling creates policy complexity | High | 13+ only, age bands, no public social/UGC, revisit current policies before release |
| Skill scores feel arbitrary | Medium | Explain as practice evidence; show insufficient-data state |
| Provider cost grows unexpectedly | Medium | One image/request per version, bounded retries/versions, record usage/latency, no open-ended chat |

## 9. Open decisions

No product-scope blocker remains for planning. Technical provider/version decisions are resolved in `docs/ARCHITECTURE.md` using current official documentation and remain replaceable behind backend boundaries where feasible.
