# User Flows

## Screen/state inventory

| ID | Screen/state | Purpose | Entry points | Exit points |
|---|---|---|---|---|
| S-001 | Welcome | Explain product and 13+ boundary | App launch signed out | Auth |
| S-002 | Auth | Sign up / sign in | Welcome, expired session, sign out | Onboarding or Home |
| S-003 | Auth confirmation/error | Handle verification or recoverable auth errors | Auth | Auth / Onboarding |
| S-010 | Onboarding: age band | Capture privacy-minimized age group | New authenticated user | Experience |
| S-011 | Onboarding: experience | Capture current level | Age band | Goal |
| S-012 | Onboarding: goal | Capture learning intent | Experience | Category |
| S-013 | Onboarding: category | Choose Landscape or Portrait | Goal | Medium |
| S-014 | Onboarding: medium | Choose Pencil or Watercolor | Category | Practice plan |
| S-015 | Onboarding: practice plan | Choose weekly days/session length | Medium | Review |
| S-016 | Onboarding: review/save | Confirm choices and assign path | Practice plan | Home |
| S-020 | Home | Show active path, progress, next lesson and current focus | App shell, onboarding completion | Lesson / Progress / History / Settings |
| S-021 | Lesson detail | Explain lesson objective, materials and checkpoints | Home, History | Active checkpoint / Home |
| S-022 | Active checkpoint | Show current instruction/rubric focus | Lesson detail, resume | Artwork source / Feedback |
| S-023 | Artwork source chooser | Camera vs library | Active checkpoint | Camera/picker or checkpoint |
| S-024 | Artwork preview | Confirm/replace selected image | Camera/picker | Upload/analysis / checkpoint |
| S-025 | Uploading | Persist private artwork submission | Preview | Analyzing / retry |
| S-026 | Analyzing | Wait for server-side AI critique | Successful upload | Feedback / retry / better-image request |
| S-027 | Feedback | Show strength, priority issue, explanation and next action | Analysis complete | Resubmit / checkpoint complete / lesson |
| S-028 | Better image required | Explain image quality limitation | AI analysis | Artwork source chooser |
| S-029 | Resubmission | Re-enter artwork flow for correction | Feedback | Preview/upload/analyzing |
| S-030 | Lesson complete | Confirm completion and updated focus | Final checkpoint | Home / Progress / History |
| S-040 | Progress | Show evidence-based skill dimensions and current focus | Home/tab | Home / Lesson |
| S-041 | History | List previous attempts | Home/tab | Attempt detail |
| S-042 | Attempt detail | Review checkpoints, feedback and before/after | History | Image comparison / History |
| S-043 | Before/after comparison | Compare first and final versions of same checkpoint | Attempt detail | Attempt detail |
| S-050 | Settings | Profile preferences, sign out, deletion | Home/tab | Edit preferences / delete / auth |
| S-051 | Delete artwork confirmation | Confirm destructive attempt/artwork deletion | Attempt detail / Settings | History / error |
| S-052 | Delete account confirmation | Confirm full account deletion | Settings | Deleting / Settings |
| S-053 | Deleting account | Run idempotent server deletion workflow | Delete account confirmation | Auth / retry |
| S-060 | Global offline/error | Recover from network/server issues without data loss claims | Any network action | Retry / back |
| S-061 | Session bootstrap | Restore/validate auth before protected navigation | App launch | Auth / Onboarding / Home |

## Navigation model

```text
Root
├─ Session bootstrap
│  ├─ Signed out/invalid → Welcome/Auth
│  └─ Signed in
│     ├─ Onboarding incomplete → Onboarding stack
│     └─ Onboarding complete → App shell
└─ App shell
   ├─ Home
   ├─ Progress
   ├─ History
   └─ Settings

Home → Lesson detail → Active checkpoint → Upload/Analyze → Feedback → Resubmit or next checkpoint → Lesson complete
History → Attempt detail → Before/After
Settings → destructive confirmations
```

Protected routes never render owner data until session bootstrap is resolved.

## UF-001 — First run and account creation
- User intent: start using DrawCoach AI with a private account.
- Starting state: fresh install or signed-out app.
- Preconditions: none to view Welcome; network required to create account.

```text
App launch
  → S-061 Session bootstrap
  → No valid session
  → S-001 Welcome
  → User taps Get started
  → S-002 Auth
  → Choose Create account
  → Enter email + password
  → Client validation
      ├─ Invalid → Inline validation → edit
      └─ Valid → Auth request
            ├─ Failure → recoverable error → retry
            ├─ Confirmation required → S-003 → confirm → session
            └─ Session created → profile lookup
                  ├─ No completed profile → S-010 Onboarding
                  └─ Existing profile → S-020 Home
```

### Error/recovery branches
- Offline before submit: keep form values; explain network required.
- Duplicate email: show sign-in suggestion without exposing account details beyond provider-safe response.
- App killed after account creation but before onboarding: next launch restores session and returns to first incomplete onboarding step/profile flow.

### Analytics checkpoints
- `welcome_viewed`
- `auth_started:create`
- `auth_succeeded:create`
- `auth_failed:<category>`

### Related acceptance criteria
- F-001 all criteria.

## UF-002 — Returning user / session restore
- User intent: continue learning without repeating authentication/onboarding.
- Starting state: app launch.
- Preconditions: previously signed in or signed out.

```text
App launch
  → S-061 Session bootstrap
  → Read persisted session
      ├─ Missing → Welcome/Auth
      └─ Present → validate/refresh as supported
            ├─ Invalid/expired → clear auth state → Auth
            └─ Valid → load learner profile
                  ├─ Onboarding incomplete → Onboarding
                  └─ Complete → Home
```

### Error/recovery branches
- Temporary network failure during bootstrap: do not silently treat as signed out if a local session exists; show bounded retry/offline state and avoid exposing stale protected mutations.

### Analytics checkpoints
- `session_restored`
- `session_restore_failed:<category>`

### Related acceptance criteria
- F-001 session restore criteria.

## UF-003 — Complete onboarding and assign path
- User intent: create a learning plan.
- Starting state: authenticated user with incomplete profile.
- Preconditions: supported user age 13+.

```text
S-010 Age band
  → choose 13–17 / 18–24 / 25–34 / 35–44 / 45–54 / 55+
  → S-011 Experience
  → choose New / Beginner / Intermediate
  → S-012 Goal
  → choose Hobby / Fundamentals / Specialize / Portfolio practice
  → S-013 Category
  → choose Landscape / Portrait
  → S-014 Medium
  → choose Pencil / Watercolor
  → S-015 Practice plan
  → choose weekly days + session duration
  → S-016 Review
  → Confirm
      ├─ Save failure → keep selections → retry
      └─ Save success → assign matching path → S-020 Home
```

### Decision branches
- User presses Back: previous choice remains in local onboarding state.
- Unsupported under-13 audience: no under-13 selection exists; Welcome/age screen states 13+ MVP requirement.
- User closes app before final save: no false completion; next launch resumes onboarding from persisted server state or restarts with safe defaults.

### Analytics checkpoints
- `onboarding_started`
- `onboarding_step_viewed:<step>`
- `onboarding_completed` with enum category/medium/experience only.

### Related acceptance criteria
- F-002 all criteria.
- F-003 path assignment criteria.

## UF-004 — Open home and start next lesson
- User intent: know what to practice next.
- Starting state: onboarded user enters app shell.
- Preconditions: active learning path exists.

```text
S-020 Home
  → load path + progress + next eligible lesson + focus
      ├─ Loading → skeleton
      ├─ Recoverable failure → retry / last-known safe summary
      ├─ Path complete → completion state + review history
      └─ Next lesson available
            → user taps Start/Continue
            → authorize lesson eligibility
                  ├─ Not eligible/stale client → refresh Home
                  └─ Eligible → S-021 Lesson detail
```

### Error/recovery branches
- Catalog missing/inconsistent: show explicit configuration error, not empty blank state.

### Analytics checkpoints
- `home_viewed`
- `lesson_cta_tapped`

### Related acceptance criteria
- F-003 all criteria.

## UF-005 — Start/resume a lesson
- User intent: perform the current assignment in order.
- Starting state: S-021 Lesson detail.
- Preconditions: lesson belongs to active path and prerequisites pass.

```text
S-021 Lesson detail
  → Review objective/materials/checkpoints
  → Start / Continue
      ├─ Existing active attempt → load attempt
      └─ None → create attempt
  → Resolve first incomplete checkpoint
  → S-022 Active checkpoint
```

### Decision branches
- User exits: attempt remains `in_progress`; Home CTA becomes Continue.
- Completed lesson opened from history: read-only review, not a new mutable attempt unless a future explicit repeat feature is added.

### Error/recovery branches
- Attempt creation fails: retry; never fabricate local completion.

### Analytics checkpoints
- `lesson_started`
- `lesson_resumed`
- `checkpoint_viewed`

### Related acceptance criteria
- F-004.

## UF-006 — Capture/upload first checkpoint artwork
- User intent: send current work for feedback.
- Starting state: S-022 Active checkpoint.
- Preconditions: active mutable checkpoint.

```text
S-022 Active checkpoint
  → Add artwork
  → S-023 Source chooser
      ├─ Camera
      │   → request camera permission when needed
      │       ├─ Denied → explanation → choose Library or system settings/back
      │       └─ Granted → capture
      └─ Library
          → open system picker
              ├─ Cancel → checkpoint unchanged
              └─ Select image
  → S-024 Artwork preview
      ├─ Replace → source chooser
      └─ Confirm
          → validate type/size
              ├─ Invalid → explain → replace
              └─ Valid → S-025 Uploading
                    ├─ Upload failure → retry without advancing
                    └─ Stored successfully + submission record created
                          → S-026 Analyzing
```

### Error/recovery branches
- Permission denied permanently: do not loop permission prompt; provide alternative source/settings guidance.
- Upload timeout: retry is idempotent and does not create duplicate versions.
- User loses network on preview: image remains selected while screen/process allows; no background upload promise.

### Analytics checkpoints
- `artwork_source_selected:<camera|library>`
- `artwork_upload_succeeded`
- `artwork_upload_failed:<category>`

### Related acceptance criteria
- F-005.

## UF-007 — Receive AI critique
- User intent: get one useful correction for this exact checkpoint.
- Starting state: valid submission awaiting analysis.
- Preconditions: image stored privately, submission owned by current user.

```text
S-026 Analyzing
  → trusted backend authorizes user/submission
  → loads lesson/checkpoint rubric + minimal learner context
  → calls configured vision model
      ├─ Provider/timeout failure
      │   → mark retryable → client shows Retry
      ├─ Invalid structured output
      │   → one controlled server retry
      │       ├─ still invalid → retryable failure
      │       └─ valid → continue
      ├─ Image quality insufficient
      │   → store needs_better_image result
      │   → S-028 Better image required
      │   → user chooses new image → UF-006
      └─ Valid critique
          → persist critique/rubric evidence
          → S-027 Feedback
```

### Feedback rendering order
1. `What is working` — one strength.
2. `Fix this first` — one priority issue.
3. `Why` — short teaching explanation.
4. `Do this now` — concrete correction.
5. Optional micro-exercise.
6. Confidence/limitation note only when useful.
7. Helpful / Not helpful control.

### Error/recovery branches
- User leaves while analysis runs: Home/lesson can show `Analysis in progress`; returning to checkpoint reloads state.
- Provider result arrives after user navigated away: state persists server-side; no reliance on mounted component.

### Analytics checkpoints
- `analysis_started`
- `feedback_delivered`
- latency bucket / failure category

### Related acceptance criteria
- F-006.

## UF-008 — Correct and resubmit
- User intent: apply the priority correction and demonstrate improvement.
- Starting state: S-027 Feedback.
- Preconditions: delivered critique for current checkpoint.

```text
S-027 Feedback
  → user reads next action
  → Resubmit correction
  → S-029 Resubmission
  → reuse UF-006 capture/upload flow
  → analyze with previous priority issue + checkpoint rubric
      ├─ Target improved sufficiently
      │   → mark checkpoint accepted
      │   → More checkpoints?
      │       ├─ Yes → next checkpoint unlocks → S-022
      │       └─ No → mark lesson complete → S-030
      ├─ Target unresolved AND analyzed version count < 3
      │   → S-027 new single-priority feedback → repeat
      └─ Target unresolved AND count reaches 3
          → mark checkpoint `needs_practice`
          → carry weakness into progress recommendation
          → next checkpoint or S-030
```

### Error/recovery branches
- Upload/provider failure does not count as an analyzed version until a valid critique is stored.
- User chooses `Try again later`: attempt remains resumable.

### Analytics checkpoints
- `correction_started`
- `correction_accepted`
- `checkpoint_needs_practice`

### Related acceptance criteria
- F-007.

## UF-009 — Complete lesson and update progress
- User intent: finish today's assignment and understand the next focus.
- Starting state: final checkpoint becomes accepted or `needs_practice`.
- Preconditions: all checkpoints have terminal status.

```text
Final checkpoint terminal
  → server marks lesson attempt completed
  → recompute/refresh skill evidence summary
  → determine next focus from recurring weakness relevant to next lesson
  → S-030 Lesson complete
      → show completion + focus
      ├─ View progress → S-040
      └─ Back home → S-020 with next lesson
```

### Error/recovery branches
- Progress summary computation fails after lesson completion: lesson remains completed; show last-known/insufficient-data progress and retry summary separately.

### Analytics checkpoints
- `lesson_completed`
- recommended dimension category

### Related acceptance criteria
- F-008.

## UF-010 — View progress
- User intent: see evidence of improvement and current weakness.
- Starting state: app shell.
- Preconditions: onboarded user.

```text
S-040 Progress
  → load skill summary
      ├─ No/insufficient evidence → explicit practice-first empty state
      ├─ Error → retry / last-known summary
      └─ Evidence → show dimensions + current focus
  → optional CTA to next lesson
```

### Analytics checkpoints
- `progress_viewed`

### Related acceptance criteria
- F-008.

## UF-011 — Review history and before/after
- User intent: revisit coaching and visually compare improvement.
- Starting state: app shell History.
- Preconditions: authenticated owner.

```text
S-041 History
  → load owner's attempts
      ├─ None → empty state + Start first lesson CTA
      └─ Attempts → select one
          → S-042 Attempt detail
          → select checkpoint
              ├─ One version → show image + critique
              └─ Two+ versions → Before/After control
                    → S-043 compare first vs final version only
```

### Error/recovery branches
- Private signed image URL expires: refresh through authorized data layer.
- Deleted attempt disappears after refresh; stale navigation handles not-found by returning to History.

### Analytics checkpoints
- `history_viewed`
- `before_after_viewed`

### Related acceptance criteria
- F-009.

## UF-012 — Rate feedback usefulness
- User intent: indicate whether critique helped.
- Starting state: S-027 Feedback.
- Preconditions: critique owned by user.

```text
Feedback
  → tap Helpful / Not helpful
  → optimistic selected state
      ├─ write succeeds → persist
      └─ write fails → rollback + unobtrusive retry
  → learning flow remains unblocked
```

### Analytics checkpoints
- rating record itself.

### Related acceptance criteria
- F-010.

## UF-013 — Sign out
- User intent: end session on device.
- Starting state: S-050 Settings.
- Preconditions: authenticated.

```text
Settings
  → Sign out
  → end auth session
      ├─ failure → remain safely authenticated + show error
      └─ success → clear protected client state/cache → S-002 Auth
```

### Related acceptance criteria
- F-011 sign-out criterion.

## UF-014 — Delete an artwork/attempt
- User intent: remove owned practice data and associated stored images.
- Starting state: S-042 Attempt detail or supported Settings/history action.
- Preconditions: authenticated owner.

```text
Attempt detail
  → Delete
  → S-051 confirmation
      ├─ Cancel → no change
      └─ Confirm
          → authorized deletion workflow
              ├─ Failure → keep visible + retry
              └─ Success → remove DB records/storage objects → S-041 History
```

### Error/recovery branches
- Repeated confirmation/request is idempotent.
- Partial storage cleanup is treated as pending/failure internally, not false complete.

### Analytics checkpoints
- deletion success/failure category; no content identifiers in generic analytics beyond non-sensitive internal ID where policy allows.

### Related acceptance criteria
- F-011.

## UF-015 — Delete account
- User intent: permanently remove account and owned DrawCoach data.
- Starting state: S-050 Settings.
- Preconditions: authenticated.

```text
Settings
  → Delete account
  → S-052 destructive confirmation
      ├─ Cancel → Settings
      └─ Confirm explicit phrase/action
          → S-053 Deleting account
          → trusted server deletion workflow
              1. lock/mark deletion request
              2. remove/queue private storage cleanup
              3. remove app-owned rows according to DATABASE rules
              4. remove auth user with privileged server capability
              ├─ Failure/pending → show retry/support-safe state; do not claim deletion
              └─ Complete → clear local session/cache → Auth/Welcome
```

### Error/recovery branches
- Network lost: operation remains server-authoritative/idempotent; app rechecks request/account status on next authenticated opportunity.

### Analytics checkpoints
- `account_deletion_started`
- `account_deletion_completed`
- `account_deletion_failed:<category>`

### Related acceptance criteria
- F-011.

## UF-016 — Network loss / generic recovery
- User intent: avoid losing work or being misled when connectivity fails.
- Starting state: any network-dependent screen.

```text
Network request
  → failure classified
      ├─ Auth/session invalid → session flow
      ├─ Offline/timeout → S-060 recoverable offline state
      │   → retain safe local form/selected-image state where possible
      │   → Retry when online
      ├─ Permission/authorization denied → safe not-authorized state; never retry as privileged
      └─ Server/provider error → retry with bounded behavior
```

### Rules
- No client-only success for server-authoritative mutations.
- No infinite automatic retry loops.
- Artwork upload/analysis is not advertised as offline-capable.
- Loaded lesson text/progress may display from cache if clearly stale-safe.

### Related acceptance criteria
- Cross-cutting error/offline requirements across F-001–F-011.

## Coverage matrix

| Feature | Primary flows |
|---|---|
| F-001 Authentication | UF-001, UF-002, UF-013 |
| F-002 Onboarding | UF-003 |
| F-003 Path/Home | UF-003, UF-004 |
| F-004 Lessons/checkpoints | UF-005, UF-008, UF-009 |
| F-005 Artwork upload | UF-006 |
| F-006 AI critique | UF-007 |
| F-007 Correction loop | UF-008 |
| F-008 Progress | UF-009, UF-010 |
| F-009 History | UF-011 |
| F-010 Usefulness rating | UF-012 |
| F-011 Settings/deletion | UF-013, UF-014, UF-015 |

Every MVP feature is reachable through at least one defined flow, including recovery and destructive paths.
